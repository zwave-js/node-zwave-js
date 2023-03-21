/// <reference types="node" />
export declare function zeroPad(input: Buffer, blockSize: number): {
    output: Buffer;
    paddingLength: number;
};
/** Left-Shifts a buffer by 1 bit */
export declare function leftShift1(input: Buffer): Buffer;
/** Computes the byte-wise XOR of two buffers with the same length */
export declare function xor(b1: Buffer, b2: Buffer): Buffer;
/** Increments a multi-byte integer in a buffer */
export declare function increment(buffer: Buffer): void;
//# sourceMappingURL=bufferUtils.d.ts.map