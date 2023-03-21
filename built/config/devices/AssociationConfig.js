"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionalAssociationConfig = void 0;
const safe_1 = require("@zwave-js/shared/safe");
const utils_safe_1 = require("../utils_safe");
const ConditionalItem_1 = require("./ConditionalItem");
class ConditionalAssociationConfig {
    constructor(filename, groupId, definition) {
        this.groupId = groupId;
        (0, ConditionalItem_1.validateCondition)(filename, definition, `Association ${groupId} contains an`);
        this.condition = definition.$if;
        if (typeof definition.label !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${filename}:
Association ${groupId} has a non-string label`);
        }
        this.label = definition.label;
        if (definition.description != undefined &&
            typeof definition.description !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${filename}:
Association ${groupId} has a non-string description`);
        }
        this.description = definition.description;
        if (typeof definition.maxNodes !== "number") {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${filename}:
maxNodes for association ${groupId} is not a number`);
        }
        this.maxNodes = definition.maxNodes;
        if (definition.isLifeline != undefined &&
            typeof definition.isLifeline !== "boolean") {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${filename}:
isLifeline in association ${groupId} must be a boolean`);
        }
        this.isLifeline = !!definition.isLifeline;
        if (definition.multiChannel != undefined &&
            typeof definition.multiChannel !== "boolean") {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${filename}:
multiChannel in association ${groupId} must be a boolean`);
        }
        // Default to the "auto" strategy
        this.multiChannel = definition.multiChannel ?? "auto";
    }
    evaluateCondition(deviceId) {
        if (!(0, ConditionalItem_1.conditionApplies)(this, deviceId))
            return;
        return (0, safe_1.pick)(this, [
            "groupId",
            "label",
            "description",
            "maxNodes",
            "isLifeline",
            "multiChannel",
        ]);
    }
}
exports.ConditionalAssociationConfig = ConditionalAssociationConfig;
//# sourceMappingURL=AssociationConfig.js.map