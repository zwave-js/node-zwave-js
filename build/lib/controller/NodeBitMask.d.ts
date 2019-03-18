/// <reference types="node" />
/** Max number of nodes in a ZWave network */
export declare const MAX_NODES = 232;
/** The number of bytes in a node bit mask */
export declare const NUM_NODEMASK_BYTES: number;
export declare function parseNodeBitMask(mask: Buffer): number[];
