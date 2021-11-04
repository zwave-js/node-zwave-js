import { MessageRecord, stripUndefined } from "@zwave-js/core";
import { num2hex } from "@zwave-js/shared";
import {
	SendDataBridgeRequest,
	SendDataMulticastBridgeRequest,
} from "./SendDataBridgeMessages";
import { SendDataMulticastRequest, SendDataRequest } from "./SendDataMessages";

export type SendDataMessage =
	| SendDataRequest
	| SendDataMulticastRequest
	| SendDataBridgeRequest
	| SendDataMulticastBridgeRequest;

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
	OK = 0x00, // Transmission complete and ACK received
	NoAck = 0x01, // Transmission complete, no ACK received
	Fail = 0x02, // Transmission failed
	NotIdle = 0x03, // Transmission failed, network busy
	NoRoute = 0x04, // Transmission complete, no return route
}

export enum ProtocolDataRate {
	ZWave_9k6 = 0x01,
	ZWave_40k = 0x02,
	ZWave_100k = 0x03,
	LongRange_100k = 0x04,
}

export function protocolDataRateToString(rate: ProtocolDataRate): string {
	switch (rate) {
		case ProtocolDataRate.ZWave_9k6:
			return "Z-Wave, 9.6 kbit/s";
		case ProtocolDataRate.ZWave_40k:
			return "Z-Wave, 40 kbit/s";
		case ProtocolDataRate.ZWave_100k:
			return "Z-Wave, 100 kbit/s";
		case ProtocolDataRate.LongRange_100k:
			return "Z-Wave Long Range, 100 kbit/s";
	}
	return `Unknown (${num2hex(rate)})`;
}

export enum RssiError {
	NotAvailable = 127,
	ReceiverSaturated = 126,
	NoSignalDetected = 125,
}

// const RSSI_RESERVED_START = 11;

/** A number between -128 and +124 dBm or one of the special values in {@link RssiError} indicating an error */
export type RSSI = number | RssiError;

export function parseRSSI(payload: Buffer, offset: number = 0): RSSI {
	const ret = payload.readInt8(offset);
	// Filter out reserved values
	// TODO: Figure out for which controllers this is relevant
	// if (
	// 	ret >= RSSI_RESERVED_START &&
	// 	ret < RssiError.NoSignalDetected
	// ) {
	// 	ret = RssiError.NotAvailable;
	// }
	return ret;
}

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

function parseTXPower(payload: Buffer, offset: number = 0): number | undefined {
	if (payload.length <= offset) return;
	const ret = payload.readInt8(offset);
	if (ret >= -127 && ret <= 126) return ret;
}

