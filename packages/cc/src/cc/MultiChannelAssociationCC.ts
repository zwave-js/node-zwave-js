import type {
	IZWaveEndpoint,
	MessageRecord,
	SupervisionResult,
} from "@zwave-js/core/safe";
import {
	CommandClasses,
	encodeBitMask,
	MAX_NODES,
	Maybe,
	MessageOrCCLogEntry,
	MessagePriority,
	parseBitMask,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
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
	useSupervision,
} from "../lib/CommandClassDecorators";
import * as ccUtils from "../lib/utils";
import { V } from "../lib/Values";
import {
	AssociationAddress,
	EndpointAddress,
	MultiChannelAssociationCommand,
} from "../lib/_Types";
import { AssociationCCValues } from "./AssociationCC";

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
): Buffer {
	const nodeAddressBytes = nodeIds.length;
	const endpointAddressBytes = endpoints.length * 2;
	const payload = Buffer.allocUnsafe(
		// node addresses
		nodeAddressBytes +
			// endpoint marker
			(endpointAddressBytes > 0 ? 1 : 0) +
			// endpoints
			endpointAddressBytes,
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
			const destination =
				typeof endpoint.endpoint === "number"
					? // The destination is a single number
					  endpoint.endpoint & 0b0111_1111
					: // The destination is a bit mask
					  encodeBitMask(endpoint.endpoint, 7)[0] | 0b1000_0000;

			payload[offset + 2 * i] = endpoint.nodeId;
			payload[offset + 2 * i + 1] = destination;
		}
	}
	return payload;
}

function deserializeMultiChannelAssociationDestination(data: Buffer): {
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
			? parseBitMask(Buffer.from([destination]))
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
	): Maybe<boolean> {
		switch (cmd) {
			case MultiChannelAssociationCommand.Get:
			case MultiChannelAssociationCommand.Set:
			case MultiChannelAssociationCommand.Remove:
			case MultiChannelAssociationCommand.SupportedGroupingsGet:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	/**
	 * Returns the number of association groups a node supports.
	 * Association groups are consecutive, starting at 1.
	 */
	public async getGroupCount(): Promise<number | undefined> {
		this.assertSupportsCommand(
			MultiChannelAssociationCommand,
			MultiChannelAssociationCommand.SupportedGroupingsGet,
			nameof(MultiChannelAssociationCommand),
		);

		const cc = new MultiChannelAssociationCCSupportedGroupingsGet(
			this.applHost,
			{
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
			},
		);
		const response =
			await this.applHost.sendCommand<MultiChannelAssociationCCSupportedGroupingsReport>(
				cc,
				this.commandOptions,
			);
		return response?.groupCount;
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
			nameof(MultiChannelAssociationCommand),
		);

		const cc = new MultiChannelAssociationCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
		});
		const response =
			await this.applHost.sendCommand<MultiChannelAssociationCCReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, ["maxNodes", "nodeIds", "endpoints"]);
		}
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
			nameof(MultiChannelAssociationCommand),
		);

		const cc = new MultiChannelAssociationCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
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
			nameof(MultiChannelAssociationCommand),
		);

		if (!options.groupId && this.version === 1) {
			// V1 does not support omitting the group, manually remove the destination from all groups
			// We don't want to do too much work, so find out which groups the destination is in
			const currentDestinations =
				MultiChannelAssociationCC.getAllDestinationsCached(
					this.applHost,
					this.endpoint,
				);
			for (const [group, destinations] of currentDestinations) {
				const cc = new MultiChannelAssociationCCRemove(this.applHost, {
					nodeId: this.endpoint.nodeId,
					endpoint: this.endpoint.index,
					groupId: group,
					nodeIds: destinations
						.filter((d) => !d.endpoint)
						.map((d) => d.nodeId),
					endpoints: destinations.filter(
						(d): d is AssociationAddress & { endpoint: number } =>
							!!d.endpoint,
					),
				});
				// TODO: evaluate intermediate supervision results
				await this.applHost.sendCommand(cc, this.commandOptions);
			}
		} else {
			const cc = new MultiChannelAssociationCCRemove(this.applHost, {
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
				...options,
			});
			return this.applHost.sendCommand(cc, this.commandOptions);
		}
	}
}

