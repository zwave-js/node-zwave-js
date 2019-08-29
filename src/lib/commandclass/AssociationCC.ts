import { MAX_NODES } from "../controller/NodeBitMask";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { ValueID } from "../node/ValueDB";
import { validatePayload } from "../util/misc";
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
function getMaxNodesValueId(groupId: number): ValueID {
	return {
		commandClass: CommandClasses.Association,
		propertyName: "maxNodes",
		propertyKey: groupId,
	};
}

/** Returns the ValueID used to store the node IDs of an association group */
function getNodeIdsValueId(groupId: number): ValueID {
	return {
		commandClass: CommandClasses.Association,
		propertyName: "nodeIds",
		propertyKey: groupId,
	};
}

// All the supported commands
export enum AssociationCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	Remove = 0x04,
	SupportedGroupingsGet = 0x05,
	SupportedGroupingsReport = 0x06,
	// TODO: These two commands are V2. I have no clue how this is supposed to function:
	// SpecificGroupGet = 0x0b,
	// SpecificGroupReport = 0x0c,

	// Here's what the docs have to say:
	// This functionality allows a supporting multi-button device to detect a key press and subsequently advertise
	// the identity of the key. The following sequence of events takes place:
	// * The user activates a special identification sequence and pushes the button to be identified
	// * The device issues a Node Information frame (NIF)
	// * The NIF allows the portable controller to determine the NodeID of the multi-button device
	// * The portable controller issues an Association Specific Group Get Command to the multi-button device
	// * The multi-button device returns an Association Specific Group Report Command that advertises the
	//   association group that represents the most recently detected button
}

@API(CommandClasses.Association)
export class AssociationCCAPI extends CCAPI {
	/**
	 * Returns the number of association groups a node supports.
	 * Association groups are consecutive, starting at 1.
	 */
	public async getGroupCount(): Promise<number> {
		const cc = new AssociationCCSupportedGroupingsGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<
			AssociationCCSupportedGroupingsReport
		>(cc))!;
		return response.groupCount;
	}

	/**
	 * Returns information about an association group.
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getGroup(groupId: number) {
		const cc = new AssociationCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
		});
		const response = (await this.driver.sendCommand<AssociationCCReport>(
			cc,
		))!;
		return {
			maxNodes: response.maxNodes,
			nodeIds: response.nodeIds,
		};
	}

	/**
	 * Adds new nodes to an association group
	 */
	public async addNodeIds(
		groupId: number,
		...nodeIds: number[]
	): Promise<void> {
		const cc = new AssociationCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			nodeIds,
		});
		await this.driver.sendCommand(cc);
	}

	/**
	 * Removes nodes from an association group
	 */
	public async removeNodeIds(
		options: AssociationCCRemoveOptions,
	): Promise<void> {
		const cc = new AssociationCCRemove(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.driver.sendCommand(cc);
	}
}

export interface AssociationCC {
	ccCommand: AssociationCommand;
}

@commandClass(CommandClasses.Association)
@implementedVersion(2)
export class AssociationCC extends CommandClass {
	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const api = node.commandClasses.Association;

		// First find out how many groups are supported
		log.controller.logNode(node.id, {
			message: "querying number of association groups...",
			direction: "outbound",
		});
		const groupCount = await api.getGroupCount();
		log.controller.logNode(node.id, {
			message: `supports ${groupCount} association groups`,
			direction: "inbound",
		});

		// Then query each association group
		for (let groupId = 1; groupId <= groupCount; groupId++) {
			log.controller.logNode(node.id, {
				message: `querying association group #${groupId}...`,
				direction: "outbound",
			});
			const group = await api.getGroup(groupId);
			const logMessage = `received information for association group #${groupId}:
maximum # of nodes: ${group.maxNodes}
currently assigned nodes: ${group.nodeIds.map(String).join(", ")}`;
			log.controller.logNode(node.id, {
				message: logMessage,
				direction: "inbound",
			});
		}

		// If the target node supports Z-Wave+ info that means the lifeline MUST be group #1
		if (node.supportsCC(CommandClasses["Z-Wave Plus Info"])) {
			log.controller.logNode(node.id, {
				message:
					"supports Z-Wave+, assigning ourselves to the Lifeline group...",
				direction: "outbound",
			});
			await api.addNodeIds(1, this.driver.controller!.ownNodeId!);
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

interface AssociationCCSetOptions extends CCCommandOptions {
	groupId: number;
	nodeIds: number[];
}

@CCCommand(AssociationCommand.Set)
export class AssociationCCSet extends AssociationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | AssociationCCSetOptions,
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
			if (!options.nodeIds.every(n => n > 0 && n < MAX_NODES)) {
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
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| (AssociationCCRemoveOptions & CCCommandOptions),
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
						`Node ${this.nodeId} only supports AssociationCC V1 which requires the group Id to be set`,
						ZWaveErrorCodes.Argument_Invalid,
					);
				}
			} else {
				throw new ZWaveError(
					"The group id must be positive!",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			if (
				options.nodeIds &&
				!options.nodeIds.every(n => n > 0 && n < MAX_NODES)
			) {
				throw new ZWaveError(
					`All node IDs must be between 1 and ${MAX_NODES}!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
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
}

@CCCommand(AssociationCommand.Report)
export class AssociationCCReport extends AssociationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

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
	@ccValue(true)
	public get maxNodes(): number {
		return this._maxNodes;
	}

	private _nodeIds: number[];
	@ccValue(true)
	public get nodeIds(): readonly number[] {
		return this._nodeIds;
	}

	private _reportsToFollow: number;
	public get reportsToFollow(): number {
		return this._reportsToFollow;
	}

	public expectMoreMessages(): boolean {
		return this._reportsToFollow > 0;
	}

	public mergePartialCCs(partials: AssociationCCReport[]): void {
		// Concat the list of nodes
		this._nodeIds = [...partials, this]
			.map(report => report._nodeIds)
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
	}
}

interface AssociationCCGetOptions extends CCCommandOptions {
	groupId: number;
}

@CCCommand(AssociationCommand.Get)
@expectedCCResponse(AssociationCCReport)
export class AssociationCCGet extends AssociationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | AssociationCCGetOptions,
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

@CCCommand(AssociationCommand.SupportedGroupingsReport)
export class AssociationCCSupportedGroupingsReport extends AssociationCC {
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
	@ccValue(true)
	public get groupCount(): number {
		return this._groupCount;
	}
}

@CCCommand(AssociationCommand.SupportedGroupingsGet)
@expectedCCResponse(AssociationCCSupportedGroupingsReport)
export class AssociationCCSupportedGroupingsGet extends AssociationCC {}
