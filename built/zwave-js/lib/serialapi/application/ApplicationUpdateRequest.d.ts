/// <reference types="node" />
import { CommandClasses, MessageOrCCLogEntry, NodeUpdatePayload } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions, SuccessIndicator } from "@zwave-js/serial";
export declare enum ApplicationUpdateTypes {
    SmartStart_NodeInfo_Received = 134,
    SmartStart_HomeId_Received = 133,
    NodeInfo_Received = 132,
    NodeInfo_RequestDone = 130,
    NodeInfo_RequestFailed = 129,
    RoutingPending = 128,
    Node_Added = 64,
    Node_Removed = 32,
    SUC_IdChanged = 16
}
export declare class ApplicationUpdateRequest extends Message {
    constructor(host: ZWaveHost, options?: MessageOptions);
    readonly updateType: ApplicationUpdateTypes;
    serialize(): Buffer;
}
interface ApplicationUpdateRequestWithNodeInfoOptions extends MessageBaseOptions {
    nodeInformation: NodeUpdatePayload;
}
export declare class ApplicationUpdateRequestWithNodeInfo extends ApplicationUpdateRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | ApplicationUpdateRequestWithNodeInfoOptions);
    nodeId: number;
    nodeInformation: NodeUpdatePayload;
    serialize(): Buffer;
}
export declare class ApplicationUpdateRequestNodeInfoReceived extends ApplicationUpdateRequestWithNodeInfo {
}
export declare class ApplicationUpdateRequestNodeInfoRequestFailed extends ApplicationUpdateRequest implements SuccessIndicator {
    isOK(): boolean;
}
export declare class ApplicationUpdateRequestNodeAdded extends ApplicationUpdateRequestWithNodeInfo {
}
export declare class ApplicationUpdateRequestNodeRemoved extends ApplicationUpdateRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    nodeId: number;
}
export declare class ApplicationUpdateRequestSmartStartHomeIDReceived extends ApplicationUpdateRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly remoteNodeId: number;
    readonly nwiHomeId: Buffer;
    readonly basicDeviceClass: number;
    readonly genericDeviceClass: number;
    readonly specificDeviceClass: number;
    readonly supportedCCs: readonly CommandClasses[];
    toLogEntry(): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=ApplicationUpdateRequest.d.ts.map