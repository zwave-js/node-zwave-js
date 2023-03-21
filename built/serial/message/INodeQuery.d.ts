import type { Message } from "./Message";
export interface INodeQuery {
    nodeId: number;
}
/** Tests if the given message is for a node or references a node */
export declare function isNodeQuery<T extends Message>(msg: T): msg is T & INodeQuery;
//# sourceMappingURL=INodeQuery.d.ts.map