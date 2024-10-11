import type { ConfigManager, DeviceConfig } from "@zwave-js/config";
import type {
	CCId,
	CommandClasses,
	ControllerLogger,
	FrameType,
	MaybeNotKnown,
	NodeIDType,
	NodeId,
	SecurityClass,
	SecurityManagers,
	SendCommandOptions,
	SendCommandReturnType,
	ValueDB,
	ValueID,
} from "@zwave-js/core";
import type { ZWaveHostOptions } from "./ZWaveHostOptions";

/** Allows querying the home ID and node ID of the host */
export interface HostIDs {
	/** The ID of this node in the current network */
	ownNodeId: number;
	/** The Home ID of the current network */
	homeId: number;
}

// FIXME: This should not be needed. Instead have the driver set callback IDs during sendMessage
/** Allows generating a new callback ID */
export interface GetNextCallbackId {
	/**
	 * Returns the next callback ID. Callback IDs are used to correlate requests
	 * to the controller/nodes with its response
	 */
	getNextCallbackId(): number;
}

/** Allows querying device configuration for a node */
export interface GetDeviceConfig {
	getDeviceConfig?: (nodeId: number) => DeviceConfig | undefined;
}

/** Additional context needed for deserializing CCs */
export interface CCParsingContext
	extends Readonly<SecurityManagers>, GetDeviceConfig
{
	sourceNodeId: number;
	ownNodeId: number;

	/** If known, the frame type of the containing message */
	frameType?: FrameType;

	getHighestSecurityClass(nodeId: number): MaybeNotKnown<SecurityClass>;

	hasSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
	): MaybeNotKnown<boolean>;

	setSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
		granted: boolean,
	): void;
}

/** Additional context needed for serializing CCs */
// FIXME: Lot of duplication between the CC and message contexts
export interface CCEncodingContext
	extends Readonly<SecurityManagers>, GetDeviceConfig
{
	getHighestSecurityClass(nodeId: number): MaybeNotKnown<SecurityClass>;

	hasSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
	): MaybeNotKnown<boolean>;

	setSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
		granted: boolean,
	): void;
}

/** Host application abstractions to be used in Serial API and CC implementations */
export interface ZWaveHost extends HostIDs, GetNextCallbackId {
	/**
	 * Retrieves the maximum version of a command class that can be used to communicate with a node.
	 * Returns 1 if the node claims that it does not support a CC.
	 * Throws if the CC is not implemented in this library yet.
	 */
	getSafeCCVersion(
		cc: CommandClasses,
		nodeId: number,
		endpointIndex?: number,
	): number;

	/**
	 * Retrieves the maximum version of a command class the given node/endpoint has reported support for.
	 * Returns 0 when the CC is not supported or that information is not known yet.
	 */
	getSupportedCCVersion(
		cc: CommandClasses,
		nodeId: number,
		endpointIndex?: number,
	): number;

	/**
	 * Determines whether a CC must be secure for a given node and endpoint.
	 */
	isCCSecure(
		cc: CommandClasses,
		nodeId: number,
		endpointIndex?: number,
	): boolean;

	__internalIsMockNode?: boolean;
}

/** Host application abstractions that provide support for reading and writing values to a database */
export interface ZWaveValueHost {
	/** Returns the value DB which belongs to the node with the given ID, or throws if the Value DB cannot be accessed */
	getValueDB(nodeId: number): ValueDB;

	/** Returns the value DB which belongs to the node with the given ID, or `undefined` if the Value DB cannot be accessed */
	tryGetValueDB(nodeId: number): ValueDB | undefined;
}

/** Allows accessing a specific node */
export interface GetNode<T extends NodeId> {
	getNode(nodeId: number): T | undefined;
	getNodeOrThrow(nodeId: number): T;
}

/** Allows accessing all nodes */
export interface GetAllNodes<T extends NodeId> {
	getAllNodes(): T[];
}

/** A more featureful version of the ZWaveHost interface, which is meant to be used on the controller application side. */
export interface ZWaveApplicationHost<TNode extends NodeId = NodeId>
	extends
		ZWaveValueHost,
		ZWaveHost,
		GetNode<TNode>,
		GetAllNodes<TNode>,
		SecurityManagers,
		GetDeviceConfig
{
	/** Gives access to the configuration files */
	configManager: ConfigManager;

	options: ZWaveHostOptions;

	readonly nodeIdType?: NodeIDType;

	// TODO: There's probably a better fitting name for this now
	controllerLog: ControllerLogger;

	/** Whether the node with the given ID is the controller */
	isControllerNode(nodeId: number): boolean;

	sendCommand<TResponse extends CCId | undefined = undefined>(
		command: CCId,
		options?: SendCommandOptions,
	): Promise<SendCommandReturnType<TResponse>>;

	waitForCommand<T extends CCId>(
		predicate: (cc: CCId) => boolean,
		timeout: number,
	): Promise<T>;

	schedulePoll(
		nodeId: number,
		valueId: ValueID,
		options: NodeSchedulePollOptions,
	): boolean;
}

export interface NodeSchedulePollOptions {
	/** The timeout after which the poll is to be scheduled */
	timeoutMs?: number;
	/**
	 * The expected value that's should be verified with this poll.
	 * When this value is received in the meantime, the poll will be cancelled.
	 */
	expectedValue?: unknown;
}
