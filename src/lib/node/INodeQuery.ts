import { Message } from "../message/Message";

export interface INodeQuery {
	nodeId: number;
}

export function isNodeQuery<T extends Message>(msg: T): msg is T & INodeQuery {
	return typeof (msg as any).nodeId === "number";
}
