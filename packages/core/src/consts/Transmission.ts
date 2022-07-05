import { isObject } from "alcalzone-shared/typeguards";
import type { ICommandClass } from "../abstractions/ICommandClass";
import type { ProtocolDataRate } from "../capabilities/Protocols";
import type { Duration } from "../values/Duration";

/** The priority of messages, sorted from high (0) to low (>0) */
export enum MessagePriority {
	// Outgoing nonces have the highest priority because they are part of other transactions
	// which may already be in progress.
	// Some nodes don't respond to our requests if they are waiting for a nonce, so those need to be handled first.
	Nonce = 0,
	// Controller commands usually finish quickly and should be preferred over node queries
	Controller,
	// Multistep controller commands typically require user interaction but still
	// should happen at a higher priority than any node data exchange
	MultistepController,
	// Supervision responses must be prioritized over other messages because the nodes requesting them
	// will get impatient otherwise.
	Supervision,
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
}

export enum TransmitStatus {
	OK = 0x00,
	NoAck = 0x01,
	Fail = 0x02,
	NotIdle = 0x03,
	NoRoute = 0x04,
}

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
	/** State of the route resolution for the transmission attempt. Encoding is manufacturer specific. */
	routeSchemeState: number;
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
	/** Sets the number of milliseconds after which a message expires. When the expiration timer elapses, the promise is rejected with the error code `Controller_MessageExpired`. */
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
}

export type SupervisionOptions =
	| ({
			/** Whether supervision may be used. `false` disables supervision. Default: `"auto"`. */
			useSupervision?: "auto";
	  } & (
			| {
					requestStatusUpdates?: false;
			  }
			| {
					requestStatusUpdates: true;
					onUpdate: SupervisionUpdateHandler;
			  }
	  ))
	| {
			useSupervision: false;
	  };

export type SendCommandOptions = SendMessageOptions &
	SupervisionOptions & {
		/** How many times the driver should try to send the message. Defaults to the configured Driver option */
		maxSendAttempts?: number;
		/** Whether the driver should automatically handle the encapsulation. Default: true */
		autoEncapsulate?: boolean;
		/** Overwrite the default transmit options */
		transmitOptions?: TransmitOptions;
	};

export type SendCommandReturnType<TResponse extends ICommandClass | undefined> =
	undefined extends TResponse
		? SupervisionResult | undefined
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
		isObject(obj) &&
		"status" in obj &&
		typeof SupervisionStatus[obj.status as any] === "string"
	);
}

export function supervisedCommandSucceeded(
	result: unknown,
): result is SupervisionResult & {
	status: SupervisionStatus.Success | SupervisionStatus.Working;
} {
	return (
		isSupervisionResult(result) &&
		(result.status === SupervisionStatus.Success ||
			result.status === SupervisionStatus.Working)
	);
}

export function supervisedCommandFailed(
	result: unknown,
): result is SupervisionResult & {
	status: SupervisionStatus.Fail | SupervisionStatus.NoSupport;
} {
	return (
		isSupervisionResult(result) &&
		(result.status === SupervisionStatus.Fail ||
			result.status === SupervisionStatus.NoSupport)
	);
}

export function isUnsupervisedOrSucceeded(
	result: SupervisionResult | undefined,
): result is
	| undefined
	| (SupervisionResult & {
			status: SupervisionStatus.Success | SupervisionStatus.Working;
	  }) {
	return !result || supervisedCommandSucceeded(result);
}
