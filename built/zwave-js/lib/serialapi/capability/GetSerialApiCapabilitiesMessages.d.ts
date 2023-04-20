/// <reference types="node" />
import type { ZWaveHost } from "@zwave-js/host";
import { FunctionType, Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export declare class GetSerialApiCapabilitiesRequest extends Message {
}
export interface GetSerialApiCapabilitiesResponseOptions extends MessageBaseOptions {
    firmwareVersion: string;
    manufacturerId: number;
    productType: number;
    productId: number;
    supportedFunctionTypes: FunctionType[];
}
export declare class GetSerialApiCapabilitiesResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | GetSerialApiCapabilitiesResponseOptions);
    firmwareVersion: string;
    manufacturerId: number;
    productType: number;
    productId: number;
    supportedFunctionTypes: FunctionType[];
    serialize(): Buffer;
}
//# sourceMappingURL=GetSerialApiCapabilitiesMessages.d.ts.map