import type {
	IZWaveEndpoint,
	MaybeNotKnown,
	MessageRecord,
	SupervisionResult,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	MAX_NODES,
	type MessageOrCCLogEntry,
	MessagePriority,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { validateArgs } from "@zwave-js/transformers";
import { distinct } from "alcalzone-shared/arrays";
import { CCAPI, PhysicalCCAPI } from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { type AssociationAddress, AssociationCommand } from "../lib/_Types";
import * as ccUtils from "../lib/utils";

export const AssociationCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Association, {
		/** Whether the node has a lifeline association */
		...V.staticProperty("hasLifeline", undefined, { internal: true }),
		/** How many association groups the node has */
		...V.staticProperty("groupCount", undefined, { internal: true }),
	}),

	...V.defineDynamicCCValues(CommandClasses.Association, {
		/** The maximum number of nodes in an association group */
		...V.dynamicPropertyAndKeyWithName(
			"maxNodes",
			"maxNodes",
			(groupId: number) => groupId,
			({ property, propertyKey }) =>
				property === "maxNodes" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
		/** The node IDs currently belonging to an association group */
		...V.dynamicPropertyAndKeyWithName(
			"nodeIds",
			"nodeIds",
			(groupId: number) => groupId,
			({ property, propertyKey }) =>
				property === "nodeIds" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
	}),
});

// @noSetValueAPI

