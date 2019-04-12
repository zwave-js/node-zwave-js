import { parseBitMask } from "../values/Primitive";

/** Max number of nodes in a ZWave network */
export const MAX_NODES = 232;
/** The number of bytes in a node bit mask */
export const NUM_NODEMASK_BYTES = MAX_NODES / 8;

export function parseNodeBitMask(mask: Buffer): number[] {
	return parseBitMask(mask.slice(0, NUM_NODEMASK_BYTES));
}
