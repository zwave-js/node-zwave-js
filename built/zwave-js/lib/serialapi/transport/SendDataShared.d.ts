/// <reference types="node" />
import { MessageRecord, RSSI, TXReport } from "@zwave-js/core/safe";
import { AssignPriorityReturnRouteRequestTransmitReport } from "../network-mgmt/AssignPriorityReturnRouteMessages";
import { AssignPrioritySUCReturnRouteRequestTransmitReport } from "../network-mgmt/AssignPrioritySUCReturnRouteMessages";
import { AssignReturnRouteRequestTransmitReport } from "../network-mgmt/AssignReturnRouteMessages";
import { AssignSUCReturnRouteRequestTransmitReport } from "../network-mgmt/AssignSUCReturnRouteMessages";
import { DeleteReturnRouteRequestTransmitReport } from "../network-mgmt/DeleteReturnRouteMessages";
import { DeleteSUCReturnRouteRequestTransmitReport } from "../network-mgmt/DeleteSUCReturnRouteMessages";
import { SendDataBridgeRequest, SendDataBridgeRequestTransmitReport, SendDataMulticastBridgeRequest, SendDataMulticastBridgeRequestTransmitReport } from "./SendDataBridgeMessages";
import { SendDataMulticastRequest, SendDataMulticastRequestTransmitReport, SendDataRequest, SendDataRequestTransmitReport } from "./SendDataMessages";
export type SendDataMessage = SendDataRequest | SendDataMulticastRequest | SendDataBridgeRequest | SendDataMulticastBridgeRequest;
export type SendDataTransmitReport = SendDataRequestTransmitReport | SendDataMulticastRequestTransmitReport | SendDataBridgeRequestTransmitReport | SendDataMulticastBridgeRequestTransmitReport;
/** All message classes that are a callback with a transmit report */
export type TransmitReport = SendDataTransmitReport | AssignReturnRouteRequestTransmitReport | AssignSUCReturnRouteRequestTransmitReport | AssignPriorityReturnRouteRequestTransmitReport | AssignPrioritySUCReturnRouteRequestTransmitReport | DeleteReturnRouteRequestTransmitReport | DeleteSUCReturnRouteRequestTransmitReport;
export declare function parseRSSI(payload: Buffer, offset?: number): RSSI;
export declare function tryParseRSSI(payload: Buffer, offset?: number): RSSI | undefined;
/**
 * Parses a TX report returned by a SendData callback
 * @param includeACK whether ACK related fields should be parsed
 */
export declare function parseTXReport(includeACK: boolean, payload: Buffer): TXReport | undefined;
export declare function txReportToMessageRecord(report: TXReport): MessageRecord;
export declare function isSendData(msg: unknown): msg is SendDataMessage;
export declare function isSendDataSinglecast(msg: unknown): msg is SendDataRequest | SendDataBridgeRequest;
export declare function isSendDataMulticast(msg: unknown): msg is SendDataMulticastRequest | SendDataMulticastBridgeRequest;
export declare function isSendDataTransmitReport(msg: unknown): msg is SendDataTransmitReport;
export declare function isTransmitReport(msg: unknown): msg is TransmitReport;
export declare function hasTXReport(msg: unknown): msg is (SendDataRequestTransmitReport | SendDataBridgeRequestTransmitReport) & {
    txReport: TXReport;
};
export declare function exceedsMaxPayloadLength(msg: SendDataMessage): boolean;
//# sourceMappingURL=SendDataShared.d.ts.map