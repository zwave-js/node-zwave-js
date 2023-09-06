import { num2hex } from "@zwave-js/shared/safe";
import { isObject } from "alcalzone-shared/typeguards";
import type { ICommandClass } from "../abstractions/ICommandClass";
import type { ProtocolDataRate } from "../capabilities/Protocols";
import { type S2SecurityClass } from "../security/SecurityClass";
import { Duration } from "../values/Duration";

/** The priority of messages, sorted from high (0) to low (>0) */
export enum MessagePriority {
	// High-priority controller commands that must be handled before all other commands.
	// We use this priority to decide which messages go onto the immediate queue.
	ControllerImmediate = 0,
	// Controller commands finish quickly and should be preferred over node queries
	Controller,
	// Some node commands like nonces, responses to Supervision and Transport Service
	// need to be handled before all node commands.
	// We use this priority to decide which messages go onto the immediate queue.
	Immediate,
	// To avoid S2 collisions, some commands that normally have Immediate priority
	// have to go onto the normal queue, but still before all other messages
	ImmediateLow,
	// Pings (NoOP) are used for device probing at startup and for network diagnostics
	Ping,
	// Whenever sleeping devices wake up, their queued messages must be handled quickly
	// because they want to go to sleep soon. So prioritize them over non-sleeping devices
	WakeUp,
	// Normal operation and node data exchange
	Normal,
	// Node querying is expensive and happens whenever a new node is discovered.
	// In order to keep the system responsive, give them a lower priority
	NodeQuery,
	// Some devices need their state to be polled at regular intervals. Only do that when
	// nothing else needs to be done
	Poll,
}

export function isMessagePriority(val: unknown): val is MessagePriority {
	return typeof val === "number" && val in MessagePriority;
}

export type MulticastDestination = [number, number, ...number[]];

export enum TransmitOptions {
	NotSet = 0,

	ACK = 1 << 0,
	LowPower = 1 << 1,
	AutoRoute = 1 << 2,

	NoRoute = 1 << 4,
	Explore = 1 << 5,

	DEFAULT = ACK | AutoRoute | Explore,
	DEFAULT_NOACK = DEFAULT & ~ACK,
}

export enum TransmitStatus {
	OK = 0x00,
	NoAck = 0x01,
	Fail = 0x02,
	NotIdle = 0x03,
	NoRoute = 0x04,
}

export type FrameType = "singlecast" | "broadcast" | "multicast";

/** A number between -128 and +124 dBm or one of the special values in {@link RssiError} indicating an error */
export type RSSI = number | RssiError;

export enum RssiError {
	NotAvailable = 127,
	ReceiverSaturated = 126,
	NoSignalDetected = 125,
}

export function isRssiError(rssi: RSSI): rssi is RssiError {
	return rssi >= RssiError.NoSignalDetected;
}

/** Averages RSSI measurements using an exponential moving average with the given weight for the accumulator */
export function averageRSSI(
	acc: number | undefined,
	rssi: RSSI,
	weight: number,
): number {
	if (isRssiError(rssi)) {
		switch (rssi) {
			case RssiError.NotAvailable:
				// If we don't have a value yet, return 0
				return acc ?? 0;
			case RssiError.ReceiverSaturated:
				// Assume rssi is 0 dBm
				rssi = 0;
				break;
			case RssiError.NoSignalDetected:
				// Assume rssi is -128 dBm
				rssi = -128;
				break;
		}
	}

	if (acc == undefined) return rssi;
	return Math.round(acc * weight + rssi * (1 - weight));
}

/**
 * Converts an RSSI value to a human readable format, i.e. the measurement including the unit or the corresponding error message.
 */
export function rssiToString(rssi: RSSI): string {
	switch (rssi) {
		case RssiError.NotAvailable:
			return "N/A";
		case RssiError.ReceiverSaturated:
			return "Receiver saturated";
		case RssiError.NoSignalDetected:
			return "No signal detected";
		default:
			return `${rssi} dBm`;
	}
}

/**
 * How the controller transmitted a frame to a node.
 */
export enum RoutingScheme {
	Idle,
	Direct,
	Priority,
	LWR,
	NLWR,
	Auto,
	ResortDirect,
	Explore,
}

/**
 * Converts a routing scheme value to a human readable format.
 */
export function routingSchemeToString(scheme: RoutingScheme): string {
	switch (scheme) {
		case RoutingScheme.Idle:
			return "Idle";
		case RoutingScheme.Direct:
			return "Direct";
		case RoutingScheme.Priority:
			return "Priority Route";
		case RoutingScheme.LWR:
			return "LWR";
		case RoutingScheme.NLWR:
			return "NLWR";
		case RoutingScheme.Auto:
			return "Auto Route";
		case RoutingScheme.ResortDirect:
			return "Resort to Direct";
		case RoutingScheme.Explore:
			return "Explorer Frame";
		default:
			return `Unknown (${num2hex(scheme)})`;
	}
}

