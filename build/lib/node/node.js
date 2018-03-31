"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var QueryStage;
(function (QueryStage) {
    QueryStage[QueryStage["None"] = 0] = "None";
    QueryStage[QueryStage["ProtocolInfo"] = 1] = "ProtocolInfo";
    QueryStage[QueryStage["Probe"] = 2] = "Probe";
    QueryStage[QueryStage["WakeUp"] = 3] = "WakeUp";
    QueryStage[QueryStage["ManufacturerSpecific1"] = 4] = "ManufacturerSpecific1";
    QueryStage[QueryStage["NodeInfo"] = 5] = "NodeInfo";
    QueryStage[QueryStage["NodePlusInfo"] = 6] = "NodePlusInfo";
    QueryStage[QueryStage["SecurityReport"] = 7] = "SecurityReport";
    QueryStage[QueryStage["ManufacturerSpecific2"] = 8] = "ManufacturerSpecific2";
    QueryStage[QueryStage["Versions"] = 9] = "Versions";
    QueryStage[QueryStage["Instances"] = 10] = "Instances";
    QueryStage[QueryStage["Static"] = 11] = "Static";
    // ===== the stuff above should never change =====
    // ===== the stuff below changes frequently, so it has to be redone on every start =====
    QueryStage[QueryStage["CacheLoad"] = 12] = "CacheLoad";
    QueryStage[QueryStage["Associations"] = 13] = "Associations";
    QueryStage[QueryStage["Neighbors"] = 14] = "Neighbors";
    QueryStage[QueryStage["Session"] = 15] = "Session";
    QueryStage[QueryStage["Dynamic"] = 16] = "Dynamic";
    QueryStage[QueryStage["Configuration"] = 17] = "Configuration";
    QueryStage[QueryStage["Complete"] = 18] = "Complete";
})(QueryStage = exports.QueryStage || (exports.QueryStage = {}));
class Node {
    constructor(id, driver) {
        this.id = id;
        this.driver = driver;
        this.queryStage = QueryStage.None;
        // TODO restore from cache
    }
    beginQuery() {
        //
    }
}
exports.Node = Node;
