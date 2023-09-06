import {
	type MessageRecord,
	type RSSI,
	RssiError,
	type SerializableTXReport,
	type TXReport,
	TransmitStatus,
	protocolDataRateToString,
	routingSchemeToString,
	rssiToString,
	stripUndefined,
} from "@zwave-js/core/safe";
import { AssignPriorityReturnRouteRequestTransmitReport } from "../network-mgmt/AssignPriorityReturnRouteMessages";
import { AssignPrioritySUCReturnRouteRequestTransmitReport } from "../network-mgmt/AssignPrioritySUCReturnRouteMessages";
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
	| AssignPriorityReturnRouteRequestTransmitReport
	| AssignPrioritySUCReturnRouteRequestTransmitReport
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

export function encodeTXReport(report: SerializableTXReport): Buffer {
	const ret = Buffer.alloc(24, 0);
	ret.writeUInt16BE(report.txTicks, 0);
	ret[2] = report.repeaterNodeIds?.length ?? 0;
	ret.writeInt8(report.ackRSSI ?? RssiError.NotAvailable, 3);
	for (let i = 0; i < 4; i++) {
		ret.writeInt8(
			report.ackRepeaterRSSI?.[i] ?? RssiError.NotAvailable,
			4 + i,
		);
	}
	ret[8] = report.ackChannelNo ?? 0;
	ret[9] = report.txChannelNo ?? 0;
	ret[10] = report.routeSchemeState ?? 0;
	ret[11] = report.repeaterNodeIds?.[0] ?? 0;
	ret[12] = report.repeaterNodeIds?.[1] ?? 0;
	ret[13] = report.repeaterNodeIds?.[2] ?? 0;
	ret[14] = report.repeaterNodeIds?.[3] ?? 0;
	ret[15] = (report.beam1000ms ? 0b0100_0000 : 0)
		| (report.beam250ms ? 0b0010_0000 : 0)
		| report.routeSpeed;
	ret[16] = report.routingAttempts ?? 1;
	ret[17] = report.failedRouteLastFunctionalNodeId ?? 0;
	ret[18] = report.failedRouteFirstNonFunctionalNodeId ?? 0;
	ret.writeInt8(report.txPower ?? 0, 19);
	ret.writeInt8(report.measuredNoiseFloor ?? RssiError.NotAvailable, 20);
	ret.writeInt8(report.destinationAckTxPower ?? 0, 21);
	ret.writeInt8(
		report.destinationAckMeasuredRSSI ?? RssiError.NotAvailable,
		22,
	);
	ret.writeInt8(
		report.destinationAckMeasuredNoiseFloor ?? RssiError.NotAvailable,
		23,
	);
	return ret;
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
		"routing scheme": routingSchemeToString(report.routeSchemeState),
		"ACK RSSI": report.ackRSSI != undefined
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
		report.failedRouteLastFunctionalNodeId
		&& report.failedRouteFirstNonFunctionalNodeId
	) {
		ret[
			"route failed here"
		] = `${report.failedRouteLastFunctionalNodeId} -> ${report.failedRouteFirstNonFunctionalNodeId}`;
	}
	if (report.txPower != undefined) ret["TX power"] = `${report.txPower} dBm`;
	if (
		report.measuredNoiseFloor != undefined
		&& report.measuredNoiseFloor !== RssiError.NotAvailable
	) {
		ret["measured noise floor"] = rssiToString(report.measuredNoiseFloor);
	}
	if (report.destinationAckTxPower != undefined) {
		ret[
			"ACK TX power by destination"
		] = `${report.destinationAckTxPower} dBm`;
	}
	if (
		report.destinationAckMeasuredRSSI != undefined
		&& report.destinationAckMeasuredRSSI !== RssiError.NotAvailable
	) {
		ret["measured RSSI of ACK from destination"] = rssiToString(
			report.destinationAckMeasuredRSSI,
		);
	}
	if (
		report.destinationAckMeasuredNoiseFloor != undefined
		&& report.destinationAckMeasuredNoiseFloor !== RssiError.NotAvailable
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
		msg instanceof SendDataRequest
		|| msg instanceof SendDataMulticastRequest
		|| msg instanceof SendDataBridgeRequest
		|| msg instanceof SendDataMulticastBridgeRequest
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
		msg instanceof SendDataMulticastRequest
		|| msg instanceof SendDataMulticastBridgeRequest
	);
}

export function isSendDataTransmitReport(
	msg: unknown,
): msg is SendDataTransmitReport {
	if (!msg) return false;
	return (
		msg instanceof SendDataRequestTransmitReport
		|| msg instanceof SendDataMulticastRequestTransmitReport
		|| msg instanceof SendDataBridgeRequestTransmitReport
		|| msg instanceof SendDataMulticastBridgeRequestTransmitReport
	);
}

export function isTransmitReport(msg: unknown): msg is TransmitReport {
	if (!msg) return false;
	return (
		isSendDataTransmitReport(msg)
		|| msg instanceof AssignReturnRouteRequestTransmitReport
		|| msg instanceof AssignSUCReturnRouteRequestTransmitReport
		|| msg instanceof DeleteReturnRouteRequestTransmitReport
		|| msg instanceof DeleteSUCReturnRouteRequestTransmitReport
		|| msg instanceof AssignPriorityReturnRouteRequestTransmitReport
		|| msg instanceof AssignPrioritySUCReturnRouteRequestTransmitReport
	);
}

export function hasTXReport(
	msg: unknown,
): msg is
	& (
		| SendDataRequestTransmitReport
		| SendDataBridgeRequestTransmitReport
	)
	& { txReport: TXReport }
{
	if (!msg) return false;
	return (
		(msg instanceof SendDataRequestTransmitReport
			|| msg instanceof SendDataBridgeRequestTransmitReport)
		// Only OK and NoAck have meaningful data in the TX report
		&& (msg.transmitStatus === TransmitStatus.OK
			|| msg.transmitStatus === TransmitStatus.NoAck)
		&& !!msg.txReport
	);
}

export function exceedsMaxPayloadLength(msg: SendDataMessage): boolean {
	return msg.serializeCC().length > msg.getMaxPayloadLength();
}
