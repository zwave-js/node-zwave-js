/// <reference types="node" />
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
interface SetSerialApiTimeoutsRequestOptions extends MessageBaseOptions {
    ackTimeout: number;
    byteTimeout: number;
}
export declare class SetSerialApiTimeoutsRequest extends Message {
    constructor(host: ZWaveHost, options: SetSerialApiTimeoutsRequestOptions);
    ackTimeout: number;
    byteTimeout: number;
    serialize(): Buffer;
}
export declare class SetSerialApiTimeoutsResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    private _oldAckTimeout;
    get oldAckTimeout(): number;
    private _oldByteTimeout;
    get oldByteTimeout(): number;
}
export {};
//# sourceMappingURL=SetSerialApiTimeoutsMessages.d.ts.map