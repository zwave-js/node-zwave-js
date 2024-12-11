import type {
	EndpointId,
	GetValueDB,
	MessageRecord,
	SupervisionResult,
	WithAddress,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	MAX_NODES,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	ZWaveError,
	ZWaveErrorCodes,
	encodeBitMask,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core/safe";
import type { CCEncodingContext, CCParsingContext } from "@zwave-js/host/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI, PhysicalCCAPI } from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type RefreshValuesContext,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValueProperty,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import {
	type AssociationAddress,
	type EndpointAddress,
	MultiChannelAssociationCommand,
} from "../lib/_Types.js";
import * as ccUtils from "../lib/utils.js";
import { AssociationCCValues } from "./AssociationCC.js";

export const MultiChannelAssociationCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Multi Channel Association"], {
		// number multi channel association groups
		...V.staticProperty("groupCount", undefined, { internal: true }),
	}),

	...V.defineDynamicCCValues(CommandClasses["Multi Channel Association"], {
		// maximum number of nodes of a multi channel association group
		...V.dynamicPropertyAndKeyWithName(
			"maxNodes",
			"maxNodes",
			(groupId: number) => groupId,
			({ property, propertyKey }) =>
				property === "maxNodes" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),

		// node IDs of a multi channel association group
		...V.dynamicPropertyAndKeyWithName(
			"nodeIds",
			"nodeIds",
			(groupId: number) => groupId,
			({ property, propertyKey }) =>
				property === "nodeIds" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),

		// Endpoint addresses of a multi channel association group
		...V.dynamicPropertyAndKeyWithName(
			"endpoints",
			"endpoints",
			(groupId: number) => groupId,
			({ property, propertyKey }) =>
				property === "endpoints" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
	}),
});

function endpointAddressesToString(
	endpoints: readonly EndpointAddress[],
): string {
	return endpoints
		.map(({ nodeId, endpoint }) => {
			if (typeof endpoint === "number") {
				return `${nodeId}:${endpoint}`;
			} else {
				return `${nodeId}:[${endpoint.map(String).join(", ")}]`;
			}
		})
		.join(", ");
}

const MULTI_CHANNEL_ASSOCIATION_MARKER = 0x00;

function serializeMultiChannelAssociationDestination(
	nodeIds: number[],
	endpoints: EndpointAddress[],
): Bytes {
	const nodeAddressBytes = nodeIds.length;
	const endpointAddressBytes = endpoints.length * 2;
	const payload = new Bytes(
		// node addresses
		nodeAddressBytes
			// endpoint marker
			+ (endpointAddressBytes > 0 ? 1 : 0)
			// endpoints
			+ endpointAddressBytes,
	);
	// write node addresses
	for (let i = 0; i < nodeIds.length; i++) {
		payload[i] = nodeIds[i];
	}
	// write endpoint addresses
	if (endpointAddressBytes > 0) {
		let offset = nodeIds.length;
		payload[offset] = MULTI_CHANNEL_ASSOCIATION_MARKER;
		offset += 1;
		for (let i = 0; i < endpoints.length; i++) {
			const endpoint = endpoints[i];
			const destination = typeof endpoint.endpoint === "number"
				// The destination is a single number
				? endpoint.endpoint & 0b0111_1111
				// The destination is a bit mask
				: encodeBitMask(endpoint.endpoint, 7)[0] | 0b1000_0000;

			payload[offset + 2 * i] = endpoint.nodeId;
			payload[offset + 2 * i + 1] = destination;
		}
	}
	return payload;
}

function deserializeMultiChannelAssociationDestination(data: Uint8Array): {
	nodeIds: number[];
	endpoints: EndpointAddress[];
} {
	const nodeIds: number[] = [];
	let endpointOffset = data.length;
	// Scan node ids until we find the marker
	for (let i = 0; i < data.length; i++) {
		if (data[i] === MULTI_CHANNEL_ASSOCIATION_MARKER) {
			endpointOffset = i + 1;
			break;
		}
		nodeIds.push(data[i]);
	}
	const endpoints: EndpointAddress[] = [];
	for (let i = endpointOffset; i < data.length; i += 2) {
		const nodeId = data[i];
		const isBitMask = !!(data[i + 1] & 0b1000_0000);
		const destination = data[i + 1] & 0b0111_1111;
		const endpoint = isBitMask
			? parseBitMask(Bytes.from([destination]))
			: destination;

		endpoints.push({ nodeId, endpoint });
	}

	return { nodeIds, endpoints };
}

// @noSetValueAPI

