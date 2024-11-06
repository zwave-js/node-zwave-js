import { MAX_NODES } from "./consts.js";

export enum NodeIDType {
	Short = 0x01,
	Long = 0x02,
}

/** The broadcast target node id */
export const NODE_ID_BROADCAST = 0xff;

/** The broadcast target node id for Z-Wave LR */
export const NODE_ID_BROADCAST_LR = 0xfff;

/** The highest allowed node id */
// FIXME: Rename probably
export const NODE_ID_MAX = MAX_NODES;

export type MulticastDestination = [number, number, ...number[]];
