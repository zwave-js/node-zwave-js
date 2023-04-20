/// <reference types="node" />
import type { CommandClasses } from "../capabilities/CommandClasses";
import type { MulticastDestination, NODE_ID_BROADCAST } from "../consts";
/** A basic abstraction of a Z-Wave Command Class providing access to the relevant functionality */
export interface ICommandClass {
    ccId: CommandClasses;
    ccCommand?: number;
    serialize(): Buffer;
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
    nodeId: typeof NODE_ID_BROADCAST;
};
//# sourceMappingURL=ICommandClass.d.ts.map