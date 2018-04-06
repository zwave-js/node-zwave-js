import { Message } from "../message/Message";

export interface INodeQuery {
	nodeId: number;
}

export function isNodeQuery(msg: any): msg is INodeQuery {
	return typeof msg.nodeId === "number";
}
