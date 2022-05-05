import type { ProtocolDataRate } from "@zwave-js/core";

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

export type HealNodeStatus = "pending" | "done" | "failed" | "skipped";
export type SDKVersion =
	| `${number}.${number}`
	| `${number}.${number}.${number}`;
