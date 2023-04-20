"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scale = exports.getDefaultScale = void 0;
const safe_1 = require("@zwave-js/shared/safe");
const utils_safe_1 = require("./utils_safe");
function getDefaultScale(scale) {
    return new Scale(scale, {
        unit: undefined,
        label: "Unknown",
    });
}
exports.getDefaultScale = getDefaultScale;
class Scale {
    constructor(key, definition) {
        this.key = key;
        if (typeof definition.label !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("named scales", `The label for scale ${(0, safe_1.num2hex)(key)} is not a string!`);
        }
        this.label = definition.label;
        if (definition.unit != undefined &&
            typeof definition.unit !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("named scales", `The unit for scale ${(0, safe_1.num2hex)(key)} is not a string!`);
        }
        this.unit = definition.unit;
        if (definition.description != undefined &&
            typeof definition.description !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("named scales", `The description for scale ${(0, safe_1.num2hex)(key)} is not a string!`);
        }
        this.description = definition.description;
    }
}
exports.Scale = Scale;
//# sourceMappingURL=Scales.js.map