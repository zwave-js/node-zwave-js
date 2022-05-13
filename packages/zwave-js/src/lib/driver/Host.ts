import type { ConfigManager } from "@zwave-js/config";
import type {
	CommandClasses,
	SecurityManager,
	SecurityManager2,
} from "@zwave-js/core";
import type { ReadonlyThrowingMap } from "../controller/Controller";
import type { ControllerLogger } from "../log/Controller";
import type { ZWaveNode } from "../node/Node";
import type { ZWaveOptions } from "./ZWaveOptions";

/** Host application abstractions to be used in Serial API and CC implemenations */
export interface ZWaveHost {
	// TODO: There's probably a better fitting name for this now
	controllerLog: ControllerLogger;

	/** Gives access to the configuration files */
	configManager: ConfigManager;

	/** Management of Security S0 keys and nonces */
	securityManager: SecurityManager | undefined;
	/** Management of Security S2 keys and nonces */
	securityManager2: SecurityManager2 | undefined;

	/** The ID of this node in the current network */
	ownNodeId: number;
	/** The Home ID of the current network */
	homeId: number;

	/** Readonly access to all node instances known to the host */
	nodes: ReadonlyThrowingMap<number, ZWaveNode>;

	options: Pick<ZWaveOptions, "preserveUnknownValues" | "attempts">;

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
	 * Returns the next callback ID. Callback IDs are used to correllate requests
	 * to the controller/nodes with its response
	 */
	getNextCallbackId(): number;
}
