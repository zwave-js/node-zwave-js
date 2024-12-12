import { type MulticastDestination } from "../definitions/NodeID.js";

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

/** Allows accessing a specific endpoint */
export interface GetEndpoint<T extends EndpointId | VirtualEndpointId> {
	getEndpoint(index: 0): T;
	getEndpoint(index: number): T | undefined;
	getEndpointOrThrow(index: number): T;
}

/** Allows accessing all endpoints */
export interface GetAllEndpoints<T extends EndpointId | VirtualEndpointId> {
	getAllEndpoints(): T[];
}
