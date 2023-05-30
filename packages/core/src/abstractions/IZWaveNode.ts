import type { FLiRS } from "../capabilities/NodeInfo";
import type { InterviewStage, NodeStatus } from "../consts";
import type { SecurityClassOwner } from "../security/SecurityClass";
import { type MaybeNotKnown } from "../values/Primitive";
import type { IVirtualEndpoint, IZWaveEndpoint } from "./IZWaveEndpoint";

/** A basic abstraction of a Z-Wave node providing access to the relevant functionality */
export interface IZWaveNode extends IZWaveEndpoint, SecurityClassOwner {
	readonly id: number;
	isListening: boolean | undefined;
	isFrequentListening: FLiRS | undefined;
	readonly canSleep: boolean | undefined;
	readonly status: NodeStatus;
	interviewStage: InterviewStage;

	getEndpoint(index: 0): IZWaveEndpoint;
	getEndpoint(index: number): IZWaveEndpoint | undefined;
	getEndpointOrThrow(index: number): IZWaveEndpoint;
	getAllEndpoints(): IZWaveEndpoint[];
	readonly isSecure: MaybeNotKnown<boolean>;
}

/** A basic abstraction of a virtual node (multicast or broadcast) providing access to the relevant functionality */
export interface IVirtualNode extends IVirtualEndpoint {
	readonly id: number | undefined;
	readonly physicalNodes: readonly IZWaveNode[];

	getEndpoint(index: 0): IVirtualEndpoint;
	getEndpoint(index: number): IVirtualEndpoint | undefined;
	getEndpointOrThrow(index: number): IVirtualEndpoint;
}
