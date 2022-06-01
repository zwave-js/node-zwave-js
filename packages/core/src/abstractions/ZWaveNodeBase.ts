import type { FLiRS } from "../capabilities/NodeInfo";
import type { InterviewStage, NodeStatus } from "../consts";
import type { Maybe } from "../index_safe";
import type { SecurityClassOwner } from "../security/SecurityClass";
import type {
	VirtualEndpointBase,
	ZWaveEndpointBase,
} from "./ZWaveEndpointBase";

export interface ZWaveNodeBase extends ZWaveEndpointBase, SecurityClassOwner {
	readonly id: number;
	isListening: boolean | undefined;
	isFrequentListening: FLiRS | undefined;
	readonly canSleep: boolean | undefined;
	readonly status: NodeStatus;
	interviewStage: InterviewStage;

	getEndpoint(index: 0): ZWaveEndpointBase;
	getEndpoint(index: number): ZWaveEndpointBase | undefined;
	getEndpointOrThrow(index: number): ZWaveEndpointBase;
	getAllEndpoints(): ZWaveEndpointBase[];
	readonly isSecure: Maybe<boolean>;
}

export interface VirtualNodeBase extends VirtualEndpointBase {
	readonly id: number | undefined;
	readonly physicalNodes: readonly ZWaveNodeBase[];

	getEndpoint(index: 0): VirtualEndpointBase;
	getEndpoint(index: number): VirtualEndpointBase | undefined;
	getEndpointOrThrow(index: number): VirtualEndpointBase;
}
