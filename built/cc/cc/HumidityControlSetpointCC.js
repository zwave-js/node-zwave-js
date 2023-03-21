"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumidityControlSetpointCCCapabilitiesGet = exports.HumidityControlSetpointCCCapabilitiesReport = exports.HumidityControlSetpointCCScaleSupportedGet = exports.HumidityControlSetpointCCScaleSupportedReport = exports.HumidityControlSetpointCCSupportedGet = exports.HumidityControlSetpointCCSupportedReport = exports.HumidityControlSetpointCCGet = exports.HumidityControlSetpointCCReport = exports.HumidityControlSetpointCCSet = exports.HumidityControlSetpointCC = exports.HumidityControlSetpointCCAPI = exports.HumidityControlSetpointCCValues = void 0;
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
exports.HumidityControlSetpointCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Humidity Control Setpoint"], {
        ...Values_1.V.staticProperty("supportedSetpointTypes", undefined, {
            internal: true,
        }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Humidity Control Setpoint"], {
        ...Values_1.V.dynamicPropertyAndKeyWithName("setpoint", "setpoint", (setpointType) => setpointType, ({ property, propertyKey }) => property === "setpoint" && typeof propertyKey === "number", (setpointType) => ({
            // This is the base metadata that will be extended on the fly
            ...safe_1.ValueMetadata.Number,
            label: `Setpoint (${(0, safe_2.getEnumMemberName)(_Types_1.HumidityControlSetpointType, setpointType)})`,
            ccSpecific: { setpointType },
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("setpointScale", "setpointScale", (setpointType) => setpointType, ({ property, propertyKey }) => property === "setpointScale" && typeof propertyKey === "number", (setpointType) => ({
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: `Setpoint scale (${(0, safe_2.getEnumMemberName)(_Types_1.HumidityControlSetpointType, setpointType)})`,
        })),
    }),
});
const humidityControlSetpointScaleName = "humidity";
function getScale(configManager, scale) {
    return configManager.lookupNamedScale(humidityControlSetpointScaleName, scale);
}
function getSetpointUnit(configManager, scale) {
    return getScale(configManager, scale).unit ?? "";
}
let HumidityControlSetpointCCAPI = class HumidityControlSetpointCCAPI extends API_1.CCAPI {
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
            const scaleValueId = exports.HumidityControlSetpointCCValues.setpointScale(propertyKey).endpoint(this.endpoint.index);
            const preferredScale = this.tryGetValueDB()?.getValue(scaleValueId);
            const result = await this.set(propertyKey, value, preferredScale ?? 0);
            // Verify the change after a delay, unless the command was supervised and successful
            if (this.isSinglecast() && !(0, safe_1.supervisedCommandSucceeded)(result)) {
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
            case _Types_1.HumidityControlSetpointCommand.Get:
            case _Types_1.HumidityControlSetpointCommand.SupportedGet:
            case _Types_1.HumidityControlSetpointCommand.CapabilitiesGet:
                return this.isSinglecast();
            case _Types_1.HumidityControlSetpointCommand.Set:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    async get(setpointType) {
        __assertType("setpointType", "HumidityControlSetpointType", __assertType__number.bind(void 0, setpointType));
        this.assertSupportsCommand(_Types_1.HumidityControlSetpointCommand, _Types_1.HumidityControlSetpointCommand.Get);
        const cc = new HumidityControlSetpointCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            setpointType,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (!response)
            return;
        return response.type === _Types_1.HumidityControlSetpointType["N/A"]
            ? // not supported
                undefined
            : // supported
                {
                    value: response.value,
                    scale: response.scale,
                };
    }
    async set(setpointType, value, scale) {
        __assertType("setpointType", "HumidityControlSetpointType", __assertType__number.bind(void 0, setpointType));
        __assertType("value", "number", __assertType__number.bind(void 0, value));
        __assertType("scale", "number", __assertType__number.bind(void 0, scale));
        this.assertSupportsCommand(_Types_1.HumidityControlSetpointCommand, _Types_1.HumidityControlSetpointCommand.Set);
        const cc = new HumidityControlSetpointCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            setpointType,
            value,
            scale,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getCapabilities(setpointType) {
        __assertType("setpointType", "HumidityControlSetpointType", __assertType__number.bind(void 0, setpointType));
        this.assertSupportsCommand(_Types_1.HumidityControlSetpointCommand, _Types_1.HumidityControlSetpointCommand.CapabilitiesGet);
        const cc = new HumidityControlSetpointCCCapabilitiesGet(this.applHost, {
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
    async getSupportedSetpointTypes() {
        this.assertSupportsCommand(_Types_1.HumidityControlSetpointCommand, _Types_1.HumidityControlSetpointCommand.SupportedGet);
        const cc = new HumidityControlSetpointCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.supportedSetpointTypes;
    }
    async getSupportedScales(setpointType) {
        __assertType("setpointType", "HumidityControlSetpointType", __assertType__number.bind(void 0, setpointType));
        this.assertSupportsCommand(_Types_1.HumidityControlSetpointCommand, _Types_1.HumidityControlSetpointCommand.SupportedGet);
        const cc = new HumidityControlSetpointCCScaleSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            setpointType,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return response.supportedScales.map((scale) => getScale(this.applHost.configManager, scale));
        }
    }
};
_a = API_1.SET_VALUE, _b = API_1.POLL_VALUE;
HumidityControlSetpointCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Humidity Control Setpoint"])
], HumidityControlSetpointCCAPI);
exports.HumidityControlSetpointCCAPI = HumidityControlSetpointCCAPI;
let HumidityControlSetpointCC = class HumidityControlSetpointCC extends CommandClass_1.CommandClass {
    translatePropertyKey(applHost, property, propertyKey) {
        if (property === "setpoint") {
            return (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlSetpointType, propertyKey);
        }
        else {
            return super.translatePropertyKey(applHost, property, propertyKey);
        }
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Humidity Control Setpoint"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
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
                    .map((type) => (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlSetpointType, type))
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
            const setpointName = (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlSetpointType, type);
            // Find out the capabilities of this setpoint
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `retrieving capabilities for setpoint ${setpointName}...`,
                direction: "outbound",
            });
            const setpointScaleSupported = await api.getSupportedScales(type);
            if (setpointScaleSupported) {
                const logMessage = `received supported scales for setpoint ${setpointName}: 
${setpointScaleSupported
                    .map((t) => `\n· ${t.key} ${t.unit} - ${t.label}`)
                    .join("")}`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
                const scaleValue = exports.HumidityControlSetpointCCValues.setpointScale(type);
                const states = {};
                for (const scale of setpointScaleSupported) {
                    if (scale.unit)
                        states[scale.key] = scale.unit;
                }
                this.setMetadata(applHost, scaleValue, {
                    ...scaleValue.meta,
                    states,
                });
            }
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
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Humidity Control Setpoint"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        const setpointTypes = this.getValue(applHost, exports.HumidityControlSetpointCCValues.supportedSetpointTypes) ?? [];
        // Query each setpoint's current value
        for (const type of setpointTypes) {
            const setpointName = (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlSetpointType, type);
            // Every time, query the current value
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `querying current value of setpoint ${setpointName}...`,
                direction: "outbound",
            });
            const setpoint = await api.get(type);
            if (setpoint) {
                const logMessage = `received current value of setpoint ${setpointName}: ${setpoint.value} ${getScale(applHost.configManager, setpoint.scale).unit ?? ""}`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
        }
    }
};
HumidityControlSetpointCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Humidity Control Setpoint"]),
    (0, CommandClassDecorators_1.implementedVersion)(2),
    (0, CommandClassDecorators_1.ccValues)(exports.HumidityControlSetpointCCValues)
], HumidityControlSetpointCC);
exports.HumidityControlSetpointCC = HumidityControlSetpointCC;
let HumidityControlSetpointCCSet = class HumidityControlSetpointCCSet extends HumidityControlSetpointCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.setpointType = options.setpointType;
            this.value = options.value;
            this.scale = options.scale;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.setpointType & 0b1111]),
            (0, safe_1.encodeFloatWithScale)(this.value, this.scale),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const scale = getScale(applHost.configManager, this.scale);
        return {
            ...super.toLogEntry(applHost),
            message: {
                "setpoint type": (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlSetpointType, this.setpointType),
                value: `${this.value} ${scale.unit}`,
            },
        };
    }
};
HumidityControlSetpointCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlSetpointCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], HumidityControlSetpointCCSet);
exports.HumidityControlSetpointCCSet = HumidityControlSetpointCCSet;
let HumidityControlSetpointCCReport = class HumidityControlSetpointCCReport extends HumidityControlSetpointCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this._type = this.payload[0] & 0b1111;
        // Setpoint type 0 is not defined in the spec, prevent devices from using it.
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
        const setpointValue = exports.HumidityControlSetpointCCValues.setpoint(this.type);
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
        this.setValue(applHost, exports.HumidityControlSetpointCCValues.setpointScale(this.type), this.scale);
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
                "setpoint type": (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlSetpointType, this.type),
                value: `${this.value} ${scale.unit}`,
            },
        };
    }
};
HumidityControlSetpointCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlSetpointCommand.Report)
], HumidityControlSetpointCCReport);
exports.HumidityControlSetpointCCReport = HumidityControlSetpointCCReport;
function testResponseForHumidityControlSetpointGet(sent, received) {
    // We expect a Humidity Control Setpoint Report that matches the requested setpoint type
    return received.type === sent.setpointType;
}
let HumidityControlSetpointCCGet = class HumidityControlSetpointCCGet extends HumidityControlSetpointCC {
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
                "setpoint type": (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlSetpointType, this.setpointType),
            },
        };
    }
};
HumidityControlSetpointCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlSetpointCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(HumidityControlSetpointCCReport, testResponseForHumidityControlSetpointGet)
], HumidityControlSetpointCCGet);
exports.HumidityControlSetpointCCGet = HumidityControlSetpointCCGet;
let HumidityControlSetpointCCSupportedReport = class HumidityControlSetpointCCSupportedReport extends HumidityControlSetpointCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.supportedSetpointTypes = (0, safe_1.parseBitMask)(this.payload, _Types_1.HumidityControlSetpointType["N/A"]);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supported setpoint types": this.supportedSetpointTypes
                    .map((t) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.HumidityControlSetpointType, t)}`)
                    .join(""),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.HumidityControlSetpointCCValues.supportedSetpointTypes)
], HumidityControlSetpointCCSupportedReport.prototype, "supportedSetpointTypes", void 0);
HumidityControlSetpointCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlSetpointCommand.SupportedReport)
], HumidityControlSetpointCCSupportedReport);
exports.HumidityControlSetpointCCSupportedReport = HumidityControlSetpointCCSupportedReport;
let HumidityControlSetpointCCSupportedGet = class HumidityControlSetpointCCSupportedGet extends HumidityControlSetpointCC {
};
HumidityControlSetpointCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlSetpointCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(HumidityControlSetpointCCSupportedReport)
], HumidityControlSetpointCCSupportedGet);
exports.HumidityControlSetpointCCSupportedGet = HumidityControlSetpointCCSupportedGet;
let HumidityControlSetpointCCScaleSupportedReport = class HumidityControlSetpointCCScaleSupportedReport extends HumidityControlSetpointCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.supportedScales = (0, safe_1.parseBitMask)(Buffer.from([this.payload[0] & 0b1111]), 0);
    }
    toLogEntry(applHost) {
        const supportedScales = this.supportedScales.map((scale) => getScale(applHost.configManager, scale));
        return {
            ...super.toLogEntry(applHost),
            message: {
                "scale supported": supportedScales
                    .map((t) => `\n· ${t.key} ${t.unit} - ${t.label}`)
                    .join(""),
            },
        };
    }
};
HumidityControlSetpointCCScaleSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlSetpointCommand.ScaleSupportedReport)
], HumidityControlSetpointCCScaleSupportedReport);
exports.HumidityControlSetpointCCScaleSupportedReport = HumidityControlSetpointCCScaleSupportedReport;
let HumidityControlSetpointCCScaleSupportedGet = class HumidityControlSetpointCCScaleSupportedGet extends HumidityControlSetpointCC {
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
                "setpoint type": (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlSetpointType, this.setpointType),
            },
        };
    }
};
HumidityControlSetpointCCScaleSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlSetpointCommand.ScaleSupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(HumidityControlSetpointCCScaleSupportedReport)
], HumidityControlSetpointCCScaleSupportedGet);
exports.HumidityControlSetpointCCScaleSupportedGet = HumidityControlSetpointCCScaleSupportedGet;
let HumidityControlSetpointCCCapabilitiesReport = class HumidityControlSetpointCCCapabilitiesReport extends HumidityControlSetpointCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this._type = this.payload[0] & 0b1111;
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
        const setpointValue = exports.HumidityControlSetpointCCValues.setpoint(this.type);
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
                "setpoint type": (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlSetpointType, this.type),
                "min value": `${this.minValue} ${minValueScale.unit}`,
                "max value": `${this.maxValue} ${maxValueScale.unit}`,
            },
        };
    }
};
HumidityControlSetpointCCCapabilitiesReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlSetpointCommand.CapabilitiesReport)
], HumidityControlSetpointCCCapabilitiesReport);
exports.HumidityControlSetpointCCCapabilitiesReport = HumidityControlSetpointCCCapabilitiesReport;
let HumidityControlSetpointCCCapabilitiesGet = class HumidityControlSetpointCCCapabilitiesGet extends HumidityControlSetpointCC {
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
                "setpoint type": (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlSetpointType, this.setpointType),
            },
        };
    }
};
HumidityControlSetpointCCCapabilitiesGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlSetpointCommand.CapabilitiesGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(HumidityControlSetpointCCCapabilitiesReport)
], HumidityControlSetpointCCCapabilitiesGet);
exports.HumidityControlSetpointCCCapabilitiesGet = HumidityControlSetpointCCCapabilitiesGet;
//# sourceMappingURL=HumidityControlSetpointCC.js.map