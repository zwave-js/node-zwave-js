import type {
	CommandClassInfo,
	CommandClasses,
} from "../definitions/CommandClasses.js";
import type {
	MulticastDestination,
	NODE_ID_BROADCAST,
	NODE_ID_BROADCAST_LR,
} from "../definitions/NodeID.js";

/** Identifies which node and/or endpoint a CC is addressed to */
export interface CCAddress {
	nodeId: number | MulticastDestination;
	endpointIndex?: number;
}

export type WithAddress<T extends object> = T & CCAddress;

/** Uniquely identifies a CC and its address */
export interface CCId extends CCAddress {
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

/** Allows querying if a CC is supported and in which version */
export interface SupportsCC {
	supportsCC(cc: CommandClasses): boolean;
	getCCVersion(cc: CommandClasses): number;
}

/** Allows querying if a CC is controlled */
export interface ControlsCC {
	controlsCC(cc: CommandClasses): boolean;
}

/** Allows querying if a CC is supported or controlled only securely */
export interface IsCCSecure {
	isCCSecure(cc: CommandClasses): boolean;
}

/** Allows querying all implemented CCs and their information */
export interface GetCCs {
	getCCs(): Iterable<[ccId: CommandClasses, info: CommandClassInfo]>;
}

/** Allows modifying the list of supported/controlled CCs */
export interface ModifyCCs {
	addCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void;
	removeCC(cc: CommandClasses): void;
}
