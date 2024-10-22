import type {
	EndpointId,
	MaybeNotKnown,
	MessageRecord,
	SupervisionResult,
	WithAddress,
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
	CCEncodingContext,
	CCParsingContext,
	GetDeviceConfig,
	GetValueDB,
} from "@zwave-js/host/safe";
import { validateArgs } from "@zwave-js/transformers";
import { distinct } from "alcalzone-shared/arrays";
import { CCAPI, PhysicalCCAPI } from "../lib/API";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type RefreshValuesContext,
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

		const cc = new AssociationCCSupportedGroupingsGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
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

		const cc = new AssociationCCSupportedGroupingsReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			groupCount,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Returns information about an association group.
	 */
	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getGroup(groupId: number) {
		this.assertSupportsCommand(AssociationCommand, AssociationCommand.Get);

		const cc = new AssociationCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			groupId,
		});
		const response = await this.host.sendCommand<AssociationCCReport>(
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
		options: AssociationCCReportOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			AssociationCommand,
			AssociationCommand.Report,
		);

		const cc = new AssociationCCReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		await this.host.sendCommand(cc, this.commandOptions);
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

		const cc = new AssociationCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			groupId,
			nodeIds,
		});
		return this.host.sendCommand(cc, this.commandOptions);
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

		// Validate options
		if (!options.groupId) {
			if (this.version === 1) {
				throw new ZWaveError(
					`Node ${this.endpoint.nodeId} only supports AssociationCC V1 which requires the group Id to be set`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		} else if (options.groupId < 0) {
			throw new ZWaveError(
				"The group id must be positive!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const cc = new AssociationCCRemove({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
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

		const cc = new AssociationCCSpecificGroupGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
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

		const cc = new AssociationCCSpecificGroupReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			group,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Association)
@implementedVersion(4)
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
		ctx: GetValueDB,
		endpoint: EndpointId,
	): number {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				AssociationCCValues.groupCount.endpoint(endpoint.index),
			) || 0;
	}

	/**
	 * Returns the number of nodes an association group supports.
	 * This only works AFTER the interview process
	 */
	public static getMaxNodesCached(
		ctx: GetValueDB & GetDeviceConfig,
		endpoint: EndpointId,
		groupId: number,
	): number {
		return (
			ctx
				.getValueDB(endpoint.nodeId)
				.getValue(
					AssociationCCValues.maxNodes(groupId).endpoint(
						endpoint.index,
					),
				)
				// If the information is not available, fall back to the configuration file if possible
				// This can happen on some legacy devices which have "hidden" association groups
				?? ctx
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
		ctx: GetValueDB,
		endpoint: EndpointId,
	): ReadonlyMap<number, readonly AssociationAddress[]> {
		const ret = new Map<number, AssociationAddress[]>();
		const groupCount = this.getGroupCountCached(ctx, endpoint);
		const valueDB = ctx.getValueDB(endpoint.nodeId);
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

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses.Association,
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Even if Multi Channel Association is supported, we still need to query the number of
		// normal association groups since some devices report more association groups than
		// multi channel association groups

		// Find out how many groups are supported
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying number of association groups...",
			direction: "outbound",
		});
		const groupCount = await api.getGroupCount();
		if (groupCount != undefined) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `supports ${groupCount} association groups`,
				direction: "inbound",
			});
		} else {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying association groups timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		// Query each association group for its members
		await this.refreshValues(ctx);

		// Skip the remaining Association CC interview in favor of Multi Channel Association if possible
		if (endpoint.supportsCC(CommandClasses["Multi Channel Association"])) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`${this.constructor.name}: delaying configuration of lifeline associations until after Multi Channel Association interview...`,
				direction: "none",
			});
			this.setInterviewComplete(ctx, true);
			return;
		}

		// And set up lifeline associations
		await ccUtils.configureLifelineAssociations(ctx, endpoint);

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses.Association,
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const groupCount = AssociationCC.getGroupCountCached(
			ctx,
			endpoint,
		);

		// Query each association group
		for (let groupId = 1; groupId <= groupCount; groupId++) {
			ctx.logNode(node.id, {
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
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}
	}
}

// @publicAPI
export interface AssociationCCSetOptions {
	groupId: number;
	nodeIds: number[];
}

