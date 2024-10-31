/** Max number of nodes in a ZWave network */
export const MAX_NODES = 232;

/** Max number of nodes in a Z-Wave LR network */
export const MAX_NODES_LR = 4000; // FIXME: This seems too even, figure out the exact number

/** The broadcast target node id */
export const NODE_ID_BROADCAST = 0xff;

/** The broadcast target node id for Z-Wave LR */
export const NODE_ID_BROADCAST_LR = 0xfff;

/** The highest allowed node id */
export const NODE_ID_MAX = MAX_NODES;

/** The number of bytes in a node bit mask */
export const NUM_NODEMASK_BYTES = MAX_NODES / 8;

/** The number of node ids in a long range "segment" (GetLongRangeNodes response) */
export const NUM_LR_NODES_PER_SEGMENT = 128;

/** The number of bytes in a long range node bit mask segment */
export const NUM_LR_NODEMASK_SEGMENT_BYTES = NUM_LR_NODES_PER_SEGMENT / 8;

export enum NodeIDType {
	Short = 0x01,
	Long = 0x02,
}

/** The size of a Home ID */
export const HOMEID_BYTES = 4;

/** How many repeaters can appear in a route */
export const MAX_REPEATERS = 4;

export { ControllerStatus } from "./ControllerStatus.js";
export { InterviewStage } from "./InterviewStage.js";
export { NodeStatus } from "./NodeStatus.js";
export * from "./Transmission.js";

export const MAX_SUPERVISION_SESSION_ID = 0b111111;

export const MAX_TRANSPORT_SERVICE_SESSION_ID = 0b1111;
