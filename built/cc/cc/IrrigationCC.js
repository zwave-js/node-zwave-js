"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
var IrrigationCC_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IrrigationCCSystemShutoff = exports.IrrigationCCValveTableRun = exports.IrrigationCCValveTableGet = exports.IrrigationCCValveTableReport = exports.IrrigationCCValveTableSet = exports.IrrigationCCValveRun = exports.IrrigationCCValveConfigGet = exports.IrrigationCCValveConfigReport = exports.IrrigationCCValveConfigSet = exports.IrrigationCCValveInfoGet = exports.IrrigationCCValveInfoReport = exports.IrrigationCCSystemConfigGet = exports.IrrigationCCSystemConfigReport = exports.IrrigationCCSystemConfigSet = exports.IrrigationCCSystemStatusGet = exports.IrrigationCCSystemStatusReport = exports.IrrigationCCSystemInfoGet = exports.IrrigationCCSystemInfoReport = exports.IrrigationCC = exports.IrrigationCCAPI = exports.IrrigationCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__IrrigationCCSystemConfigSetOptions = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function su__2__3_eu($o) {
        return ![0, 1].includes($o) ? {} : null;
    }
    function _0($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("masterValveDelay" in $o && $o["masterValveDelay"] !== undefined) {
            const error = _number($o["masterValveDelay"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("highPressureThreshold" in $o && $o["highPressureThreshold"] !== undefined) {
            const error = _number($o["highPressureThreshold"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("lowPressureThreshold" in $o && $o["lowPressureThreshold"] !== undefined) {
            const error = _number($o["lowPressureThreshold"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("rainSensorPolarity" in $o && $o["rainSensorPolarity"] !== undefined) {
            const error = su__2__3_eu($o["rainSensorPolarity"]);
            if (error)
                return error;
        }
        if ("moistureSensorPolarity" in $o && $o["moistureSensorPolarity"] !== undefined) {
            const error = su__2__3_eu($o["moistureSensorPolarity"]);
            if (error)
                return error;
        }
        return null;
    }
    return _0($o);
};
const __assertType__ValveId = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _2($o) {
        return $o !== "master" ? {} : null;
    }
    function su__number__2_eu($o) {
        const conditions = [_number, _2];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su__number__2_eu($o);
};
const __assertType__IrrigationCCValveConfigSetOptions = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _3($o) {
        return $o !== "master" ? {} : null;
    }
    function su__number__3_eu($o) {
        const conditions = [_number, _3];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function _boolean($o) {
        return typeof $o !== "boolean" ? {} : null;
    }
    function _0($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("valveId" in $o && $o["valveId"] !== undefined) {
            const error = su__number__3_eu($o["valveId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("nominalCurrentHighThreshold" in $o && $o["nominalCurrentHighThreshold"] !== undefined) {
            const error = _number($o["nominalCurrentHighThreshold"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("nominalCurrentLowThreshold" in $o && $o["nominalCurrentLowThreshold"] !== undefined) {
            const error = _number($o["nominalCurrentLowThreshold"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("maximumFlow" in $o && $o["maximumFlow"] !== undefined) {
            const error = _number($o["maximumFlow"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("highFlowThreshold" in $o && $o["highFlowThreshold"] !== undefined) {
            const error = _number($o["highFlowThreshold"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("lowFlowThreshold" in $o && $o["lowFlowThreshold"] !== undefined) {
            const error = _number($o["lowFlowThreshold"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("useRainSensor" in $o && $o["useRainSensor"] !== undefined) {
            const error = _boolean($o["useRainSensor"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("useMoistureSensor" in $o && $o["useMoistureSensor"] !== undefined) {
            const error = _boolean($o["useMoistureSensor"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    return _0($o);
};
const __assertType__number = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    return _number($o);
};
const __assertType__sa__2_ea_2 = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _2($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("valveId" in $o && $o["valveId"] !== undefined) {
            const error = _number($o["valveId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("duration" in $o && $o["duration"] !== undefined) {
            const error = _number($o["duration"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function sa__2_ea_2($o) {
        if (!Array.isArray($o))
            return {};
        for (let i = 0; i < $o.length; i++) {
            const error = _2($o[i]);
            if (error)
                return error;
        }
        return null;
    }
    return sa__2_ea_2($o);
};
const __assertType__sa__number_ea_2 = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function sa__number_ea_2($o) {
        if (!Array.isArray($o))
            return {};
        for (let i = 0; i < $o.length; i++) {
            const error = _number($o[i]);
            if (error)
                return error;
        }
        return null;
    }
    return sa__number_ea_2($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const strings_1 = require("alcalzone-shared/strings");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.IrrigationCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses.Irrigation, {
        ...Values_1.V.staticProperty("numValves", undefined, { internal: true }),
        ...Values_1.V.staticProperty("numValveTables", undefined, { internal: true }),
        ...Values_1.V.staticProperty("supportsMasterValve", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("maxValveTableSize", undefined, { internal: true }),
        ...Values_1.V.staticProperty("systemVoltage", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: "System voltage",
            unit: "V",
        }),
        ...Values_1.V.staticProperty("masterValveDelay", {
            ...safe_1.ValueMetadata.UInt8,
            label: "Master valve delay",
            description: "The delay between turning on the master valve and turning on any zone valve",
            unit: "seconds",
        }),
        ...Values_1.V.staticProperty("flowSensorActive", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Flow sensor active",
        }),
        ...Values_1.V.staticProperty("pressureSensorActive", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Pressure sensor active",
        }),
        ...Values_1.V.staticProperty("rainSensorActive", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Rain sensor attached and active",
        }),
        ...Values_1.V.staticProperty("rainSensorPolarity", {
            ...safe_1.ValueMetadata.Number,
            label: "Rain sensor polarity",
            min: 0,
            max: 1,
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.IrrigationSensorPolarity),
        }),
        ...Values_1.V.staticProperty("moistureSensorActive", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Moisture sensor attached and active",
        }),
        ...Values_1.V.staticProperty("moistureSensorPolarity", {
            ...safe_1.ValueMetadata.Number,
            label: "Moisture sensor polarity",
            min: 0,
            max: 1,
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.IrrigationSensorPolarity),
        }),
        ...Values_1.V.staticProperty("flow", {
            ...safe_1.ValueMetadata.ReadOnlyNumber,
            label: "Flow",
            unit: "l/h",
        }),
        ...Values_1.V.staticProperty("pressure", {
            ...safe_1.ValueMetadata.ReadOnlyNumber,
            label: "Pressure",
            unit: "kPa",
        }),
        ...Values_1.V.staticProperty("shutoffDuration", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: "Remaining shutoff duration",
            unit: "hours",
        }),
        ...Values_1.V.staticProperty("errorNotProgrammed", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Error: device not programmed",
        }),
        ...Values_1.V.staticProperty("errorEmergencyShutdown", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Error: emergency shutdown",
        }),
        ...Values_1.V.staticProperty("errorHighPressure", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Error: high pressure",
        }),
        ...Values_1.V.staticProperty("highPressureThreshold", {
            ...safe_1.ValueMetadata.Number,
            label: "High pressure threshold",
            unit: "kPa",
        }),
        ...Values_1.V.staticProperty("errorLowPressure", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Error: low pressure",
        }),
        ...Values_1.V.staticProperty("lowPressureThreshold", {
            ...safe_1.ValueMetadata.Number,
            label: "Low pressure threshold",
            unit: "kPa",
        }),
        ...Values_1.V.staticProperty("errorValve", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Error: valve reporting error",
        }),
        ...Values_1.V.staticProperty("masterValveOpen", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Master valve is open",
        }),
        ...Values_1.V.staticProperty("firstOpenZoneId", {
            ...safe_1.ValueMetadata.ReadOnlyNumber,
            label: "First open zone valve ID",
        }),
        ...Values_1.V.staticPropertyWithName("shutoffSystem", "shutoff", {
            ...safe_1.ValueMetadata.WriteOnlyBoolean,
            label: `Shutoff system`,
        }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses.Irrigation, {
        ...Values_1.V.dynamicPropertyAndKeyWithName("valveConnected", (valveId) => valveId, "valveConnected", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "valveConnected", (valveId) => ({
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: `${valveIdToMetadataPrefix(valveId)}: Connected`,
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("nominalCurrent", (valveId) => valveId, "nominalCurrent", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "nominalCurrent", (valveId) => ({
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: `${valveIdToMetadataPrefix(valveId)}: Nominal current`,
            unit: "mA",
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("nominalCurrentHighThreshold", (valveId) => valveId, "nominalCurrentHighThreshold", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "nominalCurrentHighThreshold", (valveId) => ({
            ...safe_1.ValueMetadata.Number,
            label: `${valveIdToMetadataPrefix(valveId)}: Nominal current - high threshold`,
            min: 0,
            max: 2550,
            unit: "mA",
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("nominalCurrentLowThreshold", (valveId) => valveId, "nominalCurrentLowThreshold", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "nominalCurrentLowThreshold", (valveId) => ({
            ...safe_1.ValueMetadata.Number,
            label: `${valveIdToMetadataPrefix(valveId)}: Nominal current - low threshold`,
            min: 0,
            max: 2550,
            unit: "mA",
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("errorShortCircuit", (valveId) => valveId, "errorShortCircuit", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "errorShortCircuit", (valveId) => ({
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: `${valveIdToMetadataPrefix(valveId)}: Error - Short circuit detected`,
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("errorHighCurrent", (valveId) => valveId, "errorHighCurrent", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "errorHighCurrent", (valveId) => ({
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: `${valveIdToMetadataPrefix(valveId)}: Error - Current above high threshold`,
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("errorLowCurrent", (valveId) => valveId, "errorLowCurrent", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "errorLowCurrent", (valveId) => ({
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: `${valveIdToMetadataPrefix(valveId)}: Error - Current below low threshold`,
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("maximumFlow", (valveId) => valveId, "maximumFlow", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "maximumFlow", (valveId) => ({
            ...safe_1.ValueMetadata.Number,
            label: `${valveIdToMetadataPrefix(valveId)}: Maximum flow`,
            min: 0,
            unit: "l/h",
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("errorMaximumFlow", (valveId) => valveId, "errorMaximumFlow", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "errorMaximumFlow", (valveId) => ({
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: `${valveIdToMetadataPrefix(valveId)}: Error - Maximum flow detected`,
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("highFlowThreshold", (valveId) => valveId, "highFlowThreshold", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "highFlowThreshold", (valveId) => ({
            ...safe_1.ValueMetadata.Number,
            label: `${valveIdToMetadataPrefix(valveId)}: High flow threshold`,
            min: 0,
            unit: "l/h",
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("errorHighFlow", (valveId) => valveId, "errorHighFlow", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "errorHighFlow", (valveId) => ({
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: `${valveIdToMetadataPrefix(valveId)}: Error - Flow above high threshold`,
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("lowFlowThreshold", (valveId) => valveId, "lowFlowThreshold", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "lowFlowThreshold", (valveId) => ({
            ...safe_1.ValueMetadata.Number,
            label: `${valveIdToMetadataPrefix(valveId)}: Low flow threshold`,
            min: 0,
            unit: "l/h",
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("errorLowFlow", (valveId) => valveId, "errorLowFlow", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "errorLowFlow", (valveId) => ({
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: `${valveIdToMetadataPrefix(valveId)}: Error - Flow below high threshold`,
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("useRainSensor", (valveId) => valveId, "useRainSensor", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "useRainSensor", (valveId) => ({
            ...safe_1.ValueMetadata.Boolean,
            label: `${valveIdToMetadataPrefix(valveId)}: Use rain sensor`,
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("useMoistureSensor", (valveId) => valveId, "useMoistureSensor", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "useMoistureSensor", (valveId) => ({
            ...safe_1.ValueMetadata.Boolean,
            label: `${valveIdToMetadataPrefix(valveId)}: Use moisture sensor`,
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("valveRunDuration", (valveId) => valveId, "duration", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "duration", (valveId) => ({
            ...safe_1.ValueMetadata.UInt16,
            label: `${valveIdToMetadataPrefix(valveId)}: Run duration`,
            min: 1,
            unit: "s",
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("valveRunStartStop", (valveId) => valveId, "startStop", ({ property, propertyKey }) => (typeof property === "number" || property === "master") &&
            propertyKey === "startStop", (valveId) => ({
            ...safe_1.ValueMetadata.Boolean,
            label: `${valveIdToMetadataPrefix(valveId)}: Start/Stop`,
        })),
    }),
});
function valveIdToMetadataPrefix(valveId) {
    if (valveId === "master")
        return "Master valve";
    return `Valve ${(0, strings_1.padStart)(valveId.toString(), 3, "0")}`;
}
const systemConfigProperties = [
    "masterValveDelay",
    "highPressureThreshold",
    "lowPressureThreshold",
    "rainSensorPolarity",
    "moistureSensorPolarity",
];
const valveConfigPropertyKeys = [
    "nominalCurrentHighThreshold",
    "nominalCurrentLowThreshold",
    "maximumFlow",
    "highFlowThreshold",
    "lowFlowThreshold",
    "useRainSensor",
    "useMoistureSensor",
];
let IrrigationCCAPI = class IrrigationCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, propertyKey }, value) => {
            const valueDB = this.getValueDB();
            if (systemConfigProperties.includes(property)) {
                const options = {};
                for (const prop of systemConfigProperties) {
                    if (prop === property)
                        continue;
                    const valueId = {
                        commandClass: this.ccId,
                        endpoint: this.endpoint.index,
                        property: prop,
                    };
                    const cachedVal = valueDB.getValue(valueId);
                    if (cachedVal == undefined) {
                        throw new safe_1.ZWaveError(`The "${property}" property cannot be changed before ${prop} is known!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                    }
                    options[prop] = cachedVal;
                }
                options[property] =
                    value;
                return this.setSystemConfig(options);
            }
            else if (property === "shutoff") {
                return this.shutoffSystem(0);
            }
            else if (property === "master" ||
                (typeof property === "number" && property >= 1)) {
                // This is a value of a valve
                if (propertyKey == undefined) {
                    (0, API_1.throwMissingPropertyKey)(this.ccId, property);
                }
                if (valveConfigPropertyKeys.includes(propertyKey)) {
                    const options = {
                        valveId: property,
                    };
                    for (const prop of valveConfigPropertyKeys) {
                        if (prop === propertyKey)
                            continue;
                        const valueId = {
                            commandClass: this.ccId,
                            endpoint: this.endpoint.index,
                            property,
                            propertyKey: prop,
                        };
                        const cachedVal = valueDB.getValue(valueId);
                        if (cachedVal == undefined) {
                            throw new safe_1.ZWaveError(`The "${property}_${propertyKey}" property cannot be changed before ${property}_${prop} is known!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                        }
                        options[prop] = cachedVal;
                    }
                    options[propertyKey] = value;
                    return this.setValveConfig(options);
                }
                else if (propertyKey === "duration") {
                    // The run duration needs to be set separately from triggering the run
                    // So this is okay
                    return;
                }
                else if (propertyKey === "startStop") {
                    // Trigger or stop a valve run, depending on the value
                    if (typeof value !== "boolean") {
                        (0, API_1.throwWrongValueType)(this.ccId, property, "boolean", typeof value);
                    }
                    if (value) {
                        // Start a valve run
                        const duration = valueDB.getValue(exports.IrrigationCCValues.valveRunDuration(property).endpoint(this.endpoint.index));
                        if (duration == undefined) {
                            throw new safe_1.ZWaveError(`Cannot start a valve run without specifying a duration first!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                        }
                        return this.runValve(property, duration);
                    }
                    else {
                        // Stop a valve run
                        return this.shutoffValve(property);
                    }
                }
                else {
                    (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
                }
            }
        };
        this[_b] = async ({ property, propertyKey, }) => {
            switch (property) {
                case "systemVoltage":
                case "flowSensorActive":
                case "pressureSensorActive":
                case "rainSensorActive":
                case "moistureSensorActive":
                case "flow":
                case "pressure":
                case "shutoffDuration":
                case "errorNotProgrammed":
                case "errorEmergencyShutdown":
                case "errorHighPressure":
                case "errorLowPressure":
                case "errorValve":
                case "masterValveOpen":
                case "firstOpenZoneId":
                    return (await this.getSystemStatus())?.[property];
                case "masterValveDelay":
                case "highPressureThreshold":
                case "lowPressureThreshold":
                case "rainSensorPolarity":
                case "moistureSensorPolarity":
                    return (await this.getSystemConfig())?.[property];
            }
            if (property === "master" ||
                (typeof property === "number" && property >= 1)) {
                // This is a value of a valve
                switch (propertyKey) {
                    case "connected":
                    case "nominalCurrent":
                    case "errorShortCircuit":
                    case "errorHighCurrent":
                    case "errorLowCurrent":
                    case "errorMaximumFlow":
                    case "errorHighFlow":
                    case "errorLowFlow":
                        return (await this.getValveInfo(property))?.[propertyKey];
                    case "nominalCurrentHighThreshold":
                    case "nominalCurrentLowThreshold":
                    case "maximumFlow":
                    case "highFlowThreshold":
                    case "lowFlowThreshold":
                    case "useRainSensor":
                    case "useMoistureSensor":
                        return (await this.getValveConfig(property))?.[propertyKey];
                    case undefined:
                        (0, API_1.throwMissingPropertyKey)(this.ccId, property);
                    default:
                        (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
                }
            }
            (0, API_1.throwUnsupportedProperty)(this.ccId, property);
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.IrrigationCommand.SystemInfoGet:
            case _Types_1.IrrigationCommand.SystemStatusGet:
            case _Types_1.IrrigationCommand.SystemConfigSet:
            case _Types_1.IrrigationCommand.SystemConfigGet:
            case _Types_1.IrrigationCommand.ValveInfoGet:
            case _Types_1.IrrigationCommand.ValveConfigSet:
            case _Types_1.IrrigationCommand.ValveConfigGet:
            case _Types_1.IrrigationCommand.ValveRun:
            case _Types_1.IrrigationCommand.ValveTableSet:
            case _Types_1.IrrigationCommand.ValveTableGet:
            case _Types_1.IrrigationCommand.ValveTableRun:
            case _Types_1.IrrigationCommand.SystemShutoff:
                // These are all mandatory in V1
                return true;
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getSystemInfo() {
        this.assertSupportsCommand(_Types_1.IrrigationCommand, _Types_1.IrrigationCommand.SystemInfoGet);
        const cc = new IrrigationCCSystemInfoGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "numValves",
                "numValveTables",
                "supportsMasterValve",
                "maxValveTableSize",
            ]);
        }
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getSystemStatus() {
        this.assertSupportsCommand(_Types_1.IrrigationCommand, _Types_1.IrrigationCommand.SystemStatusGet);
        const cc = new IrrigationCCSystemStatusGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "systemVoltage",
                "flowSensorActive",
                "pressureSensorActive",
                "rainSensorActive",
                "moistureSensorActive",
                "flow",
                "pressure",
                "shutoffDuration",
                "errorNotProgrammed",
                "errorEmergencyShutdown",
                "errorHighPressure",
                "errorLowPressure",
                "errorValve",
                "masterValveOpen",
                "firstOpenZoneId",
            ]);
        }
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getSystemConfig() {
        this.assertSupportsCommand(_Types_1.IrrigationCommand, _Types_1.IrrigationCommand.SystemConfigGet);
        const cc = new IrrigationCCSystemConfigGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "masterValveDelay",
                "highPressureThreshold",
                "lowPressureThreshold",
                "rainSensorPolarity",
                "moistureSensorPolarity",
            ]);
        }
    }
    async setSystemConfig(config) {
        __assertType("config", "IrrigationCCSystemConfigSetOptions", __assertType__IrrigationCCSystemConfigSetOptions.bind(void 0, config));
        this.assertSupportsCommand(_Types_1.IrrigationCommand, _Types_1.IrrigationCommand.SystemConfigSet);
        const cc = new IrrigationCCSystemConfigSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...config,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getValveInfo(valveId) {
        __assertType("valveId", "ValveId", __assertType__ValveId.bind(void 0, valveId));
        this.assertSupportsCommand(_Types_1.IrrigationCommand, _Types_1.IrrigationCommand.ValveInfoGet);
        const cc = new IrrigationCCValveInfoGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            valveId,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "connected",
                "nominalCurrent",
                "errorShortCircuit",
                "errorHighCurrent",
                "errorLowCurrent",
                "errorMaximumFlow",
                "errorHighFlow",
                "errorLowFlow",
            ]);
        }
    }
    async setValveConfig(options) {
        __assertType("options", "IrrigationCCValveConfigSetOptions", __assertType__IrrigationCCValveConfigSetOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.IrrigationCommand, _Types_1.IrrigationCommand.ValveConfigSet);
        const cc = new IrrigationCCValveConfigSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...options,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getValveConfig(valveId) {
        __assertType("valveId", "ValveId", __assertType__ValveId.bind(void 0, valveId));
        this.assertSupportsCommand(_Types_1.IrrigationCommand, _Types_1.IrrigationCommand.ValveConfigGet);
        const cc = new IrrigationCCValveConfigGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            valveId,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "nominalCurrentHighThreshold",
                "nominalCurrentLowThreshold",
                "maximumFlow",
                "highFlowThreshold",
                "lowFlowThreshold",
                "useRainSensor",
                "useMoistureSensor",
            ]);
        }
    }
    async runValve(valveId, duration) {
        __assertType("valveId", "ValveId", __assertType__ValveId.bind(void 0, valveId));
        __assertType("duration", "number", __assertType__number.bind(void 0, duration));
        this.assertSupportsCommand(_Types_1.IrrigationCommand, _Types_1.IrrigationCommand.ValveRun);
        const cc = new IrrigationCCValveRun(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            valveId,
            duration,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    shutoffValve(valveId) {
        __assertType("valveId", "ValveId", __assertType__ValveId.bind(void 0, valveId));
        return this.runValve(valveId, 0);
    }
    async setValveTable(tableId, entries) {
        __assertType("tableId", "number", __assertType__number.bind(void 0, tableId));
        __assertType("entries", undefined, __assertType__sa__2_ea_2.bind(void 0, entries));
        this.assertSupportsCommand(_Types_1.IrrigationCommand, _Types_1.IrrigationCommand.ValveTableSet);
        if (!this.endpoint.virtual) {
            const maxValveTableSize = IrrigationCC.getMaxValveTableSizeCached(this.applHost, this.endpoint);
            if (maxValveTableSize != undefined &&
                entries.length > maxValveTableSize) {
                throw new safe_1.ZWaveError(`The number of valve table entries must not exceed ${maxValveTableSize}.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
        }
        const cc = new IrrigationCCValveTableSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            tableId,
            entries,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getValveTable(tableId) {
        __assertType("tableId", "number", __assertType__number.bind(void 0, tableId));
        this.assertSupportsCommand(_Types_1.IrrigationCommand, _Types_1.IrrigationCommand.ValveTableGet);
        const cc = new IrrigationCCValveTableGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            tableId,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return response?.entries;
        }
    }
    async runTables(tableIDs) {
        __assertType("tableIDs", undefined, __assertType__sa__number_ea_2.bind(void 0, tableIDs));
        this.assertSupportsCommand(_Types_1.IrrigationCommand, _Types_1.IrrigationCommand.ValveTableRun);
        const cc = new IrrigationCCValveTableRun(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            tableIDs,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    /**
     * Shuts off the entire system for the given duration.
     * @param duration Shutoff duration in hours. A value of 255 will shut off the entire system permanently and prevents schedules from running.
     */
    async shutoffSystem(duration) {
        __assertType("duration", "number", __assertType__number.bind(void 0, duration));
        this.assertSupportsCommand(_Types_1.IrrigationCommand, _Types_1.IrrigationCommand.SystemShutoff);
        const cc = new IrrigationCCSystemShutoff(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            duration,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    /** Shuts off the entire system permanently and prevents schedules from running */
    shutoffSystemPermanently() {
        return this.shutoffSystem(255);
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
IrrigationCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Irrigation)
], IrrigationCCAPI);
exports.IrrigationCCAPI = IrrigationCCAPI;
let IrrigationCC = IrrigationCC_1 = class IrrigationCC extends CommandClass_1.CommandClass {
    /**
     * Returns the maximum number of valve table entries reported by the node.
     * This only works AFTER the node has been interviewed.
     */
    static getMaxValveTableSizeCached(applHost, endpoint) {
        return applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.IrrigationCCValues.maxValveTableSize.endpoint(endpoint.index));
    }
    /**
     * Returns the number of zone valves reported by the node.
     * This only works AFTER the node has been interviewed.
     */
    static getNumValvesCached(applHost, endpoint) {
        return applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.IrrigationCCValues.numValves.endpoint(endpoint.index));
    }
    /**
     * Returns whether the node supports a master valve
     * This only works AFTER the node has been interviewed.
     */
    static supportsMasterValveCached(applHost, endpoint) {
        return !!applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.IrrigationCCValues.supportsMasterValve.endpoint(endpoint.index));
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Irrigation, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "Querying irrigation system info...",
            direction: "outbound",
        });
        const systemInfo = await api.getSystemInfo();
        if (!systemInfo) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Time out while querying irrigation system info, skipping interview...",
                level: "warn",
            });
            return;
        }
        const logMessage = `received irrigation system info:
supports master valve: ${systemInfo.supportsMasterValve}
no. of valves:         ${systemInfo.numValves}
no. of valve tables:   ${systemInfo.numValveTables}
max. valve table size: ${systemInfo.maxValveTableSize}`;
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: logMessage,
            direction: "inbound",
        });
        // For each valve, create the values to start/stop a run
        for (let i = 1; i <= systemInfo.numValves; i++) {
            this.ensureMetadata(applHost, exports.IrrigationCCValues.valveRunDuration(i));
            this.ensureMetadata(applHost, exports.IrrigationCCValues.valveRunStartStop(i));
        }
        // And create a shutoff value
        this.ensureMetadata(applHost, exports.IrrigationCCValues.shutoffSystem);
        // Query current values
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Irrigation, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        // Query the current system config
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "Querying irrigation system configuration...",
            direction: "outbound",
        });
        const systemConfig = await api.getSystemConfig();
        if (systemConfig) {
            let logMessage = `received irrigation system configuration:
master valve delay:       ${systemConfig.masterValveDelay} seconds
high pressure threshold:  ${systemConfig.highPressureThreshold} kPa
low pressure threshold:   ${systemConfig.lowPressureThreshold} kPa`;
            if (systemConfig.rainSensorPolarity != undefined) {
                logMessage += `
rain sensor polarity:     ${(0, safe_2.getEnumMemberName)(_Types_1.IrrigationSensorPolarity, systemConfig.rainSensorPolarity)}`;
            }
            if (systemConfig.moistureSensorPolarity != undefined) {
                logMessage += `
moisture sensor polarity: ${(0, safe_2.getEnumMemberName)(_Types_1.IrrigationSensorPolarity, systemConfig.moistureSensorPolarity)}`;
            }
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
        // and status
        // Query the current system config
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "Querying irrigation system status...",
            direction: "outbound",
        });
        await api.getSystemStatus();
        // for each valve, query the current status and configuration
        if (IrrigationCC_1.supportsMasterValveCached(applHost, endpoint)) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Querying master valve configuration...",
                direction: "outbound",
            });
            await api.getValveConfig("master");
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Querying master valve status...",
                direction: "outbound",
            });
            await api.getValveInfo("master");
        }
        for (let i = 1; i <= (IrrigationCC_1.getNumValvesCached(applHost, endpoint) ?? 0); i++) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `Querying configuration for valve ${(0, strings_1.padStart)(i.toString(), 3, "0")}...`,
                direction: "outbound",
            });
            await api.getValveConfig(i);
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `Querying status for valve ${(0, strings_1.padStart)(i.toString(), 3, "0")}...`,
                direction: "outbound",
            });
            await api.getValveInfo(i);
        }
    }
    translateProperty(applHost, property, propertyKey) {
        if (property === "master") {
            return "Master valve";
        }
        else if (typeof property === "number") {
            return `Valve ${(0, strings_1.padStart)(property.toString(), 3, "0")}`;
        }
        return super.translateProperty(applHost, property, propertyKey);
    }
};
IrrigationCC = IrrigationCC_1 = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Irrigation),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.IrrigationCCValues)
], IrrigationCC);
exports.IrrigationCC = IrrigationCC;
let IrrigationCCSystemInfoReport = class IrrigationCCSystemInfoReport extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 4);
        this.supportsMasterValve = !!(this.payload[0] & 0x01);
        this.numValves = this.payload[1];
        this.numValveTables = this.payload[2];
        this.maxValveTableSize = this.payload[3] & 0b1111;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supports master valve": this.supportsMasterValve,
                "no. of valves": this.numValves,
                "no. of valve tables": this.numValveTables,
                "max. valve table size": this.maxValveTableSize,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.numValves)
], IrrigationCCSystemInfoReport.prototype, "numValves", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.numValveTables)
], IrrigationCCSystemInfoReport.prototype, "numValveTables", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.supportsMasterValve)
], IrrigationCCSystemInfoReport.prototype, "supportsMasterValve", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.maxValveTableSize)
], IrrigationCCSystemInfoReport.prototype, "maxValveTableSize", void 0);
IrrigationCCSystemInfoReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.SystemInfoReport)
], IrrigationCCSystemInfoReport);
exports.IrrigationCCSystemInfoReport = IrrigationCCSystemInfoReport;
let IrrigationCCSystemInfoGet = class IrrigationCCSystemInfoGet extends IrrigationCC {
};
IrrigationCCSystemInfoGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.SystemInfoGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(IrrigationCCSystemInfoReport)
], IrrigationCCSystemInfoGet);
exports.IrrigationCCSystemInfoGet = IrrigationCCSystemInfoGet;
let IrrigationCCSystemStatusReport = class IrrigationCCSystemStatusReport extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.systemVoltage = this.payload[0];
        this.flowSensorActive = !!(this.payload[1] & 0x01);
        this.pressureSensorActive = !!(this.payload[1] & 0x02);
        this.rainSensorActive = !!(this.payload[1] & 0x04);
        this.moistureSensorActive = !!(this.payload[1] & 0x08);
        let offset = 2;
        {
            const { value, scale, bytesRead } = (0, safe_1.parseFloatWithScale)(this.payload.slice(offset));
            (0, safe_1.validatePayload)(scale === 0);
            if (this.flowSensorActive)
                this.flow = value;
            offset += bytesRead;
        }
        {
            const { value, scale, bytesRead } = (0, safe_1.parseFloatWithScale)(this.payload.slice(offset));
            (0, safe_1.validatePayload)(scale === 0);
            if (this.pressureSensorActive)
                this.pressure = value;
            offset += bytesRead;
        }
        (0, safe_1.validatePayload)(this.payload.length >= offset + 4);
        this.shutoffDuration = this.payload[offset];
        this.errorNotProgrammed = !!(this.payload[offset + 1] & 0x01);
        this.errorEmergencyShutdown = !!(this.payload[offset + 1] & 0x02);
        this.errorHighPressure = !!(this.payload[offset + 1] & 0x04);
        this.errorLowPressure = !!(this.payload[offset + 1] & 0x08);
        this.errorValve = !!(this.payload[offset + 1] & 0x10);
        this.masterValveOpen = !!(this.payload[offset + 2] & 0x01);
        if (this.payload[offset + 3]) {
            this.firstOpenZoneId = this.payload[offset + 3];
        }
    }
    toLogEntry(applHost) {
        const message = {
            "system voltage": `${this.systemVoltage} V`,
            "active sensors": [
                this.flowSensorActive ? "flow" : undefined,
                this.pressureSensorActive ? "pressure" : undefined,
                this.rainSensorActive ? "rain" : undefined,
                this.moistureSensorActive ? "moisture" : undefined,
            ]
                .filter(Boolean)
                .join(", "),
        };
        if (this.flow != undefined) {
            message.flow = `${this.flow} l/h`;
        }
        if (this.pressure != undefined) {
            message.pressure = `${this.pressure} kPa`;
        }
        message["remaining shutoff duration"] = `${this.shutoffDuration} hours`;
        message["master valve status"] = this.masterValveOpen
            ? "open"
            : "closed";
        message["first open zone valve"] = this.firstOpenZoneId || "none";
        const errors = [
            this.errorNotProgrammed ? "device not programmed" : undefined,
            this.errorEmergencyShutdown ? "emergency shutdown" : undefined,
            this.errorHighPressure
                ? "high pressure threshold triggered"
                : undefined,
            this.errorLowPressure
                ? "low pressure threshold triggered"
                : undefined,
            this.errorValve
                ? "a valve or the master valve has an error"
                : undefined,
        ].filter(Boolean);
        if (errors.length > 0) {
            message.errors = errors.map((e) => `\n· ${e}`).join("");
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.systemVoltage)
], IrrigationCCSystemStatusReport.prototype, "systemVoltage", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.flowSensorActive)
], IrrigationCCSystemStatusReport.prototype, "flowSensorActive", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.pressureSensorActive)
], IrrigationCCSystemStatusReport.prototype, "pressureSensorActive", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.rainSensorActive)
], IrrigationCCSystemStatusReport.prototype, "rainSensorActive", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.moistureSensorActive)
], IrrigationCCSystemStatusReport.prototype, "moistureSensorActive", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.flow)
], IrrigationCCSystemStatusReport.prototype, "flow", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.pressure)
], IrrigationCCSystemStatusReport.prototype, "pressure", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.shutoffDuration)
], IrrigationCCSystemStatusReport.prototype, "shutoffDuration", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.errorNotProgrammed)
], IrrigationCCSystemStatusReport.prototype, "errorNotProgrammed", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.errorEmergencyShutdown)
], IrrigationCCSystemStatusReport.prototype, "errorEmergencyShutdown", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.errorHighPressure)
], IrrigationCCSystemStatusReport.prototype, "errorHighPressure", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.errorLowPressure)
], IrrigationCCSystemStatusReport.prototype, "errorLowPressure", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.errorValve)
], IrrigationCCSystemStatusReport.prototype, "errorValve", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.masterValveOpen)
], IrrigationCCSystemStatusReport.prototype, "masterValveOpen", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.firstOpenZoneId)
], IrrigationCCSystemStatusReport.prototype, "firstOpenZoneId", void 0);
IrrigationCCSystemStatusReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.SystemStatusReport)
], IrrigationCCSystemStatusReport);
exports.IrrigationCCSystemStatusReport = IrrigationCCSystemStatusReport;
let IrrigationCCSystemStatusGet = class IrrigationCCSystemStatusGet extends IrrigationCC {
};
IrrigationCCSystemStatusGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.SystemStatusGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(IrrigationCCSystemStatusReport)
], IrrigationCCSystemStatusGet);
exports.IrrigationCCSystemStatusGet = IrrigationCCSystemStatusGet;
let IrrigationCCSystemConfigSet = class IrrigationCCSystemConfigSet extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.masterValveDelay = options.masterValveDelay;
            this.highPressureThreshold = options.highPressureThreshold;
            this.lowPressureThreshold = options.lowPressureThreshold;
            this.rainSensorPolarity = options.rainSensorPolarity;
            this.moistureSensorPolarity = options.moistureSensorPolarity;
        }
    }
    serialize() {
        let polarity = 0;
        if (this.rainSensorPolarity != undefined)
            polarity |= 0b1;
        if (this.moistureSensorPolarity != undefined)
            polarity |= 0b10;
        if (this.rainSensorPolarity == undefined &&
            this.moistureSensorPolarity == undefined) {
            // Valid bit
            polarity |= 128;
        }
        this.payload = Buffer.concat([
            Buffer.from([this.masterValveDelay]),
            (0, safe_1.encodeFloatWithScale)(this.highPressureThreshold, 0 /* kPa */),
            (0, safe_1.encodeFloatWithScale)(this.lowPressureThreshold, 0 /* kPa */),
            Buffer.from([polarity]),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "master valve delay": `${this.masterValveDelay} s`,
            "high pressure threshold": `${this.highPressureThreshold} kPa`,
            "low pressure threshold": `${this.lowPressureThreshold} kPa`,
        };
        if (this.rainSensorPolarity != undefined) {
            message["rain sensor polarity"] = (0, safe_2.getEnumMemberName)(_Types_1.IrrigationSensorPolarity, this.rainSensorPolarity);
        }
        if (this.moistureSensorPolarity != undefined) {
            message["moisture sensor polarity"] = (0, safe_2.getEnumMemberName)(_Types_1.IrrigationSensorPolarity, this.moistureSensorPolarity);
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
IrrigationCCSystemConfigSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.SystemConfigSet),
    (0, CommandClassDecorators_1.useSupervision)()
], IrrigationCCSystemConfigSet);
exports.IrrigationCCSystemConfigSet = IrrigationCCSystemConfigSet;
let IrrigationCCSystemConfigReport = class IrrigationCCSystemConfigReport extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.masterValveDelay = this.payload[0];
        let offset = 1;
        {
            const { value, scale, bytesRead } = (0, safe_1.parseFloatWithScale)(this.payload.slice(offset));
            (0, safe_1.validatePayload)(scale === 0 /* kPa */);
            this.highPressureThreshold = value;
            offset += bytesRead;
        }
        {
            const { value, scale, bytesRead } = (0, safe_1.parseFloatWithScale)(this.payload.slice(offset));
            (0, safe_1.validatePayload)(scale === 0 /* kPa */);
            this.lowPressureThreshold = value;
            offset += bytesRead;
        }
        (0, safe_1.validatePayload)(this.payload.length >= offset + 1);
        const polarity = this.payload[offset];
        if (!!(polarity & 128)) {
            // The valid bit is set
            this.rainSensorPolarity = polarity & 0b1;
            this.moistureSensorPolarity = (polarity & 0b10) >>> 1;
        }
    }
    toLogEntry(applHost) {
        const message = {
            "master valve delay": `${this.masterValveDelay} s`,
            "high pressure threshold": `${this.highPressureThreshold} kPa`,
            "low pressure threshold": `${this.lowPressureThreshold} kPa`,
        };
        if (this.rainSensorPolarity != undefined) {
            message["rain sensor polarity"] = (0, safe_2.getEnumMemberName)(_Types_1.IrrigationSensorPolarity, this.rainSensorPolarity);
        }
        if (this.moistureSensorPolarity != undefined) {
            message["moisture sensor polarity"] = (0, safe_2.getEnumMemberName)(_Types_1.IrrigationSensorPolarity, this.moistureSensorPolarity);
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.masterValveDelay)
], IrrigationCCSystemConfigReport.prototype, "masterValveDelay", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.highPressureThreshold)
], IrrigationCCSystemConfigReport.prototype, "highPressureThreshold", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.lowPressureThreshold)
], IrrigationCCSystemConfigReport.prototype, "lowPressureThreshold", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.rainSensorPolarity)
], IrrigationCCSystemConfigReport.prototype, "rainSensorPolarity", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.IrrigationCCValues.moistureSensorPolarity)
], IrrigationCCSystemConfigReport.prototype, "moistureSensorPolarity", void 0);
IrrigationCCSystemConfigReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.SystemConfigReport)
], IrrigationCCSystemConfigReport);
exports.IrrigationCCSystemConfigReport = IrrigationCCSystemConfigReport;
let IrrigationCCSystemConfigGet = class IrrigationCCSystemConfigGet extends IrrigationCC {
};
IrrigationCCSystemConfigGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.SystemConfigGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(IrrigationCCSystemConfigReport)
], IrrigationCCSystemConfigGet);
exports.IrrigationCCSystemConfigGet = IrrigationCCSystemConfigGet;
let IrrigationCCValveInfoReport = class IrrigationCCValveInfoReport extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 4);
        if ((this.payload[0] & 0b1) === _Types_1.ValveType.MasterValve) {
            this.valveId = "master";
        }
        else {
            this.valveId = this.payload[1];
        }
        this.connected = !!(this.payload[0] & 0b10);
        this.nominalCurrent = 10 * this.payload[2];
        this.errorShortCircuit = !!(this.payload[3] & 0b1);
        this.errorHighCurrent = !!(this.payload[3] & 0b10);
        this.errorLowCurrent = !!(this.payload[3] & 0b100);
        if (this.valveId === "master") {
            this.errorMaximumFlow = !!(this.payload[3] & 0b1000);
            this.errorHighFlow = !!(this.payload[3] & 16);
            this.errorLowFlow = !!(this.payload[3] & 32);
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // connected
        const valveConnectedValue = exports.IrrigationCCValues.valveConnected(this.valveId);
        this.ensureMetadata(applHost, valveConnectedValue);
        this.setValue(applHost, valveConnectedValue, this.connected);
        // nominalCurrent
        const nominalCurrentValue = exports.IrrigationCCValues.nominalCurrent(this.valveId);
        this.ensureMetadata(applHost, nominalCurrentValue);
        this.setValue(applHost, nominalCurrentValue, this.nominalCurrent);
        // errorShortCircuit
        const errorShortCircuitValue = exports.IrrigationCCValues.errorShortCircuit(this.valveId);
        this.ensureMetadata(applHost, errorShortCircuitValue);
        this.setValue(applHost, errorShortCircuitValue, this.errorShortCircuit);
        // errorHighCurrent
        const errorHighCurrentValue = exports.IrrigationCCValues.errorHighCurrent(this.valveId);
        this.ensureMetadata(applHost, errorHighCurrentValue);
        this.setValue(applHost, errorHighCurrentValue, this.errorHighCurrent);
        // errorLowCurrent
        const errorLowCurrentValue = exports.IrrigationCCValues.errorLowCurrent(this.valveId);
        this.ensureMetadata(applHost, errorLowCurrentValue);
        this.setValue(applHost, errorLowCurrentValue, this.errorLowCurrent);
        if (this.errorMaximumFlow != undefined) {
            const errorMaximumFlowValue = exports.IrrigationCCValues.errorMaximumFlow(this.valveId);
            this.ensureMetadata(applHost, errorMaximumFlowValue);
            this.setValue(applHost, errorMaximumFlowValue, this.errorMaximumFlow);
        }
        if (this.errorHighFlow != undefined) {
            const errorHighFlowValue = exports.IrrigationCCValues.errorHighFlow(this.valveId);
            this.ensureMetadata(applHost, errorHighFlowValue);
            this.setValue(applHost, errorHighFlowValue, this.errorHighFlow);
        }
        if (this.errorLowFlow != undefined) {
            const errorLowFlowValue = exports.IrrigationCCValues.errorLowFlow(this.valveId);
            this.ensureMetadata(applHost, errorLowFlowValue);
            this.setValue(applHost, errorLowFlowValue, this.errorLowFlow);
        }
        return true;
    }
    toLogEntry(applHost) {
        const message = {
            "valve ID": this.valveId,
            connected: this.connected,
            "nominal current": `${this.nominalCurrent} mA`,
        };
        const errors = [
            this.errorShortCircuit ? "short circuit" : undefined,
            this.errorHighCurrent ? "current above high threshold" : undefined,
            this.errorLowCurrent ? "current below low threshold" : undefined,
            this.errorMaximumFlow ? "maximum flow" : undefined,
            this.errorHighFlow ? "flow above high threshold" : undefined,
            this.errorLowFlow ? "flow below low threshold" : undefined,
        ].filter(Boolean);
        if (errors.length > 0) {
            message.errors = errors.map((e) => `\n· ${e}`).join("");
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
IrrigationCCValveInfoReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.ValveInfoReport)
], IrrigationCCValveInfoReport);
exports.IrrigationCCValveInfoReport = IrrigationCCValveInfoReport;
function testResponseForIrrigationCommandWithValveId(sent, received) {
    return received.valveId === sent.valveId;
}
let IrrigationCCValveInfoGet = class IrrigationCCValveInfoGet extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.valveId = options.valveId;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.valveId === "master" ? 1 : 0,
            this.valveId === "master" ? 1 : this.valveId || 1,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "valve ID": this.valveId,
            },
        };
    }
};
IrrigationCCValveInfoGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.ValveInfoGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(IrrigationCCValveInfoReport, testResponseForIrrigationCommandWithValveId)
], IrrigationCCValveInfoGet);
exports.IrrigationCCValveInfoGet = IrrigationCCValveInfoGet;
let IrrigationCCValveConfigSet = class IrrigationCCValveConfigSet extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.valveId = options.valveId;
            this.nominalCurrentHighThreshold =
                options.nominalCurrentHighThreshold;
            this.nominalCurrentLowThreshold =
                options.nominalCurrentLowThreshold;
            this.maximumFlow = options.maximumFlow;
            this.highFlowThreshold = options.highFlowThreshold;
            this.lowFlowThreshold = options.lowFlowThreshold;
            this.useRainSensor = options.useRainSensor;
            this.useMoistureSensor = options.useMoistureSensor;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([
                this.valveId === "master" ? 1 : 0,
                this.valveId === "master" ? 1 : this.valveId || 1,
                Math.floor(this.nominalCurrentHighThreshold / 10),
                Math.floor(this.nominalCurrentLowThreshold / 10),
            ]),
            (0, safe_1.encodeFloatWithScale)(this.maximumFlow, 0 /* l/h */),
            (0, safe_1.encodeFloatWithScale)(this.highFlowThreshold, 0 /* l/h */),
            (0, safe_1.encodeFloatWithScale)(this.lowFlowThreshold, 0 /* l/h */),
            Buffer.from([
                (this.useRainSensor ? 0b1 : 0) |
                    (this.useMoistureSensor ? 0b10 : 0),
            ]),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "valve ID": this.valveId,
                "nominal current high threshold": `${this.nominalCurrentHighThreshold} mA`,
                "nominal current low threshold": `${this.nominalCurrentLowThreshold} mA`,
                "maximum flow": `${this.maximumFlow} l/h`,
                "high flow threshold": `${this.highFlowThreshold} l/h`,
                "low flow threshold": `${this.lowFlowThreshold} l/h`,
                "use rain sensor": this.useRainSensor,
                "use moisture sensor": this.useMoistureSensor,
            },
        };
    }
};
IrrigationCCValveConfigSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.ValveConfigSet),
    (0, CommandClassDecorators_1.useSupervision)()
], IrrigationCCValveConfigSet);
exports.IrrigationCCValveConfigSet = IrrigationCCValveConfigSet;
let IrrigationCCValveConfigReport = class IrrigationCCValveConfigReport extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 4);
        if ((this.payload[0] & 0b1) === _Types_1.ValveType.MasterValve) {
            this.valveId = "master";
        }
        else {
            this.valveId = this.payload[1];
        }
        this.nominalCurrentHighThreshold = 10 * this.payload[2];
        this.nominalCurrentLowThreshold = 10 * this.payload[3];
        let offset = 4;
        {
            const { value, scale, bytesRead } = (0, safe_1.parseFloatWithScale)(this.payload.slice(offset));
            (0, safe_1.validatePayload)(scale === 0 /* l/h */);
            this.maximumFlow = value;
            offset += bytesRead;
        }
        {
            const { value, scale, bytesRead } = (0, safe_1.parseFloatWithScale)(this.payload.slice(offset));
            (0, safe_1.validatePayload)(scale === 0 /* l/h */);
            this.highFlowThreshold = value;
            offset += bytesRead;
        }
        {
            const { value, scale, bytesRead } = (0, safe_1.parseFloatWithScale)(this.payload.slice(offset));
            (0, safe_1.validatePayload)(scale === 0 /* l/h */);
            this.lowFlowThreshold = value;
            offset += bytesRead;
        }
        (0, safe_1.validatePayload)(this.payload.length >= offset + 1);
        this.useRainSensor = !!(this.payload[offset] & 0b1);
        this.useMoistureSensor = !!(this.payload[offset] & 0b10);
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // nominalCurrentHighThreshold
        const nominalCurrentHighThresholdValue = exports.IrrigationCCValues.nominalCurrentHighThreshold(this.valveId);
        this.ensureMetadata(applHost, nominalCurrentHighThresholdValue);
        this.setValue(applHost, nominalCurrentHighThresholdValue, this.nominalCurrentHighThreshold);
        // nominalCurrentLowThreshold
        const nominalCurrentLowThresholdValue = exports.IrrigationCCValues.nominalCurrentLowThreshold(this.valveId);
        this.ensureMetadata(applHost, nominalCurrentLowThresholdValue);
        this.setValue(applHost, nominalCurrentLowThresholdValue, this.nominalCurrentLowThreshold);
        // maximumFlow
        const maximumFlowValue = exports.IrrigationCCValues.maximumFlow(this.valveId);
        this.ensureMetadata(applHost, maximumFlowValue);
        this.setValue(applHost, maximumFlowValue, this.maximumFlow);
        // highFlowThreshold
        const highFlowThresholdValue = exports.IrrigationCCValues.highFlowThreshold(this.valveId);
        this.ensureMetadata(applHost, highFlowThresholdValue);
        this.setValue(applHost, highFlowThresholdValue, this.highFlowThreshold);
        // lowFlowThreshold
        const lowFlowThresholdValue = exports.IrrigationCCValues.lowFlowThreshold(this.valveId);
        this.ensureMetadata(applHost, lowFlowThresholdValue);
        this.setValue(applHost, lowFlowThresholdValue, this.lowFlowThreshold);
        // useRainSensor
        const useRainSensorValue = exports.IrrigationCCValues.useRainSensor(this.valveId);
        this.ensureMetadata(applHost, useRainSensorValue);
        this.setValue(applHost, useRainSensorValue, this.useRainSensor);
        // useMoistureSensor
        const useMoistureSensorValue = exports.IrrigationCCValues.useMoistureSensor(this.valveId);
        this.ensureMetadata(applHost, useMoistureSensorValue);
        this.setValue(applHost, useMoistureSensorValue, this.useMoistureSensor);
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "valve ID": this.valveId,
                "nominal current high threshold": `${this.nominalCurrentHighThreshold} mA`,
                "nominal current low threshold": `${this.nominalCurrentLowThreshold} mA`,
                "maximum flow": `${this.maximumFlow} l/h`,
                "high flow threshold": `${this.highFlowThreshold} l/h`,
                "low flow threshold": `${this.lowFlowThreshold} l/h`,
                "use rain sensor": this.useRainSensor,
                "use moisture sensor": this.useMoistureSensor,
            },
        };
    }
};
IrrigationCCValveConfigReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.ValveConfigReport)
], IrrigationCCValveConfigReport);
exports.IrrigationCCValveConfigReport = IrrigationCCValveConfigReport;
let IrrigationCCValveConfigGet = class IrrigationCCValveConfigGet extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.valveId = options.valveId;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.valveId === "master" ? 1 : 0,
            this.valveId === "master" ? 1 : this.valveId || 1,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "valve ID": this.valveId,
            },
        };
    }
};
IrrigationCCValveConfigGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.ValveConfigGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(IrrigationCCValveConfigReport, testResponseForIrrigationCommandWithValveId)
], IrrigationCCValveConfigGet);
exports.IrrigationCCValveConfigGet = IrrigationCCValveConfigGet;
let IrrigationCCValveRun = class IrrigationCCValveRun extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.valveId = options.valveId;
            this.duration = options.duration;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.valveId === "master" ? 1 : 0,
            this.valveId === "master" ? 1 : this.valveId || 1,
            0,
            0,
        ]);
        this.payload.writeUInt16BE(this.duration, 2);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "valve ID": this.valveId,
        };
        if (this.duration) {
            message.duration = `${this.duration} s`;
        }
        else {
            message.action = "turn off";
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
IrrigationCCValveRun = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.ValveRun),
    (0, CommandClassDecorators_1.useSupervision)()
], IrrigationCCValveRun);
exports.IrrigationCCValveRun = IrrigationCCValveRun;
let IrrigationCCValveTableSet = class IrrigationCCValveTableSet extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.tableId = options.tableId;
            this.entries = options.entries;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(1 + this.entries.length * 3);
        this.payload[0] = this.tableId;
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            const offset = 1 + i * 3;
            this.payload[offset] = entry.valveId;
            this.payload.writeUInt16BE(entry.duration, offset + 1);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "table ID": this.tableId,
        };
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            const valveLabel = (0, strings_1.padStart)(entry.valveId.toString(), 3, "0");
            if (entry.duration) {
                message[`valve ${valveLabel} duration`] = `${entry.duration} s`;
            }
            else {
                message[`valve ${valveLabel} action`] = `turn off`;
            }
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
IrrigationCCValveTableSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.ValveTableSet),
    (0, CommandClassDecorators_1.useSupervision)()
], IrrigationCCValveTableSet);
exports.IrrigationCCValveTableSet = IrrigationCCValveTableSet;
let IrrigationCCValveTableReport = class IrrigationCCValveTableReport extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)((this.payload.length - 1) % 3 === 0);
        this.tableId = this.payload[0];
        this.entries = [];
        for (let offset = 1; offset < this.payload.length; offset += 3) {
            this.entries.push({
                valveId: this.payload[offset],
                duration: this.payload.readUInt16BE(offset + 1),
            });
        }
    }
    toLogEntry(applHost) {
        const message = {
            "table ID": this.tableId,
        };
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            const valveLabel = (0, strings_1.padStart)(entry.valveId.toString(), 3, "0");
            if (entry.duration) {
                message[`valve ${valveLabel} duration`] = `${entry.duration} s`;
            }
            else {
                message[`valve ${valveLabel} action`] = `turn off`;
            }
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
IrrigationCCValveTableReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.ValveTableReport)
], IrrigationCCValveTableReport);
exports.IrrigationCCValveTableReport = IrrigationCCValveTableReport;
function testResponseForIrrigationValveTableGet(sent, received) {
    return received.tableId === sent.tableId;
}
let IrrigationCCValveTableGet = class IrrigationCCValveTableGet extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.tableId = options.tableId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.tableId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "table ID": this.tableId,
            },
        };
    }
};
IrrigationCCValveTableGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.ValveTableGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(IrrigationCCValveTableReport, testResponseForIrrigationValveTableGet)
], IrrigationCCValveTableGet);
exports.IrrigationCCValveTableGet = IrrigationCCValveTableGet;
let IrrigationCCValveTableRun = class IrrigationCCValveTableRun extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.tableIDs = options.tableIDs;
            if (this.tableIDs.length < 1) {
                throw new safe_1.ZWaveError(`${this.constructor.name}: At least one table ID must be specified.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
        }
    }
    serialize() {
        this.payload = Buffer.from(this.tableIDs);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "table IDs": this.tableIDs
                    .map((id) => (0, strings_1.padStart)(id.toString(), 3, "0"))
                    .join(", "),
            },
        };
    }
};
IrrigationCCValveTableRun = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.ValveTableRun),
    (0, CommandClassDecorators_1.useSupervision)()
], IrrigationCCValveTableRun);
exports.IrrigationCCValveTableRun = IrrigationCCValveTableRun;
let IrrigationCCSystemShutoff = class IrrigationCCSystemShutoff extends IrrigationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.duration = options.duration;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.duration ?? 255]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                duration: this.duration === 0
                    ? "temporarily"
                    : this.duration === 255 || this.duration === undefined
                        ? "permanently"
                        : `${this.duration} hours`,
            },
        };
    }
};
IrrigationCCSystemShutoff = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IrrigationCommand.SystemShutoff),
    (0, CommandClassDecorators_1.useSupervision)()
], IrrigationCCSystemShutoff);
exports.IrrigationCCSystemShutoff = IrrigationCCSystemShutoff;
//# sourceMappingURL=IrrigationCC.js.map