"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_TRANSPORT_SERVICE_SESSION_ID = exports.MAX_SUPERVISION_SESSION_ID = exports.NodeStatus = exports.InterviewStage = exports.MAX_REPEATERS = exports.HOMEID_BYTES = exports.NUM_NODEMASK_BYTES = exports.NODE_ID_MAX = exports.NODE_ID_BROADCAST = exports.MAX_NODES = void 0;
/** Max number of nodes in a ZWave network */
exports.MAX_NODES = 232;
/** The broadcast target node id */
exports.NODE_ID_BROADCAST = 0xff;
/** The highest allowed node id */
exports.NODE_ID_MAX = exports.MAX_NODES;
/** The number of bytes in a node bit mask */
exports.NUM_NODEMASK_BYTES = exports.MAX_NODES / 8;
/** The size of a Home ID */
exports.HOMEID_BYTES = 4;
/** How many repeaters can appear in a route */
exports.MAX_REPEATERS = 4;
var InterviewStage_1 = require("./InterviewStage");
Object.defineProperty(exports, "InterviewStage", { enumerable: true, get: function () { return InterviewStage_1.InterviewStage; } });
var NodeStatus_1 = require("./NodeStatus");
Object.defineProperty(exports, "NodeStatus", { enumerable: true, get: function () { return NodeStatus_1.NodeStatus; } });
__exportStar(require("./Transmission"), exports);
exports.MAX_SUPERVISION_SESSION_ID = 0b111111;
exports.MAX_TRANSPORT_SERVICE_SESSION_ID = 0b1111;
//# sourceMappingURL=index.js.map