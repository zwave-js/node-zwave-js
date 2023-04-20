/// <reference types="node" />
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
export declare enum RemoveFailedNodeStartFlags {
    OK = 0,
    /** The removing process was aborted because the controller  is not the primary one */
    NotPrimaryController = 2,
    /** The removing process was aborted because no call back function is used */
    NoCallbackFunction = 4,
    /** The removing process aborted because the node was node found */
    NodeNotFound = 8,
    /** The removing process is busy */
    RemoveProcessBusy = 16,
    /** The removing process could not be started*/
    RemoveFailed = 32
}
export declare enum RemoveFailedNodeStatus {
    /** The node is working properly (removed from the failed nodes list ) */
    NodeOK = 0,
    /** The failed node was removed from the failed nodes list */
    NodeRemoved = 1,
    /** The failed node was not removed from the failing nodes list */
    NodeNotRemoved = 2
}
export declare class RemoveFailedNodeRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
interface RemoveFailedNodeRequestOptions extends MessageBaseOptions {
    failedNodeId: number;
}
export declare class RemoveFailedNodeRequest extends RemoveFailedNodeRequestBase {
    constructor(host: ZWaveHost, options: RemoveFailedNodeRequestOptions);
    /** The node that should be removed */
    failedNodeId: number;
    serialize(): Buffer;
}
export declare class RemoveFailedNodeRequestStatusReport extends RemoveFailedNodeRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    private _removeStatus;
    get removeStatus(): RemoveFailedNodeStatus;
    isOK(): boolean;
}
export declare class RemoveFailedNodeResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    private _removeStatus;
    get removeStatus(): RemoveFailedNodeStartFlags;
    isOK(): boolean;
}
export {};
//# sourceMappingURL=RemoveFailedNodeMessages.d.ts.map