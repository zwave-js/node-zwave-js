/// <reference types="node" />
import type { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { MultiStageCallback, SuccessIndicator } from "@zwave-js/serial";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
export declare enum NodeNeighborUpdateStatus {
    UpdateStarted = 33,
    UpdateDone = 34,
    UpdateFailed = 35
}
export interface RequestNodeNeighborUpdateRequestOptions extends MessageBaseOptions {
    nodeId: number;
    /** This must be determined with {@link computeNeighborDiscoveryTimeout} */
    discoveryTimeout: number;
}
export declare class RequestNodeNeighborUpdateRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
export declare class RequestNodeNeighborUpdateRequest extends RequestNodeNeighborUpdateRequestBase {
    constructor(host: ZWaveHost, options: RequestNodeNeighborUpdateRequestOptions);
    nodeId: number;
    discoveryTimeout: number;
    serialize(): Buffer;
    getCallbackTimeout(): number | undefined;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class RequestNodeNeighborUpdateReport extends RequestNodeNeighborUpdateRequestBase implements SuccessIndicator, MultiStageCallback {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    isFinal(): boolean;
    private _updateStatus;
    get updateStatus(): NodeNeighborUpdateStatus;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=RequestNodeNeighborUpdateMessages.d.ts.map