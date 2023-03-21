/// <reference types="node" />
import { NodeType } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
import { UnknownZWaveChipType } from "../../controller/ZWaveChipTypes";
import type { ZWaveApiVersion } from "../_Types";
export declare class GetSerialApiInitDataRequest extends Message {
}
export interface GetSerialApiInitDataResponseOptions extends MessageBaseOptions {
    zwaveApiVersion: ZWaveApiVersion;
    isPrimary: boolean;
    nodeType: NodeType;
    supportsTimers: boolean;
    isSIS: boolean;
    nodeIds: number[];
    zwaveChipType?: string | UnknownZWaveChipType;
}
export declare class GetSerialApiInitDataResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | GetSerialApiInitDataResponseOptions);
    zwaveApiVersion: ZWaveApiVersion;
    isPrimary: boolean;
    nodeType: NodeType;
    supportsTimers: boolean;
    isSIS: boolean;
    nodeIds: readonly number[];
    zwaveChipType?: string | UnknownZWaveChipType;
    serialize(): Buffer;
}
//# sourceMappingURL=GetSerialApiInitDataMessages.d.ts.map