/** Information about the transmission as received by the controller */
export interface TXReport {
	/** Transmission time in ticks (multiples of 10ms) */
	txTicks: number;
	/** Number of repeaters used in the route to the destination, 0 for direct range */
	numRepeaters: number;
	/** RSSI value of the acknowledgement frame */
	ackRSSI?: RSSI;
	/** RSSI values of the incoming acknowledgement frame, measured by repeater 0...3 */
	ackRepeaterRSSI?: [RSSI?, RSSI?, RSSI?, RSSI?];
	/** Channel number the acknowledgement frame is received on */
	ackChannelNo?: number;
	/** Channel number used to transmit the data */
	txChannelNo: number;
	/** State of the route resolution for the transmission attempt. Encoding is manufacturer specific. Z-Wave JS uses the Silicon Labs interpretation. */
	routeSchemeState: RoutingScheme;
	/** Node IDs of the repeater 0..3 used in the route. */
	repeaterNodeIds: [number?, number?, number?, number?];
	/** Whether the destination requires a 1000ms beam to be reached */
	beam1000ms: boolean;
	/** Whether the destination requires a 250ms beam to be reached */
	beam250ms: boolean;
	/** Transmission speed used in the route */
	routeSpeed: ProtocolDataRate;
	/** How many routing attempts have been made to transmit the payload */
	routingAttempts: number;
	/** When a route failed, this indicates the last functional Node ID in the last used route */
	failedRouteLastFunctionalNodeId?: number;
	/** When a route failed, this indicates the first non-functional Node ID in the last used route */
	failedRouteFirstNonFunctionalNodeId?: number;
	/** Transmit power used for the transmission in dBm */
	txPower?: number;
	/** Measured noise floor during the outgoing transmission */
	measuredNoiseFloor?: RSSI;
	/** TX power in dBm used by the destination to transmit the ACK */
	destinationAckTxPower?: number;
	/** Measured RSSI of the acknowledgement frame received from the destination */
	destinationAckMeasuredRSSI?: RSSI;
	/** Noise floor measured by the destination during the ACK transmission */
	destinationAckMeasuredNoiseFloor?: RSSI;
}

/** Information about the transmission, but for serialization in mocks */
export type SerializableTXReport =
	& Partial<Omit<TXReport, "numRepeaters">>
	& Pick<TXReport, "txTicks" | "routeSpeed">;

export interface SendMessageOptions {
	/** The priority of the message to send. If none is given, the defined default priority of the message class will be used. */
	priority?: MessagePriority;
	/** If an exception should be thrown when the message to send is not supported. Setting this to false is is useful if the capabilities haven't been determined yet. Default: true */
	supportCheck?: boolean;
	/**
	 * Whether the driver should update the node status to asleep or dead when a transaction is not acknowledged (repeatedly).
	 * Setting this to false will cause the simply transaction to be rejected on failure.
	 * Default: true
	 */
	changeNodeStatusOnMissingACK?: boolean;
	/** Sets the number of milliseconds after which a queued message expires. When the expiration timer elapses, the promise is rejected with the error code `Controller_MessageExpired`. */
	expire?: number;
	/**
	 * @internal
	 * Information used to identify or mark this transaction
	 */
	tag?: any;
	/**
	 * @internal
	 * Whether the send thread MUST be paused after this message was handled
	 */
	pauseSendThread?: boolean;
	/** If a Wake Up On Demand should be requested for the target node. */
	requestWakeUpOnDemand?: boolean;
	/**
	 * When a message sent to a node results in a TX report to be received, this callback will be called.
	 * For multi-stage messages, the callback may be called multiple times.
	 */
	onTXReport?: (report: TXReport) => void;

	/** Will be called when the transaction for this message progresses. */
	onProgress?: TransactionProgressListener;
}

export enum EncapsulationFlags {
	None = 0,
	Supervision = 1 << 0,
	// Multi Channel is tracked through the endpoint index
	Security = 1 << 1,
	CRC16 = 1 << 2,
}

export type SupervisionOptions =
	| (
		& {
			/** Whether supervision may be used. `false` disables supervision. Default: `"auto"`. */
			useSupervision?: "auto";
		}
		& (
			| {
				requestStatusUpdates?: false;
			}
			| {
				requestStatusUpdates: true;
				onUpdate: SupervisionUpdateHandler;
			}
		)
	)
	| {
		useSupervision: false;
	};

