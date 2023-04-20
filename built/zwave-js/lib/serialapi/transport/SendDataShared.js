"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exceedsMaxPayloadLength = exports.hasTXReport = exports.isTransmitReport = exports.isSendDataTransmitReport = exports.isSendDataMulticast = exports.isSendDataSinglecast = exports.isSendData = exports.txReportToMessageRecord = exports.parseTXReport = exports.tryParseRSSI = exports.parseRSSI = void 0;
const safe_1 = require("@zwave-js/core/safe");
const AssignPriorityReturnRouteMessages_1 = require("../network-mgmt/AssignPriorityReturnRouteMessages");
const AssignPrioritySUCReturnRouteMessages_1 = require("../network-mgmt/AssignPrioritySUCReturnRouteMessages");
const AssignReturnRouteMessages_1 = require("../network-mgmt/AssignReturnRouteMessages");
const AssignSUCReturnRouteMessages_1 = require("../network-mgmt/AssignSUCReturnRouteMessages");
const DeleteReturnRouteMessages_1 = require("../network-mgmt/DeleteReturnRouteMessages");
const DeleteSUCReturnRouteMessages_1 = require("../network-mgmt/DeleteSUCReturnRouteMessages");
const SendDataBridgeMessages_1 = require("./SendDataBridgeMessages");
const SendDataMessages_1 = require("./SendDataMessages");
// const RSSI_RESERVED_START = 11;
function parseRSSI(payload, offset = 0) {
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
exports.parseRSSI = parseRSSI;
function tryParseRSSI(payload, offset = 0) {
    if (payload.length <= offset)
        return;
    return parseRSSI(payload, offset);
}
exports.tryParseRSSI = tryParseRSSI;
function parseTXPower(payload, offset = 0) {
    if (payload.length <= offset)
        return;
    const ret = payload.readInt8(offset);
    if (ret >= -127 && ret <= 126)
        return ret;
}
/**
 * Parses a TX report returned by a SendData callback
 * @param includeACK whether ACK related fields should be parsed
 */
function parseTXReport(includeACK, payload) {
    if (payload.length < 17)
        return;
    const ret = {
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
        beam1000ms: !!(payload[15] & 64),
        beam250ms: !!(payload[15] & 32),
        routeSpeed: payload[15] & 7,
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
    ret.repeaterNodeIds = ret.repeaterNodeIds.slice(0, firstMissingRepeater);
    if (ret.ackRepeaterRSSI) {
        ret.ackRepeaterRSSI = ret.ackRepeaterRSSI.slice(0, firstMissingRepeater);
    }
    return (0, safe_1.stripUndefined)(ret);
}
exports.parseTXReport = parseTXReport;
function txReportToMessageRecord(report) {
    const ret = (0, safe_1.stripUndefined)({
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
        "protocol & route speed": (0, safe_1.protocolDataRateToString)(report.routeSpeed),
        "ACK RSSI": report.ackRSSI != undefined
            ? (0, safe_1.rssiToString)(report.ackRSSI)
            : undefined,
        ...(report.ackRepeaterRSSI?.length
            ? {
                "ACK RSSI on repeaters": report.ackRepeaterRSSI
                    .map((rssi) => (0, safe_1.rssiToString)(rssi))
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
    if (report.failedRouteLastFunctionalNodeId &&
        report.failedRouteFirstNonFunctionalNodeId) {
        ret["route failed here"] = `${report.failedRouteLastFunctionalNodeId} -> ${report.failedRouteFirstNonFunctionalNodeId}`;
    }
    if (report.txPower != undefined)
        ret["TX power"] = `${report.txPower} dBm`;
    if (report.measuredNoiseFloor != undefined &&
        report.measuredNoiseFloor !== safe_1.RssiError.NotAvailable) {
        ret["measured noise floor"] = (0, safe_1.rssiToString)(report.measuredNoiseFloor);
    }
    if (report.destinationAckTxPower != undefined) {
        ret["ACK TX power by destination"] = `${report.destinationAckTxPower} dBm`;
    }
    if (report.destinationAckMeasuredRSSI != undefined &&
        report.destinationAckMeasuredRSSI !== safe_1.RssiError.NotAvailable) {
        ret["measured RSSI of ACK from destination"] = (0, safe_1.rssiToString)(report.destinationAckMeasuredRSSI);
    }
    if (report.destinationAckMeasuredNoiseFloor != undefined &&
        report.destinationAckMeasuredNoiseFloor !== safe_1.RssiError.NotAvailable) {
        ret["measured noise floor by destination"] = (0, safe_1.rssiToString)(report.destinationAckMeasuredNoiseFloor);
    }
    return ret;
}
exports.txReportToMessageRecord = txReportToMessageRecord;
function isSendData(msg) {
    if (!msg)
        return false;
    return (msg instanceof SendDataMessages_1.SendDataRequest ||
        msg instanceof SendDataMessages_1.SendDataMulticastRequest ||
        msg instanceof SendDataBridgeMessages_1.SendDataBridgeRequest ||
        msg instanceof SendDataBridgeMessages_1.SendDataMulticastBridgeRequest);
}
exports.isSendData = isSendData;
function isSendDataSinglecast(msg) {
    if (!msg)
        return false;
    return (msg instanceof SendDataMessages_1.SendDataRequest || msg instanceof SendDataBridgeMessages_1.SendDataBridgeRequest);
}
exports.isSendDataSinglecast = isSendDataSinglecast;
function isSendDataMulticast(msg) {
    if (!msg)
        return false;
    return (msg instanceof SendDataMessages_1.SendDataMulticastRequest ||
        msg instanceof SendDataBridgeMessages_1.SendDataMulticastBridgeRequest);
}
exports.isSendDataMulticast = isSendDataMulticast;
function isSendDataTransmitReport(msg) {
    if (!msg)
        return false;
    return (msg instanceof SendDataMessages_1.SendDataRequestTransmitReport ||
        msg instanceof SendDataMessages_1.SendDataMulticastRequestTransmitReport ||
        msg instanceof SendDataBridgeMessages_1.SendDataBridgeRequestTransmitReport ||
        msg instanceof SendDataBridgeMessages_1.SendDataMulticastBridgeRequestTransmitReport);
}
exports.isSendDataTransmitReport = isSendDataTransmitReport;
function isTransmitReport(msg) {
    if (!msg)
        return false;
    return (isSendDataTransmitReport(msg) ||
        msg instanceof AssignReturnRouteMessages_1.AssignReturnRouteRequestTransmitReport ||
        msg instanceof AssignSUCReturnRouteMessages_1.AssignSUCReturnRouteRequestTransmitReport ||
        msg instanceof DeleteReturnRouteMessages_1.DeleteReturnRouteRequestTransmitReport ||
        msg instanceof DeleteSUCReturnRouteMessages_1.DeleteSUCReturnRouteRequestTransmitReport ||
        msg instanceof AssignPriorityReturnRouteMessages_1.AssignPriorityReturnRouteRequestTransmitReport ||
        msg instanceof AssignPrioritySUCReturnRouteMessages_1.AssignPrioritySUCReturnRouteRequestTransmitReport);
}
exports.isTransmitReport = isTransmitReport;
function hasTXReport(msg) {
    if (!msg)
        return false;
    return ((msg instanceof SendDataMessages_1.SendDataRequestTransmitReport ||
        msg instanceof SendDataBridgeMessages_1.SendDataBridgeRequestTransmitReport) &&
        !!msg.txReport);
}
exports.hasTXReport = hasTXReport;
function exceedsMaxPayloadLength(msg) {
    return msg.serializeCC().length > msg.getMaxPayloadLength();
}
exports.exceedsMaxPayloadLength = exceedsMaxPayloadLength;
//# sourceMappingURL=SendDataShared.js.map