@commandClass(CommandClasses["Multi Channel Association"])
@implementedVersion(4)
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
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): number {
		return (
			applHost
				.getValueDB(endpoint.nodeId)
				.getValue(
					MultiChannelAssociationCCValues.groupCount.endpoint(
						endpoint.index,
					),
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
					MultiChannelAssociationCCValues.maxNodes(groupId).endpoint(
						endpoint.index,
					),
				) ?? 0
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
			const groupDestinations: AssociationAddress[] = [];
			// Add all node destinations
			const nodes =
				valueDB.getValue<number[]>(
					MultiChannelAssociationCCValues.nodeIds(i).endpoint(
						endpoint.index,
					),
				) ?? [];
			groupDestinations.push(...nodes.map((nodeId) => ({ nodeId })));
			// And all endpoint destinations
			const endpoints =
				valueDB.getValue<EndpointAddress[]>(
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
						index ===
						groupDestinations.findIndex(
							({ nodeId, endpoint }) =>
								nodeId === addr.nodeId &&
								endpoint === addr.endpoint,
						),
				),
			);
		}
		return ret;
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const mcAPI = CCAPI.create(
			CommandClasses["Multi Channel Association"],
			applHost,
			endpoint,
		);

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// First find out how many groups are supported as multi channel
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying number of multi channel association groups...",
			direction: "outbound",
		});
		const mcGroupCount = await mcAPI.getGroupCount();
		if (mcGroupCount != undefined) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `supports ${mcGroupCount} multi channel association groups`,
				direction: "inbound",
			});
		} else {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying multi channel association groups timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		// Query each association group for its members
		await this.refreshValues(applHost);

		// And set up lifeline associations
		await ccUtils.configureLifelineAssociations(applHost, endpoint);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const mcAPI = CCAPI.create(
			CommandClasses["Multi Channel Association"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const assocAPI = CCAPI.create(
			CommandClasses.Association,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const mcGroupCount: number =
			this.getValue(
				applHost,
				MultiChannelAssociationCCValues.groupCount,
			) ?? 0;

		// Some devices report more association groups than multi channel association groups, so we need this info here
		const assocGroupCount: number =
			this.getValue(applHost, AssociationCCValues.groupCount) ||
			mcGroupCount;

		// Then query each multi channel association group
		for (let groupId = 1; groupId <= mcGroupCount; groupId++) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying multi channel association group #${groupId}...`,
				direction: "outbound",
			});
			const group = await mcAPI.getGroup(groupId);
			if (!group) continue;
			const logMessage = `received information for multi channel association group #${groupId}:
maximum # of nodes:           ${group.maxNodes}
currently assigned nodes:     ${group.nodeIds.map(String).join(", ")}
currently assigned endpoints: ${group.endpoints
				.map(({ nodeId, endpoint }) => {
					if (typeof endpoint === "number") {
						return `${nodeId}:${endpoint}`;
					} else {
						return `${nodeId}:[${endpoint.map(String).join(", ")}]`;
					}
				})
				.join("")}`;
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		// Check if there are more non-multi-channel association groups we haven't queried yet
		if (assocAPI.isSupported() && assocGroupCount > mcGroupCount) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying additional non-multi-channel association groups...`,
				direction: "outbound",
			});
			for (
				let groupId = mcGroupCount + 1;
				groupId <= assocGroupCount;
				groupId++
			) {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying association group #${groupId}...`,
					direction: "outbound",
				});
				const group = await assocAPI.getGroup(groupId);
				if (!group) continue;
				const logMessage = `received information for association group #${groupId}:
maximum # of nodes:           ${group.maxNodes}
currently assigned nodes:     ${group.nodeIds.map(String).join(", ")}`;
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}
	}
}

type MultiChannelAssociationCCSetOptions = {
	groupId: number;
} & (
	| { nodeIds: number[] }
	| { endpoints: EndpointAddress[] }
	| { nodeIds: number[]; endpoints: EndpointAddress[] }
);

