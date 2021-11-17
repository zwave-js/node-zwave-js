import type {
	MetadataUpdatedArgs,
	ValueAddedArgs,
	ValueID,
	ValueNotificationArgs,
	ValueRemovedArgs,
	ValueUpdatedArgs,
} from "@zwave-js/core";
import type { FirmwareUpdateStatus } from "../commandclass";
import type { ZWaveNotificationCallbackParams_EntryControlCC } from "../commandclass/EntryControlCC";
import type { ZWaveNotificationCallbackParams_NotificationCC } from "../commandclass/NotificationCC";
import type {
	Powerlevel,
	ZWaveNotificationCallbackParams_PowerlevelCC,
} from "../commandclass/PowerlevelCC";
import type { ZWaveNode } from "./Node";

export interface TranslatedValueID extends ValueID {
	commandClassName: string;
	propertyName?: string;
	propertyKeyName?: string;
}

export type NodeInterviewFailedEventArgs = {
	errorMessage: string;
	isFinal: boolean;
} & (
	| {
			attempt: number;
			maxAttempts: number;
	  }
	// eslint-disable-next-line @typescript-eslint/ban-types
	| {}
);

export type ZWaveNodeValueAddedArgs = ValueAddedArgs & TranslatedValueID;
export type ZWaveNodeValueUpdatedArgs = ValueUpdatedArgs & TranslatedValueID;
export type ZWaveNodeValueRemovedArgs = ValueRemovedArgs & TranslatedValueID;
export type ZWaveNodeValueNotificationArgs = ValueNotificationArgs &
	TranslatedValueID;

export type ZWaveNodeMetadataUpdatedArgs = MetadataUpdatedArgs &
	TranslatedValueID;

export type ZWaveNodeValueAddedCallback = (
	node: ZWaveNode,
	args: ZWaveNodeValueAddedArgs,
) => void;
export type ZWaveNodeValueUpdatedCallback = (
	node: ZWaveNode,
	args: ZWaveNodeValueUpdatedArgs,
) => void;
export type ZWaveNodeValueRemovedCallback = (
	node: ZWaveNode,
	args: ZWaveNodeValueRemovedArgs,
) => void;
export type ZWaveNodeValueNotificationCallback = (
	node: ZWaveNode,
	args: ZWaveNodeValueNotificationArgs,
) => void;
export type ZWaveNodeMetadataUpdatedCallback = (
	node: ZWaveNode,
	args: ZWaveNodeMetadataUpdatedArgs,
) => void;
export type ZWaveInterviewFailedCallback = (
	node: ZWaveNode,
	args: NodeInterviewFailedEventArgs,
) => void;
export type ZWaveNodeFirmwareUpdateProgressCallback = (
	node: ZWaveNode,
	sentFragments: number,
	totalFragments: number,
) => void;
export type ZWaveNodeFirmwareUpdateFinishedCallback = (
	node: ZWaveNode,
	status: FirmwareUpdateStatus,
	waitTime?: number,
) => void;
export type ZWaveNodeStatusChangeCallback = (
	node: ZWaveNode,
	oldStatus: NodeStatus,
) => void;

export type ZWaveNotificationCallback = (
	...args:
		| ZWaveNotificationCallbackParams_NotificationCC
		| ZWaveNotificationCallbackParams_EntryControlCC
		| ZWaveNotificationCallbackParams_PowerlevelCC
) => void;

export interface ZWaveNodeValueEventCallbacks {
	"value added": ZWaveNodeValueAddedCallback;
	"value updated": ZWaveNodeValueUpdatedCallback;
	"value removed": ZWaveNodeValueRemovedCallback;
	"metadata updated": ZWaveNodeMetadataUpdatedCallback;
	"value notification": ZWaveNodeValueNotificationCallback;
}

export interface ZWaveNodeEventCallbacks extends ZWaveNodeValueEventCallbacks {
	notification: ZWaveNotificationCallback;
	"interview failed": ZWaveInterviewFailedCallback;
	"firmware update progress": ZWaveNodeFirmwareUpdateProgressCallback;
	"firmware update finished": ZWaveNodeFirmwareUpdateFinishedCallback;
	"wake up": ZWaveNodeStatusChangeCallback;
	sleep: ZWaveNodeStatusChangeCallback;
	dead: ZWaveNodeStatusChangeCallback;
	alive: ZWaveNodeStatusChangeCallback;
	"interview completed": (node: ZWaveNode) => void;
	ready: (node: ZWaveNode) => void;
	"interview stage completed": (node: ZWaveNode, stageName: string) => void;
	"interview started": (node: ZWaveNode) => void;
}

