"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeterCCReset = exports.MeterCCSupportedGet = exports.MeterCCSupportedReport = exports.MeterCCGet = exports.MeterCCReport = exports.MeterCC = exports.MeterCCAPI = exports.MeterCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__optional_MeterCCGetOptions = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function su__2__3__4_eu($o) {
        return ![0, 1, 2].includes($o) ? {} : null;
    }
    function _0($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("scale" in $o && $o["scale"] !== undefined) {
            const error = _number($o["scale"]);
            if (error)
                return error;
        }
        if ("rateType" in $o && $o["rateType"] !== undefined) {
            const error = su__2__3__4_eu($o["rateType"]);
            if (error)
                return error;
        }
        return null;
    }
    function optional__0($o) {
        if ($o !== undefined) {
            const error = _0($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional__0($o);
};
const __assertType__optional_MeterCCResetOptions = $o => {
    function _undefined($o) {
        return $o !== undefined ? {} : null;
    }
    function _1($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("type" in $o && $o["type"] !== undefined) {
            const error = _undefined($o["type"]);
            if (error)
                return error;
        }
        if ("targetValue" in $o && $o["targetValue"] !== undefined) {
            const error = _undefined($o["targetValue"]);
            if (error)
                return error;
        }
        return null;
    }
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _2($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("type" in $o && $o["type"] !== undefined) {
            const error = _number($o["type"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("targetValue" in $o && $o["targetValue"] !== undefined) {
            const error = _number($o["targetValue"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function su__1__2_eu($o) {
        const conditions = [_1, _2];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function optional_su__1__2_eu($o) {
        if ($o !== undefined) {
            const error = su__1__2_eu($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional_su__1__2_eu($o);
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
exports.MeterCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses.Meter, {
        ...Values_1.V.staticProperty("type", undefined, { internal: true }),
        ...Values_1.V.staticProperty("supportsReset", undefined, { internal: true }),
        ...Values_1.V.staticProperty("supportedScales", undefined, { internal: true }),
        ...Values_1.V.staticProperty("supportedRateTypes", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticPropertyWithName("resetAll", "reset", {
            ...safe_1.ValueMetadata.WriteOnlyBoolean,
            label: `Reset accumulated values`,
        }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses.Meter, {
        ...Values_1.V.dynamicPropertyAndKeyWithName("resetSingle", "reset", (meterType) => meterType, ({ property, propertyKey }) => property === "reset" && typeof propertyKey === "number", (meterType) => ({
            ...safe_1.ValueMetadata.WriteOnlyBoolean,
            // This is only a placeholder label. A config manager is needed to
            // determine the actual label.
            label: `Reset (${(0, safe_2.num2hex)(meterType)})`,
            ccSpecific: { meterType },
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("value", "value", toPropertyKey, ({ property, propertyKey }) => property === "value" && typeof propertyKey === "number", (meterType, rateType, scale) => ({
            ...safe_1.ValueMetadata.ReadOnlyNumber,
            // Label and unit can only be determined with a config manager
            ccSpecific: {
                meterType,
                rateType,
                scale,
            },
        })),
    }),
});
function toPropertyKey(meterType, rateType, scale) {
    return (meterType << 16) | (scale << 8) | rateType;
}
function splitPropertyKey(key) {
    return {
        rateType: key & 0xff,
        scale: (key >>> 8) & 0xff,
        meterType: key >>> 16,
    };
}
function getMeterTypeName(configManager, type) {
    return (configManager.lookupMeter(type)?.name ?? `UNKNOWN (${(0, safe_2.num2hex)(type)})`);
}
function getValueLabel(configManager, meterType, scale, rateType, suffix) {
    let ret = getMeterTypeName(configManager, meterType);
    switch (rateType) {
        case _Types_1.RateType.Consumed:
            ret += ` Consumption [${scale.label}]`;
            break;
        case _Types_1.RateType.Produced:
            ret += ` Production [${scale.label}]`;
            break;
        default:
            ret += ` [${scale.label}]`;
    }
    if (suffix) {
        ret += ` (${suffix})`;
    }
    return ret;
}
let MeterCCAPI = class MeterCCAPI extends API_1.PhysicalCCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, propertyKey, }) => {
            switch (property) {
                case "value":
                case "previousValue":
                case "deltaTime": {
                    if (propertyKey == undefined) {
                        (0, API_1.throwMissingPropertyKey)(this.ccId, property);
                    }
                    else if (typeof propertyKey !== "number") {
                        (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
                    }
                    const { rateType, scale } = splitPropertyKey(propertyKey);
                    return (await this.get({
                        rateType,
                        scale,
                    }))?.[property];
                }
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
        this[_b] = async ({ property, propertyKey }, value) => {
            if (property !== "reset") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            else if (propertyKey != undefined &&
                typeof propertyKey !== "number") {
                (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
            }
            else if (value !== true) {
                (0, API_1.throwWrongValueType)(this.ccId, property, "true", value === false ? "false" : typeof value);
            }
            const resetOptions = propertyKey != undefined
                ? {
                    type: propertyKey,
                    targetValue: 0,
                }
                : {};
            await this.reset(resetOptions);
            // Refresh values
            await this.getAll();
            return undefined;
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.MeterCommand.Get:
                return true; // This is mandatory
            case _Types_1.MeterCommand.SupportedGet:
                return this.version >= 2;
            case _Types_1.MeterCommand.Reset: {
                const ret = this.tryGetValueDB()?.getValue({
                    commandClass: (0, CommandClassDecorators_1.getCommandClass)(this),
                    endpoint: this.endpoint.index,
                    property: "supportsReset",
                });
                return ret === true;
            }
        }
        return super.supportsCommand(cmd);
    }
    async get(options) {
        __assertType("options", "(optional) MeterCCGetOptions", __assertType__optional_MeterCCGetOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.MeterCommand, _Types_1.MeterCommand.Get);
        const cc = new MeterCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...options,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return {
                type: response.type,
                scale: this.applHost.configManager.lookupMeterScale(response.type, response.scale),
                ...(0, safe_2.pick)(response, [
                    "value",
                    "previousValue",
                    "rateType",
                    "deltaTime",
                ]),
            };
        }
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getAll() {
        const valueDB = this.tryGetValueDB();
        if (this.version >= 2) {
            const supportedScales = valueDB?.getValue(exports.MeterCCValues.supportedScales.endpoint(this.endpoint.index)) ?? [];
            const supportedRateTypes = valueDB?.getValue(exports.MeterCCValues.supportedRateTypes.endpoint(this.endpoint.index)) ?? [];
            const rateTypes = supportedRateTypes.length
                ? supportedRateTypes
                : [undefined];
            const ret = [];
            for (const rateType of rateTypes) {
                for (const scale of supportedScales) {
                    const response = await this.get({
                        scale,
                        rateType,
                    });
                    if (response)
                        ret.push(response);
                }
            }
            return ret;
        }
        else {
            const response = await this.get();
            return response ? [response] : [];
        }
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getSupported() {
        this.assertSupportsCommand(_Types_1.MeterCommand, _Types_1.MeterCommand.SupportedGet);
        const cc = new MeterCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "type",
                "supportsReset",
                "supportedScales",
                "supportedRateTypes",
            ]);
        }
    }
    async reset(options) {
        __assertType("options", "(optional) MeterCCResetOptions", __assertType__optional_MeterCCResetOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.MeterCommand, _Types_1.MeterCommand.Reset);
        const cc = new MeterCCReset(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...options,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.POLL_VALUE;
_b = API_1.SET_VALUE;
MeterCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Meter)
], MeterCCAPI);
exports.MeterCCAPI = MeterCCAPI;
let MeterCC = class MeterCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Meter, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        if (this.version >= 2) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "querying meter support...",
                direction: "outbound",
            });
            const suppResp = await api.getSupported();
            if (suppResp) {
                const logMessage = `received meter support:
type:                 ${getMeterTypeName(applHost.configManager, suppResp.type)}
supported scales:     ${suppResp.supportedScales
                    .map((s) => applHost.configManager.lookupMeterScale(suppResp.type, s).label)
                    .map((label) => `\n· ${label}`)
                    .join("")}
supported rate types: ${suppResp.supportedRateTypes
                    .map((rt) => (0, safe_2.getEnumMemberName)(_Types_1.RateType, rt))
                    .map((label) => `\n· ${label}`)
                    .join("")}
supports reset:       ${suppResp.supportsReset}`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
            else {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: "Querying meter support timed out, skipping interview...",
                    level: "warn",
                });
                return;
            }
        }
        // Query current meter values
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Meter, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        if (this.version === 1) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `querying default meter value...`,
                direction: "outbound",
            });
            await api.get();
        }
        else {
            const type = this.getValue(applHost, exports.MeterCCValues.type) ?? 0;
            const supportedScales = this.getValue(applHost, exports.MeterCCValues.supportedScales) ?? [];
            const supportedRateTypes = this.getValue(applHost, exports.MeterCCValues.supportedRateTypes) ?? [];
            const rateTypes = supportedRateTypes.length
                ? supportedRateTypes
                : [undefined];
            for (const rateType of rateTypes) {
                for (const scale of supportedScales) {
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: `querying meter value (type = ${getMeterTypeName(applHost.configManager, type)}, scale = ${applHost.configManager.lookupMeterScale(type, scale)
                            .label}${rateType != undefined
                            ? `, rate type = ${(0, safe_2.getEnumMemberName)(_Types_1.RateType, rateType)}`
                            : ""})...`,
                        direction: "outbound",
                    });
                    await api.get({ scale, rateType });
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
        const values = this.getDefinedValueIDs(applHost).filter((v) => exports.MeterCCValues.value.is(v));
        return values.some((v) => {
            const lastUpdated = valueDB.getTimestamp(v);
            return (lastUpdated == undefined ||
                Date.now() - lastUpdated > core_1.timespan.hours(6));
        });
    }
    translatePropertyKey(applHost, property, propertyKey) {
        if (property === "value" && typeof propertyKey === "number") {
            const { meterType, rateType, scale } = splitPropertyKey(propertyKey);
            let ret;
            if (meterType !== 0) {
                ret = `${applHost.configManager.getMeterName(meterType)}_${applHost.configManager.lookupMeterScale(meterType, scale)
                    .label}`;
            }
            else {
                ret = "default";
            }
            if (rateType !== _Types_1.RateType.Unspecified) {
                ret += "_" + (0, safe_2.getEnumMemberName)(_Types_1.RateType, rateType);
            }
            return ret;
        }
        else if (property === "reset" && typeof propertyKey === "number") {
            return getMeterTypeName(applHost.configManager, propertyKey);
        }
        return super.translatePropertyKey(applHost, property, propertyKey);
    }
};
MeterCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Meter),
    (0, CommandClassDecorators_1.implementedVersion)(6),
    (0, CommandClassDecorators_1.ccValues)(exports.MeterCCValues)
], MeterCC);
exports.MeterCC = MeterCC;
let MeterCCReport = class MeterCCReport extends MeterCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this._type = this.payload[0] & 31;
        this._rateType = (this.payload[0] & 96) >>> 5;
        const scale1Bit2 = (this.payload[0] & 128) >>> 7;
        const { scale: scale1Bits10, value, bytesRead, } = (0, safe_1.parseFloatWithScale)(this.payload.slice(1));
        let offset = 2 + (bytesRead - 1);
        // The scale is composed of two fields (see SDS13781)
        const scale1 = (scale1Bit2 << 2) | scale1Bits10;
        let scale2 = 0;
        this._value = value;
        if (this.version >= 2 && this.payload.length >= offset + 2) {
            this._deltaTime = this.payload.readUInt16BE(offset);
            offset += 2;
            if (this._deltaTime === 0xffff) {
                this._deltaTime = safe_1.unknownNumber;
            }
            if (
            // 0 means that no previous value is included
            this.deltaTime !== 0 &&
                this.payload.length >= offset + (bytesRead - 1)) {
                const { value: prevValue } = (0, safe_1.parseFloatWithScale)(
                // This float is split in the payload
                Buffer.concat([
                    Buffer.from([this.payload[1]]),
                    this.payload.slice(offset),
                ]));
                offset += bytesRead - 1;
                this._previousValue = prevValue;
            }
            if (this.version >= 4 &&
                scale1 === 7 &&
                this.payload.length >= offset + 1) {
                scale2 = this.payload[offset];
            }
        }
        else {
            // 0 means that no previous value is included
            this._deltaTime = 0;
        }
        this.scale = scale1 === 7 ? scale1 + scale2 : scale1;
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        const meterType = applHost.configManager.lookupMeter(this._type);
        const scale = applHost.configManager.lookupMeterScale(this._type, this.scale);
        // Filter out unknown meter types and scales, unless the strict validation is disabled
        const measurementValidation = !this.host.getDeviceConfig?.(this.nodeId)?.compat?.disableStrictMeasurementValidation;
        if (measurementValidation) {
            safe_1.validatePayload.withReason(`Unknown meter type ${(0, safe_2.num2hex)(this.type)} or corrupted data`)(!!meterType);
            safe_1.validatePayload.withReason(`Unknown meter scale ${(0, safe_2.num2hex)(this.scale)} or corrupted data`)(scale.label !== (0, config_1.getDefaultMeterScale)(this.scale).label);
            // Filter out unsupported meter types, scales and rate types if possible
            if (this.version >= 2) {
                const expectedType = this.getValue(applHost, exports.MeterCCValues.type);
                if (expectedType != undefined) {
                    safe_1.validatePayload.withReason("Unexpected meter type or corrupted data")(this._type === expectedType);
                }
                const supportedScales = this.getValue(applHost, exports.MeterCCValues.supportedScales);
                if (supportedScales?.length) {
                    safe_1.validatePayload.withReason(`Unsupported meter scale ${scale.label} or corrupted data`)(supportedScales.includes(this.scale));
                }
                const supportedRateTypes = this.getValue(applHost, exports.MeterCCValues.supportedRateTypes);
                if (supportedRateTypes?.length) {
                    safe_1.validatePayload.withReason(`Unsupported rate type ${(0, safe_2.getEnumMemberName)(_Types_1.RateType, this._rateType)} or corrupted data`)(supportedRateTypes.includes(this._rateType));
                }
            }
        }
        const valueValue = exports.MeterCCValues.value(this._type, this._rateType, this.scale);
        this.ensureMetadata(applHost, valueValue, {
            ...valueValue.meta,
            label: getValueLabel(applHost.configManager, this._type, scale, this._rateType),
            unit: scale.label,
        });
        this.setValue(applHost, valueValue, this._value);
        return true;
    }
    get type() {
        return this._type;
    }
    get value() {
        return this._value;
    }
    get previousValue() {
        return this._previousValue;
    }
    get rateType() {
        return this._rateType;
    }
    get deltaTime() {
        return this._deltaTime;
    }
    toLogEntry(applHost) {
        const meterType = applHost.configManager.lookupMeter(this._type);
        const scale = applHost.configManager.lookupMeterScale(this._type, this.scale);
        const message = {
            type: meterType?.name ?? `Unknown (${(0, safe_2.num2hex)(this._type)})`,
            scale: scale.label,
            "rate type": (0, safe_2.getEnumMemberName)(_Types_1.RateType, this._rateType),
            value: this.value,
        };
        if (this._deltaTime !== "unknown") {
            message["time delta"] = `${this.deltaTime} seconds`;
        }
        if (this._previousValue != undefined) {
            message["prev. value"] = this._previousValue;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
MeterCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MeterCommand.Report)
], MeterCCReport);
exports.MeterCCReport = MeterCCReport;
function testResponseForMeterGet(sent, received) {
    // We expect a Meter Report that matches the requested scale and rate type
    // (if they were requested)
    return ((sent.scale == undefined || sent.scale === received.scale) &&
        (sent.rateType == undefined || sent.rateType == received.rateType));
}
let MeterCCGet = class MeterCCGet extends MeterCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.rateType = options.rateType;
            this.scale = options.scale;
        }
    }
    serialize() {
        let scale1;
        let scale2;
        let bufferLength = 0;
        if (this.scale == undefined) {
            scale1 = 0;
        }
        else if (this.version >= 4 && this.scale >= 7) {
            scale1 = 7;
            scale2 = this.scale >>> 3;
            bufferLength = 2;
        }
        else if (this.version >= 3) {
            scale1 = this.scale & 0b111;
            bufferLength = 1;
        }
        else if (this.version >= 2) {
            scale1 = this.scale & 0b11;
            bufferLength = 1;
        }
        else {
            scale1 = 0;
        }
        let rateTypeFlags = 0;
        if (this.version >= 4 && this.rateType != undefined) {
            rateTypeFlags = this.rateType & 0b11;
            bufferLength = Math.max(bufferLength, 1);
        }
        this.payload = Buffer.alloc(bufferLength, 0);
        this.payload[0] = (rateTypeFlags << 6) | (scale1 << 3);
        if (scale2)
            this.payload[1] = scale2;
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {};
        if (this.rateType != undefined) {
            message["rate type"] = (0, safe_2.getEnumMemberName)(_Types_1.RateType, this.rateType);
        }
        if (this.scale != undefined) {
            // Try to lookup the meter type to translate the scale
            const type = this.getValue(applHost, exports.MeterCCValues.type);
            if (type != undefined) {
                message.scale = applHost.configManager.lookupMeterScale(type, this.scale).label;
            }
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
MeterCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MeterCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(MeterCCReport, testResponseForMeterGet)
], MeterCCGet);
exports.MeterCCGet = MeterCCGet;
let MeterCCSupportedReport = class MeterCCSupportedReport extends MeterCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.type = this.payload[0] & 31;
        this.supportsReset = !!(this.payload[0] & 128);
        const hasMoreScales = !!(this.payload[1] & 128);
        if (hasMoreScales) {
            // The bitmask is spread out
            (0, safe_1.validatePayload)(this.payload.length >= 3);
            const extraBytes = this.payload[2];
            (0, safe_1.validatePayload)(this.payload.length >= 3 + extraBytes);
            // The bitmask is the original payload byte plus all following bytes
            // Since the first byte only has 7 bits, we need to reduce all following bits by 1
            this.supportedScales = (0, safe_1.parseBitMask)(Buffer.concat([
                Buffer.from([this.payload[1] & 127]),
                this.payload.slice(3, 3 + extraBytes),
            ]), 0).map((scale) => (scale >= 8 ? scale - 1 : scale));
        }
        else {
            // only 7 bits in the bitmask. Bit 7 is 0, so no need to mask it out
            this.supportedScales = (0, safe_1.parseBitMask)(Buffer.from([this.payload[1]]), 0);
        }
        // This is only present in V4+
        this.supportedRateTypes = (0, safe_1.parseBitMask)(Buffer.from([(this.payload[0] & 96) >>> 5]), 1);
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        if (!this.supportsReset)
            return true;
        // Create reset values
        if (this.version < 6) {
            this.ensureMetadata(applHost, exports.MeterCCValues.resetAll);
        }
        else {
            const resetSingleValue = exports.MeterCCValues.resetSingle(this.type);
            this.ensureMetadata(applHost, resetSingleValue, {
                ...resetSingleValue.meta,
                label: `Reset (${getMeterTypeName(applHost.configManager, this.type)})`,
            });
        }
        return true;
    }
    toLogEntry(applHost) {
        const message = {
            type: `${applHost.configManager.lookupMeter(this.type)?.name ??
                `Unknown (${(0, safe_2.num2hex)(this.type)})`}`,
            "supports reset": this.supportsReset,
            "supported scales": `${this.supportedScales
                .map((scale) => `
· ${applHost.configManager.lookupMeterScale(this.type, scale).label}`)
                .join("")}`,
            "supported rate types": this.supportedRateTypes
                .map((rt) => (0, safe_2.getEnumMemberName)(_Types_1.RateType, rt))
                .join(", "),
        };
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MeterCCValues.type)
], MeterCCSupportedReport.prototype, "type", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MeterCCValues.supportsReset)
], MeterCCSupportedReport.prototype, "supportsReset", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MeterCCValues.supportedScales)
], MeterCCSupportedReport.prototype, "supportedScales", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MeterCCValues.supportedRateTypes)
], MeterCCSupportedReport.prototype, "supportedRateTypes", void 0);
MeterCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MeterCommand.SupportedReport)
], MeterCCSupportedReport);
exports.MeterCCSupportedReport = MeterCCSupportedReport;
let MeterCCSupportedGet = class MeterCCSupportedGet extends MeterCC {
};
MeterCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MeterCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(MeterCCSupportedReport)
], MeterCCSupportedGet);
exports.MeterCCSupportedGet = MeterCCSupportedGet;
let MeterCCReset = class MeterCCReset extends MeterCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.type = options.type;
            this.targetValue = options.targetValue;
            // Test if this is a valid target value
            if (this.targetValue != undefined &&
                !(0, safe_1.getMinIntegerSize)(this.targetValue, true)) {
                throw new safe_1.ZWaveError(`${this.targetValue} is not a valid target value!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
        }
    }
    serialize() {
        if (this.version >= 6 && this.targetValue != undefined && this.type) {
            const size = (this.targetValue &&
                (0, safe_1.getMinIntegerSize)(this.targetValue, true)) ||
                0;
            if (size > 0) {
                this.payload = Buffer.allocUnsafe(1 + size);
                this.payload[0] = (size << 5) | (this.type & 0b11111);
                this.payload.writeIntBE(this.targetValue, 1, size);
            }
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {};
        if (this.type != undefined) {
            message.type = `${applHost.configManager.lookupMeter(this.type)?.name ??
                `Unknown (${(0, safe_2.num2hex)(this.type)})`}`;
        }
        if (this.targetValue != undefined) {
            message["target value"] = this.targetValue;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
MeterCCReset = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MeterCommand.Reset),
    (0, CommandClassDecorators_1.useSupervision)()
], MeterCCReset);
exports.MeterCCReset = MeterCCReset;
//# sourceMappingURL=MeterCC.js.map