"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Max number of nodes in a ZWave network */
exports.MAX_NODES = 232;
/** The number of bytes in a node bit mask */
exports.NUM_NODEMASK_BYTES = exports.MAX_NODES / 8;
function parseNodeBitMask(mask) {
    const ret = [];
    for (let nodeId = 1; nodeId <= exports.MAX_NODES; nodeId++) {
        const byteNum = (nodeId - 1) >>> 3; // id / 8
        const bitNum = (nodeId - 1) % 8;
        if ((mask[byteNum] & (1 << bitNum)) !== 0)
            ret.push(nodeId);
    }
    return ret;
}
exports.parseNodeBitMask = parseNodeBitMask;
