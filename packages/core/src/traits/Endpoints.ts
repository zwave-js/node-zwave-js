import { type MulticastDestination } from "../consts/Transmission";
import { type NodeId } from "./Nodes";

/** Identifies an endpoint */
export interface EndpointId {
	readonly virtual: false;
	readonly nodeId: number;
	readonly index: number;
}

/** Identifies a virtual endpoint */
export interface VirtualEndpointId {
	readonly virtual: true;
	readonly nodeId: number | MulticastDestination;
	readonly index: number;
}

/** Allows accessing the parent node of the endpoint, if it exists */
export interface GetEndpointNode<T extends NodeId> {
	tryGetNode(): T | undefined;
}
