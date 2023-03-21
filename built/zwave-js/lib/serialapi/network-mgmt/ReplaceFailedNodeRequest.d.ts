/// <reference types="node" />
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
export declare enum ReplaceFailedNodeStartFlags {
    OK = 0,
    /** The replacing process was aborted because the controller  is not the primary one */
    NotPrimaryController = 2,
    /** The replacing process was aborted because no call back function is used */
    NoCallbackFunction = 4,
    /** The replacing process aborted because the node was node found */
    NodeNotFound = 8,
    /** The replacing process is busy */
    ReplaceProcessBusy = 16,
    /** The replacing process could not be started*/
    ReplaceFailed = 32
}
export declare enum ReplaceFailedNodeStatus {
    NodeOK = 0,
    /** The failed node is ready to be replaced and controller is ready to add new node with the nodeID of the failed node. */
    FailedNodeReplace = 3,
    /** The failed node has been replaced. */
    FailedNodeReplaceDone = 4,
    /** The failed node has not been replaced */
    FailedNodeReplaceFailed = 5
}
export declare class ReplaceFailedNodeRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
interface ReplaceFailedNodeRequestOptions extends MessageBaseOptions {
    failedNodeId: number;
}
export declare class ReplaceFailedNodeRequest extends ReplaceFailedNodeRequestBase {
    constructor(host: ZWaveHost, options: ReplaceFailedNodeRequestOptions);
    /** The node that should be removed */
    failedNodeId: number;
    serialize(): Buffer;
}
export declare class ReplaceFailedNodeResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    private _replaceStatus;
    get replaceStatus(): ReplaceFailedNodeStartFlags;
    isOK(): boolean;
}
export declare class ReplaceFailedNodeRequestStatusReport extends ReplaceFailedNodeRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    private _replaceStatus;
    get replaceStatus(): ReplaceFailedNodeStatus;
    isOK(): boolean;
}
export {};
//# sourceMappingURL=ReplaceFailedNodeRequest.d.ts.map