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
import type { ZWaveEndpointBase, ZWaveHost } from "@zwave-js/host";
import { MessagePriority } from "@zwave-js/serial";
import { validateArgs } from "@zwave-js/transformers";
import { distinct } from "alcalzone-shared/arrays";
import type { Driver } from "../driver/Driver";
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
import { AssociationCommand, type AssociationAddress } from "./_Types";

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
		associations = node.deviceConfig?.endpoints?.get(
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

		const cc = new AssociationCCSupportedGroupingsGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<AssociationCCSupportedGroupingsReport>(
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
	@validateArgs()
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
	@validateArgs()
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

	public constructor(host: ZWaveHost, options: CommandClassOptions) {
		super(host, options);
		this.registerValue(getHasLifelineValueId(0).property, {
			internal: true,
		});
	}

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
				.getValue(getMaxNodesValueId(endpoint.index, groupId)) ??
			// If the information is not available, fall back to the configuration file if possible
			// This can happen on some legacy devices which have "hidden" association groups
			host.nodes
				.get(endpoint.nodeId)
				?.deviceConfig?.getAssociationConfigForEndpoint(
					endpoint.index,
					groupId,
				)?.maxNodes ??
			0
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
			// Add all root destinations
			const nodes =
				valueDB.getValue<number[]>(
					getNodeIdsValueId(endpoint.index, i),
				) ?? [];

			ret.set(
				i,
				// Filter out duplicates
				distinct(nodes).map((nodeId) => ({ nodeId })),
			);
		}
		return ret;
	}

	public async interview(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses.Association.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Even if Multi Channel Association is supported, we still need to query the number of
		// normal association groups since some devices report more association groups than
		// multi channel association groups

		// Find out how many groups are supported
		driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying number of association groups...",
			direction: "outbound",
		});
		const groupCount = await api.getGroupCount();
		if (groupCount != undefined) {
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `supports ${groupCount} association groups`,
				direction: "inbound",
			});
		} else {
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Querying association groups timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		// Query each association group for its members
		await this.refreshValues(driver);

		// Skip the remaining quer Association CC in favor of Multi Channel Association if possible
		if (
			endpoint.commandClasses["Multi Channel Association"].isSupported()
		) {
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `${this.constructor.name}: delaying configuration of lifeline associations until after Multi Channel Association interview...`,
				direction: "none",
			});
			this.interviewComplete = true;
			return;
		}

		// And set up lifeline associations
		await endpoint.configureLifelineAssociations();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(driver: Driver): Promise<void> {
		const node = this.getNode(driver)!;
		const endpoint = this.getEndpoint(driver)!;
		const api = endpoint.commandClasses.Association.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const groupCount = AssociationCC.getGroupCountCached(driver, endpoint);

		// Query each association group
		for (let groupId = 1; groupId <= groupCount; groupId++) {
			driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `querying association group #${groupId}...`,
				direction: "outbound",
			});
			const group = await api.getGroup(groupId);
			if (group != undefined) {
				const logMessage = `received information for association group #${groupId}:
maximum # of nodes: ${group.maxNodes}
currently assigned nodes: ${group.nodeIds.map(String).join(", ")}`;
				driver.controllerLog.logNode(node.id, {
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

@CCCommand(AssociationCommand.SupportedGroupingsGet)
@expectedCCResponse(AssociationCCSupportedGroupingsReport)
export class AssociationCCSupportedGroupingsGet extends AssociationCC {}
