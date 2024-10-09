import type { FLiRS } from "../capabilities/NodeInfo";
import type { InterviewStage, NodeStatus } from "../consts";
import type { SecurityClassOwner } from "../security/SecurityClass";
import { type MaybeNotKnown } from "../values/Primitive";
import type {
	EndpointId,
	IVirtualEndpoint,
	IZWaveEndpoint,
	VirtualEndpointId,
} from "./IZWaveEndpoint";

export interface NodeId extends EndpointId {
	readonly id: number;
	// FIXME: GH#7261 this should have type 0
	readonly index: number;
}

export interface GetEndpoint<T extends EndpointId | VirtualEndpointId> {
	getEndpoint(index: 0): T;
	getEndpoint(index: number): T | undefined;
	getEndpointOrThrow(index: number): T;
}

/** A basic abstraction of a Z-Wave node providing access to the relevant functionality */
export interface IZWaveNode
	extends
		IZWaveEndpoint,
		NodeId,
		GetEndpoint<IZWaveEndpoint>,
		SecurityClassOwner
{
	isListening: MaybeNotKnown<boolean>;
	isFrequentListening: MaybeNotKnown<FLiRS>;
	readonly canSleep: MaybeNotKnown<boolean>;
	readonly status: NodeStatus;
	interviewStage: InterviewStage;

	getAllEndpoints(): IZWaveEndpoint[];
	readonly isSecure: MaybeNotKnown<boolean>;
}

export interface VirtualNodeId extends VirtualEndpointId {
	readonly id: number | undefined;
}

export interface PhysicalNodes<T = object> {
	readonly physicalNodes: readonly (NodeId & T)[];
}

/** A basic abstraction of a virtual node (multicast or broadcast) providing access to the relevant functionality */
export interface IVirtualNode
	extends
		IVirtualEndpoint,
		VirtualNodeId,
		GetEndpoint<IVirtualEndpoint>,
		PhysicalNodes<IZWaveNode>
{
}