@API(CommandClasses.Association)
export class AssociationCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: AssociationCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case AssociationCommand.Get:
			case AssociationCommand.Set:
			case AssociationCommand.Report:
			case AssociationCommand.Remove:
			case AssociationCommand.SupportedGroupingsGet:
			case AssociationCommand.SupportedGroupingsReport:
				return true;
			case AssociationCommand.SpecificGroupGet:
			case AssociationCommand.SpecificGroupReport:
				return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	/**
	 * Returns the number of association groups a node supports.
	 * Association groups are consecutive, starting at 1.
	 */
	public async getGroupCount(): Promise<MaybeNotKnown<number>> {
		this.assertSupportsCommand(
			AssociationCommand,
			AssociationCommand.SupportedGroupingsGet,
		);

		const cc = new AssociationCCSupportedGroupingsGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			AssociationCCSupportedGroupingsReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) return response.groupCount;
	}

	@validateArgs()
	public async reportGroupCount(groupCount: number): Promise<void> {
		this.assertSupportsCommand(
			AssociationCommand,
			AssociationCommand.SupportedGroupingsReport,
		);

		const cc = new AssociationCCSupportedGroupingsReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupCount,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Returns information about an association group.
	 */
	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getGroup(groupId: number) {
		this.assertSupportsCommand(AssociationCommand, AssociationCommand.Get);

		const cc = new AssociationCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
		});
		const response = await this.applHost.sendCommand<AssociationCCReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return {
				maxNodes: response.maxNodes,
				nodeIds: response.nodeIds,
			};
		}
	}

	@validateArgs()
	public async sendReport(
		options: AssociationCCReportSpecificOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			AssociationCommand,
			AssociationCommand.Report,
		);

		const cc = new AssociationCCReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Adds new nodes to an association group
	 */
	@validateArgs()
	public async addNodeIds(
		groupId: number,
		...nodeIds: number[]
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(AssociationCommand, AssociationCommand.Set);

		const cc = new AssociationCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			nodeIds,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Removes nodes from an association group
	 */
	@validateArgs()
	public async removeNodeIds(
		options: AssociationCCRemoveOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			AssociationCommand,
			AssociationCommand.Remove,
		);

		const cc = new AssociationCCRemove(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Removes nodes from all association groups
	 */
	@validateArgs()
	public async removeNodeIdsFromAllGroups(
		nodeIds: number[],
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			AssociationCommand,
			AssociationCommand.Remove,
		);

		if (this.version >= 2) {
			// The node supports bulk removal
			return this.removeNodeIds({ nodeIds, groupId: 0 });
		} else {
			// We have to remove the node manually from all groups
			const groupCount = this.tryGetValueDB()?.getValue<number>(
				AssociationCCValues.groupCount.endpoint(
					this.endpoint.index,
				),
			) ?? 0;
			for (let groupId = 1; groupId <= groupCount; groupId++) {
				// TODO: evaluate intermediate supervision results
				await this.removeNodeIds({ nodeIds, groupId });
			}
		}
	}

	/**
	 * Request the association group that represents the most recently detected button press
	 */
	@validateArgs()
	public async getSpecificGroup(): Promise<number | undefined> {
		this.assertSupportsCommand(
			AssociationCommand,
			AssociationCommand.SpecificGroupGet,
		);

		const cc = new AssociationCCSpecificGroupGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			AssociationCCSpecificGroupReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.group;
	}

	/**
	 * Report the association group that represents the most recently detected button press
	 */
	@validateArgs()
	public async reportSpecificGroup(
		group: number,
	): Promise<void> {
		this.assertSupportsCommand(
			AssociationCommand,
			AssociationCommand.SpecificGroupReport,
		);

		const cc = new AssociationCCSpecificGroupReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			group,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Association)
@implementedVersion(3)
@ccValues(AssociationCCValues)
export class AssociationCC extends CommandClass {
	declare ccCommand: AssociationCommand;

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		// AssociationCC must be interviewed after Z-Wave+ if that is supported
		return [
			...super.determineRequiredCCInterviews(),
			CommandClasses["Z-Wave Plus Info"],
			// We need information about endpoints to correctly configure the lifeline associations
			CommandClasses["Multi Channel"],
		];
	}

	/**
	 * Returns the number of association groups reported by the node/endpoint.
	 * This only works AFTER the interview process
	 */
	public static getGroupCountCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): number {
		return (
			applHost
				.getValueDB(endpoint.nodeId)
				.getValue(
					AssociationCCValues.groupCount.endpoint(endpoint.index),
				) || 0
		);
	}

	/**
	 * Returns the number of nodes an association group supports.
	 * This only works AFTER the interview process
	 */
	public static getMaxNodesCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
		groupId: number,
	): number {
		return (
			applHost
				.getValueDB(endpoint.nodeId)
				.getValue(
					AssociationCCValues.maxNodes(groupId).endpoint(
						endpoint.index,
					),
				)
				// If the information is not available, fall back to the configuration file if possible
				// This can happen on some legacy devices which have "hidden" association groups
				?? applHost
					.getDeviceConfig?.(endpoint.nodeId)
					?.getAssociationConfigForEndpoint(endpoint.index, groupId)
					?.maxNodes
				?? 0
		);
	}

	/**
	 * Returns all the destinations of all association groups reported by the node/endpoint.
	 * This only works AFTER the interview process
	 */
	public static getAllDestinationsCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): ReadonlyMap<number, readonly AssociationAddress[]> {
		const ret = new Map<number, AssociationAddress[]>();
		const groupCount = this.getGroupCountCached(applHost, endpoint);
		const valueDB = applHost.getValueDB(endpoint.nodeId);
		for (let i = 1; i <= groupCount; i++) {
			// Add all root destinations
			const nodes = valueDB.getValue<number[]>(
				AssociationCCValues.nodeIds(i).endpoint(endpoint.index),
			) ?? [];

			ret.set(
				i,
				// Filter out duplicates
				distinct(nodes).map((nodeId) => ({ nodeId })),
			);
		}
		return ret;
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Association,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Even if Multi Channel Association is supported, we still need to query the number of
		// normal association groups since some devices report more association groups than
		// multi channel association groups

		// Find out how many groups are supported
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying number of association groups...",
			direction: "outbound",
		});
		const groupCount = await api.getGroupCount();
		if (groupCount != undefined) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `supports ${groupCount} association groups`,
				direction: "inbound",
			});
		} else {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying association groups timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		// Query each association group for its members
		await this.refreshValues(applHost);

		// Skip the remaining Association CC interview in favor of Multi Channel Association if possible
		if (endpoint.supportsCC(CommandClasses["Multi Channel Association"])) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`${this.constructor.name}: delaying configuration of lifeline associations until after Multi Channel Association interview...`,
				direction: "none",
			});
			this.setInterviewComplete(applHost, true);
			return;
		}

		// And set up lifeline associations
		await ccUtils.configureLifelineAssociations(applHost, endpoint);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Association,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const groupCount = AssociationCC.getGroupCountCached(
			applHost,
			endpoint,
		);

		// Query each association group
		for (let groupId = 1; groupId <= groupCount; groupId++) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying association group #${groupId}...`,
				direction: "outbound",
			});
			const group = await api.getGroup(groupId);
			if (group != undefined) {
				const logMessage =
					`received information for association group #${groupId}:
maximum # of nodes: ${group.maxNodes}
currently assigned nodes: ${group.nodeIds.map(String).join(", ")}`;
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}
	}
}

// @publicAPI
export interface AssociationCCSetOptions extends CCCommandOptions {
	groupId: number;
	nodeIds: number[];
}

