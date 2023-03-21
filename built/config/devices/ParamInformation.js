"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConditionalConfigOption = exports.ConditionalParamInformation = void 0;
const safe_1 = require("@zwave-js/shared/safe");
const typeguards_1 = require("alcalzone-shared/typeguards");
const utils_safe_1 = require("../utils_safe");
const ConditionalItem_1 = require("./ConditionalItem");
class ConditionalParamInformation {
    constructor(parent, parameterNumber, valueBitMask, definition) {
        this.parent = parent;
        this.parameterNumber = parameterNumber;
        this.valueBitMask = valueBitMask;
        // No need to validate here, this should be done one level higher
        this.condition = definition.$if;
        if (typeof definition.label !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-string label`);
        }
        this.label = definition.label;
        if (definition.description != undefined &&
            typeof definition.description !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-string description`);
        }
        this.description = definition.description;
        if (typeof definition.valueSize !== "number" ||
            definition.valueSize <= 0) {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has an invalid value size`);
        }
        this.valueSize = definition.valueSize;
        if (definition.minValue != undefined &&
            typeof definition.minValue !== "number") {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-numeric property minValue`);
        }
        this.minValue = definition.minValue;
        if (definition.maxValue != undefined &&
            typeof definition.maxValue !== "number") {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-numeric property maxValue`);
        }
        this.maxValue = definition.maxValue;
        if (definition.unsigned != undefined &&
            typeof definition.unsigned !== "boolean") {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-boolean property unsigned`);
        }
        this.unsigned = definition.unsigned === true;
        if (definition.unit != undefined &&
            typeof definition.unit !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-string unit`);
        }
        this.unit = definition.unit;
        if (definition.readOnly != undefined && definition.readOnly !== true) {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${parent.filename}:
		Parameter #${parameterNumber}: readOnly must true or omitted!`);
        }
        this.readOnly = definition.readOnly;
        if (definition.writeOnly != undefined &&
            definition.writeOnly !== true) {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${parent.filename}:
		Parameter #${parameterNumber}: writeOnly must be true or omitted!`);
        }
        this.writeOnly = definition.writeOnly;
        if (definition.defaultValue == undefined) {
            if (!this.readOnly) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} is missing defaultValue, which is required unless the parameter is readOnly`);
            }
        }
        else if (typeof definition.defaultValue !== "number") {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-numeric property defaultValue`);
        }
        this.defaultValue = definition.defaultValue;
        if (definition.allowManualEntry != undefined &&
            definition.allowManualEntry !== false) {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber}: allowManualEntry must be false or omitted!`);
        }
        // Default to allowing manual entry, except if the param is readonly
        this.allowManualEntry =
            definition.allowManualEntry ?? (this.readOnly ? false : true);
        if ((0, typeguards_1.isArray)(definition.options) &&
            !definition.options.every((opt) => (0, typeguards_1.isObject)(opt) &&
                typeof opt.label === "string" &&
                typeof opt.value === "number")) {
            (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber}: options is malformed!`);
        }
        this.options =
            definition.options?.map((opt) => new ConditionalConfigOption(opt.value, opt.label, opt.$if)) ?? [];
    }
    evaluateCondition(deviceId) {
        if (!(0, ConditionalItem_1.conditionApplies)(this, deviceId))
            return;
        const ret = {
            ...(0, safe_1.pick)(this, [
                "parameterNumber",
                "valueBitMask",
                "label",
                "description",
                "valueSize",
                "minValue",
                "maxValue",
                "unsigned",
                "defaultValue",
                "unit",
                "readOnly",
                "writeOnly",
                "allowManualEntry",
            ]),
            options: (0, ConditionalItem_1.evaluateDeep)(this.options, deviceId, true),
        };
        // Infer minValue from options if possible
        if (ret.minValue == undefined) {
            if (ret.allowManualEntry === false && ret.options.length > 0) {
                ret.minValue = Math.min(...ret.options.map((o) => o.value));
            }
            else {
                throw (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${this.parent.filename}:
Parameter #${this.parameterNumber} is missing required property "minValue"!`);
            }
        }
        if (ret.maxValue == undefined) {
            if (ret.allowManualEntry === false && ret.options.length > 0) {
                ret.maxValue = Math.max(...ret.options.map((o) => o.value));
            }
            else {
                throw (0, utils_safe_1.throwInvalidConfig)("devices", `packages/config/config/devices/${this.parent.filename}:
Parameter #${this.parameterNumber} is missing required property "maxValue"!`);
            }
        }
        // @ts-expect-error TS doesn't seem to understand that we do set min/maxValue
        return ret;
    }
}
exports.ConditionalParamInformation = ConditionalParamInformation;
class ConditionalConfigOption {
    constructor(value, label, condition) {
        this.value = value;
        this.label = label;
        this.condition = condition;
    }
    evaluateCondition(deviceId) {
        if (!(0, ConditionalItem_1.conditionApplies)(this, deviceId))
            return;
        return (0, safe_1.pick)(this, ["value", "label"]);
    }
}
exports.ConditionalConfigOption = ConditionalConfigOption;
//# sourceMappingURL=ParamInformation.js.map