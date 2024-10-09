import type {
	CommandClassInfo,
	CommandClasses,
} from "../capabilities/CommandClasses";
import type { MulticastDestination } from "../consts";
import type { IVirtualNode, IZWaveNode } from "./IZWaveNode";

/** Identifies an endpoint */
export interface EndpointId {
	readonly virtual: false;
	readonly nodeId: number;
	readonly index: number;
}

/** Allows querying if a CC is supported and in which version */
export interface SupportsCC {
	supportsCC(cc: CommandClasses): boolean;
	getCCVersion(cc: CommandClasses): number;
}

/** Allows querying if a CC is controlled */
export interface ControlsCC {
	controlsCC(cc: CommandClasses): boolean;
}

/** Allows querying if a CC is supported or controlled only securely */
export interface IsCCSecure {
	isCCSecure(cc: CommandClasses): boolean;
}

/** Allows modifying the list of supported/controlled CCs */
export interface ModifyCCs {
	addCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void;
	removeCC(cc: CommandClasses): void;
}

/** A basic abstraction of a Z-Wave endpoint providing access to the relevant functionality */
export interface IZWaveEndpoint
	extends EndpointId, SupportsCC, ControlsCC, IsCCSecure, ModifyCCs
{
	getCCs(): Iterable<[ccId: CommandClasses, info: CommandClassInfo]>;
	getNodeUnsafe(): IZWaveNode | undefined;
}

/** Identifies a virtual endpoint */
export interface VirtualEndpointId {
	readonly virtual: true;
	readonly nodeId: number | MulticastDestination;
	readonly index: number;
}

/** A basic abstraction of an endpoint of a virtual node (multicast or broadcast) providing access to the relevant functionality */
export interface IVirtualEndpoint extends VirtualEndpointId, SupportsCC {
	readonly node: IVirtualNode;
}

// TODO: Use cases in CCAPI implementations:
// - EndpointId or VirtualEndpointId
// - SupportsCC
// - VirtualEndpoint:
//     - physical nodes -> NodeId
//     - physical nodes -> Endpoint -> SupportsCC,ControlsCC
