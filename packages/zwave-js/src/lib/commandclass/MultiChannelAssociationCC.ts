import type { MessageRecord, ValueID } from "@zwave-js/core";
import {
	CommandClasses,
	encodeBitMask,
	MAX_NODES,
	Maybe,
	MessageOrCCLogEntry,
	parseBitMask,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveEndpointBase, ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import type { Driver } from "../driver/Driver";
import { PhysicalCCAPI } from "./API";
import { getGroupCountValueId as getAssociationGroupCountValueId } from "./AssociationCC";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	CommandClassOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import {
	AssociationAddress,
	EndpointAddress,
	MultiChannelAssociationCommand,
} from "./_Types";

/** Returns the ValueID used to store the maximum number of nodes of an association group */
export function getMaxNodesValueId(
	endpointIndex: number,
	groupId: number,
): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel Association"],
		endpoint: endpointIndex,
		property: "maxNodes",
		propertyKey: groupId,
	};
}

/** Returns the ValueID used to store the node IDs of a multi channel association group */
export function getNodeIdsValueId(
	endpointIndex: number,
	groupId: number,
): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel Association"],
		endpoint: endpointIndex,
		property: "nodeIds",
		propertyKey: groupId,
	};
}

/** Returns the ValueID used to store the endpoint addresses of a multi channel association group */
export function getEndpointsValueId(
	endpointIndex: number,
	groupId: number,
): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel Association"],
		endpoint: endpointIndex,
		property: "endpoints",
		propertyKey: groupId,
	};
}

