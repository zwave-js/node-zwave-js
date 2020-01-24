import { MAX_NODES } from "../controller/NodeBitMask";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { ValueID } from "../node/ValueDB";
import { validatePayload } from "../util/misc";
import { encodeBitMask, Maybe, parseBitMask } from "../values/Primitive";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

/** Returns the ValueID used to store the maximum number of nodes of an association group */
export function getMaxNodesValueId(groupId: number): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel Association"],
		property: "maxNodes",
		propertyKey: groupId,
	};
}

/** Returns the ValueID used to store the node IDs of an association group */
export function getNodeIdsValueId(groupId: number): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel Association"],
		property: "nodeIds",
		propertyKey: groupId,
	};
}

/** Returns the ValueID used to store the endpoint addresses of an association group */
export function getEndpointsValueId(groupId: number): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel Association"],
		property: "endpoints",
		propertyKey: groupId,
	};
}

/** Returns the ValueID used to store the group count of an association group */
export function getGroupCountValueId(): ValueID {
	return {
		commandClass: CommandClasses["Multi Channel Association"],
		property: "groupCount",
	};
}

export type EndpointBitMask = (1 | 2 | 3 | 4 | 5 | 6 | 7)[];

export interface EndpointAddress {
	nodeId: number;
	endpoint: number | EndpointBitMask;
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

function deserializeMultiChannelAssociationDestination(
	data: Buffer,
): { nodeIds: number[]; endpoints: EndpointAddress[] } {
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
			? (parseBitMask(Buffer.from([destination])) as any)
			: destination;

		endpoints.push({ nodeId, endpoint });
	}

	return { nodeIds, endpoints };
}

// All the supported commands
export enum MultiChannelAssociationCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	Remove = 0x04,
	SupportedGroupingsGet = 0x05,
	SupportedGroupingsReport = 0x06,
}

// @noSetValueAPI

@API(CommandClasses["Multi Channel Association"])
export class MultiChannelAssociationCCAPI extends CCAPI {
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
	public async getGroupCount(): Promise<number> {
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
		const response = (await this.driver.sendCommand<
			MultiChannelAssociationCCSupportedGroupingsReport
		>(cc))!;
		return response.groupCount;
	}

	/**
	 * Returns information about an association group.
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
		const response = (await this.driver.sendCommand<
			MultiChannelAssociationCCReport
		>(cc))!;
		return {
			maxNodes: response.maxNodes,
			nodeIds: response.nodeIds,
			endpoints: response.endpoints,
		};
	}

	/**
	 * Adds new nodes or endpoints to an association group
	 */
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
		await this.driver.sendCommand(cc);
	}

	/**
	 * Removes nodes or endpoints from an association group
	 */
	public async removeDestinations(
		options: MultiChannelAssociationCCRemoveOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			MultiChannelAssociationCommand,
			MultiChannelAssociationCommand.Remove,
		);

		const cc = new MultiChannelAssociationCCRemove(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.driver.sendCommand(cc);
	}
}

