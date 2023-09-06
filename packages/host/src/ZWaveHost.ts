import type { ConfigManager, DeviceConfig } from "@zwave-js/config";
import type {
	CommandClasses,
	ControllerLogger,
	ICommandClass,
	IZWaveNode,
	MaybeNotKnown,
	NodeIDType,
	SecurityClass,
	SecurityManager,
	SecurityManager2,
	SendCommandOptions,
	SendCommandReturnType,
	ValueDB,
	ValueID,
} from "@zwave-js/core";
import type { ReadonlyThrowingMap } from "@zwave-js/shared";
import type { ZWaveHostOptions } from "./ZWaveHostOptions";

/** Host application abstractions to be used in Serial API and CC implementations */
export interface ZWaveHost {
	/** The ID of this node in the current network */
	ownNodeId: number;
	/** The Home ID of the current network */
	homeId: number;

	/** How many bytes a node ID occupies in serial API commands */
	readonly nodeIdType?: NodeIDType;

	/** Management of Security S0 keys and nonces */
	securityManager: SecurityManager | undefined;
	/** Management of Security S2 keys and nonces */
	securityManager2: SecurityManager2 | undefined;

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

	/**
	 * Returns the next callback ID. Callback IDs are used to correlate requests
	 * to the controller/nodes with its response
	 */
	getNextCallbackId(): number;

	/**
	 * Returns the next session ID for supervised communication
	 */
	getNextSupervisionSessionId(nodeId: number): number;

	getDeviceConfig?: (nodeId: number) => DeviceConfig | undefined;

	__internalIsMockNode?: boolean;
}

/** A more featureful version of the ZWaveHost interface, which is meant to be used on the controller application side. */
export interface ZWaveApplicationHost extends ZWaveHost {
	/** Gives access to the configuration files */
	configManager: ConfigManager;

	options: ZWaveHostOptions;

	// TODO: There's probably a better fitting name for this now
	controllerLog: ControllerLogger;

	/** Returns the value DB which belongs to the node with the given ID, or throws if the Value DB cannot be accessed */
	getValueDB(nodeId: number): ValueDB;

	/** Returns the value DB which belongs to the node with the given ID, or `undefined` if the Value DB cannot be accessed */
	tryGetValueDB(nodeId: number): ValueDB | undefined;

	/** Readonly access to all node instances known to the host */
	nodes: ReadonlyThrowingMap<number, IZWaveNode>;

	/** Whether the node with the given ID is the controller */
	isControllerNode(nodeId: number): boolean;

	sendCommand<TResponse extends ICommandClass | undefined = undefined>(
		command: ICommandClass,
		options?: SendCommandOptions,
	): Promise<SendCommandReturnType<TResponse>>;

	waitForCommand<T extends ICommandClass>(
		predicate: (cc: ICommandClass) => boolean,
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
