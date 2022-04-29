import {
	MessageRecord,
	protocolDataRateToString,
	stripUndefined,
} from "@zwave-js/core/safe";
import {
	RSSI,
	RssiError,
	rssiToString,
	TXReport,
} from "../../controller/_Types";
import { AssignReturnRouteRequestTransmitReport } from "../network-mgmt/AssignReturnRouteMessages";
import { AssignSUCReturnRouteRequestTransmitReport } from "../network-mgmt/AssignSUCReturnRouteMessages";
import { DeleteReturnRouteRequestTransmitReport } from "../network-mgmt/DeleteReturnRouteMessages";
import { DeleteSUCReturnRouteRequestTransmitReport } from "../network-mgmt/DeleteSUCReturnRouteMessages";
import {
	SendDataBridgeRequest,
	SendDataBridgeRequestTransmitReport,
	SendDataMulticastBridgeRequest,
	SendDataMulticastBridgeRequestTransmitReport,
} from "./SendDataBridgeMessages";
import {
	SendDataMulticastRequest,
	SendDataMulticastRequestTransmitReport,
	SendDataRequest,
	SendDataRequestTransmitReport,
} from "./SendDataMessages";

export type SendDataMessage =
	| SendDataRequest
	| SendDataMulticastRequest
	| SendDataBridgeRequest
	| SendDataMulticastBridgeRequest;

export type SendDataTransmitReport =
	| SendDataRequestTransmitReport
	| SendDataMulticastRequestTransmitReport
	| SendDataBridgeRequestTransmitReport
	| SendDataMulticastBridgeRequestTransmitReport;

/** All message classes that are a callback with a transmit report */
export type TransmitReport =
	| SendDataTransmitReport
	| AssignReturnRouteRequestTransmitReport
	| AssignSUCReturnRouteRequestTransmitReport
	| DeleteReturnRouteRequestTransmitReport
	| DeleteSUCReturnRouteRequestTransmitReport;

// const RSSI_RESERVED_START = 11;

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

export function tryParseRSSI(
	payload: Buffer,
	offset: number = 0,
): RSSI | undefined {
	if (payload.length <= offset) return;
	return parseRSSI(payload, offset);
}

function parseTXPower(payload: Buffer, offset: number = 0): number | undefined {
	if (payload.length <= offset) return;
	const ret = payload.readInt8(offset);
	if (ret >= -127 && ret <= 126) return ret;
}

/**
 * Parses a TX report returned by a SendData callback
 * @param includeACK whether ACK related fields should be parsed
 */
export function parseTXReport(
	includeACK: boolean,
	payload: Buffer,
): TXReport | undefined {
	if (payload.length < 17) return;
	const ret: TXReport = {
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
		measuredNoiseFloor: tryParseRSSI(payload, 20),
		destinationAckTxPower: includeACK
			? parseTXPower(payload, 21)
			: undefined,
		destinationAckMeasuredRSSI: includeACK
			? tryParseRSSI(payload, 22)
			: undefined,
		destinationAckMeasuredNoiseFloor: includeACK
			? tryParseRSSI(payload, 23)
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

export function txReportToMessageRecord(report: TXReport): MessageRecord {
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

export function isSendDataTransmitReport(
	msg: unknown,
): msg is SendDataTransmitReport {
	if (!msg) return false;
	return (
		msg instanceof SendDataRequestTransmitReport ||
		msg instanceof SendDataMulticastRequestTransmitReport ||
		msg instanceof SendDataBridgeRequestTransmitReport ||
		msg instanceof SendDataMulticastBridgeRequestTransmitReport
	);
}

export function isTransmitReport(msg: unknown): msg is TransmitReport {
	if (!msg) return false;
	return (
		isSendDataTransmitReport(msg) ||
		msg instanceof AssignReturnRouteRequestTransmitReport ||
		msg instanceof AssignSUCReturnRouteRequestTransmitReport ||
		msg instanceof DeleteReturnRouteRequestTransmitReport ||
		msg instanceof DeleteSUCReturnRouteRequestTransmitReport
	);
}

export function hasTXReport(
	msg: unknown,
): msg is (
	| SendDataRequestTransmitReport
	| SendDataBridgeRequestTransmitReport
) & { txReport: TXReport } {
	if (!msg) return false;
	return (
		(msg instanceof SendDataRequestTransmitReport ||
			msg instanceof SendDataBridgeRequestTransmitReport) &&
		!!msg.txReport
	);
}
