import type { CompatConfig, ConfigManager } from "@zwave-js/config";
import type {
	CommandClasses,
	ControllerLogger,
	Maybe,
	SecurityClass,
	SecurityManager,
	SecurityManager2,
	ValueDB,
} from "@zwave-js/core";
import type { ReadonlyThrowingMap } from "@zwave-js/shared";
import type { ZWaveNodeBase } from "./ZWaveNodeBase";

export interface ZWaveHostOptions {
	/**
	 * Some Command Classes support reporting that a value is unknown.
	 * When this flag is `false`, unknown values are exposed as `undefined`.
	 * When it is `true`, unknown values are exposed as the literal string "unknown" (even if the value is normally numeric).
	 * Default: `false`
	 */
	preserveUnknownValues?: boolean;

	attempts: {
		/**
		 * @internal
		 * How often to attempt opening the serial port
		 */
		openSerialPort: number;

		/** How often the driver should try communication with the controller before giving up */
		controller: number; // [1...3], default: 3

		/** How often the driver should try sending SendData commands before giving up */
		sendData: number; // [1...5], default: 3

		/**
		 * How many attempts should be made for each node interview before giving up
		 */
		nodeInterview: number; // [1...10], default: 5
	};
}

/** Host application abstractions to be used in Serial API and CC implementations */
export interface ZWaveHost {
	/** The ID of this node in the current network */
	ownNodeId: number;
	/** The Home ID of the current network */
	homeId: number;

	/** Management of Security S0 keys and nonces */
	securityManager: SecurityManager | undefined;
	/** Management of Security S2 keys and nonces */
	securityManager2: SecurityManager2 | undefined;

	/**
	 * Retrieves the maximum version of a command class that can be used to communicate with a node.
	 * Returns 1 if the node claims that it does not support a CC.
	 * Throws if the CC is not implemented in this library yet.
	 */
	getSafeCCVersionForNode(
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

	getHighestSecurityClass(nodeId: number): SecurityClass | undefined;

	hasSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
	): Maybe<boolean>;

	setSecurityClass(
		nodeId: number,
		securityClass: SecurityClass,
		granted: boolean,
	): void;

	/**
	 * Returns the next callback ID. Callback IDs are used to correllate requests
	 * to the controller/nodes with its response
	 */
	getNextCallbackId(): number;

	getCompatConfig?: (nodeId: number) => CompatConfig | undefined;
}

/** A more featureful version of the ZWaveHost interface, which is meant to be used on the controller application side. */
export interface ZWaveApplicationHost extends ZWaveHost {
	/** Gives access to the configuration files */
	configManager: ConfigManager;

	options: ZWaveHostOptions;

	// TODO: There's probably a better fitting name for this now
	controllerLog: ControllerLogger;

	/** Returns the value DB which belongs to the node with the given ID */
	getValueDB(nodeId: number): ValueDB;

	/** Readonly access to all node instances known to the host */
	nodes: ReadonlyThrowingMap<number, ZWaveNodeBase>;
}
