/// <reference types="node" />
import { CommandClasses, MessageOrCCLogEntry, NodeType } from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
export declare enum AddNodeType {
    Any = 1,
    Controller = 2,
    Slave = 3,
    Existing = 4,
    Stop = 5,
    StopControllerReplication = 6,
    SmartStartDSK = 8,
    SmartStartListen = 9
}
export declare enum AddNodeStatus {
    Ready = 1,
    NodeFound = 2,
    AddingSlave = 3,
    AddingController = 4,
    ProtocolDone = 5,
    Done = 6,
    Failed = 7
}
interface AddNodeToNetworkRequestOptions extends MessageBaseOptions {
    addNodeType?: AddNodeType;
    highPower?: boolean;
    networkWide?: boolean;
}
interface AddNodeDSKToNetworkRequestOptions extends MessageBaseOptions {
    nwiHomeId: Buffer;
    authHomeId: Buffer;
    highPower?: boolean;
    networkWide?: boolean;
}
export declare function computeNeighborDiscoveryTimeout(host: ZWaveApplicationHost, nodeType: NodeType): number;
export declare class AddNodeToNetworkRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
export declare class AddNodeToNetworkRequest extends AddNodeToNetworkRequestBase {
    constructor(host: ZWaveHost, options?: AddNodeToNetworkRequestOptions);
    /** The type of node to add */
    addNodeType: AddNodeType | undefined;
    /** Whether to use high power */
    highPower: boolean;
    /** Whether to include network wide */
    networkWide: boolean;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class EnableSmartStartListenRequest extends AddNodeToNetworkRequestBase {
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class AddNodeDSKToNetworkRequest extends AddNodeToNetworkRequestBase {
    constructor(host: ZWaveHost, options: AddNodeDSKToNetworkRequestOptions);
    /** The home IDs of node to add */
    nwiHomeId: Buffer;
    authHomeId: Buffer;
    /** Whether to use high power */
    highPower: boolean;
    /** Whether to include network wide */
    networkWide: boolean;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class AddNodeToNetworkRequestStatusReport extends AddNodeToNetworkRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly status: AddNodeStatus;
    readonly statusContext: AddNodeStatusContext | undefined;
    toLogEntry(): MessageOrCCLogEntry;
}
interface AddNodeStatusContext {
    nodeId: number;
    basicDeviceClass?: number;
    genericDeviceClass?: number;
    specificDeviceClass?: number;
    supportedCCs?: CommandClasses[];
    controlledCCs?: CommandClasses[];
}
export {};
//# sourceMappingURL=AddNodeToNetworkRequest.d.ts.map