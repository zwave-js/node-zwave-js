"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultMeterScale = exports.MeterScale = exports.Meter = void 0;
const safe_1 = require("@zwave-js/shared/safe");
const typeguards_1 = require("alcalzone-shared/typeguards");
const utils_safe_1 = require("./utils_safe");
class Meter {
    constructor(id, definition) {
        this.id = id;
        this.name = definition.name;
        const scales = new Map();
        if ((0, typeguards_1.isObject)(definition.scales)) {
            for (const [scaleId, scaleDefinition] of Object.entries(definition.scales)) {
                if (!utils_safe_1.hexKeyRegexNDigits.test(scaleId)) {
                    (0, utils_safe_1.throwInvalidConfig)("meters", `found invalid key "${scaleId}" in meter ${(0, safe_1.num2hex)(id)}. Meter scales must have lowercase hexadecimal IDs.`);
                }
                if (typeof scaleDefinition !== "string") {
                    (0, utils_safe_1.throwInvalidConfig)("meters", `The scale definition for "${scaleId}" in meter ${(0, safe_1.num2hex)(id)} is not a string!`);
                }
                const scaleIdNum = parseInt(scaleId.slice(2), 16);
                scales.set(scaleIdNum, new MeterScale(scaleIdNum, scaleDefinition));
            }
        }
        this.scales = scales;
    }
}
exports.Meter = Meter;
class MeterScale {
    constructor(key, definition) {
        this.key = key;
        this.label = definition;
    }
}
exports.MeterScale = MeterScale;
function getDefaultMeterScale(scale) {
    return new MeterScale(scale, `Unknown (${(0, safe_1.num2hex)(scale)})`);
}
exports.getDefaultMeterScale = getDefaultMeterScale;
//# sourceMappingURL=Meters.js.map