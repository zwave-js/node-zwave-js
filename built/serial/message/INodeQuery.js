"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNodeQuery = void 0;
/** Tests if the given message is for a node or references a node */
function isNodeQuery(msg) {
    return typeof msg.nodeId === "number";
}
exports.isNodeQuery = isNodeQuery;
//# sourceMappingURL=INodeQuery.js.map