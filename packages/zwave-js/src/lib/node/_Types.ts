import type { NotificationCCReport } from "@zwave-js/cc/NotificationCC";
import type {
	EntryControlDataTypes,
	EntryControlEventTypes,
	FirmwareUpdateProgress,
	FirmwareUpdateResult,
	MultilevelSwitchCommand,
	Powerlevel,
	PowerlevelTestStatus,
	Weekday,
} from "@zwave-js/cc/safe";
import type {
	CommandClasses,
	MetadataUpdatedArgs,
	NodeStatus,
	TranslatedValueID,
	ValueAddedArgs,
	ValueNotificationArgs,
	ValueRemovedArgs,
	ValueUpdatedArgs,
} from "@zwave-js/core/safe";
import { type AllOrNone } from "@zwave-js/shared";
import { type Endpoint } from "./Endpoint";
import type { ZWaveNode } from "./Node";
import type { RouteStatistics } from "./NodeStatistics";

export {
	EntryControlDataTypes,
	EntryControlEventTypes,
	FirmwareUpdateStatus,
	MultilevelSwitchCommand,
	Powerlevel,
	PowerlevelTestStatus,
} from "@zwave-js/cc/safe";
export {
	ControllerStatus,
	InterviewStage,
	NodeStatus,
} from "@zwave-js/core/safe";

export type NodeInterviewFailedEventArgs =
	& {
		errorMessage: string;
		isFinal: boolean;
	}
	& (
		| {
			attempt: number;
			maxAttempts: number;
		}
		// eslint-disable-next-line @typescript-eslint/ban-types
		| {}
	);

export type ZWaveNodeValueAddedArgs = ValueAddedArgs & TranslatedValueID;
export type ZWaveNodeValueUpdatedArgs =
	& Omit<ValueUpdatedArgs, "source">
	& TranslatedValueID;
export type ZWaveNodeValueRemovedArgs = ValueRemovedArgs & TranslatedValueID;
export type ZWaveNodeValueNotificationArgs =
	& ValueNotificationArgs
	& TranslatedValueID;

export type ZWaveNodeMetadataUpdatedArgs =
	& MetadataUpdatedArgs
	& TranslatedValueID;

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
	progress: FirmwareUpdateProgress,
) => void;
export type ZWaveNodeFirmwareUpdateFinishedCallback = (
	node: ZWaveNode,
	result: FirmwareUpdateResult,
) => void;
export type ZWaveNodeStatusChangeCallback = (
	node: ZWaveNode,
	oldStatus: NodeStatus,
) => void;

/**
 * This is emitted when a start or stop event is received
 */
export interface ZWaveNotificationCallbackArgs_MultilevelSwitchCC {
	/** The numeric identifier for the event type */
	eventType:
		| MultilevelSwitchCommand.StartLevelChange
		| MultilevelSwitchCommand.StopLevelChange;
	/** A human-readable label for the event type */
	eventTypeLabel: string;
	/** The direction of the level change */
	direction?: string;
}

/**
 * Parameter types for the MultilevelSwitch CC specific version of ZWaveNotificationCallback
 */
export type ZWaveNotificationCallbackParams_MultilevelSwitchCC = [
	endpoint: Endpoint,
	ccId: (typeof CommandClasses)["Multilevel Switch"],
	args: ZWaveNotificationCallbackArgs_MultilevelSwitchCC,
];

export interface ZWaveNotificationCallbackArgs_NotificationCC {
	/** The numeric identifier for the notification type */
	type: number;
	/** The human-readable label for the notification type */
	label: string;
	/** The numeric identifier for the notification event */
	event: number;
	/** The human-readable label for the notification event */
	eventLabel: string;
	/** Additional information related to the event */
	parameters?: NotificationCCReport["eventParameters"];
}

/**
 * Parameter types for the Notification CC specific version of ZWaveNotificationCallback
 */
export type ZWaveNotificationCallbackParams_NotificationCC = [
	endpoint: Endpoint,
	ccId: CommandClasses.Notification,
	args: ZWaveNotificationCallbackArgs_NotificationCC,
];

/**
 * This is emitted when an unsolicited powerlevel test report is received
 */
export interface ZWaveNotificationCallbackArgs_PowerlevelCC {
	testNodeId: number;
	status: PowerlevelTestStatus;
	acknowledgedFrames: number;
}

/**
 * Parameter types for the Powerlevel CC specific version of ZWaveNotificationCallback
 */
export type ZWaveNotificationCallbackParams_PowerlevelCC = [
	endpoint: Endpoint,
	ccId: CommandClasses.Powerlevel,
	args: ZWaveNotificationCallbackArgs_PowerlevelCC,
];

export interface ZWaveNotificationCallbackArgs_EntryControlCC {
	eventType: EntryControlEventTypes;
	/** A human-readable label for the event type */
	eventTypeLabel: string;
	dataType: EntryControlDataTypes;
	/** A human-readable label for the data type */
	dataTypeLabel: string;
	eventData?: Buffer | string;
}

/**
 * Parameter types for the Entry Control CC specific version of ZWaveNotificationCallback
 */
export type ZWaveNotificationCallbackParams_EntryControlCC = [
	endpoint: Endpoint,
	ccId: (typeof CommandClasses)["Entry Control"],
	args: ZWaveNotificationCallbackArgs_EntryControlCC,
];

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

export const zWaveNodeEvents = [
	"notification",
	"interview failed",
	"firmware update progress",
	"firmware update finished",
	"wake up",
	"sleep",
	"dead",
	"alive",
	"interview completed",
	"ready",
	"interview stage completed",
	"interview started",
	"value added",
	"value updated",
	"value removed",
	"metadata updated",
	"value notification",
] as const satisfies readonly ZWaveNodeEvents[];

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

	/**
	 * How many routing neighbors this node has (Z-Wave Classic only). Higher = better, ideally > 2.
	 * For Z-Wave LR, this is undefined.
	 */
	numNeighbors?: number;

	/**
	 * How many pings were not ACKed by the node. Lower = better, ideally 0.
	 */
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
	 * The no. of neighbors is only relevant for Z-Wave Classic. The condition is assumed to be fulfilled for Z-Wave LR.
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

export enum LinkReliabilityCheckMode {
	BasicSetOnOff,
}

export interface LinkReliabilityCheckOptions {
	mode: LinkReliabilityCheckMode;
	interval: number;
	rounds?: number;
	onProgress?: (progress: LinkReliabilityCheckResult) => void;
}

export interface LinkReliabilityCheckResult {
	rounds: number;

	commandsSent: number;
	commandErrors: number;
	missingResponses?: number;

	latency: {
		min: number;
		max: number;
		average: number;
	};

	ackRSSI: {
		min: number;
		max: number;
		average: number;
	};

	responseRSSI?: {
		min: number;
		max: number;
		average: number;
	};
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

export type DateAndTime =
	& AllOrNone<{
		hour: number;
		minute: number;
	}>
	& (
		| { weekday?: Weekday; second?: undefined }
		| { weekday?: undefined; second?: number }
	)
	& AllOrNone<{
		year: number;
		month: number;
		day: number;
	}>
	& AllOrNone<{
		dstOffset: number;
		standardOffset: number;
	}>;
