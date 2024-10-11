import type { CommandClasses } from "../capabilities/CommandClasses";
import type {
	FrameType,
	MulticastDestination,
	NODE_ID_BROADCAST,
	NODE_ID_BROADCAST_LR,
} from "../consts";
import { type SecurityClass } from "../security/SecurityClass";
import { type MaybeNotKnown } from "../values/Primitive";

/** Additional context needed for deserializing CCs */
export interface CCParsingContext {
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
export interface CCEncodingContext {
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

/** A basic abstraction of a Z-Wave Command Class providing access to the relevant functionality */
export interface ICommandClass {
	ccId: CommandClasses;
	ccCommand?: number;

	serialize(ctx: CCEncodingContext): Buffer;
	nodeId: number | MulticastDestination;
	expectsCCResponse(): boolean;
	isExpectedCCResponse(received: ICommandClass): boolean;
}

export type SinglecastCC<T extends ICommandClass = ICommandClass> = T & {
	nodeId: number;
};

export type MulticastCC<T extends ICommandClass = ICommandClass> = T & {
	nodeId: MulticastDestination;
};

export type BroadcastCC<T extends ICommandClass = ICommandClass> = T & {
	nodeId: typeof NODE_ID_BROADCAST | typeof NODE_ID_BROADCAST_LR;
};
