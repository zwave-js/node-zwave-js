import type { FLiRS } from "../capabilities/NodeInfo";
import type { InterviewStage, NodeStatus } from "../consts";
import type {
	QuerySecurityClasses,
	SetSecurityClass,
} from "../security/SecurityClass";
import { type MaybeNotKnown } from "../values/Primitive";
import type {
	EndpointId,
	IVirtualEndpoint,
	IZWaveEndpoint,
	VirtualEndpointId,
} from "./IZWaveEndpoint";

/** Identifies a node */
export interface NodeId extends EndpointId {
	readonly id: number;
	// // FIXME: GH#7261 this should have type 0
	// readonly index: number;
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

/** A basic abstraction of a Z-Wave node providing access to the relevant functionality */
export interface IZWaveNode
	extends
		IZWaveEndpoint,
		NodeId,
		ListenBehavior,
		QueryNodeStatus,
		GetEndpoint<IZWaveEndpoint>,
		GetAllEndpoints<IZWaveEndpoint>,
		QuerySecurityClasses,
		SetSecurityClass
{
	interviewStage: InterviewStage;
}

export interface VirtualNodeId extends VirtualEndpointId {
	readonly id: number | undefined;
}

export interface PhysicalNodes<T extends NodeId> {
	readonly physicalNodes: readonly T[];
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