@CCCommand(MultiChannelAssociationCommand.Set)
@useSupervision()
export class MultiChannelAssociationCCSet extends MultiChannelAssociationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (MultiChannelAssociationCCSetOptions & CCCommandOptions),
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
			this.nodeIds = ("nodeIds" in options && options.nodeIds) || [];
			if (this.nodeIds.some((n) => n < 1 || n > MAX_NODES)) {
				throw new ZWaveError(
					`All node IDs must be between 1 and ${MAX_NODES}!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.endpoints =
				("endpoints" in options && options.endpoints) || [];
		}
	}

	public groupId: number;
	public nodeIds: number[];
	public endpoints: EndpointAddress[];

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.groupId]),
			serializeMultiChannelAssociationDestination(
				this.nodeIds,
				this.endpoints,
			),
		]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"group id": this.groupId,
				"node ids": this.nodeIds.join(", "),
				endpoints: endpointAddressesToString(this.endpoints),
			},
		};
	}
}

interface MultiChannelAssociationCCRemoveOptions {
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (MultiChannelAssociationCCRemoveOptions & CCCommandOptions),
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
						} only supports MultiChannelAssociationCC V1 which requires the group Id to be set`,
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
			this.endpoints = options.endpoints;
		}
	}

	public groupId?: number;
	public nodeIds?: number[];
	public endpoints?: EndpointAddress[];

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.groupId || 0]),
			serializeMultiChannelAssociationDestination(
				this.nodeIds || [],
				this.endpoints || [],
			),
		]);
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = { "group id": this.groupId };
		if (this.nodeIds) {
			message["node ids"] = this.nodeIds.join(", ");
		}
		if (this.endpoints) {
			message.endpoints = endpointAddressesToString(this.endpoints);
		}
		return {
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(MultiChannelAssociationCommand.Report)
export class MultiChannelAssociationCCReport extends MultiChannelAssociationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 3);
		this.groupId = this.payload[0];
		this.maxNodes = this.payload[1];
		this.reportsToFollow = this.payload[2];
		({ nodeIds: this._nodeIds, endpoints: this._endpoints } =
			deserializeMultiChannelAssociationDestination(
				this.payload.slice(3),
			));
	}

	public readonly groupId: number;

	@ccValue(
		MultiChannelAssociationCCValues.maxNodes,
		(self: MultiChannelAssociationCCReport) => [self.groupId] as const,
	)
	public readonly maxNodes: number;

	private _nodeIds: number[];
	@ccValue(
		MultiChannelAssociationCCValues.nodeIds,
		(self: MultiChannelAssociationCCReport) => [self.groupId] as const,
	)
	public get nodeIds(): readonly number[] {
		return this._nodeIds;
	}

	private _endpoints: EndpointAddress[];
	@ccValue(
		MultiChannelAssociationCCValues.endpoints,
		(self: MultiChannelAssociationCCReport) => [self.groupId] as const,
	)
	public get endpoints(): readonly EndpointAddress[] {
		return this._endpoints;
	}

	public readonly reportsToFollow: number;

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Distinguish sessions by the association group ID
		return { groupId: this.groupId };
	}

	public expectMoreMessages(): boolean {
		return this.reportsToFollow > 0;
	}

	public mergePartialCCs(
		applHost: ZWaveApplicationHost,
		partials: MultiChannelAssociationCCReport[],
	): void {
		// Concat the list of nodes
		this._nodeIds = [...partials, this]
			.map((report) => [...report.nodeIds])
			.reduce((prev, cur) => prev.concat(...cur), []);
		// Concat the list of endpoints
		this._endpoints = [...partials, this]
			.map((report) => [...report.endpoints])
			.reduce((prev, cur) => prev.concat(...cur), []);
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"group id": this.groupId,
				"maximum # of nodes": this.maxNodes,
				"node ids": this.nodeIds.join(", "),
				endpoints: endpointAddressesToString(this.endpoints),
			},
		};
	}
}

interface MultiChannelAssociationCCGetOptions extends CCCommandOptions {
	groupId: number;
}

@CCCommand(MultiChannelAssociationCommand.Get)
@expectedCCResponse(MultiChannelAssociationCCReport)
export class MultiChannelAssociationCCGet extends MultiChannelAssociationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelAssociationCCGetOptions,
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

@CCCommand(MultiChannelAssociationCommand.SupportedGroupingsReport)
export class MultiChannelAssociationCCSupportedGroupingsReport extends MultiChannelAssociationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this.groupCount = this.payload[0];
	}

	@ccValue(MultiChannelAssociationCCValues.groupCount)
	public readonly groupCount: number;

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { "group count": this.groupCount },
		};
	}
}

@CCCommand(MultiChannelAssociationCommand.SupportedGroupingsGet)
@expectedCCResponse(MultiChannelAssociationCCSupportedGroupingsReport)
export class MultiChannelAssociationCCSupportedGroupingsGet extends MultiChannelAssociationCC {}
