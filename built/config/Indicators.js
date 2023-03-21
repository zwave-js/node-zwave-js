"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicatorProperty = void 0;
const safe_1 = require("@zwave-js/shared/safe");
const utils_safe_1 = require("./utils_safe");
class IndicatorProperty {
    constructor(id, definition) {
        this.id = id;
        if (typeof definition.label !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("indicators", `The label for property ${(0, safe_1.num2hex)(id)} is not a string!`);
        }
        this.label = definition.label;
        if (definition.description != undefined &&
            typeof definition.description !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("indicators", `The description for property ${(0, safe_1.num2hex)(id)} is not a string!`);
        }
        this.description = definition.description;
        if (definition.min != undefined && typeof definition.min !== "number") {
            (0, utils_safe_1.throwInvalidConfig)("indicators", `The minimum value for property ${(0, safe_1.num2hex)(id)} is not a number!`);
        }
        this.min = definition.min;
        if (definition.max != undefined && typeof definition.max !== "number") {
            (0, utils_safe_1.throwInvalidConfig)("indicators", `The maximum value for property ${(0, safe_1.num2hex)(id)} is not a number!`);
        }
        this.max = definition.max;
        if (definition.readonly != undefined &&
            typeof definition.readonly !== "boolean") {
            (0, utils_safe_1.throwInvalidConfig)("indicators", `readonly for property ${(0, safe_1.num2hex)(id)} is not a boolean!`);
        }
        this.readonly = definition.readonly;
        if (definition.type != undefined &&
            typeof definition.type !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("indicators", `type for property ${(0, safe_1.num2hex)(id)} is not a string!`);
        }
        // TODO: Validate that the value is ok
        this.type = definition.type;
    }
}
exports.IndicatorProperty = IndicatorProperty;
//# sourceMappingURL=Indicators.js.map