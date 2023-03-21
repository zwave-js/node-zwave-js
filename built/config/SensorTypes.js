"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorType = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const typeguards_1 = require("alcalzone-shared/typeguards");
const Scales_1 = require("./Scales");
const utils_safe_1 = require("./utils_safe");
const namedScalesMarker = "$SCALES:";
class SensorType {
    constructor(manager, key, definition) {
        this.key = key;
        if (typeof definition.label !== "string")
            (0, utils_safe_1.throwInvalidConfig)("sensor types", `label for ${(0, safe_2.num2hex)(key)} is not a string`);
        this.label = definition.label;
        if (typeof definition.scales === "string" &&
            definition.scales.startsWith(namedScalesMarker)) {
            // This is referencing a named scale
            const scaleName = definition.scales.substr(namedScalesMarker.length);
            const scales = manager.lookupNamedScaleGroup(scaleName);
            if (!scales) {
                throw new safe_1.ZWaveError(`Sensor type ${(0, safe_2.num2hex)(key)} is referencing non-existing named scale "${scaleName}"!`, safe_1.ZWaveErrorCodes.Config_Invalid);
            }
            this.scales = scales;
        }
        else {
            // This is an inline scale definition
            const scales = new Map();
            if (!(0, typeguards_1.isObject)(definition.scales))
                (0, utils_safe_1.throwInvalidConfig)("sensor types", `scale definition for ${(0, safe_2.num2hex)(key)} is not an object`);
            for (const [scaleKey, scaleDefinition] of Object.entries(definition.scales)) {
                if (!utils_safe_1.hexKeyRegexNDigits.test(scaleKey))
                    (0, utils_safe_1.throwInvalidConfig)("sensor types", `found invalid key "${scaleKey}" in sensor type ${(0, safe_2.num2hex)(key)}. Sensor  scales must have lowercase hexadecimal IDs.`);
                const scaleKeyNum = parseInt(scaleKey.slice(2), 16);
                scales.set(scaleKeyNum, new Scales_1.Scale(scaleKeyNum, scaleDefinition));
            }
            this.scales = scales;
        }
    }
}
exports.SensorType = SensorType;
//# sourceMappingURL=SensorTypes.js.map