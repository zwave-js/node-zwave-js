/** Max number of nodes in a ZWave network */
export const MAX_NODES = 232;

/** Max number of nodes in a Z-Wave LR network */
export const MAX_NODES_LR = 4000; // FIXME: This seems too even, figure out the exact number

/** The number of bytes in a node bit mask */
export const NUM_NODEMASK_BYTES = MAX_NODES / 8;

/** The number of node ids in a long range "segment" (GetLongRangeNodes response) */
export const NUM_LR_NODES_PER_SEGMENT = 128;

/** The number of bytes in a long range node bit mask segment */
export const NUM_LR_NODEMASK_SEGMENT_BYTES = NUM_LR_NODES_PER_SEGMENT / 8;

/** The size of a Home ID */
export const HOMEID_BYTES = 4;

export const MAX_TRANSPORT_SERVICE_SESSION_ID = 0b1111;
