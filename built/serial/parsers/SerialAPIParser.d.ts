/// <reference types="node" />
/// <reference types="node" />
import { Transform, TransformCallback } from "stream";
import type { SerialLogger } from "../Logger";
export declare class SerialAPIParser extends Transform {
    private logger?;
    private onDiscarded?;
    constructor(logger?: SerialLogger | undefined, onDiscarded?: ((data: Buffer) => void) | undefined);
    private receiveBuffer;
    _transform(chunk: any, encoding: string, callback: TransformCallback): void;
}
/** Skips the first n bytes of a buffer and returns the rest */
export declare function skipBytes(buf: Buffer, n: number): Buffer;
//# sourceMappingURL=SerialAPIParser.d.ts.map