"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateDeep = exports.validateCondition = exports.conditionApplies = exports.isConditionalItem = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const typeguards_1 = require("alcalzone-shared/typeguards");
const Logic_1 = require("../Logic");
const utils_safe_1 = require("../utils_safe");
function isConditionalItem(val) {
    // Conditional items must be objects or classes
    if (typeof val !== "object" || val == undefined)
        return false;
    // Conditional items may have a string-valued condition
    if (typeof val.condition !== "string" &&
        typeof val.condition !== "undefined") {
        return false;
    }
    // Conditional items must have an evaluateCondition method
    if (typeof val.evaluateCondition !== "function")
        return false;
    return true;
}
exports.isConditionalItem = isConditionalItem;
/** Checks if a given condition applies for the given device ID */
function conditionApplies(self, deviceId) {
    // No condition? Always applies
    if (!self.condition)
        return true;
    // No device ID? Always applies
    if (!deviceId)
        return true;
    try {
        return !!(0, Logic_1.evaluate)(self.condition, deviceId);
    }
    catch (e) {
        throw new safe_1.ZWaveError(`Invalid condition "${self.condition}"!`, safe_1.ZWaveErrorCodes.Config_Invalid);
    }
}
exports.conditionApplies = conditionApplies;
function validateCondition(filename, definition, errorPrefix) {
    if (definition.$if != undefined && typeof definition.$if !== "string") {
        (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${filename}:
${errorPrefix} invalid $if condition`);
    }
}
exports.validateCondition = validateCondition;
/**
 * Recursively evaluates the given conditional item. By default, arrays are collapsed to the first applicable item.
 */
function evaluateDeep(obj, deviceId, preserveArray = false) {
    if (obj == undefined) {
        return obj;
    }
    else if ((0, typeguards_1.isArray)(obj)) {
        if (preserveArray) {
            // Evaluate all array entries and return the ones that passed
            return obj
                .map((item) => evaluateDeep(item, deviceId, true))
                .filter((o) => o != undefined);
        }
        else {
            // Return the first matching array entry
            for (const item of obj) {
                const evaluated = evaluateDeep(item, deviceId, false);
                if (evaluated != undefined)
                    return evaluated;
            }
        }
    }
    else if (obj instanceof Map) {
        const ret = new Map();
        for (const [key, val] of obj) {
            // In maps only take the first possible value for each entry
            const evaluated = evaluateDeep(val, deviceId, false);
            if (evaluated != undefined) {
                ret.set(key, evaluated);
                continue;
            }
        }
        if (ret.size > 0)
            return ret;
    }
    else if (obj instanceof safe_2.ObjectKeyMap) {
        const ret = new safe_2.ObjectKeyMap();
        for (const [key, val] of obj) {
            // In maps only take the first possible value for each entry
            const evaluated = evaluateDeep(val, deviceId, false);
            if (evaluated != undefined) {
                ret.set(key, evaluated);
                continue;
            }
        }
        if (ret.size > 0)
            return ret;
    }
    else if (isConditionalItem(obj)) {
        // Evaluate the condition for simple items
        return obj.evaluateCondition(deviceId);
    }
    else {
        // Simply return non-conditional items
        return obj;
    }
}
exports.evaluateDeep = evaluateDeep;
//# sourceMappingURL=ConditionalItem.js.map