@CCCommand(AssociationCommand.Set)
@useSupervision()
export class AssociationCCSet extends AssociationCC {
	public constructor(
		options: WithAddress<AssociationCCSetOptions>,
	) {
		super(options);
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

	public static from(raw: CCRaw, ctx: CCParsingContext): AssociationCCSet {
		validatePayload(raw.payload.length >= 2);
		const groupId = raw.payload[0];
		const nodeIds = [...raw.payload.subarray(1)];

		return new AssociationCCSet({
			nodeId: ctx.sourceNodeId,
			groupId,
			nodeIds,
		});
	}

	public groupId: number;
	public nodeIds: number[];

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.groupId, ...this.nodeIds]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"group id": this.groupId || "all groups",
			"node ids": this.nodeIds.length
				? this.nodeIds.join(", ")
				: "all nodes",
		};
		return {
			...super.toLogEntry(ctx),
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
		options: WithAddress<AssociationCCRemoveOptions>,
	) {
		super(options);
		// When removing associations, we allow invalid node IDs.
		// See GH#3606 - it is possible that those exist.
		this.groupId = options.groupId;
		this.nodeIds = options.nodeIds;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): AssociationCCRemove {
		validatePayload(raw.payload.length >= 1);

		let groupId: number | undefined;
		if (raw.payload[0] !== 0) {
			groupId = raw.payload[0];
		}
		const nodeIds = [...raw.payload.subarray(1)];

		return new AssociationCCRemove({
			nodeId: ctx.sourceNodeId,
			groupId,
			nodeIds,
		});
	}

	public groupId?: number;
	public nodeIds?: number[];

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.groupId || 0,
			...(this.nodeIds || []),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"group id": this.groupId || "all groups",
			"node ids": this.nodeIds && this.nodeIds.length
				? this.nodeIds.join(", ")
				: "all nodes",
		};
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface AssociationCCReportOptions {
	groupId: number;
	maxNodes: number;
	nodeIds: number[];
	reportsToFollow: number;
}

@CCCommand(AssociationCommand.Report)
export class AssociationCCReport extends AssociationCC {
	public constructor(
		options: WithAddress<AssociationCCReportOptions>,
	) {
		super(options);

		this.groupId = options.groupId;
		this.maxNodes = options.maxNodes;
		this.nodeIds = options.nodeIds;
		this.reportsToFollow = options.reportsToFollow;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): AssociationCCReport {
		validatePayload(raw.payload.length >= 3);
		const groupId = raw.payload[0];
		const maxNodes = raw.payload[1];
		const reportsToFollow = raw.payload[2];
		const nodeIds = [...raw.payload.subarray(3)];

		return new AssociationCCReport({
			nodeId: ctx.sourceNodeId,
			groupId,
			maxNodes,
			reportsToFollow,
			nodeIds,
		});
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
		partials: AssociationCCReport[],
		_ctx: CCParsingContext,
	): void {
		// Concat the list of nodes
		this.nodeIds = [...partials, this]
			.map((report) => report.nodeIds)
			.reduce((prev, cur) => prev.concat(...cur), []);
	}

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.groupId,
			this.maxNodes,
			this.reportsToFollow,
			...this.nodeIds,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
export interface AssociationCCGetOptions {
	groupId: number;
}

@CCCommand(AssociationCommand.Get)
@expectedCCResponse(AssociationCCReport)
export class AssociationCCGet extends AssociationCC {
	public constructor(
		options: WithAddress<AssociationCCGetOptions>,
	) {
		super(options);
		if (options.groupId < 1) {
			throw new ZWaveError(
				"The group id must be positive!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.groupId = options.groupId;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): AssociationCCGet {
		validatePayload(raw.payload.length >= 1);
		const groupId = raw.payload[0];

		return new AssociationCCGet({
			nodeId: ctx.sourceNodeId,
			groupId,
		});
	}

	public groupId: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.groupId]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "group id": this.groupId },
		};
	}
}

// @publicAPI
export interface AssociationCCSupportedGroupingsReportOptions {
	groupCount: number;
}

@CCCommand(AssociationCommand.SupportedGroupingsReport)
export class AssociationCCSupportedGroupingsReport extends AssociationCC {
	public constructor(
		options: WithAddress<AssociationCCSupportedGroupingsReportOptions>,
	) {
		super(options);

		this.groupCount = options.groupCount;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): AssociationCCSupportedGroupingsReport {
		validatePayload(raw.payload.length >= 1);
		const groupCount = raw.payload[0];

		return new AssociationCCSupportedGroupingsReport({
			nodeId: ctx.sourceNodeId,
			groupCount,
		});
	}

	@ccValue(AssociationCCValues.groupCount)
	public groupCount: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.groupCount]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
		options: WithAddress<AssociationCCSpecificGroupReportOptions>,
	) {
		super(options);

		this.group = options.group;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): AssociationCCSpecificGroupReport {
		validatePayload(raw.payload.length >= 1);
		const group = raw.payload[0];

		return new AssociationCCSpecificGroupReport({
			nodeId: ctx.sourceNodeId,
			group,
		});
	}

	public group: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.group]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { group: this.group },
		};
	}
}

@CCCommand(AssociationCommand.SpecificGroupGet)
@expectedCCResponse(AssociationCCSpecificGroupReport)
export class AssociationCCSpecificGroupGet extends AssociationCC {}
