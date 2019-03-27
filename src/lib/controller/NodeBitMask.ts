import { parseBitMask } from "../values/Primitive";

/** Max number of nodes in a ZWave network */
export const MAX_NODES = 232;
/** The number of bytes in a node bit mask */
export const NUM_NODEMASK_BYTES = MAX_NODES / 8;

export function parseNodeBitMask(mask: Buffer): number[] {
	return parseBitMask(mask.slice(0, NUM_NODEMASK_BYTES));
	// const ret: number[] = [];
	// for (let nodeId = 1; nodeId <= MAX_NODES; nodeId++) {
	// 	const byteNum = (nodeId - 1) >>> 3; // id / 8
	// 	const bitNum = (nodeId - 1) % 8;
	// 	if ((mask[byteNum] & (1 << bitNum)) !== 0) ret.push(nodeId);
	// }
	// return ret;
}
