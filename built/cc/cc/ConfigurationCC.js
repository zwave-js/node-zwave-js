"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationCCDefaultReset = exports.ConfigurationCCPropertiesGet = exports.ConfigurationCCPropertiesReport = exports.ConfigurationCCInfoGet = exports.ConfigurationCCInfoReport = exports.ConfigurationCCNameGet = exports.ConfigurationCCNameReport = exports.ConfigurationCCBulkGet = exports.ConfigurationCCBulkReport = exports.ConfigurationCCBulkSet = exports.ConfigurationCCSet = exports.ConfigurationCCGet = exports.ConfigurationCCReport = exports.ConfigurationCC = exports.ConfigurationCCAPI = exports.ConfigurationCCValues = exports.ConfigurationCCError = void 0;
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
const __assertType__optional__0 = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _boolean($o) {
        return typeof $o !== "boolean" ? {} : null;
    }
    function _0($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("valueBitMask" in $o && $o["valueBitMask"] !== undefined) {
            const error = _number($o["valueBitMask"]);
            if (error)
                return error;
        }
        if ("allowUnexpectedResponse" in $o && $o["allowUnexpectedResponse"] !== undefined) {
            const error = _boolean($o["allowUnexpectedResponse"]);
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
const __assertType__sa__2_ea_2 = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _2($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("parameter" in $o && $o["parameter"] !== undefined) {
            const error = _number($o["parameter"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("bitMask" in $o && $o["bitMask"] !== undefined) {
            const error = _number($o["bitMask"]);
            if (error)
                return error;
        }
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
const __assertType__ConfigurationCCAPISetOptions = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _2($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("parameter" in $o && $o["parameter"] !== undefined) {
            const error = _number($o["parameter"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function _undefined($o) {
        return $o !== undefined ? {} : null;
    }
    function _ignore() {
        return null;
    }
    function su__number__11_9_9_9_eu($o) {
        const conditions = [_number, _ignore];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function _3($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("bitMask" in $o && $o["bitMask"] !== undefined) {
            const error = _undefined($o["bitMask"]);
            if (error)
                return error;
        }
        if ("value" in $o && $o["value"] !== undefined) {
            const error = su__number__11_9_9_9_eu($o["value"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function si__2__3_ei($o) {
        const conditions = [_2, _3];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function _13($o) {
        return $o !== 1 ? {} : null;
    }
    function _14($o) {
        return $o !== 2 ? {} : null;
    }
    function _15($o) {
        return $o !== 4 ? {} : null;
    }
    function su__13__14__15_eu($o) {
        const conditions = [_13, _14, _15];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function su__17__18__19__20_eu($o) {
        return ![0, 1, 2, 3].includes($o) ? {} : null;
    }
    function _5($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("bitMask" in $o && $o["bitMask"] !== undefined) {
            const error = _undefined($o["bitMask"]);
            if (error)
                return error;
        }
        if ("value" in $o && $o["value"] !== undefined) {
            const error = su__number__11_9_9_9_eu($o["value"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("valueSize" in $o && $o["valueSize"] !== undefined) {
            const error = su__13__14__15_eu($o["valueSize"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("valueFormat" in $o && $o["valueFormat"] !== undefined) {
            const error = su__17__18__19__20_eu($o["valueFormat"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function si__2__5_ei($o) {
        const conditions = [_2, _5];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function _7($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("bitMask" in $o && $o["bitMask"] !== undefined) {
            const error = _number($o["bitMask"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("value" in $o && $o["value"] !== undefined) {
            const error = _number($o["value"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function si__2__7_ei($o) {
        const conditions = [_2, _7];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function su_si__2__3_ei_si__2__5_ei_si__2__7_ei_eu($o) {
        const conditions = [si__2__3_ei, si__2__5_ei, si__2__7_ei];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su_si__2__3_ei_si__2__5_ei_si__2__7_ei_eu($o);
};
const __assertType__sa_su_si__4__5_ei_si__4__7_ei_si__4__9_ei_eu_ea_2 = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _4($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("parameter" in $o && $o["parameter"] !== undefined) {
            const error = _number($o["parameter"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function _undefined($o) {
        return $o !== undefined ? {} : null;
    }
    function _ignore() {
        return null;
    }
    function su__number__13_11_11_11_eu($o) {
        const conditions = [_number, _ignore];
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
        if ("bitMask" in $o && $o["bitMask"] !== undefined) {
            const error = _undefined($o["bitMask"]);
            if (error)
                return error;
        }
        if ("value" in $o && $o["value"] !== undefined) {
            const error = su__number__13_11_11_11_eu($o["value"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function si__4__5_ei($o) {
        const conditions = [_4, _5];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function _15($o) {
        return $o !== 1 ? {} : null;
    }
    function _16($o) {
        return $o !== 2 ? {} : null;
    }
    function _17($o) {
        return $o !== 4 ? {} : null;
    }
    function su__15__16__17_eu($o) {
        const conditions = [_15, _16, _17];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function su__19__20__21__22_eu($o) {
        return ![0, 1, 2, 3].includes($o) ? {} : null;
    }
    function _7($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("bitMask" in $o && $o["bitMask"] !== undefined) {
            const error = _undefined($o["bitMask"]);
            if (error)
                return error;
        }
        if ("value" in $o && $o["value"] !== undefined) {
            const error = su__number__13_11_11_11_eu($o["value"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("valueSize" in $o && $o["valueSize"] !== undefined) {
            const error = su__15__16__17_eu($o["valueSize"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("valueFormat" in $o && $o["valueFormat"] !== undefined) {
            const error = su__19__20__21__22_eu($o["valueFormat"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function si__4__7_ei($o) {
        const conditions = [_4, _7];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function _9($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("bitMask" in $o && $o["bitMask"] !== undefined) {
            const error = _number($o["bitMask"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("value" in $o && $o["value"] !== undefined) {
            const error = _number($o["value"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function si__4__9_ei($o) {
        const conditions = [_4, _9];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function su_si__4__5_ei_si__4__7_ei_si__4__9_ei_eu($o) {
        const conditions = [si__4__5_ei, si__4__7_ei, si__4__9_ei];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function sa_su_si__4__5_ei_si__4__7_ei_si__4__9_ei_eu_ea_2($o) {
        if (!Array.isArray($o))
            return {};
        for (let i = 0; i < $o.length; i++) {
            const error = su_si__4__5_ei_si__4__7_ei_si__4__9_ei_eu($o[i]);
            if (error)
                return error;
        }
        return null;
    }
    return sa_su_si__4__5_ei_si__4__7_ei_si__4__9_ei_eu_ea_2($o);
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
const arrays_1 = require("alcalzone-shared/arrays");
const objects_1 = require("alcalzone-shared/objects");
const strings_1 = require("alcalzone-shared/strings");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
function configValueToString(value) {
    if (typeof value === "number")
        return value.toString();
    else
        return [...value].join(", ");
}
class ConfigurationCCError extends safe_1.ZWaveError {
    constructor(message, code, argument) {
        super(message, code);
        this.message = message;
        this.code = code;
        this.argument = argument;
        // We need to set the prototype explicitly
        Object.setPrototypeOf(this, ConfigurationCCError.prototype);
    }
}
exports.ConfigurationCCError = ConfigurationCCError;
exports.ConfigurationCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses.Configuration, {
        ...Values_1.V.staticProperty("isParamInformationFromConfig", undefined, // meta
        { internal: true, supportsEndpoints: false }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses.Configuration, {
        ...Values_1.V.dynamicPropertyAndKeyWithName("paramInformation", 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (parameter, bitMask) => parameter, (parameter, bitMask) => bitMask, ({ property, propertyKey }) => typeof property === "number" &&
            (typeof propertyKey === "number" || propertyKey == undefined), 
        // Metadata is determined dynamically depending on other factors
        undefined, { supportsEndpoints: false }),
    }),
});
function createConfigurationCCInstance(applHost, endpoint) {
    return CommandClass_1.CommandClass.createInstanceUnchecked(applHost, endpoint.virtual ? endpoint.node.physicalNodes[0] : endpoint, ConfigurationCC);
}
function normalizeConfigurationCCAPISetOptions(applHost, endpoint, options) {
    if ("bitMask" in options && options.bitMask) {
        // Variant 3: Partial param, look it up in the device config
        const ccc = createConfigurationCCInstance(applHost, endpoint);
        const paramInfo = ccc.getParamInformation(applHost, options.parameter, options.bitMask);
        if (!paramInfo.isFromConfig) {
            throw new safe_1.ZWaveError("Setting a partial configuration parameter requires it to be defined in a device config file!", safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        return {
            parameter: options.parameter,
            bitMask: options.bitMask,
            value: options.value,
            valueSize: paramInfo.valueSize,
            valueFormat: paramInfo.format,
        };
    }
    else if ("valueSize" in options) {
        // Variant 2: Normal parameter, not defined in a config file
        return (0, safe_2.pick)(options, [
            "parameter",
            "value",
            "valueSize",
            "valueFormat",
        ]);
    }
    else {
        // Variant 1: Normal parameter, defined in a config file
        const ccc = createConfigurationCCInstance(applHost, endpoint);
        const paramInfo = ccc.getParamInformation(applHost, options.parameter, options.bitMask);
        if (!paramInfo.isFromConfig) {
            throw new safe_1.ZWaveError("Setting a configuration parameter without specifying a value size and format requires it to be defined in a device config file!", safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        return {
            parameter: options.parameter,
            value: options.value,
            valueSize: paramInfo.valueSize,
            valueFormat: paramInfo.format,
        };
    }
}
function bulkMergePartialParamValues(applHost, endpoint, options) {
    // Merge partial parameters before doing anything else. Therefore, take the non-partials, ...
    const allParams = options.filter((o) => o.bitMask == undefined);
    // ... group the partials by parameter
    const unmergedPartials = new Map();
    for (const partial of options.filter((o) => o.bitMask != undefined)) {
        if (!unmergedPartials.has(partial.parameter)) {
            unmergedPartials.set(partial.parameter, []);
        }
        unmergedPartials.get(partial.parameter).push(partial);
    }
    // and push the merged result into the array we'll be working with
    if (unmergedPartials.size) {
        const ccc = createConfigurationCCInstance(applHost, endpoint);
        for (const [parameter, partials] of unmergedPartials) {
            allParams.push({
                parameter,
                value: ccc.composePartialParamValues(applHost, parameter, partials.map((p) => ({
                    bitMask: p.bitMask,
                    partialValue: p.value,
                }))),
                valueSize: partials[0].valueSize,
                valueFormat: partials[0].valueFormat,
            });
        }
    }
    return allParams;
}
/** Determines whether a partial parameter needs to be interpreted as signed */
function isSignedPartial(bitMask, format) {
    // Only treat partial params as signed if they span more than 1 bit.
    // Otherwise we cannot model 0/1 properly.
    return ((0, safe_1.getBitMaskWidth)(bitMask) > 1 &&
        (format ?? safe_1.ConfigValueFormat.SignedInteger) ===
            safe_1.ConfigValueFormat.SignedInteger);
}
function reInterpretSignedValue(value, valueSize, targetFormat) {
    // Re-interpret the value with the new format
    const raw = Buffer.allocUnsafe(valueSize);
    serializeValue(raw, 0, valueSize, safe_1.ConfigValueFormat.SignedInteger, value);
    return parseValue(raw, valueSize, targetFormat);
}
let ConfigurationCCAPI = class ConfigurationCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, propertyKey }, value) => {
            // Config parameters are addressed with numeric properties/keys
            if (typeof property !== "number") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (propertyKey != undefined && typeof propertyKey !== "number") {
                (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
            }
            if (typeof value !== "number") {
                (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
            }
            let ccInstance;
            const applHost = this.applHost;
            if (this.isSinglecast()) {
                ccInstance = createConfigurationCCInstance(this.applHost, this.endpoint);
            }
            else if (this.isMulticast()) {
                // Multicast is only possible if the parameter definition is the same on all target nodes
                const nodes = this.endpoint.node.physicalNodes;
                if (!nodes.every((node) => node
                    .getEndpoint(this.endpoint.index)
                    ?.supportsCC(safe_1.CommandClasses.Configuration))) {
                    throw new safe_1.ZWaveError(`The multicast setValue API for Configuration CC requires all virtual target endpoints to support Configuration CC!`, safe_1.ZWaveErrorCodes.CC_Invalid);
                }
                // Figure out if all the relevant info is the same
                const paramInfos = this.endpoint.node.physicalNodes.map((node) => createConfigurationCCInstance(this.applHost, node.getEndpoint(this.endpoint.index)).getParamInformation(this.applHost, property, propertyKey));
                if (!paramInfos.length ||
                    !paramInfos.every((info, index) => {
                        if (index === 0)
                            return true;
                        return (info.valueSize === paramInfos[0].valueSize &&
                            info.format === paramInfos[0].format);
                    })) {
                    throw new safe_1.ZWaveError(`The multicast setValue API for Configuration CC requires all virtual target nodes to have the same parameter definition!`, safe_1.ZWaveErrorCodes.CC_Invalid);
                }
                // If it is, just use the first node to create the CC instance
                ccInstance = createConfigurationCCInstance(this.applHost, this.endpoint);
            }
            else {
                throw new safe_1.ZWaveError(`The setValue API for Configuration CC is not supported via broadcast!`, safe_1.ZWaveErrorCodes.CC_NotSupported);
            }
            let { valueSize, format: valueFormat = safe_1.ConfigValueFormat.SignedInteger, } = ccInstance.getParamInformation(applHost, property);
            let targetValue;
            if (propertyKey) {
                // This is a partial value, we need to update some bits only
                // Find out the correct value size
                if (!valueSize) {
                    valueSize = ccInstance.getParamInformation(applHost, property, propertyKey).valueSize;
                }
                // Add the target value to the remaining partial values
                targetValue = ccInstance.composePartialParamValue(applHost, property, propertyKey, value);
                // Partial parameters are internally converted to unsigned values - update the valueFormat accordingly
                valueFormat = safe_1.ConfigValueFormat.UnsignedInteger;
            }
            else {
                targetValue = value;
            }
            if (!valueSize) {
                // If there's no value size configured, figure out a matching value size
                valueSize = (0, safe_1.getMinIntegerSize)(targetValue, valueFormat === safe_1.ConfigValueFormat.SignedInteger);
                // Throw if the value is too large or too small
                if (!valueSize) {
                    throw new safe_1.ZWaveError(`The value ${targetValue} is not valid for configuration parameters!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                }
            }
            // Make sure that the given value fits into the value size
            if (!isSafeValue(targetValue, valueSize, valueFormat)) {
                // If there is a value size configured, check that the given value is compatible
                throwInvalidValueError(targetValue, property, valueSize, valueFormat);
            }
            const result = await this.set({
                parameter: property,
                value: targetValue,
                valueSize: valueSize,
                valueFormat,
            });
            if (!(0, safe_1.supervisedCommandSucceeded)(result) &&
                this.isSinglecast()) {
                // Verify the current value after a delay, unless the command was supervised and successful
                this.schedulePoll({ property, propertyKey }, targetValue, 
                // Configuration changes are instant
                { transition: "fast" });
            }
            return result;
        };
        this[_b] = async ({ property, propertyKey, }) => {
            // Config parameters are addressed with numeric properties/keys
            if (typeof property !== "number") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (propertyKey != undefined && typeof propertyKey !== "number") {
                (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
            }
            return this.get(property, { valueBitMask: propertyKey });
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.ConfigurationCommand.Get:
            case _Types_1.ConfigurationCommand.Set:
                return true; // This is mandatory
            case _Types_1.ConfigurationCommand.BulkGet:
            case _Types_1.ConfigurationCommand.BulkSet:
                return this.version >= 2;
            case _Types_1.ConfigurationCommand.NameGet:
            case _Types_1.ConfigurationCommand.InfoGet:
            case _Types_1.ConfigurationCommand.PropertiesGet:
                return this.version >= 3;
            case _Types_1.ConfigurationCommand.DefaultReset:
                return this.version >= 4;
        }
        return super.supportsCommand(cmd);
    }
    /**
     * Requests the current value of a given config parameter from the device.
     * This may timeout and return `undefined` if the node does not respond.
     * If the node replied with a different parameter number, a `ConfigurationCCError`
     * is thrown with the `argument` property set to the reported parameter number.
     */
    async get(parameter, options) {
        __assertType("parameter", "number", __assertType__number.bind(void 0, parameter));
        __assertType("options", undefined, __assertType__optional__0.bind(void 0, options));
        // Get-type commands are only possible in singlecast
        this.assertPhysicalEndpoint(this.endpoint);
        this.assertSupportsCommand(_Types_1.ConfigurationCommand, _Types_1.ConfigurationCommand.Get);
        const { valueBitMask, allowUnexpectedResponse } = options ?? {};
        const cc = new ConfigurationCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            // Don't set an endpoint here, Configuration is device specific, not endpoint specific
            parameter,
            allowUnexpectedResponse,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (!response)
            return;
        // Nodes may respond with a different parameter, e.g. if we
        // requested a non-existing one
        if (response.parameter === parameter) {
            if (!valueBitMask)
                return response.value;
            // If a partial parameter was requested, extract that value
            const paramInfo = cc.getParamInformation(this.applHost, response.parameter, valueBitMask);
            return (0, safe_1.parsePartial)(response.value, valueBitMask, isSignedPartial(valueBitMask, paramInfo.format));
        }
        this.applHost.controllerLog.logNode(this.endpoint.nodeId, {
            message: `Received unexpected ConfigurationReport (param = ${response.parameter}, value = ${response.value.toString()})`,
            direction: "inbound",
            level: "error",
        });
        throw new ConfigurationCCError(`The first existing parameter on this node is ${response.parameter}`, safe_1.ZWaveErrorCodes.ConfigurationCC_FirstParameterNumber, response.parameter);
    }
    /**
     * Requests the current value of the config parameters from the device.
     * When the node does not respond due to a timeout, the `value` in the returned array will be `undefined`.
     */
    async getBulk(options) {
        __assertType("options", undefined, __assertType__sa__2_ea_2.bind(void 0, options));
        // Get-type commands are only possible in singlecast
        this.assertPhysicalEndpoint(this.endpoint);
        let values;
        // If the parameters are consecutive, we may use BulkGet
        const distinctParameters = (0, arrays_1.distinct)(options.map((o) => o.parameter));
        if (this.supportsCommand(_Types_1.ConfigurationCommand.BulkGet) &&
            (0, safe_1.isConsecutiveArray)(distinctParameters)) {
            const cc = new ConfigurationCCBulkGet(this.applHost, {
                nodeId: this.endpoint.nodeId,
                // Don't set an endpoint here, Configuration is device specific, not endpoint specific
                parameters: distinctParameters,
            });
            const response = await this.applHost.sendCommand(cc, this.commandOptions);
            if (response)
                values = response.values;
        }
        else {
            this.assertSupportsCommand(_Types_1.ConfigurationCommand, _Types_1.ConfigurationCommand.Get);
            const _values = new Map();
            for (const parameter of distinctParameters) {
                const cc = new ConfigurationCCGet(this.applHost, {
                    nodeId: this.endpoint.nodeId,
                    // Don't set an endpoint here, Configuration is device specific, not endpoint specific
                    parameter,
                });
                const response = await this.applHost.sendCommand(cc, this.commandOptions);
                if (response) {
                    _values.set(response.parameter, response.value);
                }
            }
            values = _values;
        }
        // Combine the returned values with the requested ones
        const cc = createConfigurationCCInstance(this.applHost, this.endpoint);
        return options.map((o) => {
            let value = values.get(o.parameter);
            if (typeof value === "number" && o.bitMask) {
                const paramInfo = cc.getParamInformation(this.applHost, o.parameter, o.bitMask);
                value = (0, safe_1.parsePartial)(value, o.bitMask, isSignedPartial(o.bitMask, paramInfo.format));
            }
            return { ...o, value };
        });
    }
    /**
     * Sets a new value for a given config parameter of the device.
     */
    async set(options) {
        __assertType("options", "ConfigurationCCAPISetOptions", __assertType__ConfigurationCCAPISetOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.ConfigurationCommand, _Types_1.ConfigurationCommand.Set);
        const normalized = normalizeConfigurationCCAPISetOptions(this.applHost, this.endpoint, options);
        let value = normalized.value;
        if (normalized.bitMask) {
            const ccc = createConfigurationCCInstance(this.applHost, this.endpoint);
            value = ccc.composePartialParamValue(this.applHost, normalized.parameter, normalized.bitMask, normalized.value);
        }
        const cc = new ConfigurationCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            // Don't set an endpoint here, Configuration is device specific, not endpoint specific
            resetToDefault: false,
            parameter: normalized.parameter,
            value,
            valueSize: normalized.valueSize,
            valueFormat: normalized.valueFormat,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    /**
     * Sets new values for multiple config parameters of the device. Uses the `BulkSet` command if supported, otherwise falls back to individual `Set` commands.
     */
    async setBulk(values) {
        __assertType("values", undefined, __assertType__sa_su_si__4__5_ei_si__4__7_ei_si__4__9_ei_eu_ea_2.bind(void 0, values));
        // Normalize the values so we can better work with them
        const normalized = values.map((v) => normalizeConfigurationCCAPISetOptions(this.applHost, this.endpoint, v));
        // And merge multiple partials that belong the same "full" value
        const allParams = bulkMergePartialParamValues(this.applHost, this.endpoint, normalized);
        const canUseBulkSet = this.supportsCommand(_Types_1.ConfigurationCommand.BulkSet) &&
            // For Bulk Set we need consecutive parameters
            (0, safe_1.isConsecutiveArray)(allParams.map((v) => v.parameter)) &&
            // and identical format
            new Set(allParams.map((v) => v.valueFormat)).size === 1 &&
            // and identical size
            new Set(allParams.map((v) => v.valueSize)).size === 1;
        if (canUseBulkSet) {
            const cc = new ConfigurationCCBulkSet(this.applHost, {
                nodeId: this.endpoint.nodeId,
                // Don't set an endpoint here, Configuration is device specific, not endpoint specific
                parameters: allParams.map((v) => v.parameter),
                valueSize: allParams[0].valueSize,
                valueFormat: allParams[0].valueFormat,
                values: allParams.map((v) => v.value),
                handshake: true,
            });
            return this.applHost.sendCommand(cc, this.commandOptions);
        }
        else {
            this.assertSupportsCommand(_Types_1.ConfigurationCommand, _Types_1.ConfigurationCommand.Set);
            for (const { parameter, value, valueSize, valueFormat, } of allParams) {
                const cc = new ConfigurationCCSet(this.applHost, {
                    nodeId: this.endpoint.nodeId,
                    // Don't set an endpoint here, Configuration is device specific, not endpoint specific
                    parameter,
                    value,
                    valueSize,
                    valueFormat,
                });
                // TODO: handle intermediate errors
                await this.applHost.sendCommand(cc, this.commandOptions);
            }
        }
    }
    /**
     * Resets a configuration parameter to its default value.
     *
     * WARNING: This will throw on legacy devices (ConfigurationCC v3 and below)
     */
    async reset(parameter) {
        __assertType("parameter", "number", __assertType__number.bind(void 0, parameter));
        this.assertSupportsCommand(_Types_1.ConfigurationCommand, _Types_1.ConfigurationCommand.Set);
        const cc = new ConfigurationCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            // Don't set an endpoint here, Configuration is device specific, not endpoint specific
            parameter,
            resetToDefault: true,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    /**
     * Resets multiple configuration parameters to their default value. Uses BulkSet if supported, otherwise falls back to individual Set commands.
     *
     * WARNING: This will throw on legacy devices (ConfigurationCC v3 and below)
     */
    async resetBulk(parameters) {
        __assertType("parameters", undefined, __assertType__sa__number_ea_2.bind(void 0, parameters));
        if ((0, safe_1.isConsecutiveArray)(parameters) &&
            this.supportsCommand(_Types_1.ConfigurationCommand.BulkSet)) {
            const cc = new ConfigurationCCBulkSet(this.applHost, {
                nodeId: this.endpoint.nodeId,
                // Don't set an endpoint here, Configuration is device specific, not endpoint specific
                parameters,
                resetToDefault: true,
            });
            await this.applHost.sendCommand(cc, this.commandOptions);
        }
        else {
            this.assertSupportsCommand(_Types_1.ConfigurationCommand, _Types_1.ConfigurationCommand.Set);
            const CCs = (0, arrays_1.distinct)(parameters).map((parameter) => new ConfigurationCCSet(this.applHost, {
                nodeId: this.endpoint.nodeId,
                // Don't set an endpoint here, Configuration is device specific, not endpoint specific
                parameter,
                resetToDefault: true,
            }));
            for (const cc of CCs) {
                await this.applHost.sendCommand(cc, this.commandOptions);
            }
        }
    }
    /** Resets all configuration parameters to their default value */
    async resetAll() {
        // This is dangerous - don't allow resetting all parameters via multicast
        this.assertPhysicalEndpoint(this.endpoint);
        this.assertSupportsCommand(_Types_1.ConfigurationCommand, _Types_1.ConfigurationCommand.DefaultReset);
        const cc = new ConfigurationCCDefaultReset(this.applHost, {
            nodeId: this.endpoint.nodeId,
            // Don't set an endpoint here, Configuration is device specific, not endpoint specific
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getProperties(parameter) {
        __assertType("parameter", "number", __assertType__number.bind(void 0, parameter));
        // Get-type commands are only possible in singlecast
        this.assertPhysicalEndpoint(this.endpoint);
        const cc = new ConfigurationCCPropertiesGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            // Don't set an endpoint here, Configuration is device specific, not endpoint specific
            parameter,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "valueSize",
                "valueFormat",
                "minValue",
                "maxValue",
                "defaultValue",
                "nextParameter",
                "altersCapabilities",
                "isReadonly",
                "isAdvanced",
                "noBulkSupport",
            ]);
        }
    }
    /** Requests the name of a configuration parameter from the node */
    async getName(parameter) {
        __assertType("parameter", "number", __assertType__number.bind(void 0, parameter));
        // Get-type commands are only possible in singlecast
        this.assertPhysicalEndpoint(this.endpoint);
        const cc = new ConfigurationCCNameGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            // Don't set an endpoint here, Configuration is device specific, not endpoint specific
            parameter,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.name;
    }
    /** Requests usage info for a configuration parameter from the node */
    async getInfo(parameter) {
        __assertType("parameter", "number", __assertType__number.bind(void 0, parameter));
        // Get-type commands are only possible in singlecast
        this.assertPhysicalEndpoint(this.endpoint);
        const cc = new ConfigurationCCInfoGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            // Don't set an endpoint here, Configuration is device specific, not endpoint specific
            parameter,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.info;
    }
    /**
     * This scans the node for the existing parameters. Found parameters will be reported
     * through the `value added` and `value updated` events.
     *
     * WARNING: This method throws for newer devices.
     *
     * WARNING: On nodes implementing V1 and V2, this process may take
     * **up to an hour**, depending on the configured timeout.
     *
     * WARNING: On nodes implementing V2, all parameters after 255 will be ignored.
     */
    async scanParametersLegacy() {
        if (this.version >= 3) {
            throw new safe_1.ZWaveError("Use ConfigurationCC.interview instead of scanning parameters for versions 3 and above.", safe_1.ZWaveErrorCodes.ConfigurationCC_NoLegacyScanOnNewDevices);
        }
        // Get-type commands are only possible in singlecast
        this.assertPhysicalEndpoint(this.endpoint);
        // TODO: Reduce the priority of the messages
        this.applHost.controllerLog.logNode(this.endpoint.nodeId, `Scanning available parameters...`);
        const ccInstance = createConfigurationCCInstance(this.applHost, this.endpoint);
        for (let param = 1; param <= 255; param++) {
            // Check if the parameter is readable
            let originalValue;
            this.applHost.controllerLog.logNode(this.endpoint.nodeId, {
                message: `  trying param ${param}...`,
                direction: "outbound",
            });
            try {
                originalValue = await this.get(param, {
                    // When requesting a non-existing parameter, a node SHOULD respond with the
                    // first available parameter. We use this for the first param only,
                    // because delayed responses might otherwise confuse the interview process
                    allowUnexpectedResponse: param === 1,
                });
                if (originalValue != undefined) {
                    const logMessage = `  Param ${param}:
    readable  = true
    valueSize = ${ccInstance.getParamInformation(this.applHost, param).valueSize}
    value     = ${originalValue.toString()}`;
                    this.applHost.controllerLog.logNode(this.endpoint.nodeId, {
                        message: logMessage,
                        direction: "inbound",
                    });
                }
            }
            catch (e) {
                if (e instanceof ConfigurationCCError &&
                    e.code ===
                        safe_1.ZWaveErrorCodes.ConfigurationCC_FirstParameterNumber) {
                    // Continue iterating with the next param
                    if (e.argument - 1 > param)
                        param = e.argument - 1;
                    continue;
                }
                throw e;
            }
        }
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
ConfigurationCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Configuration)
], ConfigurationCCAPI);
exports.ConfigurationCCAPI = ConfigurationCCAPI;
let ConfigurationCC = class ConfigurationCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Configuration, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        const deviceConfig = applHost.getDeviceConfig?.(node.id);
        const paramInfo = deviceConfig?.paramInformation;
        if (paramInfo) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `${this.constructor.name}: Loading configuration parameters from device config`,
                direction: "none",
            });
            this.deserializeParamInformationFromConfig(applHost, paramInfo);
        }
        if (this.version >= 3) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "finding first configuration parameter...",
                direction: "outbound",
            });
            const param0props = await api.getProperties(0);
            let param;
            if (param0props) {
                param = param0props.nextParameter;
                if (param === 0) {
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: `didn't report any config params, trying #1 just to be sure...`,
                        direction: "inbound",
                    });
                    param = 1;
                }
            }
            else {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: "Finding first configuration parameter timed out, skipping interview...",
                    level: "warn",
                });
                return;
            }
            while (param > 0) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `querying parameter #${param} information...`,
                    direction: "outbound",
                });
                // Query properties and the next param
                const props = await api.getProperties(param);
                if (!props) {
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: `Querying parameter #${param} information timed out, skipping interview...`,
                        level: "warn",
                    });
                    return;
                }
                const { nextParameter, ...properties } = props;
                let logMessage;
                if (properties.valueSize === 0) {
                    logMessage = `Parameter #${param} is unsupported. Next parameter: ${nextParameter}`;
                }
                else {
                    // Query name and info only if the parameter is supported, but skip the query for bugged devices
                    let name;
                    if (!deviceConfig?.compat?.skipConfigurationNameQuery) {
                        name = await api.getName(param);
                    }
                    // Skip the info query for bugged devices
                    if (!deviceConfig?.compat?.skipConfigurationInfoQuery) {
                        await api.getInfo(param);
                    }
                    logMessage = `received information for parameter #${param}:`;
                    if (name) {
                        logMessage += `
parameter name:      ${name}`;
                    }
                    logMessage += `
value format:        ${(0, safe_2.getEnumMemberName)(safe_1.ConfigValueFormat, properties.valueFormat)}
value size:          ${properties.valueSize} bytes
min value:           ${properties.minValue?.toString() ?? "undefined"}
max value:           ${properties.maxValue?.toString() ?? "undefined"}
default value:       ${properties.defaultValue?.toString() ?? "undefined"}
is read-only:        ${!!properties.isReadonly}
is advanced (UI):    ${!!properties.isAdvanced}
has bulk support:    ${!properties.noBulkSupport}
alters capabilities: ${!!properties.altersCapabilities}`;
                }
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
                // Some devices report their parameter 1 instead of 0 as the next one
                // when reaching the end. To avoid infinite loops, stop scanning
                // once the next parameter is lower than the current one
                if (nextParameter > param) {
                    param = nextParameter;
                }
                else {
                    break;
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
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Configuration, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        if (this.version < 3) {
            // V1/V2: Query all values defined in the config file
            const paramInfo = applHost.getDeviceConfig?.(node.id)?.paramInformation;
            if (paramInfo?.size) {
                // Because partial params share the same parameter number,
                // we need to remember which ones we have already queried.
                const alreadyQueried = new Set();
                for (const param of paramInfo.keys()) {
                    // No need to query writeonly params
                    if (paramInfo.get(param)?.writeOnly)
                        continue;
                    // Don't double-query params
                    if (alreadyQueried.has(param.parameter))
                        continue;
                    alreadyQueried.add(param.parameter);
                    // Query the current value
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: `querying parameter #${param.parameter} value...`,
                        direction: "outbound",
                    });
                    // ... at least try to
                    const paramValue = await api.get(param.parameter);
                    if (typeof paramValue === "number") {
                        applHost.controllerLog.logNode(node.id, {
                            endpoint: this.endpointIndex,
                            message: `parameter #${param.parameter} has value: ${paramValue}`,
                            direction: "inbound",
                        });
                    }
                    else if (!paramValue) {
                        applHost.controllerLog.logNode(node.id, {
                            endpoint: this.endpointIndex,
                            message: `received no value for parameter #${param.parameter}`,
                            direction: "inbound",
                            level: "warn",
                        });
                    }
                }
            }
            else {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `${this.constructor.name}: skipping interview because CC version is < 3 and there is no config file`,
                    direction: "none",
                });
            }
        }
        else {
            // V3+: Query the values of discovered parameters
            const parameters = (0, arrays_1.distinct)(this.getDefinedValueIDs(applHost)
                .map((v) => v.property)
                .filter((p) => typeof p === "number"));
            for (const param of parameters) {
                if (this.getParamInformation(applHost, param).readable !== false) {
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: `querying parameter #${param} value...`,
                        direction: "outbound",
                    });
                    await api.get(param);
                }
                else {
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: `not querying parameter #${param} value, because it is writeonly`,
                        direction: "none",
                    });
                }
            }
        }
    }
    /**
     * Whether this node's param information was loaded from a config file.
     * If this is true, we don't trust what the node reports
     */
    isParamInformationFromConfig(applHost) {
        return (this.getValue(applHost, exports.ConfigurationCCValues.isParamInformationFromConfig) === true);
    }
    /**
     * @internal
     * Stores config parameter metadata for this CC's node
     */
    extendParamInformation(applHost, parameter, valueBitMask, info) {
        // Don't trust param information that a node reports if we have already loaded it from a config file
        if (this.isParamInformationFromConfig(applHost))
            return;
        const valueDB = this.getValueDB(applHost);
        const valueId = exports.ConfigurationCCValues.paramInformation(parameter, valueBitMask).id;
        // Retrieve the base metadata
        const metadata = this.getParamInformation(applHost, parameter, valueBitMask);
        // Override it with new data
        Object.assign(metadata, info);
        // And store it back
        valueDB.setMetadata(valueId, metadata);
    }
    /**
     * @internal
     * Returns stored config parameter metadata for this CC's node
     */
    getParamInformation(applHost, parameter, valueBitMask) {
        return (this.getMetadata(applHost, exports.ConfigurationCCValues.paramInformation(parameter, valueBitMask)) ?? {
            ...safe_1.ValueMetadata.Any,
        });
    }
    /**
     * **INTERNAL:** Returns the param info that was queried for this node. This returns the information that was returned by the node
     * and does not include partial parameters.
     */
    getQueriedParamInfos(applHost) {
        const parameters = (0, arrays_1.distinct)(this.getDefinedValueIDs(applHost)
            .map((v) => v.property)
            .filter((p) => typeof p === "number"));
        return (0, objects_1.composeObject)(parameters.map((p) => [
            p,
            this.getParamInformation(applHost, p),
        ]));
    }
    /**
     * Returns stored config parameter metadata for all partial config params addressed with the given parameter number
     */
    getPartialParamInfos(applHost, parameter) {
        const valueDB = this.getValueDB(applHost);
        return valueDB.findMetadata((id) => id.commandClass === this.ccId &&
            id.property === parameter &&
            id.propertyKey != undefined);
    }
    /**
     * Computes the full value of a parameter after applying a partial param value
     */
    composePartialParamValue(applHost, parameter, bitMask, partialValue) {
        return this.composePartialParamValues(applHost, parameter, [
            { bitMask, partialValue },
        ]);
    }
    /**
     * Computes the full value of a parameter after applying multiple partial param values
     */
    composePartialParamValues(applHost, parameter, partials) {
        const valueDB = this.getValueDB(applHost);
        // Add the other values together
        const otherValues = valueDB.findValues((id) => id.commandClass === this.ccId &&
            id.property === parameter &&
            id.propertyKey != undefined &&
            !partials.some((p) => id.propertyKey === p.bitMask));
        let ret = 0;
        for (const { propertyKey: bitMask, value: partialValue, } of otherValues) {
            ret = (0, safe_1.encodePartial)(ret, partialValue, bitMask);
        }
        for (const { bitMask, partialValue } of partials) {
            ret = (0, safe_1.encodePartial)(ret, partialValue, bitMask);
        }
        return ret;
    }
    /** Deserializes the config parameter info from a config file */
    deserializeParamInformationFromConfig(applHost, config) {
        const valueDB = this.getValueDB(applHost);
        // Clear old param information
        for (const meta of valueDB.getAllMetadata(this.ccId)) {
            if (typeof meta.property === "number") {
                // this is a param information, delete it
                valueDB.setMetadata(meta, undefined, 
                // Don't emit the added/updated events, as this will spam applications with untranslated events
                { noEvent: true });
            }
        }
        // Allow overwriting the param info (mark it as unloaded)
        this.setValue(applHost, exports.ConfigurationCCValues.isParamInformationFromConfig, false);
        for (const [param, info] of config.entries()) {
            // We need to make the config information compatible with the
            // format that ConfigurationCC reports
            const paramInfo = (0, safe_1.stripUndefined)({
                // TODO: Make this smarter! (0...1 ==> boolean)
                type: "number",
                valueSize: info.valueSize,
                min: info.minValue,
                max: info.maxValue,
                default: info.defaultValue,
                unit: info.unit,
                format: info.unsigned
                    ? safe_1.ConfigValueFormat.UnsignedInteger
                    : safe_1.ConfigValueFormat.SignedInteger,
                readable: !info.writeOnly,
                writeable: !info.readOnly,
                allowManualEntry: info.allowManualEntry,
                states: info.options.length > 0
                    ? (0, objects_1.composeObject)(info.options.map(({ label, value }) => [
                        value.toString(),
                        label,
                    ]))
                    : undefined,
                label: info.label,
                description: info.description,
                isFromConfig: true,
            });
            this.extendParamInformation(applHost, param.parameter, param.valueBitMask, paramInfo);
        }
        // Remember that we loaded the param information from a config file
        this.setValue(applHost, exports.ConfigurationCCValues.isParamInformationFromConfig, true);
    }
    translatePropertyKey(applHost, property, propertyKey) {
        if (typeof property === "number" &&
            (propertyKey == undefined || typeof propertyKey === "number")) {
            // This CC names all configuration parameters differently,
            // so no name for the property key is required
            return undefined;
        }
        return super.translateProperty(applHost, property, propertyKey);
    }
    translateProperty(applHost, property, propertyKey) {
        // Try to retrieve the configured param label
        if (typeof property === "number" &&
            (propertyKey == undefined || typeof propertyKey === "number")) {
            const paramInfo = this.getParamInformation(applHost, property, propertyKey);
            if (paramInfo.label)
                return paramInfo.label;
            // fall back to paramXYZ[_key] if none is defined
            let ret = `param${(0, strings_1.padStart)(property.toString(), 3, "0")}`;
            if (propertyKey != undefined) {
                ret += "_" + propertyKey.toString();
            }
            return ret;
        }
        return super.translateProperty(applHost, property, propertyKey);
    }
};
ConfigurationCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Configuration),
    (0, CommandClassDecorators_1.implementedVersion)(4),
    (0, CommandClassDecorators_1.ccValues)(exports.ConfigurationCCValues)
], ConfigurationCC);
exports.ConfigurationCC = ConfigurationCC;
let ConfigurationCCReport = class ConfigurationCCReport extends ConfigurationCC {
    constructor(host, options) {
        super(host, options);
        // All fields must be present
        (0, safe_1.validatePayload)(this.payload.length > 2);
        this._parameter = this.payload[0];
        this._valueSize = this.payload[1] & 0b111;
        // Ensure we received a valid report
        (0, safe_1.validatePayload)(this._valueSize >= 1, this._valueSize <= 4, this.payload.length >= 2 + this._valueSize);
        // Default to parsing the value as SignedInteger, like the specs say.
        // We try to re-interpret the value in persistValues()
        this._value = parseValue(this.payload.slice(2), this._valueSize, safe_1.ConfigValueFormat.SignedInteger);
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        const valueDB = this.getValueDB(applHost);
        // Check if the initial assumption of SignedInteger holds true
        const oldParamInformation = this.getParamInformation(applHost, this._parameter);
        if (oldParamInformation.format != undefined &&
            oldParamInformation.format !== safe_1.ConfigValueFormat.SignedInteger) {
            // Re-interpret the value with the new format
            this._value = reInterpretSignedValue(this._value, this._valueSize, oldParamInformation.format);
        }
        // Store the parameter size and value
        this.extendParamInformation(applHost, this._parameter, undefined, {
            valueSize: this._valueSize,
            type: oldParamInformation.format === safe_1.ConfigValueFormat.BitField
                ? "number[]"
                : "number",
        });
        if (this.version < 3 &&
            !this.isParamInformationFromConfig &&
            oldParamInformation.min == undefined &&
            oldParamInformation.max == undefined) {
            const isSigned = oldParamInformation.format == undefined ||
                oldParamInformation.format === safe_1.ConfigValueFormat.SignedInteger;
            this.extendParamInformation(applHost, this._parameter, undefined, (0, safe_1.getIntegerLimits)(this._valueSize, isSigned));
        }
        // And store the value itself
        // If we have partial config params defined, we need to split the value
        const partialParams = this.getPartialParamInfos(applHost, this._parameter);
        if (partialParams.length > 0) {
            for (const param of partialParams) {
                if (typeof param.propertyKey === "number") {
                    valueDB.setValue({
                        commandClass: this.ccId,
                        property: this._parameter,
                        propertyKey: param.propertyKey,
                    }, (0, safe_1.parsePartial)(this._value, param.propertyKey, isSignedPartial(param.propertyKey, param.metadata.format)));
                }
            }
        }
        else {
            // This is a single param
            valueDB.setValue({
                commandClass: this.ccId,
                property: this._parameter,
            }, this._value);
        }
        return true;
    }
    get parameter() {
        return this._parameter;
    }
    get value() {
        return this._value;
    }
    get valueSize() {
        return this._valueSize;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "parameter #": this.parameter,
                "value size": this.valueSize,
                value: configValueToString(this.value),
            },
        };
    }
};
ConfigurationCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ConfigurationCommand.Report)
], ConfigurationCCReport);
exports.ConfigurationCCReport = ConfigurationCCReport;
function testResponseForConfigurationGet(sent, received) {
    // We expect a Configuration Report that matches the requested parameter
    return (sent.parameter === received.parameter || sent.allowUnexpectedResponse);
}
let ConfigurationCCGet = class ConfigurationCCGet extends ConfigurationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.parameter = options.parameter;
            this.allowUnexpectedResponse =
                options.allowUnexpectedResponse ?? false;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.parameter]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "parameter #": this.parameter },
        };
    }
};
ConfigurationCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ConfigurationCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(ConfigurationCCReport, testResponseForConfigurationGet)
], ConfigurationCCGet);
exports.ConfigurationCCGet = ConfigurationCCGet;
let ConfigurationCCSet = class ConfigurationCCSet extends ConfigurationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.parameter = options.parameter;
            // According to SDS14223 this flag SHOULD NOT be set
            // Because we don't want to test the behavior, we enforce that it MUST not be set
            // on legacy nodes
            if (options.resetToDefault && this.version <= 3) {
                throw new safe_1.ZWaveError(`The resetToDefault flag MUST not be used on nodes implementing ConfigurationCC V3 or less!`, safe_1.ZWaveErrorCodes.ConfigurationCC_NoResetToDefaultOnLegacyDevices);
            }
            this.resetToDefault = !!options.resetToDefault;
            if (!options.resetToDefault) {
                // TODO: Default to the stored value size
                this.valueSize = options.valueSize;
                this.valueFormat =
                    options.valueFormat ?? safe_1.ConfigValueFormat.SignedInteger;
                this.value = options.value;
            }
        }
    }
    serialize() {
        const valueSize = this.resetToDefault ? 1 : this.valueSize;
        const payloadLength = 2 + valueSize;
        this.payload = Buffer.alloc(payloadLength, 0);
        this.payload[0] = this.parameter;
        this.payload[1] =
            (this.resetToDefault ? 128 : 0) | (valueSize & 0b111);
        if (!this.resetToDefault) {
            // Make sure that the given value fits into the value size
            if (typeof this.value === "number" &&
                !isSafeValue(this.value, valueSize, this.valueFormat)) {
                // If there is a value size configured, check that the given value is compatible
                throwInvalidValueError(this.value, this.parameter, valueSize, this.valueFormat);
            }
            try {
                serializeValue(this.payload, 2, valueSize, this.valueFormat, this.value);
            }
            catch (e) {
                tryCatchOutOfBoundsError(e, this.value, this.parameter, valueSize, this.valueFormat);
            }
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "parameter #": this.parameter,
            "reset to default": this.resetToDefault,
        };
        if (this.valueSize != undefined) {
            message["value size"] = this.valueSize;
        }
        if (this.valueFormat != undefined) {
            message["value format"] = (0, safe_2.getEnumMemberName)(safe_1.ConfigValueFormat, this.valueFormat);
        }
        if (this.value != undefined) {
            message.value = configValueToString(this.value);
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ConfigurationCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ConfigurationCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], ConfigurationCCSet);
exports.ConfigurationCCSet = ConfigurationCCSet;
function getResponseForBulkSet(cc) {
    return cc.handshake ? ConfigurationCCBulkReport : undefined;
}
let ConfigurationCCBulkSet = class ConfigurationCCBulkSet extends ConfigurationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this._parameters = options.parameters;
            if (this._parameters.length < 1) {
                throw new safe_1.ZWaveError(`In a ConfigurationCC.BulkSet, parameters must be a non-empty array`, safe_1.ZWaveErrorCodes.CC_Invalid);
            }
            else if (!(0, safe_1.isConsecutiveArray)(this._parameters)) {
                throw new safe_1.ZWaveError(`A ConfigurationCC.BulkSet can only be used for consecutive parameters`, safe_1.ZWaveErrorCodes.CC_Invalid);
            }
            this._handshake = !!options.handshake;
            this._resetToDefault = !!options.resetToDefault;
            if (!!options.resetToDefault) {
                this._valueSize = 1;
                this._valueFormat = safe_1.ConfigValueFormat.SignedInteger;
                this._values = this._parameters.map(() => 0);
            }
            else {
                this._valueSize = options.valueSize;
                this._valueFormat =
                    options.valueFormat ?? safe_1.ConfigValueFormat.SignedInteger;
                this._values = options.values;
            }
        }
    }
    get parameters() {
        return this._parameters;
    }
    get resetToDefault() {
        return this._resetToDefault;
    }
    get valueSize() {
        return this._valueSize;
    }
    get valueFormat() {
        return this._valueFormat;
    }
    get values() {
        return this._values;
    }
    get handshake() {
        return this._handshake;
    }
    serialize() {
        const valueSize = this._resetToDefault ? 1 : this.valueSize;
        const payloadLength = 4 + valueSize * this.parameters.length;
        this.payload = Buffer.alloc(payloadLength, 0);
        this.payload.writeUInt16BE(this.parameters[0], 0);
        this.payload[2] = this.parameters.length;
        this.payload[3] =
            (this._resetToDefault ? 128 : 0) |
                (this.handshake ? 64 : 0) |
                (valueSize & 0b111);
        if (!this._resetToDefault) {
            for (let i = 0; i < this.parameters.length; i++) {
                const value = this._values[i];
                const param = this._parameters[i];
                // Make sure that the given value fits into the value size
                if (!isSafeValue(value, valueSize, this._valueFormat)) {
                    // If there is a value size configured, check that the given value is compatible
                    throwInvalidValueError(value, param, valueSize, this._valueFormat);
                }
                try {
                    serializeValue(this.payload, 4 + i * valueSize, valueSize, this._valueFormat, value);
                }
                catch (e) {
                    tryCatchOutOfBoundsError(e, value, param, valueSize, this._valueFormat);
                }
            }
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            handshake: this.handshake,
            "reset to default": this.resetToDefault,
            "value size": this.valueSize,
        };
        if (this._values.length > 0) {
            message.values = this._values
                .map((value, i) => `\n· #${this._parameters[i]}: ${configValueToString(value)}`)
                .join("");
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ConfigurationCCBulkSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ConfigurationCommand.BulkSet),
    (0, CommandClassDecorators_1.expectedCCResponse)(getResponseForBulkSet),
    (0, CommandClassDecorators_1.useSupervision)()
], ConfigurationCCBulkSet);
exports.ConfigurationCCBulkSet = ConfigurationCCBulkSet;
let ConfigurationCCBulkReport = class ConfigurationCCBulkReport extends ConfigurationCC {
    constructor(host, options) {
        super(host, options);
        this._values = new Map();
        // Ensure we received enough bytes for the preamble
        (0, safe_1.validatePayload)(this.payload.length >= 5);
        const firstParameter = this.payload.readUInt16BE(0);
        const numParams = this.payload[2];
        this._reportsToFollow = this.payload[3];
        this._defaultValues = !!(this.payload[4] & 128);
        this._isHandshakeResponse = !!(this.payload[4] & 64);
        this._valueSize = this.payload[4] & 0b111;
        // Ensure the payload is long enough for all reported values
        (0, safe_1.validatePayload)(this.payload.length >= 5 + numParams * this._valueSize);
        for (let i = 0; i < numParams; i++) {
            const param = firstParameter + i;
            this._values.set(param, 
            // Default to parsing the value as SignedInteger, like the specs say.
            // We try to re-interpret the value in persistValues()
            parseValue(this.payload.slice(5 + i * this.valueSize), this.valueSize, safe_1.ConfigValueFormat.SignedInteger));
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        const valueDB = this.getValueDB(applHost);
        // Store every received parameter
        // eslint-disable-next-line prefer-const
        for (let [parameter, value] of this._values.entries()) {
            // Check if the initial assumption of SignedInteger holds true
            const oldParamInformation = this.getParamInformation(applHost, parameter);
            if (oldParamInformation.format != undefined &&
                oldParamInformation.format !== safe_1.ConfigValueFormat.SignedInteger) {
                // Re-interpret the value with the new format
                value = reInterpretSignedValue(value, this._valueSize, oldParamInformation.format);
                this._values.set(parameter, value);
            }
            valueDB.setValue({
                commandClass: this.ccId,
                property: parameter,
            }, value);
        }
        return true;
    }
    get reportsToFollow() {
        return this._reportsToFollow;
    }
    getPartialCCSessionId() {
        // We don't expect the applHost to merge CCs but we want to wait until all reports have been received
        return {};
    }
    expectMoreMessages() {
        return this._reportsToFollow > 0;
    }
    get defaultValues() {
        return this._defaultValues;
    }
    get isHandshakeResponse() {
        return this._isHandshakeResponse;
    }
    get valueSize() {
        return this._valueSize;
    }
    get values() {
        return this._values;
    }
    toLogEntry(applHost) {
        const message = {
            "handshake response": this._isHandshakeResponse,
            "default values": this._defaultValues,
            "value size": this._valueSize,
            "reports to follow": this.reportsToFollow,
        };
        if (this._values.size > 0) {
            message.values = [...this._values]
                .map(([param, value]) => `
· #${param}: ${configValueToString(value)}`)
                .join("");
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ConfigurationCCBulkReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ConfigurationCommand.BulkReport)
], ConfigurationCCBulkReport);
exports.ConfigurationCCBulkReport = ConfigurationCCBulkReport;
let ConfigurationCCBulkGet = class ConfigurationCCBulkGet extends ConfigurationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this._parameters = options.parameters.sort();
            if (!(0, safe_1.isConsecutiveArray)(this.parameters)) {
                throw new safe_1.ZWaveError(`A ConfigurationCC.BulkGet can only be used for consecutive parameters`, safe_1.ZWaveErrorCodes.CC_Invalid);
            }
        }
    }
    get parameters() {
        return this._parameters;
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(3);
        this.payload.writeUInt16BE(this.parameters[0], 0);
        this.payload[2] = this.parameters.length;
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { parameters: this.parameters.join(", ") },
        };
    }
};
ConfigurationCCBulkGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ConfigurationCommand.BulkGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ConfigurationCCBulkReport)
], ConfigurationCCBulkGet);
exports.ConfigurationCCBulkGet = ConfigurationCCBulkGet;
let ConfigurationCCNameReport = class ConfigurationCCNameReport extends ConfigurationCC {
    constructor(host, options) {
        super(host, options);
        // Parameter and # of reports must be present
        (0, safe_1.validatePayload)(this.payload.length >= 3);
        this._parameter = this.payload.readUInt16BE(0);
        this._reportsToFollow = this.payload[2];
        if (this._reportsToFollow > 0) {
            // If more reports follow, the info must at least be one byte
            (0, safe_1.validatePayload)(this.payload.length >= 4);
        }
        this._name = this.payload.slice(3).toString("utf8");
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        this.extendParamInformation(applHost, this.parameter, undefined, {
            name: this.name,
        });
        return true;
    }
    get parameter() {
        return this._parameter;
    }
    get name() {
        return this._name;
    }
    get reportsToFollow() {
        return this._reportsToFollow;
    }
    getPartialCCSessionId() {
        // Distinguish sessions by the parameter number
        return { parameter: this._parameter };
    }
    expectMoreMessages() {
        return this._reportsToFollow > 0;
    }
    mergePartialCCs(applHost, partials) {
        // Concat the name
        this._name = [...partials, this]
            .map((report) => report._name)
            .reduce((prev, cur) => prev + cur, "");
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "parameter #": this.parameter,
                name: this.name,
                "reports to follow": this.reportsToFollow,
            },
        };
    }
};
ConfigurationCCNameReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ConfigurationCommand.NameReport)
], ConfigurationCCNameReport);
exports.ConfigurationCCNameReport = ConfigurationCCNameReport;
let ConfigurationCCNameGet = class ConfigurationCCNameGet extends ConfigurationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.parameter = options.parameter;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(2);
        this.payload.writeUInt16BE(this.parameter, 0);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "parameter #": this.parameter },
        };
    }
};
ConfigurationCCNameGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ConfigurationCommand.NameGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ConfigurationCCNameReport)
], ConfigurationCCNameGet);
exports.ConfigurationCCNameGet = ConfigurationCCNameGet;
let ConfigurationCCInfoReport = class ConfigurationCCInfoReport extends ConfigurationCC {
    constructor(host, options) {
        super(host, options);
        // Parameter and # of reports must be present
        (0, safe_1.validatePayload)(this.payload.length >= 3);
        this._parameter = this.payload.readUInt16BE(0);
        this._reportsToFollow = this.payload[2];
        if (this._reportsToFollow > 0) {
            // If more reports follow, the info must at least be one byte
            (0, safe_1.validatePayload)(this.payload.length >= 4);
        }
        this._info = this.payload.slice(3).toString("utf8");
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        this.extendParamInformation(applHost, this._parameter, undefined, {
            info: this._info,
        });
        return true;
    }
    get parameter() {
        return this._parameter;
    }
    get info() {
        return this._info;
    }
    get reportsToFollow() {
        return this._reportsToFollow;
    }
    getPartialCCSessionId() {
        // Distinguish sessions by the parameter number
        return { parameter: this._parameter };
    }
    expectMoreMessages() {
        return this._reportsToFollow > 0;
    }
    mergePartialCCs(applHost, partials) {
        // Concat the info
        this._info = [...partials, this]
            .map((report) => report._info)
            .reduce((prev, cur) => prev + cur, "");
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "parameter #": this.parameter,
                info: this.info,
                "reports to follow": this.reportsToFollow,
            },
        };
    }
};
ConfigurationCCInfoReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ConfigurationCommand.InfoReport)
], ConfigurationCCInfoReport);
exports.ConfigurationCCInfoReport = ConfigurationCCInfoReport;
let ConfigurationCCInfoGet = class ConfigurationCCInfoGet extends ConfigurationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.parameter = options.parameter;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(2);
        this.payload.writeUInt16BE(this.parameter, 0);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "parameter #": this.parameter },
        };
    }
};
ConfigurationCCInfoGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ConfigurationCommand.InfoGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ConfigurationCCInfoReport)
], ConfigurationCCInfoGet);
exports.ConfigurationCCInfoGet = ConfigurationCCInfoGet;
let ConfigurationCCPropertiesReport = class ConfigurationCCPropertiesReport extends ConfigurationCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 3);
        this._parameter = this.payload.readUInt16BE(0);
        this._valueFormat = (this.payload[2] & 0b111000) >>> 3;
        this._valueSize = this.payload[2] & 0b111;
        // GH#1309 Some devices don't tell us the first parameter if we query #0
        // Instead, they contain 0x000000
        if (this._valueSize === 0 && this.payload.length < 5) {
            this._nextParameter = 0;
            return;
        }
        // Ensure the payload contains the two bytes for next parameter
        const nextParameterOffset = 3 + 3 * this._valueSize;
        (0, safe_1.validatePayload)(this.payload.length >= nextParameterOffset + 2);
        if (this.valueSize > 0) {
            if (this._valueFormat !== safe_1.ConfigValueFormat.BitField) {
                this._minValue = parseValue(this.payload.slice(3), this._valueSize, this._valueFormat);
            }
            this._maxValue = parseValue(this.payload.slice(3 + this._valueSize), this._valueSize, this._valueFormat);
            this._defaultValue = parseValue(this.payload.slice(3 + 2 * this._valueSize), this._valueSize, this._valueFormat);
        }
        if (this.version < 4) {
            // Read the last 2 bytes to work around nodes not omitting min/max value when their size is 0
            this._nextParameter = this.payload.readUInt16BE(this.payload.length - 2);
        }
        else {
            this._nextParameter =
                this.payload.readUInt16BE(nextParameterOffset);
            // Ensure the payload contains a byte for the 2nd option flags
            (0, safe_1.validatePayload)(this.payload.length >= nextParameterOffset + 3);
            const options1 = this.payload[2];
            const options2 = this.payload[3 + 3 * this.valueSize + 2];
            this._altersCapabilities = !!(options1 & 128);
            this._isReadonly = !!(options1 & 64);
            this._isAdvanced = !!(options2 & 0b1);
            this._noBulkSupport = !!(options2 & 0b10);
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // If we actually received parameter info, store it
        if (this._valueSize > 0) {
            const valueType = this._valueFormat === safe_1.ConfigValueFormat.SignedInteger ||
                this._valueFormat === safe_1.ConfigValueFormat.UnsignedInteger
                ? "number"
                : "number[]";
            const paramInfo = (0, safe_1.stripUndefined)({
                type: valueType,
                valueFormat: this._valueFormat,
                valueSize: this._valueSize,
                minValue: this._minValue,
                maxValue: this._maxValue,
                defaultValue: this._defaultValue,
                requiresReInclusion: this._altersCapabilities,
                writeable: !this._isReadonly,
                isAdvanced: this._isAdvanced,
                noBulkSupport: this._noBulkSupport,
            });
            this.extendParamInformation(applHost, this._parameter, undefined, paramInfo);
        }
        return true;
    }
    get parameter() {
        return this._parameter;
    }
    get valueSize() {
        return this._valueSize;
    }
    get valueFormat() {
        return this._valueFormat;
    }
    get minValue() {
        return this._minValue;
    }
    get maxValue() {
        return this._maxValue;
    }
    get defaultValue() {
        return this._defaultValue;
    }
    get nextParameter() {
        return this._nextParameter;
    }
    get altersCapabilities() {
        return this._altersCapabilities;
    }
    get isReadonly() {
        return this._isReadonly;
    }
    get isAdvanced() {
        return this._isAdvanced;
    }
    get noBulkSupport() {
        return this._noBulkSupport;
    }
    toLogEntry(applHost) {
        const message = {
            "parameter #": this._parameter,
            "next param #": this._nextParameter,
            "value size": this._valueSize,
            "value format": (0, safe_2.getEnumMemberName)(safe_1.ConfigValueFormat, this._valueFormat),
        };
        if (this._minValue != undefined) {
            message["min value"] = configValueToString(this._minValue);
        }
        if (this._maxValue != undefined) {
            message["max value"] = configValueToString(this._maxValue);
        }
        if (this._defaultValue != undefined) {
            message["default value"] = configValueToString(this._defaultValue);
        }
        if (this._altersCapabilities != undefined) {
            message["alters capabilities"] = this._altersCapabilities;
        }
        if (this._isReadonly != undefined) {
            message.readonly = this._isReadonly;
        }
        if (this._isAdvanced != undefined) {
            message.advanced = this._isAdvanced;
        }
        if (this._noBulkSupport != undefined) {
            message["bulk support"] = !this._noBulkSupport;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ConfigurationCCPropertiesReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ConfigurationCommand.PropertiesReport)
], ConfigurationCCPropertiesReport);
exports.ConfigurationCCPropertiesReport = ConfigurationCCPropertiesReport;
let ConfigurationCCPropertiesGet = class ConfigurationCCPropertiesGet extends ConfigurationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.parameter = options.parameter;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(2);
        this.payload.writeUInt16BE(this.parameter, 0);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "parameter #": this.parameter },
        };
    }
};
ConfigurationCCPropertiesGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ConfigurationCommand.PropertiesGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ConfigurationCCPropertiesReport)
], ConfigurationCCPropertiesGet);
exports.ConfigurationCCPropertiesGet = ConfigurationCCPropertiesGet;
let ConfigurationCCDefaultReset = class ConfigurationCCDefaultReset extends ConfigurationCC {
};
ConfigurationCCDefaultReset = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ConfigurationCommand.DefaultReset)
], ConfigurationCCDefaultReset);
exports.ConfigurationCCDefaultReset = ConfigurationCCDefaultReset;
function isSafeValue(value, size, format) {
    let minValue;
    let maxValue;
    switch (format) {
        case safe_1.ConfigValueFormat.SignedInteger:
            minValue = -Math.pow(2, 8 * size - 1);
            maxValue = Math.pow(2, 8 * size - 1) - 1;
            break;
        case safe_1.ConfigValueFormat.UnsignedInteger:
        case safe_1.ConfigValueFormat.Enumerated:
            minValue = 0;
            maxValue = Math.pow(2, 8 * size);
            break;
        case safe_1.ConfigValueFormat.BitField:
        default:
            throw new Error("not implemented");
    }
    return minValue <= value && value <= maxValue;
}
/** Interprets values from the payload depending on the value format */
function parseValue(raw, size, format) {
    switch (format) {
        case safe_1.ConfigValueFormat.SignedInteger:
            return raw.readIntBE(0, size);
        case safe_1.ConfigValueFormat.UnsignedInteger:
        case safe_1.ConfigValueFormat.Enumerated:
            return raw.readUIntBE(0, size);
        case safe_1.ConfigValueFormat.BitField:
            return new Set((0, safe_1.parseBitMask)(raw.slice(0, size)));
    }
}
function throwInvalidValueError(value, parameter, valueSize, valueFormat) {
    throw new safe_1.ZWaveError(`The value ${value} is invalid for configuration parameter ${parameter} (size = ${valueSize}, format = ${(0, safe_2.getEnumMemberName)(safe_1.ConfigValueFormat, valueFormat)})!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
}
function tryCatchOutOfBoundsError(e, value, parameter, valueSize, valueFormat) {
    if (e.message.includes("out of bounds")) {
        throwInvalidValueError(value, parameter, valueSize, valueFormat);
    }
    else {
        throw e;
    }
}
/** Serializes values into the payload according to the value format */
function serializeValue(payload, offset, size, format, value) {
    switch (format) {
        case safe_1.ConfigValueFormat.SignedInteger:
            payload.writeIntBE(value, offset, size);
            return;
        case safe_1.ConfigValueFormat.UnsignedInteger:
        case safe_1.ConfigValueFormat.Enumerated:
            payload.writeUIntBE(value, offset, size);
            return;
        case safe_1.ConfigValueFormat.BitField: {
            const mask = (0, safe_1.encodeBitMask)([...value.values()], size * 8);
            mask.copy(payload, offset);
            return;
        }
    }
}
//# sourceMappingURL=ConfigurationCC.js.map