@CCCommand(AssociationCommand.Set)
@useSupervision()
export class AssociationCCSet extends AssociationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | AssociationCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.groupId = this.payload[0];
			this.nodeIds = [...this.payload.subarray(1)];
		} else {
			if (options.groupId < 1) {
				throw new ZWaveError(
					"The group id must be positive!",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			if (options.nodeIds.some((n) => n < 1 || n > MAX_NODES)) {
				throw new ZWaveError(
					`All node IDs must be between 1 and ${MAX_NODES}!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.groupId = options.groupId;
			this.nodeIds = options.nodeIds;
		}
	}

	public groupId: number;
	public nodeIds: number[];

	public serialize(): Buffer {
		this.payload = Buffer.from([this.groupId, ...this.nodeIds]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"group id": this.groupId || "all groups",
			"node ids": this.nodeIds.length
				? this.nodeIds.join(", ")
				: "all nodes",
		};
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export interface AssociationCCRemoveOptions {
	/** The group from which to remove the nodes. If none is specified, the nodes will be removed from all nodes. */
	groupId?: number;
	/** The nodes to remove. If none are specified, ALL nodes will be removed. */
	nodeIds?: number[];
}

@CCCommand(AssociationCommand.Remove)
@useSupervision()
export class AssociationCCRemove extends AssociationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (AssociationCCRemoveOptions & CCCommandOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			if (this.payload[0] !== 0) {
				this.groupId = this.payload[0];
			}
			this.nodeIds = [...this.payload.subarray(1)];
		} else {
			// Validate options
			if (!options.groupId) {
				if (this.version === 1) {
					throw new ZWaveError(
						`Node ${this
							.nodeId as number} only supports AssociationCC V1 which requires the group Id to be set`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
			} else if (options.groupId < 0) {
				throw new ZWaveError(
					"The group id must be positive!",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			// When removing associations, we allow invalid node IDs.
			// See GH#3606 - it is possible that those exist.
			this.groupId = options.groupId;
			this.nodeIds = options.nodeIds;
		}
	}

	public groupId?: number;
	public nodeIds?: number[];

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.groupId || 0,
			...(this.nodeIds || []),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"group id": this.groupId || "all groups",
			"node ids": this.nodeIds && this.nodeIds.length
				? this.nodeIds.join(", ")
				: "all nodes",
		};
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export interface AssociationCCReportSpecificOptions {
	groupId: number;
	maxNodes: number;
	nodeIds: number[];
	reportsToFollow: number;
}

@CCCommand(AssociationCommand.Report)
export class AssociationCCReport extends AssociationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (AssociationCCReportSpecificOptions & CCCommandOptions),
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 3);
			this.groupId = this.payload[0];
			this.maxNodes = this.payload[1];
			this.reportsToFollow = this.payload[2];
			this.nodeIds = [...this.payload.subarray(3)];
		} else {
			this.groupId = options.groupId;
			this.maxNodes = options.maxNodes;
			this.nodeIds = options.nodeIds;
			this.reportsToFollow = options.reportsToFollow;
		}
	}

	public groupId: number;

	@ccValue(
		AssociationCCValues.maxNodes,
		(self: AssociationCCReport) => [self.groupId] as const,
	)
	public maxNodes: number;

	@ccValue(
		AssociationCCValues.nodeIds,
		(self: AssociationCCReport) => [self.groupId] as const,
	)
	public nodeIds: number[];

	public reportsToFollow: number;

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Distinguish sessions by the association group ID
		return { groupId: this.groupId };
	}

	public expectMoreMessages(): boolean {
		return this.reportsToFollow > 0;
	}

	public mergePartialCCs(
		applHost: ZWaveApplicationHost,
		partials: AssociationCCReport[],
	): void {
		// Concat the list of nodes
		this.nodeIds = [...partials, this]
			.map((report) => report.nodeIds)
			.reduce((prev, cur) => prev.concat(...cur), []);
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.groupId,
			this.maxNodes,
			this.reportsToFollow,
			...this.nodeIds,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"group id": this.groupId,
				"max # of nodes": this.maxNodes,
				"node IDs": this.nodeIds.join(", "),
				"reports to follow": this.reportsToFollow,
			},
		};
	}
}

// @publicAPI
export interface AssociationCCGetOptions extends CCCommandOptions {
	groupId: number;
}

@CCCommand(AssociationCommand.Get)
@expectedCCResponse(AssociationCCReport)
export class AssociationCCGet extends AssociationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | AssociationCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.groupId = this.payload[0];
		} else {
			if (options.groupId < 1) {
				throw new ZWaveError(
					"The group id must be positive!",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.groupId = options.groupId;
		}
	}

	public groupId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.groupId]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "group id": this.groupId },
		};
	}
}

// @publicAPI
export interface AssociationCCSupportedGroupingsReportOptions
	extends CCCommandOptions
{
	groupCount: number;
}

@CCCommand(AssociationCommand.SupportedGroupingsReport)
export class AssociationCCSupportedGroupingsReport extends AssociationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| AssociationCCSupportedGroupingsReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.groupCount = this.payload[0];
		} else {
			this.groupCount = options.groupCount;
		}
	}

	@ccValue(AssociationCCValues.groupCount)
	public groupCount: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.groupCount]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "group count": this.groupCount },
		};
	}
}

@CCCommand(AssociationCommand.SupportedGroupingsGet)
@expectedCCResponse(AssociationCCSupportedGroupingsReport)
export class AssociationCCSupportedGroupingsGet extends AssociationCC {}

// @publicAPI
export interface AssociationCCSpecificGroupReportOptions {
	group: number;
}

@CCCommand(AssociationCommand.SpecificGroupReport)
export class AssociationCCSpecificGroupReport extends AssociationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (AssociationCCSpecificGroupReportOptions & CCCommandOptions),
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.group = this.payload[0];
		} else {
			this.group = options.group;
		}
	}

	public group: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.group]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { group: this.group },
		};
	}
}

@CCCommand(AssociationCommand.SpecificGroupGet)
@expectedCCResponse(AssociationCCSpecificGroupReport)
export class AssociationCCSpecificGroupGet extends AssociationCC {}
