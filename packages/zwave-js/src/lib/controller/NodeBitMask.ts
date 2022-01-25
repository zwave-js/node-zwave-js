import { NUM_NODEMASK_BYTES, parseBitMask } from "@zwave-js/core";

export function parseNodeBitMask(mask: Buffer): number[] {
	return parseBitMask(mask.slice(0, NUM_NODEMASK_BYTES));
}
