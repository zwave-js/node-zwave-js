/** Max number of nodes in a ZWave network */
export const MAX_NODES = 232;

/** The broadcast target node id */
export const NODE_ID_BROADCAST = 0xff;

/** The highest allowed node id */
export const NODE_ID_MAX = MAX_NODES;

/** The number of bytes in a node bit mask */
export const NUM_NODEMASK_BYTES = MAX_NODES / 8;

/** The size of a Home ID */
export const HOMEID_BYTES = 4;

/** How many repeaters can appear in a route */
export const MAX_REPEATERS = 4;

export { InterviewStage } from "./InterviewStage";
export { NodeStatus } from "./NodeStatus";
