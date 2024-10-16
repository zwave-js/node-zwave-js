import type { CommandClasses } from "../capabilities/CommandClasses";
import type {
	MulticastDestination,
	NODE_ID_BROADCAST,
	NODE_ID_BROADCAST_LR,
} from "../consts";
import { type SecurityManager } from "../security/Manager";
import { type SecurityManager2 } from "../security/Manager2";

/** Allows accessing the security manager instances */
export interface SecurityManagers {
	/** Management of Security S0 keys and nonces */
	securityManager: SecurityManager | undefined;
	/** Management of Security S2 keys and nonces (Z-Wave Classic) */
	securityManager2: SecurityManager2 | undefined;
	/** Management of Security S2 keys and nonces (Z-Wave Long Range) */
	securityManagerLR: SecurityManager2 | undefined;
}

/** A basic abstraction of a Z-Wave Command Class providing access to the relevant functionality */
export interface CCId {
	nodeId: number | MulticastDestination;
	endpointIndex?: number;
	ccId: CommandClasses;
	ccCommand?: number;
}

export type SinglecastCC<T extends CCId = CCId> = T & {
	nodeId: number;
};

export type MulticastCC<T extends CCId = CCId> = T & {
	nodeId: MulticastDestination;
};

export type BroadcastCC<T extends CCId = CCId> = T & {
	nodeId: typeof NODE_ID_BROADCAST | typeof NODE_ID_BROADCAST_LR;
};
