import { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageDeserializationOptions } from "@zwave-js/serial";
export declare enum NVMType {
    Flash = 128,
    DataFlash = 129,
    EEPROM = 255
}
export declare enum NVMSize {
    "16KB" = 14,
    "32KB" = 15,
    "64KB" = 16,
    "128KB" = 17,
    "256KB" = 18,
    "512KB" = 19,
    "1MB" = 20,
    "2MB" = 21,
    "4MB" = 22,
    "8MB" = 23,
    "16MB" = 24,
    Unknown = 255
}
export declare function nvmSizeToBufferSize(size: NVMSize): number | undefined;
export type NVMId = Pick<GetNVMIdResponse, "nvmManufacturerId" | "memoryType" | "memorySize">;
export declare class GetNVMIdRequest extends Message {
}
export declare class GetNVMIdResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly nvmManufacturerId: number;
    readonly memoryType: NVMType;
    readonly memorySize: NVMSize;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=GetNVMIdMessages.d.ts.map