export type SendCommandSecurityS2Options = {
	/** Send the command using a different (lower) security class */
	s2OverrideSecurityClass?: S2SecurityClass;
	/** Whether delivery of non-supervised SET-type commands is verified by waiting for potential Nonce Reports. Default: true */
	s2VerifyDelivery?: boolean;
	/** Whether the MOS extension should be included in S2 message encapsulation. */
	s2MulticastOutOfSync?: boolean;
	/** The optional multicast group ID to use for S2 message encapsulation. */
	s2MulticastGroupId?: number;
};

export type SendCommandOptions =
	& SendMessageOptions
	& SupervisionOptions
	& SendCommandSecurityS2Options
	& {
		/** How many times the driver should try to send the message. Defaults to the configured Driver option */
		maxSendAttempts?: number;
		/** Whether the driver should automatically handle the encapsulation. Default: true */
		autoEncapsulate?: boolean;
		/** Used to send a response with the same encapsulation flags as the corresponding request. */
		encapsulationFlags?: EncapsulationFlags;
		/** Overwrite the default transmit options */
		transmitOptions?: TransmitOptions;
		/** Overwrite the default report timeout */
		reportTimeoutMs?: number;
	};

export type SendCommandReturnType<TResponse extends ICommandClass | undefined> =
	undefined extends TResponse ? SupervisionResult | undefined
		: TResponse | undefined;

export enum SupervisionStatus {
	NoSupport = 0x00,
	Working = 0x01,
	Fail = 0x02,
	Success = 0xff,
}

export type SupervisionResult =
	| {
		status:
			| SupervisionStatus.NoSupport
			| SupervisionStatus.Fail
			| SupervisionStatus.Success;
		remainingDuration?: undefined;
	}
	| {
		status: SupervisionStatus.Working;
		remainingDuration: Duration;
	};

export type SupervisionUpdateHandler = (update: SupervisionResult) => void;

export function isSupervisionResult(obj: unknown): obj is SupervisionResult {
	return (
		isObject(obj)
		&& "status" in obj
		&& typeof SupervisionStatus[obj.status as any] === "string"
	);
}

export function supervisedCommandSucceeded(
	result: unknown,
): result is SupervisionResult & {
	status: SupervisionStatus.Success | SupervisionStatus.Working;
} {
	return (
		isSupervisionResult(result)
		&& (result.status === SupervisionStatus.Success
			|| result.status === SupervisionStatus.Working)
	);
}

export function supervisedCommandFailed(
	result: unknown,
): result is SupervisionResult & {
	status: SupervisionStatus.Fail | SupervisionStatus.NoSupport;
} {
	return (
		isSupervisionResult(result)
		&& (result.status === SupervisionStatus.Fail
			|| result.status === SupervisionStatus.NoSupport)
	);
}

export function isUnsupervisedOrSucceeded(
	result: SupervisionResult | undefined,
): result is
	| undefined
	| (SupervisionResult & {
		status: SupervisionStatus.Success | SupervisionStatus.Working;
	})
{
	return !result || supervisedCommandSucceeded(result);
}

/** Figures out the final supervision result from an array of things that may be supervision results */
export function mergeSupervisionResults(
	results: unknown[],
): SupervisionResult | undefined {
	const supervisionResults = results.filter(isSupervisionResult);
	if (!supervisionResults.length) return undefined;

	if (supervisionResults.some((r) => r.status === SupervisionStatus.Fail)) {
		return {
			status: SupervisionStatus.Fail,
		};
	} else if (
		supervisionResults.some((r) => r.status === SupervisionStatus.NoSupport)
	) {
		return {
			status: SupervisionStatus.NoSupport,
		};
	}
	const working = supervisionResults.filter(
		(r): r is SupervisionResult & { status: SupervisionStatus.Working } =>
			r.status === SupervisionStatus.Working,
	);
	if (working.length > 0) {
		const durations = working.map((r) =>
			r.remainingDuration.serializeSet()
		);
		const maxDuration = (durations.length > 0
			&& Duration.parseReport(Math.max(...durations)))
			|| Duration.unknown();
		return {
			status: SupervisionStatus.Working,
			remainingDuration: maxDuration,
		};
	}
	return {
		status: SupervisionStatus.Success,
	};
}

/**
 * The state a transaction is in.
 */
export enum TransactionState {
	/** The transaction is currently queued */
	Queued,
	/** The transaction is currently being handled */
	Active,
	/** The transaction was completed */
	Completed,
	/** The transaction failed */
	Failed,
}

export type TransactionProgress = {
	state:
		| TransactionState.Queued
		| TransactionState.Active
		| TransactionState.Completed;
} | {
	state: TransactionState.Failed;
	/** Why the transaction failed */
	reason?: string;
};

export type TransactionProgressListener = (
	progress: TransactionProgress,
) => void;
