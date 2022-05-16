import type { DeviceConfig } from "@zwave-js/config";
import type {
	FLiRS,
	InterviewStage,
	Maybe,
	NodeStatus,
	SecurityClassOwner,
} from "@zwave-js/core";
import type { ZWaveEndpointBase } from "./ZWaveEndpointBase";

export interface ZWaveNodeBase extends ZWaveEndpointBase, SecurityClassOwner {
	readonly id: number;
	isListening: boolean | undefined;
	isFrequentListening: FLiRS | undefined;
	readonly canSleep: boolean | undefined;
	readonly status: NodeStatus;
	interviewStage: InterviewStage;
	deviceConfig?: DeviceConfig;

	getEndpoint(index: 0): ZWaveEndpointBase;
	getEndpoint(index: number): ZWaveEndpointBase | undefined;
	readonly isSecure: Maybe<boolean>;
}