@API(CommandClasses["Multi Channel Association"])
export class MultiChannelAssociationCCAPI extends PhysicalCCAPI {
	public supportsCommand(
		cmd: MultiChannelAssociationCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case MultiChannelAssociationCommand.Get:
			case MultiChannelAssociationCommand.Set:
			case MultiChannelAssociationCommand.Report:
			case MultiChannelAssociationCommand.Remove:
			case MultiChannelAssociationCommand.SupportedGroupingsGet:
			case MultiChannelAssociationCommand.SupportedGroupingsReport:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	/**
	 * Returns the number of association groups a node supports.
	 * Association groups are consecutive, starting at 1.
	 */
	public async getGroupCount(): Promise<MaybeNotKnown<number>> {
		this.assertSupportsCommand(
			MultiChannelAssociationCommand,
			MultiChannelAssociationCommand.SupportedGroupingsGet,
		);

		const cc = new MultiChannelAssociationCCSupportedGroupingsGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			MultiChannelAssociationCCSupportedGroupingsReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.groupCount;
	}

	@validateArgs()
	public async reportGroupCount(groupCount: number): Promise<void> {
		this.assertSupportsCommand(
			MultiChannelAssociationCommand,
			MultiChannelAssociationCommand.SupportedGroupingsReport,
		);

		const cc = new MultiChannelAssociationCCSupportedGroupingsReport({
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
		this.assertSupportsCommand(
			MultiChannelAssociationCommand,
			MultiChannelAssociationCommand.Get,
		);

		const cc = new MultiChannelAssociationCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			groupId,
		});
		const response = await this.host.sendCommand<
			MultiChannelAssociationCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["maxNodes", "nodeIds", "endpoints"]);
		}
	}

	@validateArgs()
	public async sendReport(
		options: MultiChannelAssociationCCReportOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			MultiChannelAssociationCommand,
			MultiChannelAssociationCommand.Report,
		);

		const cc = new MultiChannelAssociationCCReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Adds new nodes or endpoints to an association group
	 */
	@validateArgs()
	public async addDestinations(
		options: MultiChannelAssociationCCSetOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			MultiChannelAssociationCommand,
			MultiChannelAssociationCommand.Set,
		);

		const cc = new MultiChannelAssociationCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			...options,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Removes nodes or endpoints from an association group
	 */
	@validateArgs()
	public async removeDestinations(
		options: MultiChannelAssociationCCRemoveOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			MultiChannelAssociationCommand,
			MultiChannelAssociationCommand.Remove,
		);

		if (!options.groupId && this.version === 1) {
			// V1 does not support omitting the group, manually remove the destination from all groups
			// We don't want to do too much work, so find out which groups the destination is in
			const currentDestinations = MultiChannelAssociationCC
				.getAllDestinationsCached(
					this.host,
					this.endpoint,
				);
			for (const [group, destinations] of currentDestinations) {
				const cc = new MultiChannelAssociationCCRemove({
					nodeId: this.endpoint.nodeId,
					endpointIndex: this.endpoint.index,
					groupId: group,
					nodeIds: destinations
						.filter((d) => d.endpoint != undefined)
						.map((d) => d.nodeId),
					endpoints: destinations.filter(
						(d): d is AssociationAddress & { endpoint: number } =>
							d.endpoint != undefined,
					),
				});
				// TODO: evaluate intermediate supervision results
				await this.host.sendCommand(cc, this.commandOptions);
			}
		} else if (options.groupId && options.groupId < 0) {
			throw new ZWaveError(
				"The group id must not be negative!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else {
			const cc = new MultiChannelAssociationCCRemove({
				nodeId: this.endpoint.nodeId,
				endpointIndex: this.endpoint.index,
				...options,
			});
			return this.host.sendCommand(cc, this.commandOptions);
		}
	}
}

