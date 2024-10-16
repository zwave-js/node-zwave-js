import type {
	CommandClassInfo,
	CommandClasses,
} from "../capabilities/CommandClasses";
import type {
	MulticastDestination,
	NODE_ID_BROADCAST,
	NODE_ID_BROADCAST_LR,
} from "../consts";

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
