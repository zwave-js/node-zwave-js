"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecificDeviceClass = exports.GenericDeviceClass = exports.getDefaultSpecificDeviceClass = exports.getDefaultGenericDeviceClass = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const arrays_1 = require("alcalzone-shared/arrays");
const typeguards_1 = require("alcalzone-shared/typeguards");
const utils_safe_1 = require("./utils_safe");
function getDefaultGenericDeviceClass(key) {
    return new GenericDeviceClass(key, {
        label: `UNKNOWN (${(0, safe_2.num2hex)(key)})`,
    });
}
exports.getDefaultGenericDeviceClass = getDefaultGenericDeviceClass;
function getDefaultSpecificDeviceClass(generic, key) {
    if (key === 0)
        return new SpecificDeviceClass(0x00, {
            label: "Unused",
        }, generic);
    return new SpecificDeviceClass(key, {
        label: `UNKNOWN (${(0, safe_2.num2hex)(key)})`,
    }, generic);
}
exports.getDefaultSpecificDeviceClass = getDefaultSpecificDeviceClass;
class GenericDeviceClass {
    constructor(key, definition) {
        this.key = key;
        if (typeof definition.label !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("device classes", `The label for generic device class ${(0, safe_2.num2hex)(key)} is not a string!`);
        }
        this.label = definition.label;
        if (definition.zwavePlusDeviceType != undefined) {
            if (typeof definition.zwavePlusDeviceType !== "string") {
                (0, utils_safe_1.throwInvalidConfig)("device classes", `The zwavePlusDeviceType for generic device class ${(0, safe_2.num2hex)(key)} is not a string!`);
            }
            else {
                this.zwavePlusDeviceType = definition.zwavePlusDeviceType;
            }
        }
        if (definition.requiresSecurity != undefined) {
            if (typeof definition.requiresSecurity !== "boolean") {
                (0, utils_safe_1.throwInvalidConfig)("device classes", `The requiresSecurity property for generic device class ${(0, safe_2.num2hex)(key)} is not a boolean!`);
            }
            else {
                this.requiresSecurity = definition.requiresSecurity;
            }
        }
        if (definition.supportedCCs != undefined) {
            if (!(0, typeguards_1.isArray)(definition.supportedCCs) ||
                !definition.supportedCCs.every((cc) => typeof cc === "string")) {
                (0, utils_safe_1.throwInvalidConfig)("device classes", `supportedCCs in device class ${this.label} (${(0, safe_2.num2hex)(this.key)}) is not a string array!`);
            }
            const supportedCCs = [];
            for (const ccName of definition.supportedCCs) {
                if (!(ccName in safe_1.CommandClasses)) {
                    (0, utils_safe_1.throwInvalidConfig)("device classes", `Found unknown CC "${ccName}" in supportedCCs of device class ${this.label} (${(0, safe_2.num2hex)(this.key)})!`);
                }
                supportedCCs.push(safe_1.CommandClasses[ccName]);
            }
            this.supportedCCs = supportedCCs;
        }
        else {
            this.supportedCCs = [];
        }
        if (definition.controlledCCs != undefined) {
            if (!(0, typeguards_1.isArray)(definition.controlledCCs) ||
                !definition.controlledCCs.every((cc) => typeof cc === "string")) {
                (0, utils_safe_1.throwInvalidConfig)("device classes", `controlledCCs in device class ${this.label} (${(0, safe_2.num2hex)(this.key)}) is not a string array!`);
            }
            const controlledCCs = [];
            for (const ccName of definition.controlledCCs) {
                if (!(ccName in safe_1.CommandClasses)) {
                    (0, utils_safe_1.throwInvalidConfig)("device classes", `Found unknown CC "${ccName}" in controlledCCs of device class ${this.label} (${(0, safe_2.num2hex)(this.key)})!`);
                }
                controlledCCs.push(safe_1.CommandClasses[ccName]);
            }
            this.controlledCCs = controlledCCs;
        }
        else {
            this.controlledCCs = [];
        }
        const specific = new Map();
        if ((0, typeguards_1.isObject)(definition.specific)) {
            for (const [specificKey, specificDefinition] of Object.entries(definition.specific)) {
                if (!utils_safe_1.hexKeyRegexNDigits.test(specificKey))
                    (0, utils_safe_1.throwInvalidConfig)("device classes", `found invalid key "${specificKey}" in device class ${this.label} (${(0, safe_2.num2hex)(this.key)}). Device classes must have lowercase hexadecimal IDs.`);
                const specificKeyNum = parseInt(specificKey.slice(2), 16);
                specific.set(specificKeyNum, new SpecificDeviceClass(specificKeyNum, specificDefinition, this));
            }
        }
        this.specific = specific;
    }
}
exports.GenericDeviceClass = GenericDeviceClass;
class SpecificDeviceClass {
    constructor(key, definition, generic) {
        this.key = key;
        if (typeof definition.label !== "string") {
            (0, utils_safe_1.throwInvalidConfig)("device classes", `The label for device class ${generic.label} -> ${(0, safe_2.num2hex)(key)} is not a string!`);
        }
        this.label = definition.label;
        if (definition.zwavePlusDeviceType != undefined) {
            if (typeof definition.zwavePlusDeviceType !== "string") {
                (0, utils_safe_1.throwInvalidConfig)("device classes", `The zwavePlusDeviceType for device class ${generic.label} -> ${(0, safe_2.num2hex)(key)} is not a string!`);
            }
            else {
                this.zwavePlusDeviceType = definition.zwavePlusDeviceType;
            }
        }
        else if (generic.zwavePlusDeviceType != undefined) {
            this.zwavePlusDeviceType = generic.zwavePlusDeviceType;
        }
        if (definition.requiresSecurity != undefined) {
            if (typeof definition.requiresSecurity !== "boolean") {
                (0, utils_safe_1.throwInvalidConfig)("device classes", `The requiresSecurity property for device class ${generic.label} -> ${(0, safe_2.num2hex)(key)} is not a string!`);
            }
            else {
                this.requiresSecurity = definition.requiresSecurity;
            }
        }
        else if (generic.requiresSecurity != undefined) {
            this.requiresSecurity = generic.requiresSecurity;
        }
        if (definition.supportedCCs != undefined) {
            if (!(0, typeguards_1.isArray)(definition.supportedCCs) ||
                !definition.supportedCCs.every((cc) => typeof cc === "string")) {
                (0, utils_safe_1.throwInvalidConfig)("device classes", `supportedCCs in device class ${generic.label} -> ${this.label} (${(0, safe_2.num2hex)(this.key)}) is not a string array!`);
            }
            const supportedCCs = [];
            for (const ccName of definition.supportedCCs) {
                if (!(ccName in safe_1.CommandClasses)) {
                    (0, utils_safe_1.throwInvalidConfig)("device classes", `Found unknown CC "${ccName}" in supportedCCs of device class ${generic.label} -> ${this.label} (${(0, safe_2.num2hex)(this.key)})!`);
                }
                supportedCCs.push(safe_1.CommandClasses[ccName]);
            }
            this.supportedCCs = supportedCCs;
        }
        else {
            this.supportedCCs = [];
        }
        this.supportedCCs = (0, arrays_1.distinct)([
            ...generic.supportedCCs,
            ...this.supportedCCs,
        ]);
        if (definition.controlledCCs != undefined) {
            if (!(0, typeguards_1.isArray)(definition.controlledCCs) ||
                !definition.controlledCCs.every((cc) => typeof cc === "string")) {
                (0, utils_safe_1.throwInvalidConfig)("device classes", `controlledCCs in device class ${generic.label} -> ${this.label} (${(0, safe_2.num2hex)(this.key)}) is not a string array!`);
            }
            const controlledCCs = [];
            for (const ccName of definition.controlledCCs) {
                if (!(ccName in safe_1.CommandClasses)) {
                    (0, utils_safe_1.throwInvalidConfig)("device classes", `Found unknown CC "${ccName}" in controlledCCs of device class ${generic.label} -> ${this.label} (${(0, safe_2.num2hex)(this.key)})!`);
                }
                controlledCCs.push(safe_1.CommandClasses[ccName]);
            }
            this.controlledCCs = controlledCCs;
        }
        else {
            this.controlledCCs = [];
        }
        this.controlledCCs = (0, arrays_1.distinct)([
            ...generic.controlledCCs,
            ...this.controlledCCs,
        ]);
    }
}
exports.SpecificDeviceClass = SpecificDeviceClass;
//# sourceMappingURL=DeviceClasses.js.map