export interface TransmitStatusReport {
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

/**
 * Parses a transmit status report returned by a SendData callback
 * @param includeACK whether ACK related fields should be parsed
 */
export function parseTransmitStatusReport(
	includeACK: boolean,
	payload: Buffer,
): TransmitStatusReport | undefined {
	if (payload.length < 17) return;
	const ret: TransmitStatusReport = {
		txTicks: payload.readUInt16BE(0),
		numRepeaters: payload[2],
		ackRSSI: includeACK ? parseRSSI(payload, 3) : undefined,
		ackRepeaterRSSI: includeACK
			? [
					parseRSSI(payload, 4),
					parseRSSI(payload, 5),
					parseRSSI(payload, 6),
					parseRSSI(payload, 7),
			  ]
			: undefined,
		ackChannelNo: includeACK ? payload[8] : undefined,
		txChannelNo: payload[9],
		routeSchemeState: payload[10],
		repeaterNodeIds: [payload[11], payload[12], payload[13], payload[14]],
		beam1000ms: !!(payload[15] & 0b0100_0000),
		beam250ms: !!(payload[15] & 0b0010_0000),
		routeSpeed: payload[15] & 0b0000_0111,
		routingAttempts: payload[16],
		// These might be missing:
		failedRouteLastFunctionalNodeId: payload[17],
		failedRouteFirstNonFunctionalNodeId: payload[18],
		txPower: parseTXPower(payload, 19),
		measuredNoiseFloor: parseRSSI(payload, 20),
		destinationAckTxPower: includeACK
			? parseTXPower(payload, 21)
			: undefined,
		destinationAckMeasuredRSSI: includeACK
			? parseRSSI(payload, 22)
			: undefined,
		destinationAckMeasuredNoiseFloor: includeACK
			? parseRSSI(payload, 23)
			: undefined,
	};
	// Remove unused repeaters from arrays
	const firstMissingRepeater = ret.repeaterNodeIds.indexOf(0);
	ret.repeaterNodeIds = ret.repeaterNodeIds.slice(
		0,
		firstMissingRepeater,
	) as any;
	if (ret.ackRepeaterRSSI) {
		ret.ackRepeaterRSSI = ret.ackRepeaterRSSI.slice(
			0,
			firstMissingRepeater,
		) as any;
	}

	return stripUndefined(ret as any) as any;
}

export function transmitStatusReportToMessageRecord(
	report: TransmitStatusReport,
): MessageRecord {
	const ret: MessageRecord = stripUndefined({
		// This is included in the parent command's transmit status line
		// "TX duration": `${report.txTicks * 10} ms`,
		// Number of repeaters isn't interesting if it is duplicated by the node IDs
		// repeaters: report.numRepeaters,
		...(report.repeaterNodeIds.length
			? {
					"repeater node IDs": report.repeaterNodeIds.join(", "),
			  }
			: {}),
		"routing attempts": report.routingAttempts,
		"protocol & route speed": protocolDataRateToString(report.routeSpeed),
		"ACK RSSI":
			report.ackRSSI != undefined
				? rssiToString(report.ackRSSI)
				: undefined,
		...(report.ackRepeaterRSSI?.length
			? {
					"ACK RSSI on repeaters": report.ackRepeaterRSSI
						.map((rssi) => rssiToString(rssi!))
						.join(", "),
			  }
			: {}),
		"ACK channel no.": report.ackChannelNo,
		"TX channel no.": report.txChannelNo,
		// This isn't really interesting without knowing what it means
		// "route scheme state": report.routeSchemeState,
		beam: report.beam1000ms
			? "1000 ms"
			: report.beam250ms
			? "250 ms"
			: undefined,
	});
	if (
		report.failedRouteLastFunctionalNodeId &&
		report.failedRouteFirstNonFunctionalNodeId
	) {
		ret[
			"route failed here"
		] = `${report.failedRouteLastFunctionalNodeId} -> ${report.failedRouteFirstNonFunctionalNodeId}`;
	}
	if (report.txPower != undefined) ret["TX power"] = `${report.txPower} dBm`;
	if (
		report.measuredNoiseFloor != undefined &&
		report.measuredNoiseFloor !== RssiError.NotAvailable
	) {
		ret["measured noise floor"] = rssiToString(report.measuredNoiseFloor);
	}
	if (report.destinationAckTxPower != undefined) {
		ret[
			"ACK TX power by destination"
		] = `${report.destinationAckTxPower} dBm`;
	}
	if (
		report.destinationAckMeasuredRSSI != undefined &&
		report.destinationAckMeasuredRSSI !== RssiError.NotAvailable
	) {
		ret["measured RSSI of ACK from destination"] = rssiToString(
			report.destinationAckMeasuredRSSI,
		);
	}
	if (
		report.destinationAckMeasuredNoiseFloor != undefined &&
		report.destinationAckMeasuredNoiseFloor !== RssiError.NotAvailable
	) {
		ret["measured noise floor by destination"] = rssiToString(
			report.destinationAckMeasuredNoiseFloor,
		);
	}
	return ret;
}

export function isSendData(msg: unknown): msg is SendDataMessage {
	if (!msg) return false;
	return (
		msg instanceof SendDataRequest ||
		msg instanceof SendDataMulticastRequest ||
		msg instanceof SendDataBridgeRequest ||
		msg instanceof SendDataMulticastBridgeRequest
	);
}

export function isSendDataSinglecast(
	msg: unknown,
): msg is SendDataRequest | SendDataBridgeRequest {
	if (!msg) return false;
	return (
		msg instanceof SendDataRequest || msg instanceof SendDataBridgeRequest
	);
}

export function isSendDataMulticast(
	msg: unknown,
): msg is SendDataMulticastRequest | SendDataMulticastBridgeRequest {
	if (!msg) return false;
	return (
		msg instanceof SendDataMulticastRequest ||
		msg instanceof SendDataMulticastBridgeRequest
	);
}
