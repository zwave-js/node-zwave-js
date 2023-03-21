/// <reference types="node" />
import { CommandClasses, MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions } from "@zwave-js/serial";
export interface SetApplicationNodeInformationRequestOptions extends MessageBaseOptions {
    isListening: boolean;
    genericDeviceClass: number;
    specificDeviceClass: number;
    supportedCCs: CommandClasses[];
    controlledCCs: CommandClasses[];
}
export declare class SetApplicationNodeInformationRequest extends Message {
    constructor(host: ZWaveHost, options: SetApplicationNodeInformationRequestOptions);
    isListening: boolean;
    genericDeviceClass: number;
    specificDeviceClass: number;
    supportedCCs: CommandClasses[];
    controlledCCs: CommandClasses[];
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=SetApplicationNodeInformationRequest.d.ts.map