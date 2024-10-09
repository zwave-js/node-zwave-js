import {
	type FLiRS,
	type IZWaveEndpoint,
	type IZWaveNode,
	type InterviewStage,
	type MaybeNotKnown,
	type NodeStatus,
	type SecurityClass,
} from "@zwave-js/core";
import { Endpoint } from "../Endpoint";

export abstract class ZWaveNodeBase extends Endpoint implements IZWaveNode {
	abstract isListening: MaybeNotKnown<boolean>;
	abstract isFrequentListening: MaybeNotKnown<FLiRS>;
	abstract canSleep: MaybeNotKnown<boolean>;
	abstract status: NodeStatus;
	abstract interviewStage: InterviewStage;
	abstract getEndpoint(index: 0): IZWaveEndpoint;
	abstract getEndpoint(index: number): IZWaveEndpoint | undefined;
	abstract getEndpoint(index: unknown): IZWaveEndpoint | undefined;

	abstract getEndpointOrThrow(index: number): IZWaveEndpoint;

	abstract getAllEndpoints(): IZWaveEndpoint[];

	abstract isSecure: MaybeNotKnown<boolean>;
	abstract getHighestSecurityClass(): MaybeNotKnown<SecurityClass>;

	abstract hasSecurityClass(
		securityClass: SecurityClass,
	): MaybeNotKnown<boolean>;

	abstract setSecurityClass(
		securityClass: SecurityClass,
		granted: boolean,
	): void;

	/**
	 * Whether the node should be kept awake when there are no pending messages.
	 */
	public keepAwake: boolean = false;

	/** The ID of this node */
	public get id(): number {
		return this.nodeId;
	}
}