@commandClass(CommandClasses["Multi Channel Association"])
@implementedVersion(4)
export class MultiChannelAssociationCC extends CommandClass {
	declare ccCommand: MultiChannelAssociationCommand;

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		// MultiChannelAssociationCC must be interviewed after Z-Wave+ if that is supported
		return [
			...super.determineRequiredCCInterviews(),
			CommandClasses["Z-Wave Plus Info"],
			// AssociationCC will short-circuit if this CC is supported
			CommandClasses.Association,
		];
	}

	public skipEndpointInterview(): boolean {
		// The associations are managed on the root device
		return true;
	}

	/**
	 * Returns the number of association groups reported by the node.
	 * This only works AFTER the interview process
	 */
	public getGroupCountCached(): number {
		return this.getValueDB().getValue(getGroupCountValueId()) || 0;
	}

	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Multi Channel Association"];

		log.controller.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		let groupCount: number;
		if (complete) {
			// First find out how many groups are supported
			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "querying number of association groups...",
				direction: "outbound",
			});
			groupCount = await api.getGroupCount();
			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `supports ${groupCount} association groups`,
				direction: "inbound",
			});
		} else {
			// Partial interview, read the information from cache
			groupCount =
				this.getValueDB().getValue(getGroupCountValueId()) || 0;
		}

		// Then query each association group
		for (let groupId = 1; groupId <= groupCount; groupId++) {
			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying association group #${groupId}...`,
				direction: "outbound",
			});
			const group = await api.getGroup(groupId);
			const logMessage = `received information for association group #${groupId}:
maximum # of nodes:           ${group.maxNodes}
currently assigned nodes:     ${group.nodeIds.map(String).join(", ")}
currently assigned endpoints: ${group.endpoints.map(({ nodeId, endpoint }) => {
				if (typeof endpoint === "number") {
					return `${nodeId}:${endpoint}`;
				} else {
					return `${nodeId}:[${endpoint.map(String).join(", ")}]`;
				}
			})}`;
			log.controller.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		// If the target node supports Z-Wave+ info that means the lifeline MUST be group #1
		if (node.supportsCC(CommandClasses["Z-Wave Plus Info"])) {
			// Check if we are already in the lifeline group
			const lifelineNodeIds: number[] =
				this.getValueDB().getValue(getNodeIdsValueId(1)) || [];
			const lifelineDestinations: EndpointAddress[] =
				this.getValueDB().getValue(getEndpointsValueId(1)) || [];
			const ownNodeId = this.driver.controller.ownNodeId!;
			if (
				!lifelineNodeIds.includes(ownNodeId) &&
				!lifelineDestinations.some(
					addr => addr.nodeId === ownNodeId && addr.endpoint === 0,
				)
			) {
				log.controller.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"supports Z-Wave+, assigning ourselves to the Lifeline group...",
					direction: "outbound",
				});
				if (this.version >= 3) {
					// Starting with V3, the endpoint address must be used
					await api.addDestinations({
						groupId: 1,
						endpoints: [{ nodeId: ownNodeId, endpoint: 0 }],
					});
				} else {
					await api.addDestinations({
						groupId: 1,
						nodeIds: [ownNodeId],
					});
				}
			}
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
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
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| (MultiChannelAssociationCCSetOptions & CCCommandOptions),
	) {
		super(driver, options);
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
			if (!this.nodeIds.every(n => n > 0 && n < MAX_NODES)) {
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
}

interface MultiChannelAssociationCCRemoveOptions {
	/** The group from which to remove the nodes. If none is specified, the nodes will be removed from all groups. */
	groupId?: number;
	/** The nodes to remove. If none are specified, ALL nodes will be removed. */
	nodeIds?: number[];
	/** The single endpoints to remove. If none are specified, ALL will be removed. */
	endpoints?: EndpointAddress[];
}

@CCCommand(MultiChannelAssociationCommand.Remove)
export class MultiChannelAssociationCCRemove extends MultiChannelAssociationCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| (MultiChannelAssociationCCRemoveOptions & CCCommandOptions),
	) {
		super(driver, options);
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
						`Node ${this.nodeId} only supports MultiChannelAssociationCC V1 which requires the group Id to be set`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
			} else if (options.groupId < 0) {
				throw new ZWaveError(
					"The group id must be positive!",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			if (options.nodeIds?.some(n => n < 1 || n > MAX_NODES)) {
				throw new ZWaveError(
					`All node IDs must be between 1 and ${MAX_NODES}!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
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
}

@CCCommand(MultiChannelAssociationCommand.Report)
export class MultiChannelAssociationCCReport extends MultiChannelAssociationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 3);
		this._groupId = this.payload[0];
		this._maxNodes = this.payload[1];
		this._reportsToFollow = this.payload[2];
		({
			nodeIds: this._nodeIds,
			endpoints: this._endpoints,
		} = deserializeMultiChannelAssociationDestination(
			this.payload.slice(3),
		));
	}

	private _groupId: number;
	public get groupId(): number {
		return this._groupId;
	}

	private _maxNodes: number;
	@ccValue({ internal: true })
	public get maxNodes(): number {
		return this._maxNodes;
	}

	private _nodeIds: number[];
	@ccValue({ internal: true })
	public get nodeIds(): readonly number[] {
		return this._nodeIds;
	}

	private _endpoints: EndpointAddress[];
	@ccValue({ internal: true })
	public get endpoints(): readonly EndpointAddress[] {
		return this._endpoints;
	}

	private _reportsToFollow: number;
	public get reportsToFollow(): number {
		return this._reportsToFollow;
	}

	public expectMoreMessages(): boolean {
		return this._reportsToFollow > 0;
	}

	public mergePartialCCs(partials: MultiChannelAssociationCCReport[]): void {
		// Concat the list of nodes
		this._nodeIds = [...partials, this]
			.map(report => report._nodeIds)
			.reduce((prev, cur) => prev.concat(...cur), []);
		// Concat the list of endpoints
		this._endpoints = [...partials, this]
			.map(report => report._endpoints)
			.reduce((prev, cur) => prev.concat(...cur), []);

		// Persist values
		this.getValueDB().setValue(
			getMaxNodesValueId(this._groupId),
			this._maxNodes,
		);
		this.getValueDB().setValue(
			getNodeIdsValueId(this._groupId),
			this._nodeIds,
		);
		this.getValueDB().setValue(
			getEndpointsValueId(this._groupId),
			this._endpoints,
		);
	}
}

interface MultiChannelAssociationCCGetOptions extends CCCommandOptions {
	groupId: number;
}

@CCCommand(MultiChannelAssociationCommand.Get)
@expectedCCResponse(MultiChannelAssociationCCReport)
export class MultiChannelAssociationCCGet extends MultiChannelAssociationCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| MultiChannelAssociationCCGetOptions,
	) {
		super(driver, options);
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
}

@CCCommand(MultiChannelAssociationCommand.SupportedGroupingsReport)
export class MultiChannelAssociationCCSupportedGroupingsReport extends MultiChannelAssociationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		this._groupCount = this.payload[0];

		this.persistValues();
	}

	private _groupCount: number;
	@ccValue({ internal: true })
	public get groupCount(): number {
		return this._groupCount;
	}
}

@CCCommand(MultiChannelAssociationCommand.SupportedGroupingsGet)
@expectedCCResponse(MultiChannelAssociationCCSupportedGroupingsReport)
export class MultiChannelAssociationCCSupportedGroupingsGet extends MultiChannelAssociationCC {}
