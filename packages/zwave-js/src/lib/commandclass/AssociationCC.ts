import type { AssociationConfig } from "@zwave-js/config";
import type { Maybe, MessageRecord, ValueID } from "@zwave-js/core";
import {
	CommandClasses,
	MAX_NODES,
	MessageOrCCLogEntry,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { distinct } from "alcalzone-shared/arrays";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import type { Endpoint } from "../node/Endpoint";
import type { ZWaveNode } from "../node/Node";
import { PhysicalCCAPI } from "./API";
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
import type { AssociationAddress } from "./MultiChannelAssociationCC";

/** Returns the ValueID used to store the maximum number of nodes of an association group */
export function getMaxNodesValueId(
	endpointIndex: number,
	groupId: number,
): ValueID {
	return {
		commandClass: CommandClasses.Association,
		endpoint: endpointIndex,
		property: "maxNodes",
		propertyKey: groupId,
	};
}

/** Returns the ValueID used to store the node IDs of an association group */
export function getNodeIdsValueId(
	endpointIndex: number,
	groupId: number,
): ValueID {
	return {
		commandClass: CommandClasses.Association,
		endpoint: endpointIndex,
		property: "nodeIds",
		propertyKey: groupId,
	};
}

/** Returns the ValueID used to store the group count of an association group */
export function getGroupCountValueId(endpointIndex?: number): ValueID {
	return {
		commandClass: CommandClasses.Association,
		endpoint: endpointIndex,
		property: "groupCount",
	};
}

/** Returns the ValueID used to store whether a node has a lifeline association */
export function getHasLifelineValueId(endpointIndex?: number): ValueID {
	return {
		commandClass: CommandClasses.Association,
		endpoint: endpointIndex,
		property: "hasLifeline",
	};
}

export function getLifelineGroupIds(endpoint: Endpoint): number[] {
	// For now only support this for the root endpoint - i.e. node
	if (endpoint.index > 0) return [];
	const node = endpoint as ZWaveNode;

	// Some nodes define multiple lifeline groups, so we need to assign us to
	// all of them
	const lifelineGroups: number[] = [];

	// If the target node supports Z-Wave+ info that means the lifeline MUST be group #1
	if (endpoint.supportsCC(CommandClasses["Z-Wave Plus Info"])) {
		lifelineGroups.push(1);
	}

	// We have a device config file that tells us which (additional) association to assign
	let associations: ReadonlyMap<number, AssociationConfig> | undefined;
	if (endpoint.index === 0) {
		// The root endpoint's associations may be configured separately or as part of "endpoints"
		associations =
			node.deviceConfig?.associations ??
			node.deviceConfig?.endpoints?.get(0)?.associations;
	} else {
		// The other endpoints can only have a configuration as part of "endpoints"
		associations = node.deviceConfig?.endpoints?.get(endpoint.index)
			?.associations;
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

		const cc = new AssociationCCSupportedGroupingsGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<AssociationCCSupportedGroupingsReport>(
			cc,
			this.commandOptions,
		);
		if (response) return response.groupCount;
	}

	/**
	 * Returns information about an association group.
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getGroup(groupId: number) {
		this.assertSupportsCommand(AssociationCommand, AssociationCommand.Get);

		const cc = new AssociationCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
		});
		const response = await this.driver.sendCommand<AssociationCCReport>(
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
	public async addNodeIds(
		groupId: number,
		...nodeIds: number[]
	): Promise<void> {
		this.assertSupportsCommand(AssociationCommand, AssociationCommand.Set);

		const cc = new AssociationCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			groupId,
			nodeIds,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Removes nodes from an association group
	 */
	public async removeNodeIds(
		options: AssociationCCRemoveOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			AssociationCommand,
			AssociationCommand.Remove,
		);

		const cc = new AssociationCCRemove(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Removes nodes from all association groups
	 */
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
			const node = this.endpoint.getNodeUnsafe()!;
			const groupCount =
				node.valueDB.getValue<number>(
					getGroupCountValueId(this.endpoint.index),
				) ?? 0;
			for (let groupId = 1; groupId <= groupCount; groupId++) {
				await this.removeNodeIds({ nodeIds, groupId });
			}
		}
	}
}

@commandClass(CommandClasses.Association)
@implementedVersion(3)
export class AssociationCC extends CommandClass {
	declare ccCommand: AssociationCommand;

	public constructor(driver: Driver, options: CommandClassOptions) {
		super(driver, options);
		this.registerValue(getHasLifelineValueId(0).property, true);
	}

	public determineRequiredCCInterviews(): readonly CommandClasses[] {
		// AssociationCC must be interviewed after Z-Wave+ if that is supported
		return [
			...super.determineRequiredCCInterviews(),
			CommandClasses["Z-Wave Plus Info"],
		];
	}

	/**
	 * Returns the number of association groups reported by the node/endpoint.
	 * This only works AFTER the interview process
	 */
	public getGroupCountCached(): number {
		return (
			this.getValueDB().getValue(
				getGroupCountValueId(this.endpointIndex),
			) || 0
		);
	}

	/**
	 * Returns the number of nodes an association group supports.
	 * This only works AFTER the interview process
	 */
	public getMaxNodesCached(groupId: number): number {
		return (
			this.getValueDB().getValue(
				getMaxNodesValueId(this.endpointIndex, groupId),
			) || 1
		);
	}

