import { MAX_NODES, parseBitMask } from "@zwave-js/core";

/** The number of bytes in a node bit mask */
export const NUM_NODEMASK_BYTES = MAX_NODES / 8;

export function parseNodeBitMask(mask: Buffer): number[] {
	return parseBitMask(mask.slice(0, NUM_NODEMASK_BYTES));
}
