import { type FLiRS } from "../definitions/NodeInfo.js";
import { type NodeStatus } from "../definitions/NodeStatus.js";
import { type MaybeNotKnown } from "../values/Primitive.js";
import { type EndpointId, type VirtualEndpointId } from "./Endpoints.js";

/** Identifies a node */
export interface NodeId extends EndpointId {
	readonly id: number;
	// // FIXME: GH#7261 this should have type 0
	// readonly index: number;
}

export interface VirtualNodeId extends VirtualEndpointId {
	readonly id: number | undefined;
}

/** Allows accessing a specific node */
export interface GetNode<T extends NodeId> {
	getNode(nodeId: number): T | undefined;
	getNodeOrThrow(nodeId: number): T;
}

/** Allows accessing all nodes */
export interface GetAllNodes<T extends NodeId> {
	getAllNodes(): T[];
}

/** Allows querying whether a node is a listening, FLiRS or sleeping device */
export interface ListenBehavior {
	/** Whether this node is always listening or not */
	readonly isListening: MaybeNotKnown<boolean>;

	/** Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't. */
	readonly isFrequentListening: MaybeNotKnown<FLiRS>;

	/** Whether this node can sleep */
	readonly canSleep: MaybeNotKnown<boolean>;
}

/** Allows querying whether a node's status */
export interface QueryNodeStatus {
	/**
	 * Which status the node is believed to be in
	 */
	readonly status: NodeStatus;
}

export interface PhysicalNodes<T extends NodeId> {
	readonly physicalNodes: readonly T[];
}
