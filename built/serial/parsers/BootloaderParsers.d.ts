/// <reference types="node" />
import { Transform, TransformCallback } from "stream";
import type { SerialLogger } from "../Logger";
import { XModemMessageHeaders } from "../MessageHeaders";
export declare enum BootloaderChunkType {
    Error = 0,
    Menu = 1,
    Message = 2,
    FlowControl = 3
}
export type BootloaderChunk = {
    type: BootloaderChunkType.Error;
    error: string;
    _raw: string;
} | {
    type: BootloaderChunkType.Menu;
    version: string;
    options: {
        num: number;
        option: string;
    }[];
    _raw: string;
} | {
    type: BootloaderChunkType.Message;
    message: string;
    _raw: string;
} | {
    type: BootloaderChunkType.FlowControl;
    command: XModemMessageHeaders.ACK | XModemMessageHeaders.NAK | XModemMessageHeaders.CAN | XModemMessageHeaders.C;
};
/** Parses the screen output from the bootloader, either waiting for a NUL char or a timeout */
export declare class BootloaderScreenParser extends Transform {
    private logger?;
    constructor(logger?: SerialLogger | undefined);
    private receiveBuffer;
    private flushTimeout;
    _transform(chunk: any, encoding: string, callback: TransformCallback): void;
}
export declare const bootloaderMenuPreamble = "Gecko Bootloader";
/** Transforms the bootloader screen output into meaningful chunks */
export declare class BootloaderParser extends Transform {
    constructor();
    _transform(chunk: any, encoding: string, callback: TransformCallback): void;
}
//# sourceMappingURL=BootloaderParsers.d.ts.map