@commandClass(CommandClasses["Multi Channel Association"])
@implementedVersion(5)
@ccValues(MultiChannelAssociationCCValues)
export class MultiChannelAssociationCC extends CommandClass {
	declare ccCommand: MultiChannelAssociationCommand;

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		// MultiChannelAssociationCC must be interviewed after Z-Wave+ if that is supported
		return [
			...super.determineRequiredCCInterviews(),
			CommandClasses["Z-Wave Plus Info"],
			// We need information about endpoints to correctly configure the lifeline associations
			CommandClasses["Multi Channel"],
			// AssociationCC will short-circuit if this CC is supported
			CommandClasses.Association,
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
				MultiChannelAssociationCCValues.groupCount.endpoint(
					endpoint.index,
				),
			) || 0;
	}

	/**
	 * Returns the number of nodes an association group supports.
	 * This only works AFTER the interview process
	 */
	public static getMaxNodesCached(
		ctx: GetValueDB,
		endpoint: EndpointId,
		groupId: number,
	): number {
		return ctx
			.getValueDB(endpoint.nodeId)
			.getValue(
				MultiChannelAssociationCCValues.maxNodes(groupId).endpoint(
					endpoint.index,
				),
			) ?? 0;
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
			const groupDestinations: AssociationAddress[] = [];
			// Add all node destinations
			const nodes = valueDB.getValue<number[]>(
				MultiChannelAssociationCCValues.nodeIds(i).endpoint(
					endpoint.index,
				),
			) ?? [];
			groupDestinations.push(...nodes.map((nodeId) => ({ nodeId })));
			// And all endpoint destinations
			const endpoints = valueDB.getValue<EndpointAddress[]>(
				MultiChannelAssociationCCValues.endpoints(i).endpoint(
					endpoint.index,
				),
			) ?? [];
			for (const ep of endpoints) {
				if (typeof ep.endpoint === "number") {
					groupDestinations.push({
						nodeId: ep.nodeId,
						endpoint: ep.endpoint,
					});
				} else {
					groupDestinations.push(
						...ep.endpoint.map((e) => ({
							nodeId: ep.nodeId,
							endpoint: e,
						})),
					);
				}
			}
			ret.set(
				i,
				// Filter out duplicates
				groupDestinations.filter(
					(addr, index) =>
						index
							=== groupDestinations.findIndex(
								({ nodeId, endpoint }) =>
									nodeId === addr.nodeId
									&& endpoint === addr.endpoint,
							),
				),
			);
		}
		return ret;
	}

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const mcAPI = CCAPI.create(
			CommandClasses["Multi Channel Association"],
			ctx,
			endpoint,
		);

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// First find out how many groups are supported as multi channel
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying number of multi channel association groups...",
			direction: "outbound",
		});
		const mcGroupCount = await mcAPI.getGroupCount();
		if (mcGroupCount != undefined) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`supports ${mcGroupCount} multi channel association groups`,
				direction: "inbound",
			});
		} else {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying multi channel association groups timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		// Query each association group for its members
		await this.refreshValues(ctx);

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
		const mcAPI = CCAPI.create(
			CommandClasses["Multi Channel Association"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const assocAPI = CCAPI.create(
			CommandClasses.Association,
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const mcGroupCount: number = this.getValue(
			ctx,
			MultiChannelAssociationCCValues.groupCount,
		) ?? 0;

		// Some devices report more association groups than multi channel association groups, so we need this info here
		const assocGroupCount: number =
			this.getValue(ctx, AssociationCCValues.groupCount)
			|| mcGroupCount;

		// Then query each multi channel association group
		for (let groupId = 1; groupId <= mcGroupCount; groupId++) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`querying multi channel association group #${groupId}...`,
				direction: "outbound",
			});
			const group = await mcAPI.getGroup(groupId);
			if (!group) continue;
			const logMessage =
				`received information for multi channel association group #${groupId}:
maximum # of nodes:           ${group.maxNodes}
currently assigned nodes:     ${group.nodeIds.map(String).join(", ")}
currently assigned endpoints: ${
					group.endpoints
						.map(({ nodeId, endpoint }) => {
							if (typeof endpoint === "number") {
								return `${nodeId}:${endpoint}`;
							} else {
								return `${nodeId}:[${
									endpoint.map(String).join(", ")
								}]`;
							}
						})
						.join("")
				}`;
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		// Check if there are more non-multi-channel association groups we haven't queried yet
		if (assocAPI.isSupported() && assocGroupCount > mcGroupCount) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`querying additional non-multi-channel association groups...`,
				direction: "outbound",
			});
			for (
				let groupId = mcGroupCount + 1;
				groupId <= assocGroupCount;
				groupId++
			) {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying association group #${groupId}...`,
					direction: "outbound",
				});
				const group = await assocAPI.getGroup(groupId);
				if (!group) continue;
				const logMessage =
					`received information for association group #${groupId}:
maximum # of nodes:           ${group.maxNodes}
currently assigned nodes:     ${group.nodeIds.map(String).join(", ")}`;
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
export type MultiChannelAssociationCCSetOptions =
	& {
		groupId: number;
	}
	& (
		| { nodeIds: number[] }
		| { endpoints: EndpointAddress[] }
		| { nodeIds: number[]; endpoints: EndpointAddress[] }
	);