export type ZWaveNodeEvents = Extract<keyof ZWaveNodeEventCallbacks, string>;

// prettier-ignore
export enum InterviewStage {
	/** The interview process hasn't started for this node */
	None,
	/** The node's protocol information has been queried from the controller */
	ProtocolInfo,
	/** The node has been queried for supported and controlled command classes */
	NodeInfo,

	/**
	 * Information for all command classes has been queried.
	 * This includes static information that is requested once as well as dynamic
	 * information that is requested on every restart.
	 */
	CommandClasses,

	// TODO: Heal network on startup

	/**
	 * Device information for the node has been loaded from a config file.
	 * If defined, some of the reported information will be overwritten based on the
	 * config file contents.
	 */
	OverwriteConfig,

	/** The interview process has finished */
	Complete,
}

export enum NodeStatus {
	Unknown,
	Asleep,
	Awake,
	Dead,
	Alive,
}

export enum ProtocolVersion {
	"unknown" = 0,
	"2.0" = 1,
	"4.2x / 5.0x" = 2,
	"4.5x / 6.0x" = 3,
}

export type FLiRS = false | "250ms" | "1000ms";

export type DataRate = 9600 | 40000 | 100000;

export enum NodeType {
	Controller,
	"Routing End Node",
}

/** Represents the result of one check round, usually 10 pings in both directions */
export interface HealthCheckResult {
	/**
	 * How many route changes were needed. Lower = better, ideally 0.
	 *
	 * Only available if the controller supports TX reports.
	 */
	routeChanges?: number;
	/** How many routing neighbors this node has. Higher = better, ideally > 2. */
	numNeighbors: number;
	/** How many pings were not ACKed by the node. Lower = better, ideally 0. */
	failedPingsNode: number;
	/**
	 * The minimum powerlevel where all pings from the node were ACKed by the controller. Higher = better, ideally 6dBm or more.
	 *
	 * Only available if the node supports Powerlevel CC
	 */
	minPowerlevel?: Powerlevel;
	/**
	 * If no powerlevel was found where the controller ACKed all pings from the node, this contains the number of pings that weren't ACKed. Lower = better, ideally 0.
	 *
	 * Only available if the node supports Powerlevel CC
	 */
	failedPingsController?: number;
	/**
	 * An estimation of the Signal-to-Noise Ratio Margin in dBm.
	 *
	 * Only available if the controller supports TX reports.
	 */
	snrMargin?: number;

	/** See {@link HealthCheckSummary.rating} */
	rating: number;
}

export interface HealthCheckSummary {
	/** The check results of each round */
	results: HealthCheckResult[];
	/**
	 * The health rating expressed as a number from 0 (not working at all) to 10 (perfect connectivity).
	 * The rating is calculated evaluating the test results of the worst round similar to Silabs' PC controller.
	 * Each rating is only achieved if all the requirements are fulfilled.
	 *
	 * | Rating | Failed pings | Route changes | No. of neighbors | min. powerlevel | SNR margin |
	 * | -----: | -----------: | ------------: | ---------------: | --------------: | ---------: |
	 * | ✅  10 |            0 |             0 |              > 2 |        ≤ −6 dBm |   ≥ 17 dBm |
	 * | 🟢   9 |            0 |             1 |              > 2 |        ≤ −6 dBm |   ≥ 17 dBm |
	 * | 🟢   8 |            0 |           ≤ 1 |              ≤ 2 |        ≤ −6 dBm |   ≥ 17 dBm |
	 * | 🟢   7 |            0 |           ≤ 1 |              > 2 |               - |          - |
	 * | 🟢   6 |            0 |           ≤ 1 |              ≤ 2 |               - |          - |
	 * |        |              |               |                  |                 |            |
	 * | 🟡   5 |            0 |           ≤ 4 |                - |               - |          - |
	 * | 🟡   4 |            0 |           > 4 |                - |               - |          - |
	 * |        |              |               |                  |                 |            |
	 * | 🔴   3 |            1 |             - |                - |               - |          - |
	 * | 🔴   2 |            2 |             - |                - |               - |          - |
	 * | 🔴   1 |          ≤ 9 |             - |                - |               - |          - |
	 * |        |              |               |                  |                 |            |
	 * | ❌   0 |           10 |             - |                - |               - |          - |
	 *
	 * If the min. powerlevel or SNR margin can not be measured, the condition is assumed to be fulfilled.
	 */
	rating: number;
}
