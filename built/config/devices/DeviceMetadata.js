"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionalDeviceComment = exports.ConditionalDeviceMetadata = void 0;
const safe_1 = require("@zwave-js/shared/safe");
const typeguards_1 = require("alcalzone-shared/typeguards");
const utils_safe_1 = require("../utils_safe");
const ConditionalItem_1 = require("./ConditionalItem");
const ConditionalPrimitive_1 = require("./ConditionalPrimitive");
class ConditionalDeviceMetadata {
    constructor(filename, definition) {
        for (const prop of [
            "wakeup",
            "inclusion",
            "exclusion",
            "reset",
            "manual",
        ]) {
            if (prop in definition) {
                this[prop] = (0, ConditionalPrimitive_1.parseConditionalPrimitive)(filename, "string", prop, definition[prop], "The metadata entry ");
            }
        }
        if ("comments" in definition) {
            const value = definition.comments;
            const isComment = (opt) => (0, typeguards_1.isObject)(opt) &&
                typeof opt.level === "string" &&
                typeof opt.text === "string";
            if (isComment(value)) {
                this.comments = new ConditionalDeviceComment(value.level, value.text, value.$if);
            }
            else if ((0, typeguards_1.isArray)(value) && value.every(isComment)) {
                this.comments = value.map((c) => new ConditionalDeviceComment(c.level, c.text, c.$if));
            }
            else {
                (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${filename}:
The metadata entry comments is invalid!`);
            }
        }
    }
    evaluateCondition(deviceId) {
        if (!(0, ConditionalItem_1.conditionApplies)(this, deviceId))
            return;
        const ret = {};
        for (const prop of [
            "wakeup",
            "inclusion",
            "exclusion",
            "reset",
            "manual",
        ]) {
            if (this[prop]) {
                const evaluated = (0, ConditionalItem_1.evaluateDeep)(this[prop], deviceId);
                if (evaluated)
                    ret[prop] = evaluated;
            }
        }
        const comments = (0, ConditionalItem_1.evaluateDeep)(this.comments, deviceId, true);
        if (comments)
            ret.comments = comments;
        return ret;
    }
}
exports.ConditionalDeviceMetadata = ConditionalDeviceMetadata;
class ConditionalDeviceComment {
    constructor(level, text, condition) {
        this.level = level;
        this.text = text;
        this.condition = condition;
    }
    evaluateCondition(deviceId) {
        if (!(0, ConditionalItem_1.conditionApplies)(this, deviceId))
            return;
        return (0, safe_1.pick)(this, ["level", "text"]);
    }
}
exports.ConditionalDeviceComment = ConditionalDeviceComment;
//# sourceMappingURL=DeviceMetadata.js.map