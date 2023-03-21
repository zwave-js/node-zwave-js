/// <reference types="node" />
import { DataRate, FLiRS, NodeProtocolInfoAndDeviceClass, NodeType, ProtocolVersion } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
interface GetNodeProtocolInfoRequestOptions extends MessageBaseOptions {
    requestedNodeId: number;
}
export declare class GetNodeProtocolInfoRequest extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | GetNodeProtocolInfoRequestOptions);
    requestedNodeId: number;
    serialize(): Buffer;
}
interface GetNodeProtocolInfoResponseOptions extends MessageBaseOptions, NodeProtocolInfoAndDeviceClass {
}
export declare class GetNodeProtocolInfoResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | GetNodeProtocolInfoResponseOptions);
    /** Whether this node is always listening or not */
    isListening: boolean;
    /** Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't. */
    isFrequentListening: FLiRS;
    /** Whether the node supports routing/forwarding messages. */
    isRouting: boolean;
    supportedDataRates: DataRate[];
    protocolVersion: ProtocolVersion;
    /** Whether this node supports additional CCs besides the mandatory minimum */
    optionalFunctionality: boolean;
    /** Whether this node is a controller (can calculate routes) or an end node (relies on route info) */
    nodeType: NodeType;
    /** Whether this node supports security (S0 or S2) */
    supportsSecurity: boolean;
    /** Whether this node can issue wakeup beams to FLiRS nodes */
    supportsBeaming: boolean;
    basicDeviceClass: number;
    genericDeviceClass: number;
    specificDeviceClass: number;
    serialize(): Buffer;
}
export {};
//# sourceMappingURL=GetNodeProtocolInfoMessages.d.ts.map