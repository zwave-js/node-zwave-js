"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThermostatSetpointCCSupportedGet = exports.ThermostatSetpointCCSupportedReport = exports.ThermostatSetpointCCCapabilitiesGet = exports.ThermostatSetpointCCCapabilitiesReport = exports.ThermostatSetpointCCGet = exports.ThermostatSetpointCCReport = exports.ThermostatSetpointCCSet = exports.ThermostatSetpointCC = exports.ThermostatSetpointCCAPI = exports.ThermostatSetpointCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__number = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    return _number($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
// This array is used to map the advertised supported types (interpretation A)
// to the actual enum values
// prettier-ignore
const thermostatSetpointTypeMap = [0x00, 0x01, 0x02, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f];
const thermostatSetpointScaleName = "temperature";
function getScale(configManager, scale) {
    return configManager.lookupNamedScale(thermostatSetpointScaleName, scale);
}
function getSetpointUnit(configManager, scale) {
    return getScale(configManager, scale).unit ?? "";
}
exports.ThermostatSetpointCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Thermostat Setpoint"], {
        ...Values_1.V.staticProperty("supportedSetpointTypes", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("setpointTypesInterpretation", undefined, {
            internal: true,
        }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Thermostat Setpoint"], {
        ...Values_1.V.dynamicPropertyAndKeyWithName("setpoint", "setpoint", (setpointType) => setpointType, ({ property, propertyKey }) => property === "setpoint" && typeof propertyKey === "number", (setpointType) => ({
            ...safe_1.ValueMetadata.Number,
            label: `Setpoint (${(0, safe_2.getEnumMemberName)(_Types_1.ThermostatSetpointType, setpointType)})`,
            ccSpecific: { setpointType },
        })),
        // The setpoint scale is only used internally
        ...Values_1.V.dynamicPropertyAndKeyWithName("setpointScale", "setpointScale", (setpointType) => setpointType, ({ property, propertyKey }) => property === "setpointScale" && typeof propertyKey === "number", undefined, { internal: true }),
    }),
});
let ThermostatSetpointCCAPI = class ThermostatSetpointCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, propertyKey }, value) => {
            if (property !== "setpoint") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (typeof propertyKey !== "number") {
                throw new safe_1.ZWaveError(`${safe_1.CommandClasses[this.ccId]}: "${property}" must be further specified by a numeric property key`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            if (typeof value !== "number") {
                (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
            }
            // SDS14223: The Scale field value MUST be identical to the value received in the Thermostat Setpoint Report for the
            // actual Setpoint Type during the node interview. Fall back to the first scale if none is known
            const preferredScale = this.tryGetValueDB()?.getValue(exports.ThermostatSetpointCCValues.setpointScale(propertyKey).endpoint(this.endpoint.index));
            const result = await this.set(propertyKey, value, preferredScale ?? 0);
            // Verify the current value after a delay, unless the command was supervised and successful
            if (this.isSinglecast() && !(0, safe_1.supervisedCommandSucceeded)(result)) {
                // TODO: Ideally this would be a short delay, but some thermostats like Remotec ZXT-600
                // aren't able to handle the GET this quickly.
                this.schedulePoll({ property, propertyKey }, value);
            }
            return result;
        };
        this[_b] = async ({ property, propertyKey, }) => {
            switch (property) {
                case "setpoint":
                    if (typeof propertyKey !== "number") {
                        throw new safe_1.ZWaveError(`${safe_1.CommandClasses[this.ccId]}: "${property}" must be further specified by a numeric property key`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                    }
                    return (await this.get(propertyKey))?.value;
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.ThermostatSetpointCommand.Get:
            case _Types_1.ThermostatSetpointCommand.SupportedGet:
                return this.isSinglecast();
            case _Types_1.ThermostatSetpointCommand.Set:
                return true; // This is mandatory
            case _Types_1.ThermostatSetpointCommand.CapabilitiesGet:
                return this.version >= 3 && this.isSinglecast();
        }
        return super.supportsCommand(cmd);
    }
    async get(setpointType) {
        __assertType("setpointType", "ThermostatSetpointType", __assertType__number.bind(void 0, setpointType));
        this.assertSupportsCommand(_Types_1.ThermostatSetpointCommand, _Types_1.ThermostatSetpointCommand.Get);
        const cc = new ThermostatSetpointCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            setpointType,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (!response)
            return;
        if (response.type !== _Types_1.ThermostatSetpointType["N/A"]) {
            // This is a supported setpoint
            const scale = getScale(this.applHost.configManager, response.scale);
            return {
                value: response.value,
                scale,
            };
        }
    }
    async set(setpointType, value, scale) {
        __assertType("setpointType", "ThermostatSetpointType", __assertType__number.bind(void 0, setpointType));
        __assertType("value", "number", __assertType__number.bind(void 0, value));
        __assertType("scale", "number", __assertType__number.bind(void 0, scale));
        this.assertSupportsCommand(_Types_1.ThermostatSetpointCommand, _Types_1.ThermostatSetpointCommand.Set);
        const cc = new ThermostatSetpointCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            setpointType,
            value,
            scale,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getCapabilities(setpointType) {
        __assertType("setpointType", "ThermostatSetpointType", __assertType__number.bind(void 0, setpointType));
        this.assertSupportsCommand(_Types_1.ThermostatSetpointCommand, _Types_1.ThermostatSetpointCommand.CapabilitiesGet);
        const cc = new ThermostatSetpointCCCapabilitiesGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            setpointType,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "minValue",
                "maxValue",
                "minValueScale",
                "maxValueScale",
            ]);
        }
    }
    /**
     * Requests the supported setpoint types from the node. Due to inconsistencies it is NOT recommended
     * to use this method on nodes with CC versions 1 and 2. Instead rely on the information determined
     * during node interview.
     */
    async getSupportedSetpointTypes() {
        this.assertSupportsCommand(_Types_1.ThermostatSetpointCommand, _Types_1.ThermostatSetpointCommand.SupportedGet);
        const cc = new ThermostatSetpointCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.supportedSetpointTypes;
    }
};
_a = API_1.SET_VALUE, _b = API_1.POLL_VALUE;
ThermostatSetpointCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Thermostat Setpoint"])
], ThermostatSetpointCCAPI);
exports.ThermostatSetpointCCAPI = ThermostatSetpointCCAPI;
let ThermostatSetpointCC = class ThermostatSetpointCC extends CommandClass_1.CommandClass {
    translatePropertyKey(applHost, property, propertyKey) {
        if (property === "setpoint") {
            return (0, safe_2.getEnumMemberName)(_Types_1.ThermostatSetpointType, propertyKey);
        }
        else {
            return super.translatePropertyKey(applHost, property, propertyKey);
        }
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Thermostat Setpoint"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        if (this.version <= 2) {
            let setpointTypes;
            let interpretation;
            // Whether our tests changed the assumed bitmask interpretation
            let interpretationChanged = false;
            // Query the supported setpoint types
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "retrieving supported setpoint types...",
                direction: "outbound",
            });
            const resp = await api.getSupportedSetpointTypes();
            if (!resp) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: "Querying supported setpoint types timed out, skipping interview...",
                    level: "warn",
                });
                return;
            }
            setpointTypes = [...resp];
            interpretation = undefined; // we don't know yet which interpretation the device uses
            // If necessary, test which interpretation the device follows
            // Assume interpretation B
            // --> If setpoints 3,4,5 or 6 are supported, the assumption is wrong ==> A
            function switchToInterpretationA() {
                setpointTypes = setpointTypes.map((i) => thermostatSetpointTypeMap[i]);
                interpretation = "A";
                interpretationChanged = true;
            }
            if ([3, 4, 5, 6].some((type) => setpointTypes.includes(type))) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: "uses Thermostat Setpoint bitmap interpretation A",
                    direction: "none",
                });
                switchToInterpretationA();
            }
            else {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: "Thermostat Setpoint bitmap interpretation is unknown, assuming B for now",
                    direction: "none",
                });
            }
            // Now scan all endpoints. Each type we received a value for gets marked as supported
            const supportedSetpointTypes = [];
            for (let i = 0; i < setpointTypes.length; i++) {
                const type = setpointTypes[i];
                const setpointName = (0, safe_2.getEnumMemberName)(_Types_1.ThermostatSetpointType, type);
                // Every time, query the current value
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `querying current value of setpoint ${setpointName}...`,
                    direction: "outbound",
                });
                const setpoint = await api.get(type);
                // If the node did not respond, assume the setpoint type is not supported
                let logMessage;
                if (setpoint) {
                    // Setpoint supported, remember the type
                    supportedSetpointTypes.push(type);
                    logMessage = `received current value of setpoint ${setpointName}: ${setpoint.value} ${setpoint.scale.unit ?? ""}`;
                }
                else if (!interpretation) {
                    // The setpoint type is not supported, switch to interpretation A
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: `the setpoint type ${type} is unsupported, switching to interpretation A`,
                        direction: "none",
                    });
                    switchToInterpretationA();
                    // retry the current type and scan the remaining types as A
                    i--;
                    continue;
                }
                else {
                    // We're sure about the interpretation - this should not happen
                    logMessage = `Setpoint ${setpointName} is not supported`;
                }
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
            // If we made an assumption and did not switch to interpretation A,
            // the device adheres to interpretation B
            if (!interpretation && !interpretationChanged) {
                // our assumption about interpretation B was correct
                interpretation = "B";
                interpretationChanged = true;
            }
            // Remember which setpoint types are actually supported, so we don't
            // need to do this guesswork again
            this.setValue(applHost, exports.ThermostatSetpointCCValues.supportedSetpointTypes, supportedSetpointTypes);
            // Also save the bitmap interpretation if we know it now
            if (interpretationChanged) {
                this.setValue(applHost, exports.ThermostatSetpointCCValues.setpointTypesInterpretation, interpretation);
            }
        }
        else {
            // Versions >= 3 adhere to bitmap interpretation A, so we can rely on getSupportedSetpointTypes
            // Query the supported setpoint types
            let setpointTypes = [];
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "retrieving supported setpoint types...",
                direction: "outbound",
            });
            const resp = await api.getSupportedSetpointTypes();
            if (resp) {
                setpointTypes = [...resp];
                const logMessage = "received supported setpoint types:\n" +
                    setpointTypes
                        .map((type) => (0, safe_2.getEnumMemberName)(_Types_1.ThermostatSetpointType, type))
                        .map((name) => `· ${name}`)
                        .join("\n");
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
            else {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: "Querying supported setpoint types timed out, skipping interview...",
                    level: "warn",
                });
                return;
            }
            for (const type of setpointTypes) {
                const setpointName = (0, safe_2.getEnumMemberName)(_Types_1.ThermostatSetpointType, type);
                // Find out the capabilities of this setpoint
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `retrieving capabilities for setpoint ${setpointName}...`,
                    direction: "outbound",
                });
                const setpointCaps = await api.getCapabilities(type);
                if (setpointCaps) {
                    const minValueUnit = getSetpointUnit(applHost.configManager, setpointCaps.minValueScale);
                    const maxValueUnit = getSetpointUnit(applHost.configManager, setpointCaps.maxValueScale);
                    const logMessage = `received capabilities for setpoint ${setpointName}:
minimum value: ${setpointCaps.minValue} ${minValueUnit}
maximum value: ${setpointCaps.maxValue} ${maxValueUnit}`;
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: logMessage,
                        direction: "inbound",
                    });
                }
            }
            // Query the current value for all setpoint types
            await this.refreshValues(applHost);
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Thermostat Setpoint"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        const setpointTypes = this.getValue(applHost, exports.ThermostatSetpointCCValues.supportedSetpointTypes) ?? [];
        // Query each setpoint's current value
        for (const type of setpointTypes) {
            const setpointName = (0, safe_2.getEnumMemberName)(_Types_1.ThermostatSetpointType, type);
            // Every time, query the current value
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `querying current value of setpoint ${setpointName}...`,
                direction: "outbound",
            });
            const setpoint = await api.get(type);
            if (setpoint) {
                const logMessage = `received current value of setpoint ${setpointName}: ${setpoint.value} ${setpoint.scale.unit ?? ""}`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
        }
    }
};
ThermostatSetpointCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Thermostat Setpoint"]),
    (0, CommandClassDecorators_1.implementedVersion)(3),
    (0, CommandClassDecorators_1.ccValues)(exports.ThermostatSetpointCCValues)
], ThermostatSetpointCC);
exports.ThermostatSetpointCC = ThermostatSetpointCC;
let ThermostatSetpointCCSet = class ThermostatSetpointCCSet extends ThermostatSetpointCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.setpointType = this.payload[0] & 0b1111;
            // parseFloatWithScale does its own validation
            const { value, scale } = (0, safe_1.parseFloatWithScale)(this.payload.slice(1));
            this.value = value;
            this.scale = scale;
        }
        else {
            this.setpointType = options.setpointType;
            this.value = options.value;
            this.scale = options.scale;
        }
    }
    serialize() {
        // If a config file overwrites how the float should be encoded, use that information
        const override = this.host.getDeviceConfig?.(this.nodeId)
            ?.compat?.overrideFloatEncoding;
        this.payload = Buffer.concat([
            Buffer.from([this.setpointType & 0b1111]),
            (0, safe_1.encodeFloatWithScale)(this.value, this.scale, override),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const scale = getScale(applHost.configManager, this.scale);
        return {
            ...super.toLogEntry(applHost),
            message: {
                "setpoint type": (0, safe_2.getEnumMemberName)(_Types_1.ThermostatSetpointType, this.setpointType),
                value: `${this.value} ${scale.unit}`,
            },
        };
    }
};
ThermostatSetpointCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatSetpointCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], ThermostatSetpointCCSet);
exports.ThermostatSetpointCCSet = ThermostatSetpointCCSet;
let ThermostatSetpointCCReport = class ThermostatSetpointCCReport extends ThermostatSetpointCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this._type = this.payload[0] & 0b1111;
        if (this._type === 0) {
            // Not supported
            this._value = 0;
            this.scale = 0;
            return;
        }
        // parseFloatWithScale does its own validation
        const { value, scale } = (0, safe_1.parseFloatWithScale)(this.payload.slice(1));
        this._value = value;
        this.scale = scale;
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        const scale = getScale(applHost.configManager, this.scale);
        const setpointValue = exports.ThermostatSetpointCCValues.setpoint(this.type);
        const existingMetadata = this.getMetadata(applHost, setpointValue);
        // Update the metadata when it is missing or the unit has changed
        if (existingMetadata?.unit !== scale.unit) {
            this.setMetadata(applHost, setpointValue, {
                ...(existingMetadata ?? setpointValue.meta),
                unit: scale.unit,
            });
        }
        this.setValue(applHost, setpointValue, this._value);
        // Remember the device-preferred setpoint scale so it can be used in SET commands
        this.setValue(applHost, exports.ThermostatSetpointCCValues.setpointScale(this.type), scale.key);
        return true;
    }
    get type() {
        return this._type;
    }
    get value() {
        return this._value;
    }
    toLogEntry(applHost) {
        const scale = getScale(applHost.configManager, this.scale);
        return {
            ...super.toLogEntry(applHost),
            message: {
                "setpoint type": (0, safe_2.getEnumMemberName)(_Types_1.ThermostatSetpointType, this.type),
                value: `${this.value} ${scale.unit}`,
            },
        };
    }
};
ThermostatSetpointCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatSetpointCommand.Report)
], ThermostatSetpointCCReport);
exports.ThermostatSetpointCCReport = ThermostatSetpointCCReport;
function testResponseForThermostatSetpointGet(sent, received) {
    // We expect a Thermostat Setpoint Report that matches the requested setpoint type
    return received.type === sent.setpointType;
}
let ThermostatSetpointCCGet = class ThermostatSetpointCCGet extends ThermostatSetpointCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.setpointType = options.setpointType;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.setpointType & 0b1111]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "setpoint type": (0, safe_2.getEnumMemberName)(_Types_1.ThermostatSetpointType, this.setpointType),
            },
        };
    }
};
ThermostatSetpointCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatSetpointCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(ThermostatSetpointCCReport, testResponseForThermostatSetpointGet)
], ThermostatSetpointCCGet);
exports.ThermostatSetpointCCGet = ThermostatSetpointCCGet;
let ThermostatSetpointCCCapabilitiesReport = class ThermostatSetpointCCCapabilitiesReport extends ThermostatSetpointCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this._type = this.payload[0];
        let bytesRead;
        // parseFloatWithScale does its own validation
        ({
            value: this._minValue,
            scale: this._minValueScale,
            bytesRead,
        } = (0, safe_1.parseFloatWithScale)(this.payload.slice(1)));
        ({ value: this._maxValue, scale: this._maxValueScale } =
            (0, safe_1.parseFloatWithScale)(this.payload.slice(1 + bytesRead)));
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Predefine the metadata
        const setpointValue = exports.ThermostatSetpointCCValues.setpoint(this.type);
        this.setMetadata(applHost, setpointValue, {
            ...setpointValue.meta,
            min: this._minValue,
            max: this._maxValue,
            unit: getSetpointUnit(applHost.configManager, this._minValueScale) ||
                getSetpointUnit(applHost.configManager, this._maxValueScale),
        });
        return true;
    }
    get type() {
        return this._type;
    }
    get minValue() {
        return this._minValue;
    }
    get maxValue() {
        return this._maxValue;
    }
    get minValueScale() {
        return this._minValueScale;
    }
    get maxValueScale() {
        return this._maxValueScale;
    }
    toLogEntry(applHost) {
        const minValueScale = getScale(applHost.configManager, this.minValueScale);
        const maxValueScale = getScale(applHost.configManager, this.maxValueScale);
        return {
            ...super.toLogEntry(applHost),
            message: {
                "setpoint type": (0, safe_2.getEnumMemberName)(_Types_1.ThermostatSetpointType, this._type),
                "min value": `${this.minValue} ${minValueScale.unit}`,
                "max value": `${this.maxValue} ${maxValueScale.unit}`,
            },
        };
    }
};
ThermostatSetpointCCCapabilitiesReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatSetpointCommand.CapabilitiesReport)
], ThermostatSetpointCCCapabilitiesReport);
exports.ThermostatSetpointCCCapabilitiesReport = ThermostatSetpointCCCapabilitiesReport;
let ThermostatSetpointCCCapabilitiesGet = class ThermostatSetpointCCCapabilitiesGet extends ThermostatSetpointCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.setpointType = options.setpointType;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.setpointType & 0b1111]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "setpoint type": (0, safe_2.getEnumMemberName)(_Types_1.ThermostatSetpointType, this.setpointType),
            },
        };
    }
};
ThermostatSetpointCCCapabilitiesGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatSetpointCommand.CapabilitiesGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ThermostatSetpointCCCapabilitiesReport)
], ThermostatSetpointCCCapabilitiesGet);
exports.ThermostatSetpointCCCapabilitiesGet = ThermostatSetpointCCCapabilitiesGet;
let ThermostatSetpointCCSupportedReport = class ThermostatSetpointCCSupportedReport extends ThermostatSetpointCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        const bitMask = this.payload;
        const supported = (0, safe_1.parseBitMask)(bitMask, _Types_1.ThermostatSetpointType["N/A"]);
        if (this.version >= 3) {
            // Interpretation A
            this.supportedSetpointTypes = supported.map((i) => thermostatSetpointTypeMap[i]);
        }
        else {
            // It is unknown which interpretation the device complies to.
            // This must be tested during the interview
            this.supportedSetpointTypes = supported;
        }
        // TODO:
        // Some devices skip the gaps in the ThermostatSetpointType (Interpretation A), some don't (Interpretation B)
        // Devices with V3+ must comply with Interpretation A
        // It is RECOMMENDED that a controlling node determines supported Setpoint Types
        // by sending one Thermostat Setpoint Get Command at a time while incrementing
        // the requested Setpoint Type. If the same Setpoint Type is advertised in the
        // resulting Thermostat Setpoint Report Command, the controlling node MAY conclude
        // that the actual Setpoint Type is supported. If the Setpoint Type 0x00 (type N/A)
        // is advertised in the resulting Thermostat Setpoint Report Command, the controlling
        // node MUST conclude that the actual Setpoint Type is not supported.
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supported setpoint types": this.supportedSetpointTypes
                    .map((t) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.ThermostatSetpointType, t)}`)
                    .join(""),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ThermostatSetpointCCValues.supportedSetpointTypes)
], ThermostatSetpointCCSupportedReport.prototype, "supportedSetpointTypes", void 0);
ThermostatSetpointCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatSetpointCommand.SupportedReport)
], ThermostatSetpointCCSupportedReport);
exports.ThermostatSetpointCCSupportedReport = ThermostatSetpointCCSupportedReport;
let ThermostatSetpointCCSupportedGet = class ThermostatSetpointCCSupportedGet extends ThermostatSetpointCC {
};
ThermostatSetpointCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatSetpointCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ThermostatSetpointCCSupportedReport)
    /**
     * Issues a SupportedGet command to the node. Due to inconsistencies in interpretation,
     * this command should not be used for nodes with CC versions 1 or 2
     */
], ThermostatSetpointCCSupportedGet);
exports.ThermostatSetpointCCSupportedGet = ThermostatSetpointCCSupportedGet;
//# sourceMappingURL=ThermostatSetpointCC.js.map