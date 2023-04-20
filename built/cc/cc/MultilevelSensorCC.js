"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultilevelSensorCCGetSupportedScale = exports.MultilevelSensorCCSupportedScaleReport = exports.MultilevelSensorCCGetSupportedSensor = exports.MultilevelSensorCCSupportedSensorReport = exports.MultilevelSensorCCGet = exports.MultilevelSensorCCReport = exports.MultilevelSensorCC = exports.MultilevelSensorCCAPI = exports.MultilevelSensorCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__optional_number = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function optional__number($o) {
        if ($o !== undefined) {
            const error = _number($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional__number($o);
};
const __assertType__number = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    return _number($o);
};
const __assertType__su__number__2_eu = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _2($o) {
        return !($o instanceof require("@zwave-js/config").Scale) ? {} : null;
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
const config_1 = require("@zwave-js/config");
const core_1 = require("@zwave-js/core");
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.MultilevelSensorCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Multilevel Sensor"], {
        ...Values_1.V.staticProperty("supportedSensorTypes", undefined, {
            internal: true,
        }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Multilevel Sensor"], {
        ...Values_1.V.dynamicPropertyAndKeyWithName("supportedScales", "supportedScales", (sensorType) => sensorType, ({ property, propertyKey }) => property === "supportedScales" &&
            typeof propertyKey === "number", undefined, { internal: true }),
        ...Values_1.V.dynamicPropertyWithName("value", 
        // This should have been the sensor type, but it is too late to change now
        // Maybe we can migrate this without breaking in the future
        (sensorTypeName) => sensorTypeName, ({ property, propertyKey }) => typeof property === "string" &&
            property !== "supportedSensorTypes" &&
            property !== "supportedScales" &&
            propertyKey == undefined, (sensorTypeName) => ({
            // Just the base metadata, to be extended using a config manager
            ...safe_1.ValueMetadata.ReadOnlyNumber,
            label: sensorTypeName,
        })),
    }),
});
/**
 * Determine the scale to use to query a sensor reading. Uses the user-preferred scale if given,
 * otherwise falls back to the first supported one.
 */