/** Returns the ValueID used to store the number of multi channel association group */
export function getGroupCountValueId(endpointIndex: number): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel Association"],
		endpoint: endpointIndex,
		property: "groupCount",
	};
}

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
		);

		const cc = new MultiChannelAssociationCCSupportedGroupingsGet(
			this.driver,
			{
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
			},
		);
		const response =
			await this.driver.sendCommand<MultiChannelAssociationCCSupportedGroupingsReport>(
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
		);

		const cc = new MultiChannelAssociationCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
		});
		const response =
			await this.driver.sendCommand<MultiChannelAssociationCCReport>(
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
	): Promise<void> {
		this.assertSupportsCommand(
			MultiChannelAssociationCommand,
			MultiChannelAssociationCommand.Set,
		);

		const cc = new MultiChannelAssociationCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Removes nodes or endpoints from an association group
	 */
	@validateArgs()
	public async removeDestinations(
		options: MultiChannelAssociationCCRemoveOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			MultiChannelAssociationCommand,
			MultiChannelAssociationCommand.Remove,
		);

		if (!options.groupId && this.version === 1) {
			// V1 does not support omitting the group, manually remove the destination from all groups
			// We don't want to do too much work, so find out which groups the destination is in
			const currentDestinations =
				MultiChannelAssociationCC.getAllDestinationsCached(
					this.driver,
					this.endpoint,
				);
			for (const [group, destinations] of currentDestinations) {
				const cc = new MultiChannelAssociationCCRemove(this.driver, {
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
				await this.driver.sendCommand(cc, this.commandOptions);
			}
		} else {
			const cc = new MultiChannelAssociationCCRemove(this.driver, {
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
				...options,
			});
			await this.driver.sendCommand(cc, this.commandOptions);
		}
	}
}

@commandClass(CommandClasses["Multi Channel Association"])
@implementedVersion(4)
export class MultiChannelAssociationCC extends CommandClass {
	declare ccCommand: MultiChannelAssociationCommand;

	public constructor(host: ZWaveHost, options: CommandClassOptions) {
		super(host, options);
		// Make valueIDs internal
		this.registerValue(getMaxNodesValueId(0, 0).property, {
			internal: true,
		});
		this.registerValue(getNodeIdsValueId(0, 0).property, {
			internal: true,
		});
		this.registerValue(getEndpointsValueId(0, 0).property, {
			internal: true,
		});
	}

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
		host: ZWaveHost,
		endpoint: ZWaveEndpointBase,
	): number {
		return (
			host
				.getValueDB(endpoint.nodeId)
				.getValue(getGroupCountValueId(endpoint.index)) || 0
		);
	}

	/**
	 * Returns the number of nodes an association group supports.
	 * This only works AFTER the interview process
	 */
	public static getMaxNodesCached(
		host: ZWaveHost,
		endpoint: ZWaveEndpointBase,
		groupId: number,
	): number {
		return (
			host
				.getValueDB(endpoint.nodeId)
				.getValue(getMaxNodesValueId(endpoint.index, groupId)) ?? 0
		);
	}

	/**
	 * Returns all the destinations of all association groups reported by the node/endpoint.
	 * This only works AFTER the interview process
	 */
	public static getAllDestinationsCached(
		host: ZWaveHost,
		endpoint: ZWaveEndpointBase,
	): ReadonlyMap<number, readonly AssociationAddress[]> {
		const ret = new Map<number, AssociationAddress[]>();
		const groupCount = this.getGroupCountCached(host, endpoint);
		const valueDB = host.getValueDB(endpoint.nodeId)!;
		for (let i = 1; i <= groupCount; i++) {
			const groupDestinations: AssociationAddress[] = [];
			// Add all node destinations
			const nodes =
				valueDB.getValue<number[]>(
					getNodeIdsValueId(endpoint.index, i),
				) ?? [];
			groupDestinations.push(...nodes.map((nodeId) => ({ nodeId })));
			// And all endpoint destinations
			const endpoints =
				valueDB.getValue<EndpointAddress[]>(
					getEndpointsValueId(endpoint.index, i),
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

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const mcAPI = endpoint.commandClasses["Multi Channel Association"];

		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// First find out how many groups are supported as multi channel
		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying number of multi channel association groups...",
			direction: "outbound",
		});
		const mcGroupCount = await mcAPI.getGroupCount();
		if (mcGroupCount != undefined) {
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `supports ${mcGroupCount} multi channel association groups`,
				direction: "inbound",
			});
		} else {
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying multi channel association groups timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		// Query each association group for its members
		await this.refreshValues(driver);

		// And set up lifeline associations
		await endpoint.configureLifelineAssociations();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const mcAPI = endpoint.commandClasses[
			"Multi Channel Association"
		].withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const assocAPI = endpoint.commandClasses.Association.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const mcGroupCount: number =
			this.getValueDB().getValue(
				getGroupCountValueId(this.endpointIndex),
			) ?? 0;

		// Some devices report more association groups than multi channel association groups, so we need this info here
		const assocGroupCount =
			this.getValueDB().getValue<number>(
				getAssociationGroupCountValueId(this.endpointIndex),
			) || mcGroupCount;

		// Then query each multi channel association group
		for (let groupId = 1; groupId <= mcGroupCount; groupId++) {
			driver.controllerLog.logNode(node.id, {
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
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		// Check if there are more non-multi-channel association groups we haven't queried yet
		if (assocAPI.isSupported() && assocGroupCount > mcGroupCount) {
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying additional non-multi-channel association groups...`,
				direction: "outbound",
			});
			for (
				let groupId = mcGroupCount + 1;
				groupId <= assocGroupCount;
				groupId++
			) {
				driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying association group #${groupId}...`,
					direction: "outbound",
				});
				const group = await assocAPI.getGroup(groupId);
				if (!group) continue;
				const logMessage = `received information for association group #${groupId}:
maximum # of nodes:           ${group.maxNodes}
currently assigned nodes:     ${group.nodeIds.map(String).join(", ")}`;
				driver.controllerLog.logNode(node.id, {
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = { "group id": this.groupId };
		if (this.nodeIds) {
			message["node ids"] = this.nodeIds.join(", ");
		}
		if (this.endpoints) {
			message.endpoints = endpointAddressesToString(this.endpoints);
		}
		return {
			...super.toLogEntry(),
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
		this._groupId = this.payload[0];
		this._maxNodes = this.payload[1];
		this._reportsToFollow = this.payload[2];
		({ nodeIds: this._nodeIds, endpoints: this._endpoints } =
			deserializeMultiChannelAssociationDestination(
				this.payload.slice(3),
			));
	}

	private _groupId: number;
	public get groupId(): number {
		return this._groupId;
	}

	private _maxNodes: number;
	public get maxNodes(): number {
		return this._maxNodes;
	}

	private _nodeIds: number[];
	public get nodeIds(): readonly number[] {
		return this._nodeIds;
	}

	private _endpoints: EndpointAddress[];
	public get endpoints(): readonly EndpointAddress[] {
		return this._endpoints;
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

	public mergePartialCCs(partials: MultiChannelAssociationCCReport[]): void {
		// Concat the list of nodes
		this._nodeIds = [...partials, this]
			.map((report) => report._nodeIds)
			.reduce((prev, cur) => prev.concat(...cur), []);
		// Concat the list of endpoints
		this._endpoints = [...partials, this]
			.map((report) => report._endpoints)
			.reduce((prev, cur) => prev.concat(...cur), []);

		// Persist values
		this.getValueDB().setValue(
			getMaxNodesValueId(this.endpointIndex, this._groupId),
			this._maxNodes,
		);
		this.getValueDB().setValue(
			getNodeIdsValueId(this.endpointIndex, this._groupId),
			this._nodeIds,
		);
		this.getValueDB().setValue(
			getEndpointsValueId(this.endpointIndex, this._groupId),
			this._endpoints,
		);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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
		this._groupCount = this.payload[0];

		this.persistValues();
	}

	private _groupCount: number;
	@ccValue({ internal: true })
	public get groupCount(): number {
		return this._groupCount;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "group count": this.groupCount },
		};
	}
}

@CCCommand(MultiChannelAssociationCommand.SupportedGroupingsGet)
@expectedCCResponse(MultiChannelAssociationCCSupportedGroupingsReport)
export class MultiChannelAssociationCCSupportedGroupingsGet extends MultiChannelAssociationCC {}
