"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isNodeQuery(msg) {
    return typeof msg.nodeId === "number";
}
exports.isNodeQuery = isNodeQuery;
