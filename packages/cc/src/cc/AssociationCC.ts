import type { AssociationConfig } from "@zwave-js/config";
import type {
	IZWaveEndpoint,
	IZWaveNode,
	Maybe,
	MessageRecord,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	MAX_NODES,
	MessageOrCCLogEntry,
	MessagePriority,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { validateArgs } from "@zwave-js/transformers";
import { distinct } from "alcalzone-shared/arrays";
import { CCAPI, PhysicalCCAPI } from "../lib/API";
import {
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import * as ccUtils from "../lib/utils";
import { V } from "../lib/Values";
import { AssociationCommand, type AssociationAddress } from "../lib/_Types";

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

export function getLifelineGroupIds(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
): number[] {
	// For now only support this for the root endpoint - i.e. node
	if (endpoint.index > 0) return [];
	const node = endpoint as IZWaveNode;

	// Some nodes define multiple lifeline groups, so we need to assign us to
	// all of them
	const lifelineGroups: number[] = [];

	// If the target node supports Z-Wave+ info that means the lifeline MUST be group #1
	if (endpoint.supportsCC(CommandClasses["Z-Wave Plus Info"])) {
		lifelineGroups.push(1);
	}

	// We have a device config file that tells us which (additional) association to assign
	let associations: ReadonlyMap<number, AssociationConfig> | undefined;
	const deviceConfig = applHost.getDeviceConfig?.(node.id);
	if (endpoint.index === 0) {
		// The root endpoint's associations may be configured separately or as part of "endpoints"
		associations =
			deviceConfig?.associations ??
			deviceConfig?.endpoints?.get(0)?.associations;
	} else {
		// The other endpoints can only have a configuration as part of "endpoints"
		associations = deviceConfig?.endpoints?.get(
			endpoint.index,
		)?.associations;
	}

	if (associations?.size) {
		lifelineGroups.push(
			...[...associations.values()]
				.filter((a) => a.isLifeline)
				.map((a) => a.groupId),
		);
	}

	return distinct(lifelineGroups).sort();
}

// @noSetValueAPI

@API(CommandClasses.Association)
export class AssociationCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: AssociationCommand): Maybe<boolean> {
		switch (cmd) {
			case AssociationCommand.Get:
			case AssociationCommand.Set:
			case AssociationCommand.Remove:
			case AssociationCommand.SupportedGroupingsGet:
				return true; // This is mandatory
			// Not implemented:
			// case AssociationCommand.SpecificGroupGet:
			// return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	/**
	 * Returns the number of association groups a node supports.
	 * Association groups are consecutive, starting at 1.
	 */
	public async getGroupCount(): Promise<number | undefined> {
		this.assertSupportsCommand(
			AssociationCommand,
			AssociationCommand.SupportedGroupingsGet,
		);

		const cc = new AssociationCCSupportedGroupingsGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<AssociationCCSupportedGroupingsReport>(
				cc,
				this.commandOptions,
			);
		if (response) return response.groupCount;
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

	/**
	 * Adds new nodes to an association group
	 */
	@validateArgs()
	public async addNodeIds(
		groupId: number,
		...nodeIds: number[]
	): Promise<void> {
		this.assertSupportsCommand(AssociationCommand, AssociationCommand.Set);

		const cc = new AssociationCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			nodeIds,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Removes nodes from an association group
	 */
	@validateArgs()
	public async removeNodeIds(
		options: AssociationCCRemoveOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			AssociationCommand,
			AssociationCommand.Remove,
		);

		const cc = new AssociationCCRemove(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Removes nodes from all association groups
	 */
	@validateArgs()
	public async removeNodeIdsFromAllGroups(nodeIds: number[]): Promise<void> {
		this.assertSupportsCommand(
			AssociationCommand,
			AssociationCommand.Remove,
		);

		if (this.version >= 2) {
			// The node supports bulk removal
			return this.removeNodeIds({ nodeIds, groupId: 0 });
		} else {
			// We have to remove the node manually from all groups
			const groupCount =
				this.tryGetValueDB()?.getValue<number>(
					AssociationCCValues.groupCount.endpoint(
						this.endpoint.index,
					),
				) ?? 0;
			for (let groupId = 1; groupId <= groupCount; groupId++) {
				await this.removeNodeIds({ nodeIds, groupId });
			}
		}
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
				) ??
			// If the information is not available, fall back to the configuration file if possible
			// This can happen on some legacy devices which have "hidden" association groups
			applHost
				.getDeviceConfig?.(endpoint.nodeId)
				?.getAssociationConfigForEndpoint(endpoint.index, groupId)
				?.maxNodes ??
			0
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
		const valueDB = applHost.getValueDB(endpoint.nodeId)!;
		for (let i = 1; i <= groupCount; i++) {
			// Add all root destinations
			const nodes =
				valueDB.getValue<number[]>(
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
				message: `${this.constructor.name}: delaying configuration of lifeline associations until after Multi Channel Association interview...`,
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
				const logMessage = `received information for association group #${groupId}:
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

interface AssociationCCSetOptions extends CCCommandOptions {
	groupId: number;
	nodeIds: number[];
}

@CCCommand(AssociationCommand.Set)
export class AssociationCCSet extends AssociationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | AssociationCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"group id": this.groupId || "all groups",
			"node ids": this.nodeIds.length
				? this.nodeIds.join(", ")
				: "all nodes",
		};
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

interface AssociationCCRemoveOptions {
	/** The group from which to remove the nodes. If none is specified, the nodes will be removed from all nodes. */
	groupId?: number;
	/** The nodes to remove. If none are specified, ALL nodes will be removed. */
	nodeIds?: number[];
}

@CCCommand(AssociationCommand.Remove)
export class AssociationCCRemove extends AssociationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (AssociationCCRemoveOptions & CCCommandOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			// Validate options
			if (!options.groupId) {
				if (this.version === 1) {
					throw new ZWaveError(
						`Node ${
							this.nodeId as number
						} only supports AssociationCC V1 which requires the group Id to be set`,
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"group id": this.groupId || "all groups",
			"node ids":
				this.nodeIds && this.nodeIds.length
					? this.nodeIds.join(", ")
					: "all nodes",
		};
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(AssociationCommand.Report)
export class AssociationCCReport extends AssociationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 3);
		this._groupId = this.payload[0];
		this._maxNodes = this.payload[1];
		this._reportsToFollow = this.payload[2];
		this._nodeIds = [...this.payload.slice(3)];
	}

	private _groupId: number;
	public get groupId(): number {
		return this._groupId;
	}

	private _maxNodes: number;
	@ccValue(
		AssociationCCValues.maxNodes,
		(self: AssociationCCReport) => [self.groupId] as const,
	)
	public get maxNodes(): number {
		return this._maxNodes;
	}

	private _nodeIds: number[];
	@ccValue(
		AssociationCCValues.nodeIds,
		(self: AssociationCCReport) => [self.groupId] as const,
	)
	public get nodeIds(): readonly number[] {
		return this._nodeIds;
	}

	private _reportsToFollow: number;
	public get reportsToFollow(): number {
		return this._reportsToFollow;
	}

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Distinguish sessions by the association group ID
		return { groupId: this._groupId };
	}

	public expectMoreMessages(): boolean {
		return this._reportsToFollow > 0;
	}

	public mergePartialCCs(
		applHost: ZWaveApplicationHost,
		partials: AssociationCCReport[],
	): void {
		// Concat the list of nodes
		this._nodeIds = [...partials, this]
			.map((report) => report._nodeIds)
			.reduce((prev, cur) => prev.concat(...cur), []);
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"group id": this.groupId,
				"max # of nodes": this.maxNodes,
				"node IDs": this.nodeIds.join(", "),
				"reports to follow": this.reportsToFollow,
			},
		};
	}
}

interface AssociationCCGetOptions extends CCCommandOptions {
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
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { "group id": this.groupId },
		};
	}
}

@CCCommand(AssociationCommand.SupportedGroupingsReport)
export class AssociationCCSupportedGroupingsReport extends AssociationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._groupCount = this.payload[0];
	}

	private _groupCount: number;
	@ccValue(AssociationCCValues.groupCount)
	public get groupCount(): number {
		return this._groupCount;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { "group count": this.groupCount },
		};
	}
}

@CCCommand(AssociationCommand.SupportedGroupingsGet)
@expectedCCResponse(AssociationCCSupportedGroupingsReport)
export class AssociationCCSupportedGroupingsGet extends AssociationCC {}