function getPreferredSensorScale(applHost, nodeId, endpointIndex, sensorType, supportedScales) {
    const scaleGroup = applHost.configManager.lookupSensorType(sensorType)?.scales;
    // If the sensor type is unknown, we have no default. Use the user-provided scale or 0
    if (!scaleGroup) {
        const preferred = applHost.options.preferences?.scales[sensorType];
        // We cannot look up strings for unknown sensor types, so this must be a number or we use the fallback
        if (typeof preferred !== "number")
            return 0;
        return preferred;
    }
    // Look up the preference for the scale
    let preferred;
    // Named scales apply to multiple sensor types. To be able to override the scale for single types
    // we need to look at the preferences by sensor type first
    preferred = applHost.options.preferences?.scales[sensorType];
    // If the scale is named, we can then try to use the named preference
    if (preferred == undefined && scaleGroup.name) {
        preferred = applHost.options.preferences?.scales[scaleGroup.name];
    }
    // Then fall back to the first supported scale
    if (preferred == undefined) {
        preferred = supportedScales[0] ?? 0;
        applHost.controllerLog.logNode(nodeId, {
            endpoint: endpointIndex,
            message: `No scale preference for sensor type ${sensorType}, using the first supported scale ${preferred}`,
        });
        return preferred;
    }
    // If the scale name or unit was given, try to look it up
    if (typeof preferred === "string") {
        for (const scale of scaleGroup.values()) {
            if (scale.label === preferred || scale.unit === preferred) {
                preferred = scale.key;
                break;
            }
        }
    }
    if (typeof preferred === "string") {
        // Looking up failed
        applHost.controllerLog.logNode(nodeId, {
            endpoint: endpointIndex,
            message: `Preferred scale "${preferred}" for sensor type ${sensorType} not found, using the first supported scale ${supportedScales[0] ?? 0}`,
        });
        return supportedScales[0] ?? 0;
    }
    // We have a numeric scale key, nothing to look up. Make sure it is supported though
    if (!supportedScales.length) {
        // No info about supported scales, just use the preferred one
        return preferred;
    }
    else if (!supportedScales.includes(preferred)) {
        applHost.controllerLog.logNode(nodeId, {
            endpoint: endpointIndex,
            message: `Preferred scale ${preferred} not supported for sensor type ${sensorType}, using the first supported scale`,
        });
        return supportedScales[0];
    }
    else {
        return preferred;
    }
}
// @noSetValueAPI This CC is read-only
let MultilevelSensorCCAPI = class MultilevelSensorCCAPI extends API_1.PhysicalCCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, }) => {
            // Look up the necessary information
            const valueId = {
                commandClass: safe_1.CommandClasses["Multilevel Sensor"],
                endpoint: this.endpoint.index,
                property,
            };
            const ccSpecific = this.tryGetValueDB()?.getMetadata(valueId)?.ccSpecific;
            if (!ccSpecific) {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            const { sensorType, scale } = ccSpecific;
            return this.get(sensorType, scale);
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.MultilevelSensorCommand.Get:
            case _Types_1.MultilevelSensorCommand.Report:
                return true; // This is mandatory
            case _Types_1.MultilevelSensorCommand.GetSupportedSensor:
            case _Types_1.MultilevelSensorCommand.GetSupportedScale:
                return this.version >= 5;
        }
        return super.supportsCommand(cmd);
    }
    async get(sensorType, scale) {
        __assertType("sensorType", "(optional) number", __assertType__optional_number.bind(void 0, sensorType));
        __assertType("scale", "(optional) number", __assertType__optional_number.bind(void 0, scale));
        this.assertSupportsCommand(_Types_1.MultilevelSensorCommand, _Types_1.MultilevelSensorCommand.Get);
        // Figure out the preferred scale if none was given
        let preferredScale;
        if (sensorType != undefined && scale == undefined) {
            const supportedScales = this.tryGetValueDB()?.getValue({
                commandClass: this.ccId,
                endpoint: this.endpoint.index,
                property: "supportedScales",
                propertyKey: sensorType,
            }) ?? [];
            preferredScale = getPreferredSensorScale(this.applHost, this.endpoint.nodeId, this.endpoint.index, sensorType, supportedScales);
        }
        const cc = new MultilevelSensorCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            sensorType,
            scale: scale ?? preferredScale,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (!response)
            return;
        const responseScale = this.applHost.configManager.lookupSensorScale(response.type, response.scale);
        if (sensorType == undefined) {
            // Overload #1: return the full response
            return {
                type: response.type,
                value: response.value,
                scale: responseScale,
            };
        }
        else if (scale == undefined) {
            // Overload #2: return value and scale
            return {
                value: response.value,
                scale: responseScale,
            };
        }
        else {
            // Overload #3: return only the value
            return response.value;
        }
    }
    async getSupportedSensorTypes() {
        this.assertSupportsCommand(_Types_1.MultilevelSensorCommand, _Types_1.MultilevelSensorCommand.GetSupportedSensor);
        const cc = new MultilevelSensorCCGetSupportedSensor(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.supportedSensorTypes;
    }
    async getSupportedScales(sensorType) {
        __assertType("sensorType", "number", __assertType__number.bind(void 0, sensorType));
        this.assertSupportsCommand(_Types_1.MultilevelSensorCommand, _Types_1.MultilevelSensorCommand.GetSupportedScale);
        const cc = new MultilevelSensorCCGetSupportedScale(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            sensorType,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.supportedScales;
    }
    async sendReport(sensorType, scale, value) {
        __assertType("sensorType", "number", __assertType__number.bind(void 0, sensorType));
        __assertType("scale", undefined, __assertType__su__number__2_eu.bind(void 0, scale));
        __assertType("value", "number", __assertType__number.bind(void 0, value));
        this.assertSupportsCommand(_Types_1.MultilevelSensorCommand, _Types_1.MultilevelSensorCommand.Report);
        const cc = new MultilevelSensorCCReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            type: sensorType,
            scale,
            value,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.POLL_VALUE;
MultilevelSensorCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Multilevel Sensor"])
], MultilevelSensorCCAPI);
exports.MultilevelSensorCCAPI = MultilevelSensorCCAPI;
let MultilevelSensorCC = class MultilevelSensorCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Multilevel Sensor"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        if (this.version >= 5) {
            // Query the supported sensor types
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "retrieving supported sensor types...",
                direction: "outbound",
            });
            const sensorTypes = await api.getSupportedSensorTypes();
            if (sensorTypes) {
                const logMessage = "received supported sensor types:\n" +
                    sensorTypes
                        .map((t) => applHost.configManager.getSensorTypeName(t))
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
                    message: "Querying supported sensor types timed out, skipping interview...",
                    level: "warn",
                });
                return;
            }
            // As well as the supported scales for each sensor
            for (const type of sensorTypes) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `querying supported scales for ${applHost.configManager.getSensorTypeName(type)} sensor`,
                    direction: "outbound",
                });
                const sensorScales = await api.getSupportedScales(type);
                if (sensorScales) {
                    const logMessage = "received supported scales:\n" +
                        sensorScales
                            .map((s) => applHost.configManager.lookupSensorScale(type, s).label)
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
                        message: "Querying supported scales timed out, skipping interview...",
                        level: "warn",
                    });
                    return;
                }
            }
        }
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Multilevel Sensor"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        const valueDB = this.getValueDB(applHost);
        if (this.version <= 4) {
            // Sensors up to V4 only support a single value
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "querying current sensor reading...",
                direction: "outbound",
            });
            const mlsResponse = await api.get();
            if (mlsResponse) {
                const sensorScale = applHost.configManager.lookupSensorScale(mlsResponse.type, mlsResponse.scale.key);
                const logMessage = `received current sensor reading:
sensor type: ${applHost.configManager.getSensorTypeName(mlsResponse.type)}
value:       ${mlsResponse.value} ${sensorScale.unit || ""}`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
        }
        else {
            // Query all sensor values
            const sensorTypes = valueDB.getValue({
                commandClass: this.ccId,
                property: "supportedSensorTypes",
                endpoint: this.endpointIndex,
            }) || [];
            for (const type of sensorTypes) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `querying ${applHost.configManager.getSensorTypeName(type)} sensor reading...`,
                    direction: "outbound",
                });
                const value = await api.get(type);
                if (value) {
                    const logMessage = `received current ${applHost.configManager.getSensorTypeName(type)} sensor reading: ${value.value} ${value.scale.unit || ""}`;
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: logMessage,
                        direction: "inbound",
                    });
                }
            }
        }
    }
    shouldRefreshValues(applHost) {
        // Check when any of the supported values was last updated longer than 6 hours ago.
        // This may lead to some unnecessary queries, but at least the values are up to date then
        const valueDB = applHost.tryGetValueDB(this.nodeId);
        if (!valueDB)
            return true;
        const values = this.getDefinedValueIDs(applHost).filter((v) => exports.MultilevelSensorCCValues.value.is(v));
        return values.some((v) => {
            const lastUpdated = valueDB.getTimestamp(v);
            return (lastUpdated == undefined ||
                Date.now() - lastUpdated > core_1.timespan.hours(6));
        });
    }
    translatePropertyKey(applHost, property, propertyKey) {
        // TODO: check this
        if (property === "values" && typeof propertyKey === "number") {
            const type = applHost.configManager.lookupSensorType(propertyKey);
            if (type)
                return type.label;
        }
        return super.translatePropertyKey(applHost, property, propertyKey);
    }
};
MultilevelSensorCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Multilevel Sensor"]),
    (0, CommandClassDecorators_1.implementedVersion)(11),
    (0, CommandClassDecorators_1.ccValues)(exports.MultilevelSensorCCValues)
], MultilevelSensorCC);
exports.MultilevelSensorCC = MultilevelSensorCC;
let MultilevelSensorCCReport = class MultilevelSensorCCReport extends MultilevelSensorCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.type = this.payload[0];
            // parseFloatWithScale does its own validation
            const { value, scale } = (0, safe_1.parseFloatWithScale)(this.payload.slice(1));
            this.value = value;
            this.scale = scale;
        }
        else {
            this.type = options.type;
            this.value = options.value;
            this.scale =
                options.scale instanceof config_1.Scale
                    ? options.scale.key
                    : options.scale;
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        const sensorType = applHost.configManager.lookupSensorType(this.type);
        const scale = applHost.configManager.lookupSensorScale(this.type, this.scale);
        // Filter out unknown sensor types and scales, unless the strict validation is disabled
        const measurementValidation = !this.host.getDeviceConfig?.(this.nodeId)?.compat?.disableStrictMeasurementValidation;
        if (measurementValidation) {
            safe_1.validatePayload.withReason(`Unknown sensor type ${(0, safe_2.num2hex)(this.type)} or corrupted data`)(!!sensorType);
            safe_1.validatePayload.withReason(`Unknown scale ${(0, safe_2.num2hex)(this.scale)} or corrupted data`)(scale.label !== (0, config_1.getDefaultScale)(this.scale).label);
            // Filter out unsupported sensor types and scales if possible
            if (this.version >= 5) {
                const supportedSensorTypes = this.getValue(applHost, exports.MultilevelSensorCCValues.supportedSensorTypes);
                if (supportedSensorTypes?.length) {
                    safe_1.validatePayload.withReason(`Unsupported sensor type ${sensorType.label} or corrupted data`)(supportedSensorTypes.includes(this.type));
                }
                const supportedScales = this.getValue(applHost, exports.MultilevelSensorCCValues.supportedScales(this.type));
                if (supportedScales?.length) {
                    safe_1.validatePayload.withReason(`Unsupported sensor type ${scale.label} or corrupted data`)(supportedScales.includes(scale.key));
                }
            }
        }
        const typeName = applHost.configManager.getSensorTypeName(this.type);
        const sensorValue = exports.MultilevelSensorCCValues.value(typeName);
        this.setMetadata(applHost, sensorValue, {
            ...sensorValue.meta,
            unit: scale.unit,
            ccSpecific: {
                sensorType: this.type,
                scale: scale.key,
            },
        });
        this.setValue(applHost, sensorValue, this.value);
        return true;
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.type]),
            (0, safe_1.encodeFloatWithScale)(this.value, this.scale),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                type: applHost.configManager.getSensorTypeName(this.type),
                scale: applHost.configManager.lookupSensorScale(this.type, this.scale).label,
                value: this.value,
            },
        };
    }
};
MultilevelSensorCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultilevelSensorCommand.Report),
    (0, CommandClassDecorators_1.useSupervision)()
], MultilevelSensorCCReport);
exports.MultilevelSensorCCReport = MultilevelSensorCCReport;
const testResponseForMultilevelSensorGet = (sent, received) => {
    // We expect a Multilevel Sensor Report that matches the requested sensor type (if a type was requested)
    return sent.sensorType == undefined || received.type === sent.sensorType;
};
let MultilevelSensorCCGet = class MultilevelSensorCCGet extends MultilevelSensorCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if ("sensorType" in options) {
                this.sensorType = options.sensorType;
                this.scale = options.scale;
            }
        }
    }
    serialize() {
        if (this.version >= 5 &&
            this.sensorType != undefined &&
            this.scale != undefined) {
            this.payload = Buffer.from([
                this.sensorType,
                (this.scale & 0b11) << 3,
            ]);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        let message = {};
        if (this.version >= 5 &&
            this.sensorType != undefined &&
            this.scale != undefined) {
            message = {
                "sensor type": applHost.configManager.getSensorTypeName(this.sensorType),
                scale: applHost.configManager.lookupSensorScale(this.sensorType, this.scale).label,
            };
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
MultilevelSensorCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultilevelSensorCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(MultilevelSensorCCReport, testResponseForMultilevelSensorGet)
], MultilevelSensorCCGet);
exports.MultilevelSensorCCGet = MultilevelSensorCCGet;
let MultilevelSensorCCSupportedSensorReport = class MultilevelSensorCCSupportedSensorReport extends MultilevelSensorCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.supportedSensorTypes = (0, safe_1.parseBitMask)(this.payload);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supported sensor types": this.supportedSensorTypes
                    .map((t) => `\n· ${applHost.configManager.getSensorTypeName(t)}`)
                    .join(""),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultilevelSensorCCValues.supportedSensorTypes)
], MultilevelSensorCCSupportedSensorReport.prototype, "supportedSensorTypes", void 0);
MultilevelSensorCCSupportedSensorReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultilevelSensorCommand.SupportedSensorReport)
], MultilevelSensorCCSupportedSensorReport);
exports.MultilevelSensorCCSupportedSensorReport = MultilevelSensorCCSupportedSensorReport;
let MultilevelSensorCCGetSupportedSensor = class MultilevelSensorCCGetSupportedSensor extends MultilevelSensorCC {
};
MultilevelSensorCCGetSupportedSensor = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultilevelSensorCommand.GetSupportedSensor),
    (0, CommandClassDecorators_1.expectedCCResponse)(MultilevelSensorCCSupportedSensorReport)
], MultilevelSensorCCGetSupportedSensor);
exports.MultilevelSensorCCGetSupportedSensor = MultilevelSensorCCGetSupportedSensor;
let MultilevelSensorCCSupportedScaleReport = class MultilevelSensorCCSupportedScaleReport extends MultilevelSensorCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.sensorType = this.payload[0];
        this.supportedScales = (0, safe_1.parseBitMask)(Buffer.from([this.payload[1] & 0b1111]), 0);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "sensor type": applHost.configManager.getSensorTypeName(this.sensorType),
                "supported scales": this.supportedScales
                    .map((s) => `\n· ${applHost.configManager.lookupSensorScale(this.sensorType, s).label}`)
                    .join(""),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultilevelSensorCCValues.supportedScales, (self) => [self.sensorType])
], MultilevelSensorCCSupportedScaleReport.prototype, "supportedScales", void 0);
MultilevelSensorCCSupportedScaleReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultilevelSensorCommand.SupportedScaleReport)
], MultilevelSensorCCSupportedScaleReport);
exports.MultilevelSensorCCSupportedScaleReport = MultilevelSensorCCSupportedScaleReport;
let MultilevelSensorCCGetSupportedScale = class MultilevelSensorCCGetSupportedScale extends MultilevelSensorCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.sensorType = options.sensorType;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.sensorType]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "sensor type": applHost.configManager.getSensorTypeName(this.sensorType),
            },
        };
    }
};
MultilevelSensorCCGetSupportedScale = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultilevelSensorCommand.GetSupportedScale),
    (0, CommandClassDecorators_1.expectedCCResponse)(MultilevelSensorCCSupportedScaleReport)
], MultilevelSensorCCGetSupportedScale);
exports.MultilevelSensorCCGetSupportedScale = MultilevelSensorCCGetSupportedScale;
//# sourceMappingURL=MultilevelSensorCC.js.map