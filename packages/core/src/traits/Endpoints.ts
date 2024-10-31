import { type MulticastDestination } from "../consts/Transmission.js";

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
