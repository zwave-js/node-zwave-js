"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionalPrimitiveVariant = exports.parseConditionalPrimitive = void 0;
const typeguards_1 = require("alcalzone-shared/typeguards");
const utils_safe_1 = require("../utils_safe");
const ConditionalItem_1 = require("./ConditionalItem");
function parseConditionalPrimitive(filename, valueType, propertyName, definition, errorMessagePrefix = "") {
    if ((0, typeguards_1.isArray)(definition) &&
        definition.every((i, index, dfn) => 
        // In arrays, only the last item may be non-conditional
        ((0, typeguards_1.isObject)(i) && typeof i.value === valueType) ||
            (index === dfn.length - 1 && typeof i === valueType))) {
        return definition.map((d) => typeof d === valueType
            ? new ConditionalPrimitiveVariant(d)
            : new ConditionalPrimitiveVariant(d.value, typeof d.$if === "string" ? d.$if : undefined));
    }
    else if (typeof definition === valueType) {
        return definition;
    }
    else {
        (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
${errorMessagePrefix}${propertyName} must be a ${valueType} or an array of conditional ${valueType} entries`);
    }
}
exports.parseConditionalPrimitive = parseConditionalPrimitive;
class ConditionalPrimitiveVariant {
    constructor(value, condition) {
        this.value = value;
        this.condition = condition;
    }
    evaluateCondition(deviceId) {
        if (!(0, ConditionalItem_1.conditionApplies)(this, deviceId))
            return;
        return this.value;
    }
}
exports.ConditionalPrimitiveVariant = ConditionalPrimitiveVariant;
//# sourceMappingURL=ConditionalPrimitive.js.map