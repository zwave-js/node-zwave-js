import { Message } from "../message/Message";
export interface INodeQuery {
    nodeId: number;
}
export declare function isNodeQuery<T extends Message>(msg: T): msg is T & INodeQuery;
