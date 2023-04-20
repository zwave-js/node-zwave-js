"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeStatisticsEquals = exports.NodeStatisticsHost = void 0;
const Statistics_1 = require("../driver/Statistics");
class NodeStatisticsHost extends Statistics_1.StatisticsHost {
    getAdditionalEventArgs() {
        // The node events include the node as the first argument
        return [this];
    }
    createEmpty() {
        return {
            commandsTX: 0,
            commandsRX: 0,
            commandsDroppedRX: 0,
            commandsDroppedTX: 0,
            timeoutResponse: 0,
        };
    }
}
exports.NodeStatisticsHost = NodeStatisticsHost;
/** Checks if the given route statistics belong to the same route */
function routeStatisticsEquals(r1, r2) {
    if (r1.repeaters.length !== r2.repeaters.length)
        return false;
    if (!r1.repeaters.every((node) => r2.repeaters.includes(node)))
        return false;
    return true;
}
exports.routeStatisticsEquals = routeStatisticsEquals;
//# sourceMappingURL=NodeStatistics.js.map