@CCCommand(MultiChannelAssociationCommand.Set)
@useSupervision()
export class MultiChannelAssociationCCSet extends MultiChannelAssociationCC {
	public constructor(
		options: WithAddress<MultiChannelAssociationCCSetOptions>,
	) {
		super(options);
		if (options.groupId < 1) {
			throw new ZWaveError(
				"The group id must be positive!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.groupId = options.groupId;
		this.nodeIds = ("nodeIds" in options && options.nodeIds) || [];
		if (this.nodeIds.some((n) => n < 1 || n > MAX_NODES)) {
			throw new ZWaveError(
				`All node IDs must be between 1 and ${MAX_NODES}!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.endpoints = ("endpoints" in options && options.endpoints)
			|| [];
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelAssociationCCSet {
		validatePayload(raw.payload.length >= 1);
		const groupId = raw.payload[0];

		const { nodeIds, endpoints } =
			deserializeMultiChannelAssociationDestination(
				raw.payload.subarray(1),
			);

		return new this({
			nodeId: ctx.sourceNodeId,
			groupId,
			nodeIds,
			endpoints,
		});
	}

	public groupId: number;
	public nodeIds: number[];
	public endpoints: EndpointAddress[];

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.concat([
			Bytes.from([this.groupId]),
			serializeMultiChannelAssociationDestination(
				this.nodeIds,
				this.endpoints,
			),
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"group id": this.groupId,
				"node ids": this.nodeIds.join(", "),
				endpoints: endpointAddressesToString(this.endpoints),
			},
		};
	}
}

// @publicAPI
export interface MultiChannelAssociationCCRemoveOptions {
	/** The group from which to remove the nodes. If none is specified, the nodes will be removed from all groups. */
	groupId?: number;
	/** The nodes to remove. If no nodeIds and no endpoint addresses are specified, ALL nodes will be removed. */
	nodeIds?: number[];
	/** The single endpoints to remove. If no nodeIds and no endpoint addresses are specified, ALL will be removed. */
	endpoints?: EndpointAddress[];
}

@CCCommand(MultiChannelAssociationCommand.Remove)
@useSupervision()
export class MultiChannelAssociationCCRemove extends MultiChannelAssociationCC {
	public constructor(
		options: WithAddress<MultiChannelAssociationCCRemoveOptions>,
	) {
		super(options);
		// When removing associations, we allow invalid node IDs.
		// See GH#3606 - it is possible that those exist.
		this.groupId = options.groupId;
		this.nodeIds = options.nodeIds;
		this.endpoints = options.endpoints;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelAssociationCCRemove {
		validatePayload(raw.payload.length >= 1);
		const groupId: number | undefined = raw.payload[0];

		const { nodeIds, endpoints } =
			deserializeMultiChannelAssociationDestination(
				raw.payload.subarray(1),
			);

		return new this({
			nodeId: ctx.sourceNodeId,
			groupId,
			nodeIds,
			endpoints,
		});
	}

	public groupId?: number;
	public nodeIds?: number[];
	public endpoints?: EndpointAddress[];

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.concat([
			Bytes.from([this.groupId || 0]),
			serializeMultiChannelAssociationDestination(
				this.nodeIds || [],
				this.endpoints || [],
			),
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"group id": this.groupId || "(all groups)",
		};
		if (this.nodeIds) {
			message["node ids"] = this.nodeIds.join(", ");
		}
		if (this.endpoints) {
			message.endpoints = endpointAddressesToString(this.endpoints);
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface MultiChannelAssociationCCReportOptions {
	groupId: number;
	maxNodes: number;
	nodeIds: number[];
	endpoints: EndpointAddress[];
	reportsToFollow: number;
}

@CCCommand(MultiChannelAssociationCommand.Report)
@ccValueProperty(
	"maxNodes",
	MultiChannelAssociationCCValues.maxNodes,
	(self) => [self.groupId],
)
@ccValueProperty(
	"nodeIds",
	MultiChannelAssociationCCValues.nodeIds,
	(self) => [self.groupId],
)
@ccValueProperty(
	"endpoints",
	MultiChannelAssociationCCValues.endpoints,
	(self) => [self.groupId],
)
export class MultiChannelAssociationCCReport extends MultiChannelAssociationCC {
	public constructor(
		options: WithAddress<MultiChannelAssociationCCReportOptions>,
	) {
		super(options);

		this.groupId = options.groupId;
		this.maxNodes = options.maxNodes;
		this.nodeIds = options.nodeIds;
		this.endpoints = options.endpoints;
		this.reportsToFollow = options.reportsToFollow;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelAssociationCCReport {
		validatePayload(raw.payload.length >= 3);
		const groupId = raw.payload[0];
		const maxNodes = raw.payload[1];
		const reportsToFollow = raw.payload[2];

		const { nodeIds, endpoints } =
			deserializeMultiChannelAssociationDestination(
				raw.payload.subarray(3),
			);

		return new this({
			nodeId: ctx.sourceNodeId,
			groupId,
			maxNodes,
			nodeIds,
			endpoints,
			reportsToFollow,
		});
	}

	public readonly groupId: number;

	public maxNodes: number;

	public nodeIds: number[];

	public endpoints: EndpointAddress[];

	public reportsToFollow: number;

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Distinguish sessions by the association group ID
		return { groupId: this.groupId };
	}

	public expectMoreMessages(): boolean {
		return this.reportsToFollow > 0;
	}

	/** @deprecated Use {@link mergePartialCCsAsync} instead */
	public mergePartialCCs(
		partials: MultiChannelAssociationCCReport[],
		_ctx: CCParsingContext,
	): void {
		// Concat the list of nodes
		this.nodeIds = [...partials, this]
			.map((report) => [...report.nodeIds])
			.reduce((prev, cur) => prev.concat(...cur), []);
		// Concat the list of endpoints
		this.endpoints = [...partials, this]
			.map((report) => [...report.endpoints])
			.reduce((prev, cur) => prev.concat(...cur), []);
	}

	public mergePartialCCsAsync(
		partials: MultiChannelAssociationCCReport[],
		_ctx: CCParsingContext,
	): Promise<void> {
		// Concat the list of nodes
		this.nodeIds = [...partials, this]
			.map((report) => [...report.nodeIds])
			.reduce((prev, cur) => prev.concat(...cur), []);
		// Concat the list of endpoints
		this.endpoints = [...partials, this]
			.map((report) => [...report.endpoints])
			.reduce((prev, cur) => prev.concat(...cur), []);
		return Promise.resolve();
	}

	public serialize(ctx: CCEncodingContext): Bytes {
		const destinations = serializeMultiChannelAssociationDestination(
			this.nodeIds,
			this.endpoints,
		);
		this.payload = Bytes.concat([
			Bytes.from([
				this.groupId,
				this.maxNodes,
				this.reportsToFollow,
			]),
			destinations,
		]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"group id": this.groupId,
				"maximum # of nodes": this.maxNodes,
				"node ids": this.nodeIds.join(", "),
				endpoints: endpointAddressesToString(this.endpoints),
			},
		};
	}
}

// @publicAPI
export interface MultiChannelAssociationCCGetOptions {
	groupId: number;
}

@CCCommand(MultiChannelAssociationCommand.Get)
@expectedCCResponse(MultiChannelAssociationCCReport)
export class MultiChannelAssociationCCGet extends MultiChannelAssociationCC {
	public constructor(
		options: WithAddress<MultiChannelAssociationCCGetOptions>,
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

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelAssociationCCGet {
		validatePayload(raw.payload.length >= 1);
		const groupId = raw.payload[0];

		return new this({
			nodeId: ctx.sourceNodeId,
			groupId,
		});
	}

	public groupId: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.groupId]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
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
export interface MultiChannelAssociationCCSupportedGroupingsReportOptions {
	groupCount: number;
}

@CCCommand(MultiChannelAssociationCommand.SupportedGroupingsReport)
@ccValueProperty("groupCount", MultiChannelAssociationCCValues.groupCount)
export class MultiChannelAssociationCCSupportedGroupingsReport
	extends MultiChannelAssociationCC
{
	public constructor(
		options: WithAddress<
			MultiChannelAssociationCCSupportedGroupingsReportOptions
		>,
	) {
		super(options);

		this.groupCount = options.groupCount;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): MultiChannelAssociationCCSupportedGroupingsReport {
		validatePayload(raw.payload.length >= 1);
		const groupCount = raw.payload[0];

		return new this({
			nodeId: ctx.sourceNodeId,
			groupCount,
		});
	}

	public readonly groupCount: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.groupCount]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "group count": this.groupCount },
		};
	}
}

@CCCommand(MultiChannelAssociationCommand.SupportedGroupingsGet)
@expectedCCResponse(MultiChannelAssociationCCSupportedGroupingsReport)
export class MultiChannelAssociationCCSupportedGroupingsGet
	extends MultiChannelAssociationCC
{}
