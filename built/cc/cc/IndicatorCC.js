"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicatorCCDescriptionGet = exports.IndicatorCCDescriptionReport = exports.IndicatorCCSupportedGet = exports.IndicatorCCSupportedReport = exports.IndicatorCCGet = exports.IndicatorCCReport = exports.IndicatorCCSet = exports.IndicatorCC = exports.IndicatorCCAPI = exports.IndicatorCCValues = void 0;
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
const __assertType__su__number_sa__5_ea_5_5_5_eu = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _false($o) {
        return $o !== false ? {} : null;
    }
    function _true($o) {
        return $o !== true ? {} : null;
    }
    function su__number__7__8_eu($o) {
        const conditions = [_number, _false, _true];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function _5($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("indicatorId" in $o && $o["indicatorId"] !== undefined) {
            const error = _number($o["indicatorId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("propertyId" in $o && $o["propertyId"] !== undefined) {
            const error = _number($o["propertyId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("value" in $o && $o["value"] !== undefined) {
            const error = su__number__7__8_eu($o["value"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function sa__5_ea_5($o) {
        if (!Array.isArray($o))
            return {};
        for (let i = 0; i < $o.length; i++) {
            const error = _5($o[i]);
            if (error)
                return error;
        }
        return null;
    }
    function su__number_sa__5_ea_5_5_5_eu($o) {
        const conditions = [_number, sa__5_ea_5];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su__number_sa__5_ea_5_5_5_eu($o);
};
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
function isManufacturerDefinedIndicator(indicatorId) {
    return indicatorId >= 0x80 && indicatorId <= 0x9f;
}
exports.IndicatorCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses.Indicator, {
        ...Values_1.V.staticProperty("supportedIndicatorIds", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticPropertyWithName("valueV1", "value", {
            ...safe_1.ValueMetadata.UInt8,
            label: "Indicator value",
            ccSpecific: {
                indicatorId: 0,
            },
        }),
        ...Values_1.V.staticProperty("identify", {
            ...safe_1.ValueMetadata.WriteOnlyBoolean,
            label: "Identify",
        }, { minVersion: 3 }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses.Indicator, {
        ...Values_1.V.dynamicPropertyAndKeyWithName("supportedPropertyIDs", "supportedPropertyIDs", (indicatorId) => indicatorId, ({ property, propertyKey }) => property === "supportedPropertyIDs" &&
            typeof propertyKey === "number", undefined, { internal: true }),
        ...Values_1.V.dynamicPropertyAndKeyWithName("valueV2", 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (indicatorId, propertyId) => indicatorId, (indicatorId, propertyId) => propertyId, ({ property, propertyKey }) => typeof property === "number" && typeof propertyKey === "number", 
        // The metadata is highly dependent on the indicator and property
        // so this is just a baseline
        (indicatorId, propertyId) => ({
            ...safe_1.ValueMetadata.Any,
            ccSpecific: {
                indicatorId,
                propertyId,
            },
        }), { minVersion: 2 }),
        ...Values_1.V.dynamicPropertyWithName("indicatorDescription", (indicatorId) => indicatorId, ({ property }) => typeof property === "number", undefined, { internal: true, minVersion: 4 }),
    }),
});
/**
 * Looks up the configured metadata for the given indicator and property
 */
function getIndicatorMetadata(configManager, indicatorId, propertyId, overrideIndicatorLabel) {
    const label = overrideIndicatorLabel || configManager.lookupIndicator(indicatorId);
    const prop = configManager.lookupProperty(propertyId);
    const baseMetadata = exports.IndicatorCCValues.valueV2(indicatorId, propertyId).meta;
    if (!label && !prop) {
        return {
            ...baseMetadata,
            ...safe_1.ValueMetadata.UInt8,
        };
    }
    else if (!prop) {
        return {
            ...baseMetadata,
            ...safe_1.ValueMetadata.UInt8,
            label,
        };
    }
    else {
        if (prop.type === "boolean") {
            return {
                ...baseMetadata,
                ...safe_1.ValueMetadata.Boolean,
                label: `${label} - ${prop.label}`,
                description: prop.description,
                readable: !prop.readonly,
            };
        }
        else {
            // UInt8
            return {
                ...baseMetadata,
                ...safe_1.ValueMetadata.UInt8,
                label: `${label} - ${prop.label}`,
                description: prop.description,
                min: prop.min,
                max: prop.max,
                readable: !prop.readonly,
            };
        }
    }
}
function getIndicatorName(configManager, indicatorId) {
    let indicatorName = "0 (default)";
    if (indicatorId) {
        indicatorName = `${(0, safe_2.num2hex)(indicatorId)} (${configManager.lookupIndicator(indicatorId) ?? `Unknown`})`;
    }
    return indicatorName;
}
const MAX_INDICATOR_OBJECTS = 31;
let IndicatorCCAPI = class IndicatorCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, propertyKey }, value) => {
            if (property === "value") {
                // V1 value
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                return this.set(value);
            }
            else if (typeof property === "number" &&
                typeof propertyKey === "number") {
                const indicatorId = property;
                const propertyId = propertyKey;
                const expectedType = getIndicatorMetadata(this.applHost.configManager, indicatorId, propertyId).type;
                // V2+ value
                if (typeof value !== expectedType) {
                    (0, API_1.throwWrongValueType)(this.ccId, property, expectedType, typeof value);
                }
                return this.set([
                    {
                        indicatorId: property,
                        propertyId: propertyKey,
                        value: value,
                    },
                ]);
            }
            else if (property === "identify") {
                if (typeof value !== "boolean") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "boolean", typeof value);
                }
                return this.identify();
            }
            else {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
        this[_b] = async ({ property, }) => {
            if (property === "value")
                return this.get();
            if (typeof property === "number") {
                return this.get(property);
            }
            (0, API_1.throwUnsupportedProperty)(this.ccId, property);
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.IndicatorCommand.Get:
                return this.isSinglecast();
            case _Types_1.IndicatorCommand.Set:
                return true; // This is mandatory
            case _Types_1.IndicatorCommand.SupportedGet:
                return this.version >= 2 && this.isSinglecast();
            case _Types_1.IndicatorCommand.DescriptionGet:
                return this.version >= 4 && this.isSinglecast();
        }
        return super.supportsCommand(cmd);
    }
    async get(indicatorId) {
        __assertType("indicatorId", "(optional) number", __assertType__optional_number.bind(void 0, indicatorId));
        this.assertSupportsCommand(_Types_1.IndicatorCommand, _Types_1.IndicatorCommand.Get);
        const cc = new IndicatorCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            indicatorId,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (!response)
            return;
        if (response.values)
            return response.values;
        return response.value;
    }
    async set(value) {
        __assertType("value", undefined, __assertType__su__number_sa__5_ea_5_5_5_eu.bind(void 0, value));
        this.assertSupportsCommand(_Types_1.IndicatorCommand, _Types_1.IndicatorCommand.Set);
        const cc = new IndicatorCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...(typeof value === "number" ? { value } : { values: value }),
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getSupported(indicatorId) {
        __assertType("indicatorId", "number", __assertType__number.bind(void 0, indicatorId));
        this.assertSupportsCommand(_Types_1.IndicatorCommand, _Types_1.IndicatorCommand.SupportedGet);
        const cc = new IndicatorCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            indicatorId,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return {
                // Include the actual indicator ID if 0x00 was requested
                ...(indicatorId === 0x00
                    ? { indicatorId: response.indicatorId }
                    : undefined),
                supportedProperties: response.supportedProperties,
                nextIndicatorId: response.nextIndicatorId,
            };
        }
    }
    /**
     * Instructs the node to identify itself. Available starting with V3 of this CC.
     */
    async identify() {
        if (this.version < 3) {
            throw new safe_1.ZWaveError(`The identify command is only supported in Version 3 and above`, safe_1.ZWaveErrorCodes.CC_NotSupported);
        }
        return this.set([
            {
                indicatorId: 0x50,
                propertyId: 0x03,
                value: 0x08,
            },
            {
                indicatorId: 0x50,
                propertyId: 0x04,
                value: 0x03,
            },
            {
                indicatorId: 0x50,
                propertyId: 0x05,
                value: 0x06,
            },
        ]);
    }
    async getDescription(indicatorId) {
        __assertType("indicatorId", "number", __assertType__number.bind(void 0, indicatorId));
        this.assertSupportsCommand(_Types_1.IndicatorCommand, _Types_1.IndicatorCommand.DescriptionGet);
        const cc = new IndicatorCCDescriptionGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            indicatorId,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.description;
    }
};
_a = API_1.SET_VALUE, _b = API_1.POLL_VALUE;
IndicatorCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Indicator)
], IndicatorCCAPI);
exports.IndicatorCCAPI = IndicatorCCAPI;
let IndicatorCC = class IndicatorCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Indicator, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        if (this.version > 1) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "scanning supported indicator IDs...",
                direction: "outbound",
            });
            // Query ID 0 to get the first supported ID
            let curId = 0x00;
            const supportedIndicatorIds = [];
            do {
                const supportedResponse = await api.getSupported(curId);
                if (!supportedResponse) {
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: "Time out while scanning supported indicator IDs, skipping interview...",
                        level: "warn",
                    });
                    return;
                }
                supportedIndicatorIds.push(supportedResponse.indicatorId ?? curId);
                curId = supportedResponse.nextIndicatorId;
            } while (curId !== 0x00);
            // The IDs are not stored by the report CCs so store them here once we have all of them
            this.setValue(applHost, exports.IndicatorCCValues.supportedIndicatorIds, supportedIndicatorIds);
            const logMessage = `supported indicator IDs: ${supportedIndicatorIds.join(", ")}`;
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
            if (this.version >= 4) {
                const manufacturerDefinedIndicatorIds = supportedIndicatorIds.filter((id) => isManufacturerDefinedIndicator(id));
                if (manufacturerDefinedIndicatorIds.length > 0) {
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: "retrieving description for manufacturer-defined indicator IDs...",
                        direction: "outbound",
                    });
                    for (const id of manufacturerDefinedIndicatorIds) {
                        await api.getDescription(id);
                    }
                }
            }
        }
        // Query current values
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Indicator, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        if (this.version === 1) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "requesting current indicator value...",
                direction: "outbound",
            });
            await api.get();
        }
        else {
            const supportedIndicatorIds = this.getValue(applHost, exports.IndicatorCCValues.supportedIndicatorIds) ?? [];
            for (const indicatorId of supportedIndicatorIds) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `requesting current indicator value (id = ${(0, safe_2.num2hex)(indicatorId)})...`,
                    direction: "outbound",
                });
                await api.get(indicatorId);
            }
        }
    }
    translatePropertyKey(applHost, property, propertyKey) {
        if (property === "value") {
            // CC version 1 only has a single value that doesn't need to be translated
            return undefined;
        }
        else if (typeof property === "number" &&
            typeof propertyKey === "number") {
            // The indicator property is our property key
            const prop = applHost.configManager.lookupProperty(propertyKey);
            if (prop)
                return prop.label;
        }
        return super.translatePropertyKey(applHost, property, propertyKey);
    }
    translateProperty(applHost, property, propertyKey) {
        if (typeof property === "number" && typeof propertyKey === "number") {
            // The indicator corresponds to our property
            const label = applHost.configManager.lookupIndicator(property);
            if (label)
                return label;
        }
        return super.translateProperty(applHost, property, propertyKey);
    }
    supportsV2Indicators(applHost) {
        // First test if there are any indicator ids defined
        const supportedIndicatorIds = this.getValue(applHost, exports.IndicatorCCValues.supportedIndicatorIds);
        if (!supportedIndicatorIds?.length)
            return false;
        // Then test if there are any property ids defined
        return supportedIndicatorIds.some((indicatorId) => !!this.getValue(applHost, exports.IndicatorCCValues.supportedPropertyIDs(indicatorId))?.length);
    }
};
IndicatorCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Indicator),
    (0, CommandClassDecorators_1.implementedVersion)(4),
    (0, CommandClassDecorators_1.ccValues)(exports.IndicatorCCValues)
], IndicatorCC);
exports.IndicatorCC = IndicatorCC;
let IndicatorCCSet = class IndicatorCCSet extends IndicatorCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (this.version === 1) {
                if (!("value" in options)) {
                    throw new safe_1.ZWaveError(`Node ${this.nodeId} only supports IndicatorCC V1 which requires a single value to be set`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                }
                this.indicator0Value = options.value;
            }
            else {
                if ("value" in options) {
                    this.indicator0Value = options.value;
                }
                else {
                    if (options.values.length > MAX_INDICATOR_OBJECTS) {
                        throw new safe_1.ZWaveError(`Only ${MAX_INDICATOR_OBJECTS} indicator values can be set at a time!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                    }
                    this.values = options.values;
                }
            }
        }
    }
    serialize() {
        if (this.indicator0Value != undefined) {
            this.payload = Buffer.from([this.indicator0Value]);
        }
        else {
            const values = this.values;
            const objCount = values.length & MAX_INDICATOR_OBJECTS;
            const valuesFlat = values
                .slice(0, objCount + 1)
                .map((o) => [
                o.indicatorId,
                o.propertyId,
                typeof o.value === "number"
                    ? o.value
                    : o.value
                        ? 0xff
                        : 0x00,
            ])
                .reduce((acc, cur) => acc.concat(...cur), []);
            this.payload = Buffer.concat([
                Buffer.from([0, objCount]),
                Buffer.from(valuesFlat),
            ]);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {};
        if (this.indicator0Value != undefined) {
            message["indicator 0 value"] = this.indicator0Value;
        }
        if (this.values != undefined) {
            message.values = `${this.values
                .map((v) => `
· indicatorId: ${v.indicatorId}
  propertyId:  ${v.propertyId}
  value:       ${v.value}`)
                .join("")}`;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
IndicatorCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IndicatorCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], IndicatorCCSet);
exports.IndicatorCCSet = IndicatorCCSet;
let IndicatorCCReport = class IndicatorCCReport extends IndicatorCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        const objCount = this.payload.length >= 2 ? this.payload[1] & 0b11111 : 0;
        if (objCount === 0) {
            this.value = this.payload[0];
        }
        else {
            (0, safe_1.validatePayload)(this.payload.length >= 2 + 3 * objCount);
            this.values = [];
            for (let i = 0; i < objCount; i++) {
                const offset = 2 + 3 * i;
                const value = {
                    indicatorId: this.payload[offset],
                    propertyId: this.payload[offset + 1],
                    value: this.payload[offset + 2],
                };
                this.values.push(value);
            }
            // TODO: Think if we want this:
            // // If not all Property IDs are included in the command for the actual Indicator ID,
            // // a controlling node MUST assume non-specified Property IDs values to be 0x00.
            // const indicatorId = this.values[0].indicatorId;
            // const supportedIndicatorProperties =
            // 	valueDB.getValue<number[]>(
            // 		getSupportedPropertyIDsValueID(
            // 			this.endpointIndex,
            // 			indicatorId,
            // 		),
            // 	) ?? [];
            // // Find out which ones are missing
            // const missingIndicatorProperties = supportedIndicatorProperties.filter(
            // 	prop =>
            // 		!this.values!.find(({ propertyId }) => prop === propertyId),
            // );
            // // And assume they are 0 (false)
            // for (const missing of missingIndicatorProperties) {
            // 	this.setIndicatorValue({
            // 		indicatorId,
            // 		propertyId: missing,
            // 		value: 0,
            // 	});
            // }
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        if (this.value != undefined) {
            if (!this.supportsV2Indicators(applHost)) {
                // Publish the value
                const valueV1 = exports.IndicatorCCValues.valueV1;
                this.setMetadata(applHost, valueV1);
                this.setValue(applHost, valueV1, this.value);
            }
            else {
                if (this.isSinglecast()) {
                    // Don't!
                    applHost.controllerLog.logNode(this.nodeId, {
                        message: `ignoring V1 indicator report because the node supports V2 indicators`,
                        direction: "none",
                        endpoint: this.endpointIndex,
                    });
                }
            }
        }
        else if (this.values) {
            for (const value of this.values) {
                this.setIndicatorValue(applHost, value);
            }
        }
        return true;
    }
    setIndicatorValue(applHost, value) {
        // Manufacturer-defined indicators may need a custom label
        const overrideIndicatorLabel = isManufacturerDefinedIndicator(value.indicatorId)
            ? this.getValue(applHost, exports.IndicatorCCValues.indicatorDescription(value.indicatorId))
            : undefined;
        const metadata = getIndicatorMetadata(applHost.configManager, value.indicatorId, value.propertyId, overrideIndicatorLabel);
        // Some values need to be converted
        if (metadata.type === "boolean") {
            value.value = !!value.value;
        }
        // Publish the value
        const valueV2 = exports.IndicatorCCValues.valueV2(value.indicatorId, value.propertyId);
        this.setMetadata(applHost, valueV2, metadata);
        this.setValue(applHost, valueV2, value.value);
    }
    toLogEntry(applHost) {
        const message = {};
        if (this.value != undefined) {
            message["indicator 0 value"] = this.value;
        }
        if (this.values != undefined) {
            message.values = `${this.values
                .map((v) => `
· indicatorId: ${v.indicatorId}
  propertyId:  ${v.propertyId}
  value:       ${v.value}`)
                .join("")}`;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
IndicatorCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IndicatorCommand.Report)
], IndicatorCCReport);
exports.IndicatorCCReport = IndicatorCCReport;
let IndicatorCCGet = class IndicatorCCGet extends IndicatorCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.indicatorId = options.indicatorId;
        }
    }
    serialize() {
        if (this.indicatorId != undefined) {
            this.payload = Buffer.from([this.indicatorId]);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                indicator: getIndicatorName(applHost.configManager, this.indicatorId),
            },
        };
    }
};
IndicatorCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IndicatorCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(IndicatorCCReport)
], IndicatorCCGet);
exports.IndicatorCCGet = IndicatorCCGet;
let IndicatorCCSupportedReport = class IndicatorCCSupportedReport extends IndicatorCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 3);
        this.indicatorId = this.payload[0];
        this.nextIndicatorId = this.payload[1];
        const bitMaskLength = this.payload[2] & 0b11111;
        if (bitMaskLength === 0) {
            this.supportedProperties = [];
        }
        else {
            (0, safe_1.validatePayload)(this.payload.length >= 3 + bitMaskLength);
            // The bit mask starts at 0, but bit 0 is not used
            this.supportedProperties = (0, safe_1.parseBitMask)(this.payload.slice(3, 3 + bitMaskLength), 0).filter((v) => v !== 0);
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        if (this.indicatorId !== 0x00) {
            // Remember which property IDs are supported
            this.setValue(applHost, exports.IndicatorCCValues.supportedPropertyIDs(this.indicatorId), this.supportedProperties);
        }
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                indicator: getIndicatorName(applHost.configManager, this.indicatorId),
                "supported properties": `${this.supportedProperties
                    .map((id) => applHost.configManager.lookupProperty(id)?.label ??
                    `Unknown (${(0, safe_2.num2hex)(id)})`)
                    .join(", ")}`,
                "next indicator": getIndicatorName(applHost.configManager, this.nextIndicatorId),
            },
        };
    }
};
IndicatorCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IndicatorCommand.SupportedReport)
], IndicatorCCSupportedReport);
exports.IndicatorCCSupportedReport = IndicatorCCSupportedReport;
function testResponseForIndicatorSupportedGet(sent, received) {
    return sent.indicatorId === 0 || received.indicatorId === sent.indicatorId;
}
let IndicatorCCSupportedGet = class IndicatorCCSupportedGet extends IndicatorCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.indicatorId = options.indicatorId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.indicatorId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                indicator: getIndicatorName(applHost.configManager, this.indicatorId),
            },
        };
    }
};
IndicatorCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IndicatorCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(IndicatorCCSupportedReport, testResponseForIndicatorSupportedGet)
], IndicatorCCSupportedGet);
exports.IndicatorCCSupportedGet = IndicatorCCSupportedGet;
let IndicatorCCDescriptionReport = class IndicatorCCDescriptionReport extends IndicatorCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.indicatorId = this.payload[0];
        const descrptionLength = this.payload[1];
        (0, safe_1.validatePayload)(this.payload.length >= 2 + descrptionLength);
        this.description = this.payload
            .slice(2, 2 + descrptionLength)
            .toString("utf8");
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        if (this.description) {
            this.setValue(applHost, exports.IndicatorCCValues.indicatorDescription(this.indicatorId), this.description);
        }
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "indicator ID": this.indicatorId,
                description: this.description || "(none)",
            },
        };
    }
};
IndicatorCCDescriptionReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IndicatorCommand.DescriptionReport)
], IndicatorCCDescriptionReport);
exports.IndicatorCCDescriptionReport = IndicatorCCDescriptionReport;
function testResponseForIndicatorDescriptionGet(sent, received) {
    return received.indicatorId === sent.indicatorId;
}
let IndicatorCCDescriptionGet = class IndicatorCCDescriptionGet extends IndicatorCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.indicatorId = this.payload[0];
        }
        else {
            this.indicatorId = options.indicatorId;
            if (!isManufacturerDefinedIndicator(this.indicatorId)) {
                throw new safe_1.ZWaveError("The indicator ID must be between 0x80 and 0x9f", safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
        }
    }
    serialize() {
        this.payload = Buffer.from([this.indicatorId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "indicator ID": this.indicatorId,
            },
        };
    }
};
IndicatorCCDescriptionGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.IndicatorCommand.DescriptionGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(IndicatorCCDescriptionReport, testResponseForIndicatorDescriptionGet)
], IndicatorCCDescriptionGet);
exports.IndicatorCCDescriptionGet = IndicatorCCDescriptionGet;
//# sourceMappingURL=IndicatorCC.js.map