	/**
	 * Returns all the destinations of all association groups reported by the node/endpoint.
	 * This only works AFTER the interview process
	 */
	public getAllDestinationsCached(): ReadonlyMap<
		number,
		readonly AssociationAddress[]
	> {
		const ret = new Map<number, AssociationAddress[]>();
		const groupCount = this.getGroupCountCached();
		const valueDB = this.getValueDB();
		for (let i = 1; i <= groupCount; i++) {
			// Add all root destinations
			const nodes =
				valueDB.getValue<number[]>(
					getNodeIdsValueId(this.endpointIndex, i),
				) ?? [];

			ret.set(
				i,
				// Filter out duplicates
				distinct(nodes).map((nodeId) => ({ nodeId })),
			);
		}
		return ret;
	}

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Association.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Even if Multi Channel Association is supported, we still need to query the number of
		// normal association groups since some devices report more association groups than
		// multi channel association groups

		// Find out how many groups are supported
		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying number of association groups...",
			direction: "outbound",
		});
		const groupCount = await api.getGroupCount();
		if (groupCount != undefined) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `supports ${groupCount} association groups`,
				direction: "inbound",
			});
		} else {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying association groups timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		// Skip the remaining quer Association CC in favor of Multi Channel Association if possible
		if (
			endpoint.commandClasses["Multi Channel Association"].isSupported()
		) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `${this.constructor.name}: skipping remaining interview because Multi Channel Association is supported...`,
				direction: "none",
			});
			this.interviewComplete = true;
			return;
		}

		// Query each association group for its members
		await this.refreshValues();

		// TODO: Improve how the assignments are handled. For now only auto-assign associations on the root endpoint
		if (this.endpointIndex === 0) {
			// Assign the controller to all lifeline groups (Z-Wave+ and configured)
			const lifelineGroups = getLifelineGroupIds(endpoint);
			const ownNodeId = this.driver.controller.ownNodeId!;
			const valueDB = this.getValueDB();

			if (lifelineGroups.length) {
				for (const group of lifelineGroups) {
					// Check if we are already in the lifeline group
					const lifelineValueId = getNodeIdsValueId(
						this.endpointIndex,
						group,
					);
					const lifelineNodeIds: number[] =
						valueDB.getValue(lifelineValueId) ?? [];
					if (!lifelineNodeIds.includes(ownNodeId)) {
						this.driver.controllerLog.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `Controller missing from lifeline group #${group}, assigning ourselves...`,
							direction: "outbound",
						});
						// Add a new destination
						await api.addNodeIds(group, ownNodeId);
						// and refresh it - don't trust that it worked
						await api.getGroup(group);
						// TODO: check if it worked
					}
				}

				// Remember that we have a lifeline association
				valueDB.setValue(
					getHasLifelineValueId(this.endpointIndex),
					true,
				);
			} else {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"No information about Lifeline associations, cannot assign ourselves!",
					direction: "outbound",
					level: "warn",
				});
				// Remember that we have NO lifeline association
				valueDB.setValue(
					getHasLifelineValueId(this.endpointIndex),
					false,
				);
			}
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Association.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const groupCount = this.getGroupCountCached();

		// Query each association group
		for (let groupId = 1; groupId <= groupCount; groupId++) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying association group #${groupId}...`,
				direction: "outbound",
			});
			const group = await api.getGroup(groupId);
			if (group != undefined) {
				const logMessage = `received information for association group #${groupId}:
maximum # of nodes: ${group.maxNodes}
currently assigned nodes: ${group.nodeIds.map(String).join(", ")}`;
				this.driver.controllerLog.logNode(node.id, {
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
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"group id": this.groupId || "all groups",
			"node ids": this.nodeIds.length
				? this.nodeIds.join(", ")
				: "all nodes",
		};
		return {
			...super.toLogEntry(),
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
		driver: Driver,
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

			if (options.nodeIds?.some((n) => n < 1 || n > MAX_NODES)) {
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

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"group id": this.groupId || "all groups",
			"node ids":
				this.nodeIds && this.nodeIds.length
					? this.nodeIds.join(", ")
					: "all nodes",
		};
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(AssociationCommand.Report)
export class AssociationCCReport extends AssociationCC {
	public constructor(
		driver: Driver,
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
	@ccValue({ internal: true })
	public get maxNodes(): number {
		return this._maxNodes;
	}

	private _nodeIds: number[];
	@ccValue({ internal: true })
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

	public mergePartialCCs(partials: AssociationCCReport[]): void {
		// Concat the list of nodes
		this._nodeIds = [...partials, this]
			.map((report) => report._nodeIds)
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
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "group id": this.groupId },
		};
	}
}

@CCCommand(AssociationCommand.SupportedGroupingsReport)
export class AssociationCCSupportedGroupingsReport extends AssociationCC {
	public constructor(
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "group count": this.groupCount },
		};
	}
}

@CCCommand(AssociationCommand.SupportedGroupingsGet)
@expectedCCResponse(AssociationCCSupportedGroupingsReport)
export class AssociationCCSupportedGroupingsGet extends AssociationCC {}
