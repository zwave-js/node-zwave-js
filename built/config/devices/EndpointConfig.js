"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionalEndpointConfig = void 0;
const typeguards_1 = require("alcalzone-shared/typeguards");
const utils_safe_1 = require("../utils_safe");
const AssociationConfig_1 = require("./AssociationConfig");
const ConditionalItem_1 = require("./ConditionalItem");
class ConditionalEndpointConfig {
    constructor(filename, index, definition) {
        this.index = index;
        (0, ConditionalItem_1.validateCondition)(filename, definition, `Endpoint ${index} contains an`);
        this.condition = definition.$if;
        if (definition.label != undefined) {
            if (typeof definition.label !== "string") {
                (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
Endpoint ${index}: label is not a string`);
            }
            this.label = definition.label;
        }
        if (definition.associations != undefined) {
            const associations = new Map();
            if (!(0, typeguards_1.isObject)(definition.associations)) {
                (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
Endpoint ${index}: associations is not an object`);
            }
            for (const [key, assocDefinition] of Object.entries(definition.associations)) {
                if (!/^[1-9][0-9]*$/.test(key)) {
                    (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
Endpoint ${index}: found non-numeric group id "${key}" in associations`);
                }
                const keyNum = parseInt(key, 10);
                associations.set(keyNum, new AssociationConfig_1.ConditionalAssociationConfig(filename, keyNum, assocDefinition));
            }
            this.associations = associations;
        }
    }
    evaluateCondition(deviceId) {
        if (!(0, ConditionalItem_1.conditionApplies)(this, deviceId))
            return;
        const ret = {
            index: this.index,
            label: this.label,
        };
        const associations = (0, ConditionalItem_1.evaluateDeep)(this.associations, deviceId);
        if (associations)
            ret.associations = associations;
        return ret;
    }
}
exports.ConditionalEndpointConfig = ConditionalEndpointConfig;
//# sourceMappingURL=EndpointConfig.js.map