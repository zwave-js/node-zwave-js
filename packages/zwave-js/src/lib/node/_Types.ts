import type {
	MetadataUpdatedArgs,
	NodeStatus,
	ValueAddedArgs,
	ValueID,
	ValueNotificationArgs,
	ValueRemovedArgs,
	ValueUpdatedArgs,
} from "@zwave-js/core";
import type {
	FirmwareUpdateStatus,
	Powerlevel,
	ZWaveNotificationCallbackParams_EntryControlCC,
	ZWaveNotificationCallbackParams_MultilevelSwitchCC,
	ZWaveNotificationCallbackParams_NotificationCC,
	ZWaveNotificationCallbackParams_PowerlevelCC,
} from "../commandclass/_Types";
import type { ZWaveNode } from "./Node";
import type { RouteStatistics } from "./NodeStatistics";

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
export type ZWaveNodeValueUpdatedArgs = Omit<ValueUpdatedArgs, "source"> &
	TranslatedValueID;
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
		| ZWaveNotificationCallbackParams_MultilevelSwitchCC
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

export { InterviewStage, NodeStatus } from "@zwave-js/core/safe";

/** Represents the result of one health check round of a node's lifeline */
export interface LifelineHealthCheckResult {
	/**
	 * How many times at least one new route was needed. Lower = better, ideally 0.
	 *
	 * Only available if the controller supports TX reports.
	 */
	routeChanges?: number;
	/**
	 * The maximum time it took to send a ping to the node. Lower = better, ideally 10 ms.
	 *
	 * Will use the time in TX reports if available, otherwise fall back to measuring the round trip time.
	 */
	latency: number;
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

	/** See {@link LifelineHealthCheckSummary.rating} */
	rating: number;
}

export interface LifelineHealthCheckSummary {
	/** The check results of each round */
	results: LifelineHealthCheckResult[];
	/**
	 * The health rating expressed as a number from 0 (not working at all) to 10 (perfect connectivity).
	 * The rating is calculated evaluating the test results of the worst round similar to Silabs' PC controller.
	 * Each rating is only achieved if all the requirements are fulfilled.
	 *
	 * | Rating | Failed pings | Latency       | No. of neighbors | min. powerlevel | SNR margin |
	 * | -----: | -----------: | ------------: | ---------------: | --------------: | ---------: |
	 * | ✅  10 |            0 |      ≤  50 ms |              > 2 |        ≤ −6 dBm |   ≥ 17 dBm |
	 * | 🟢   9 |            0 |      ≤ 100 ms |              > 2 |        ≤ −6 dBm |   ≥ 17 dBm |
	 * | 🟢   8 |            0 |      ≤ 100 ms |              ≤ 2 |        ≤ −6 dBm |   ≥ 17 dBm |
	 * | 🟢   7 |            0 |      ≤ 100 ms |              > 2 |               - |          - |
	 * | 🟢   6 |            0 |      ≤ 100 ms |              ≤ 2 |               - |          - |
	 * |        |              |               |                  |                 |            |
	 * | 🟡   5 |            0 |      ≤ 250 ms |                - |               - |          - |
	 * | 🟡   4 |            0 |      ≤ 500 ms |                - |               - |          - |
	 * |        |              |               |                  |                 |            |
	 * | 🔴   3 |            1 |     ≤ 1000 ms |                - |               - |          - |
	 * | 🔴   2 |          ≤ 2 |     > 1000 ms |                - |               - |          - |
	 * | 🔴   1 |          ≤ 9 |             - |                - |               - |          - |
	 * |        |              |               |                  |                 |            |
	 * | ❌   0 |           10 |             - |                - |               - |          - |
	 *
	 * If the min. powerlevel or SNR margin can not be measured, the condition is assumed to be fulfilled.
	 */
	rating: number;
}

/** Represents the result of one health check round of a route between two nodes */
export interface RouteHealthCheckResult {
	/** How many routing neighbors this node has. Higher = better, ideally > 2. */
	numNeighbors: number;
	/**
	 * How many pings were not ACKed by the target node. Lower = better, ideally 0.
	 *
	 * Only available if the source node supports Powerlevel CC
	 */
	failedPingsToTarget?: number;
	/**
	 * How many pings were not ACKed by the source node. Lower = better, ideally 0.
	 *
	 * Only available if the target node supports Powerlevel CC
	 */
	failedPingsToSource?: number;
	/**
	 * The minimum powerlevel where all pings from the source node were ACKed by the target node. Higher = better, ideally 6dBm or more.
	 *
	 * Only available if the source node supports Powerlevel CC
	 */
	minPowerlevelSource?: Powerlevel;
	/**
	 * The minimum powerlevel where all pings from the target node were ACKed by the source node. Higher = better, ideally 6dBm or more.
	 *
	 * Only available if the source node supports Powerlevel CC
	 */
	minPowerlevelTarget?: Powerlevel;

	/** See {@link RouteHealthCheckSummary.rating} */
	rating: number;
}

export interface RouteHealthCheckSummary {
	/** The check results of each round */
	results: RouteHealthCheckResult[];
	/**
	 * The health rating expressed as a number from 0 (not working at all) to 10 (perfect connectivity).
	 * See {@link LifelineHealthCheckSummary.rating} for a detailed description.
	 *
	 * Because the connection between two nodes can only be evaluated with successful pings, the ratings 4, 5 and 9
	 * cannot be achieved in this test:
	 *
	 * | Rating | Failed pings | No. of neighbors | min. powerlevel |
	 * | -----: | -----------: | ---------------: | --------------: |
	 * | ✅  10 |            0 |              > 2 |        ≤ −6 dBm |
	 * | 🟢   8 |            0 |              ≤ 2 |        ≤ −6 dBm |
	 * | 🟢   7 |            0 |              > 2 |               - |
	 * | 🟢   6 |            0 |              ≤ 2 |               - |
	 * |        |              |                  |                 |
	 * | 🔴   3 |            1 |                - |               - |
	 * | 🔴   2 |            2 |                - |               - |
	 * | 🔴   1 |          ≤ 9 |                - |               - |
	 * |        |              |                  |                 |
	 * | ❌   0 |           10 |                - |               - |
	 */
	rating: number;
}

export interface RefreshInfoOptions {
	/**
	 * Whether a re-interview should also reset the known security classes.
	 * Default: false
	 */
	resetSecurityClasses?: boolean;

	/**
	 * Whether the information about sleeping nodes should only be reset when the node wakes up.
	 * Default: true
	 */
	waitForWakeup?: boolean;
}

/** The last known routes between the controller and a node */
export interface LifelineRoutes {
	/** The last working route from the controller to this node. */
	lwr?: RouteStatistics;
	/** The next to last working route from the controller to this node. */
	nlwr?: RouteStatistics;
}
