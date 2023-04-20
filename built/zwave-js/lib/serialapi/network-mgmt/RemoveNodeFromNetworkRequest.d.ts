/// <reference types="node" />
import { CommandClasses } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
export declare enum RemoveNodeType {
    Any = 1,
    Controller = 2,
    Slave = 3,
    Stop = 5
}
export declare enum RemoveNodeStatus {
    Ready = 1,
    NodeFound = 2,
    RemovingSlave = 3,
    RemovingController = 4,
    Done = 6,
    Failed = 7
}
interface RemoveNodeFromNetworkRequestOptions extends MessageBaseOptions {
    removeNodeType?: RemoveNodeType;
    highPower?: boolean;
    networkWide?: boolean;
}
export declare class RemoveNodeFromNetworkRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
export declare class RemoveNodeFromNetworkRequest extends RemoveNodeFromNetworkRequestBase {
    constructor(host: ZWaveHost, options?: RemoveNodeFromNetworkRequestOptions);
    /** The type of node to remove */
    removeNodeType: RemoveNodeType | undefined;
    /** Whether to use high power */
    highPower: boolean;
    /** Whether to exclude network wide */
    networkWide: boolean;
    serialize(): Buffer;
}
export declare class RemoveNodeFromNetworkRequestStatusReport extends RemoveNodeFromNetworkRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly status: RemoveNodeStatus;
    readonly statusContext: RemoveNodeStatusContext | undefined;
}
interface RemoveNodeStatusContext {
    nodeId: number;
    basic?: number;
    generic?: number;
    specific?: number;
    supportedCCs?: CommandClasses[];
    controlledCCs?: CommandClasses[];
}
export {};
//# sourceMappingURL=RemoveNodeFromNetworkRequest.d.ts.map