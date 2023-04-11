"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorSwitchCCStopLevelChange = exports.ColorSwitchCCStartLevelChange = exports.ColorSwitchCCSet = exports.ColorSwitchCCGet = exports.ColorSwitchCCReport = exports.ColorSwitchCCSupportedGet = exports.ColorSwitchCCSupportedReport = exports.ColorSwitchCC = exports.ColorSwitchCCAPI = exports.ColorSwitchCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__ColorComponent = $o => {
    function su__1__2__3__4__5__6__7__8__9_eu($o) {
        return ![0, 1, 2, 3, 4, 5, 6, 7, 8].includes($o) ? {} : null;
    }
    return su__1__2__3__4__5__6__7__8__9_eu($o);
};
const __assertType__ColorSwitchCCSetOptions = $o => {
    function _undefined($o) {
        return $o !== undefined ? {} : null;
    }
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function su__undefined__number_eu($o) {
        const conditions = [_undefined, _number];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function _2($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("index" in $o && $o["index"] !== undefined) {
            const error = su__undefined__number_eu($o["index"]);
            if (error)
                return error;
        }
        if ("warmWhite" in $o && $o["warmWhite"] !== undefined) {
            const error = su__undefined__number_eu($o["warmWhite"]);
            if (error)
                return error;
        }
        if ("coldWhite" in $o && $o["coldWhite"] !== undefined) {
            const error = su__undefined__number_eu($o["coldWhite"]);
            if (error)
                return error;
        }
        if ("red" in $o && $o["red"] !== undefined) {
            const error = su__undefined__number_eu($o["red"]);
            if (error)
                return error;
        }
        if ("green" in $o && $o["green"] !== undefined) {
            const error = su__undefined__number_eu($o["green"]);
            if (error)
                return error;
        }
        if ("blue" in $o && $o["blue"] !== undefined) {
            const error = su__undefined__number_eu($o["blue"]);
            if (error)
                return error;
        }
        if ("amber" in $o && $o["amber"] !== undefined) {
            const error = su__undefined__number_eu($o["amber"]);
            if (error)
                return error;
        }
        if ("cyan" in $o && $o["cyan"] !== undefined) {
            const error = su__undefined__number_eu($o["cyan"]);
            if (error)
                return error;
        }
        if ("purple" in $o && $o["purple"] !== undefined) {
            const error = su__undefined__number_eu($o["purple"]);
            if (error)
                return error;
        }
        return null;
    }
    function _string($o) {
        return typeof $o !== "string" ? {} : null;
    }
    function _13($o) {
        return !($o instanceof require("@zwave-js/core").Duration) ? {} : null;
    }
    function su__string__13_eu($o) {
        const conditions = [_string, _13];
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
        if ("duration" in $o && $o["duration"] !== undefined) {
            const error = su__string__13_eu($o["duration"]);
            if (error)
                return error;
        }
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
    function _5($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("0" in $o && $o["0"] !== undefined) {
            const error = su__undefined__number_eu($o["0"]);
            if (error)
                return error;
        }
        if ("1" in $o && $o["1"] !== undefined) {
            const error = su__undefined__number_eu($o["1"]);
            if (error)
                return error;
        }
        if ("2" in $o && $o["2"] !== undefined) {
            const error = su__undefined__number_eu($o["2"]);
            if (error)
                return error;
        }
        if ("3" in $o && $o["3"] !== undefined) {
            const error = su__undefined__number_eu($o["3"]);
            if (error)
                return error;
        }
        if ("4" in $o && $o["4"] !== undefined) {
            const error = su__undefined__number_eu($o["4"]);
            if (error)
                return error;
        }
        if ("5" in $o && $o["5"] !== undefined) {
            const error = su__undefined__number_eu($o["5"]);
            if (error)
                return error;
        }
        if ("6" in $o && $o["6"] !== undefined) {
            const error = su__undefined__number_eu($o["6"]);
            if (error)
                return error;
        }
        if ("7" in $o && $o["7"] !== undefined) {
            const error = su__undefined__number_eu($o["7"]);
            if (error)
                return error;
        }
        if ("8" in $o && $o["8"] !== undefined) {
            const error = su__undefined__number_eu($o["8"]);
            if (error)
                return error;
        }
        return null;
    }
    function si__5__3_ei($o) {
        const conditions = [_5, _3];
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
        if ("hexColor" in $o && $o["hexColor"] !== undefined) {
            const error = _string($o["hexColor"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function si__7__3_ei($o) {
        const conditions = [_7, _3];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function su_si__2__3_ei_si__5__3_ei_si__7__3_ei_eu($o) {
        const conditions = [si__2__3_ei, si__5__3_ei, si__7__3_ei];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su_si__2__3_ei_si__5__3_ei_si__7__3_ei_eu($o);
};
const __assertType__ColorSwitchCCStartLevelChangeOptions = $o => {
    function su__8__9__10__11__12__13__14__15__16_eu($o) {
        return ![0, 1, 2, 3, 4, 5, 6, 7, 8].includes($o) ? {} : null;
    }
    function _18($o) {
        return $o !== "up" ? {} : null;
    }
    function _19($o) {
        return $o !== "down" ? {} : null;
    }
    function su__18__19_eu($o) {
        const conditions = [_18, _19];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function _2($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("colorComponent" in $o && $o["colorComponent"] !== undefined) {
            const error = su__8__9__10__11__12__13__14__15__16_eu($o["colorComponent"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("direction" in $o && $o["direction"] !== undefined) {
            const error = su__18__19_eu($o["direction"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function _true($o) {
        return $o !== true ? {} : null;
    }
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _3($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("ignoreStartLevel" in $o && $o["ignoreStartLevel"] !== undefined) {
            const error = _true($o["ignoreStartLevel"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("startLevel" in $o && $o["startLevel"] !== undefined) {
            const error = _number($o["startLevel"]);
            if (error)
                return error;
        }
        return null;
    }
    function _string($o) {
        return typeof $o !== "string" ? {} : null;
    }
    function _22($o) {
        return !($o instanceof require("@zwave-js/core").Duration) ? {} : null;
    }
    function su__string__22_eu($o) {
        const conditions = [_string, _22];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function _4($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("duration" in $o && $o["duration"] !== undefined) {
            const error = su__string__22_eu($o["duration"]);
            if (error)
                return error;
        }
        return null;
    }
    function si__2__3__4_ei($o) {
        const conditions = [_2, _3, _4];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function _false($o) {
        return $o !== false ? {} : null;
    }
    function _6($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("ignoreStartLevel" in $o && $o["ignoreStartLevel"] !== undefined) {
            const error = _false($o["ignoreStartLevel"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("startLevel" in $o && $o["startLevel"] !== undefined) {
            const error = _number($o["startLevel"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function si__2__6__4_ei($o) {
        const conditions = [_2, _6, _4];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function su_si__2__3__4_ei_si__2__6__4_ei_eu($o) {
        const conditions = [si__2__3__4_ei, si__2__6__4_ei];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su_si__2__3__4_ei_si__2__6__4_ei_eu($o);
};
const core_1 = require("@zwave-js/core");
const safe_1 = require("@zwave-js/shared/safe");
const math_1 = require("alcalzone-shared/math");
const typeguards_1 = require("alcalzone-shared/typeguards");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
const hexColorRegex = /^#?(?<red>[0-9a-f]{2})(?<green>[0-9a-f]{2})(?<blue>[0-9a-f]{2})$/i;
const colorTableKeys = [
    ...(0, safe_1.keysOf)(_Types_1.ColorComponent),
    ...(0, safe_1.keysOf)(_Types_1.ColorComponentMap),
];
function colorTableKeyToComponent(key) {
    if (/^\d+$/.test(key)) {
        return parseInt(key, 10);
    }
    else if (key in _Types_1.ColorComponentMap) {
        return _Types_1.ColorComponentMap[key];
    }
    else if (key in _Types_1.ColorComponent) {
        return _Types_1.ColorComponent[key];
    }
    throw new core_1.ZWaveError(`Invalid color key ${key}!`, core_1.ZWaveErrorCodes.Argument_Invalid);
}
function colorComponentToTableKey(component) {
    for (const [key, comp] of Object.entries(_Types_1.ColorComponentMap)) {
        if (comp === component)
            return key;
    }
}
exports.ColorSwitchCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(core_1.CommandClasses["Color Switch"], {
        ...Values_1.V.staticProperty("supportedColorComponents", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportsHexColor", undefined, {
            internal: true,
        }),
        // The compound color (static)
        ...Values_1.V.staticPropertyWithName("currentColor", "currentColor", {
            ...core_1.ValueMetadata.ReadOnly,
            label: `Current color`,
        }),
        ...Values_1.V.staticPropertyWithName("targetColor", "targetColor", {
            ...core_1.ValueMetadata.Any,
            label: `Target color`,
            valueChangeOptions: ["transitionDuration"],
        }),
        ...Values_1.V.staticProperty("duration", {
            ...core_1.ValueMetadata.ReadOnlyDuration,
            label: "Remaining duration",
        }),
        // The compound color as HEX
        ...Values_1.V.staticProperty("hexColor", {
            ...core_1.ValueMetadata.Color,
            minLength: 6,
            maxLength: 7,
            label: `RGB Color`,
            valueChangeOptions: ["transitionDuration"],
        }),
    }),
    ...Values_1.V.defineDynamicCCValues(core_1.CommandClasses["Color Switch"], {
        // The individual color channels (dynamic)
        ...Values_1.V.dynamicPropertyAndKeyWithName("currentColorChannel", "currentColor", (component) => component, ({ property, propertyKey }) => property === "currentColor" && typeof propertyKey === "number", (component) => {
            const colorName = (0, safe_1.getEnumMemberName)(_Types_1.ColorComponent, component);
            return {
                ...core_1.ValueMetadata.ReadOnlyUInt8,
                label: `Current value (${colorName})`,
                description: `The current value of the ${colorName} channel.`,
            };
        }),
        ...Values_1.V.dynamicPropertyAndKeyWithName("targetColorChannel", "targetColor", (component) => component, ({ property, propertyKey }) => property === "targetColor" && typeof propertyKey === "number", (component) => {
            const colorName = (0, safe_1.getEnumMemberName)(_Types_1.ColorComponent, component);
            return {
                ...core_1.ValueMetadata.UInt8,
                label: `Target value (${colorName})`,
                description: `The target value of the ${colorName} channel.`,
                valueChangeOptions: ["transitionDuration"],
            };
        }),
    }),
});
let ColorSwitchCCAPI = class ColorSwitchCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, propertyKey }, value, options) => {
            if (property === "targetColor") {
                const duration = core_1.Duration.from(options?.transitionDuration);
                if (propertyKey != undefined) {
                    // Single color component, only accepts numbers
                    if (typeof propertyKey !== "number") {
                        (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
                    }
                    else if (typeof value !== "number") {
                        (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                    }
                    const result = await this.set({
                        [propertyKey]: value,
                        duration,
                    });
                    if (this.isSinglecast() &&
                        !(0, core_1.supervisedCommandSucceeded)(result)) {
                        // Verify the current value after a (short) delay, unless the command was supervised and successful
                        this.schedulePoll({ property, propertyKey }, value, {
                            duration,
                            transition: "fast",
                        });
                    }
                    return result;
                }
                else {
                    // Set the compound color object
                    // Ensure the value is an object with only valid keys
                    if (!(0, typeguards_1.isObject)(value) ||
                        !Object.keys(value).every((key) => key in _Types_1.ColorComponentMap)) {
                        throw new core_1.ZWaveError(`${core_1.CommandClasses[this.ccId]}: "${property}" must be set to an object which specifies each color channel`, core_1.ZWaveErrorCodes.Argument_Invalid);
                    }
                    // Ensure that each property is numeric
                    for (const [key, val] of Object.entries(value)) {
                        if (typeof val !== "number") {
                            (0, API_1.throwWrongValueType)(this.ccId, `${property}.${key}`, "number", typeof val);
                        }
                    }
                    // GH#2527: strip unsupported color components, because some devices don't react otherwise
                    if (this.isSinglecast()) {
                        const supportedColors = this.tryGetValueDB()?.getValue(exports.ColorSwitchCCValues.supportedColorComponents.endpoint(this.endpoint.index));
                        if (supportedColors) {
                            value = (0, safe_1.pick)(value, supportedColors
                                .map((c) => colorComponentToTableKey(c))
                                .filter((c) => !!c));
                        }
                    }
                    // Avoid sending empty commands
                    if (Object.keys(value).length === 0)
                        return;
                    return this.set({ ...value, duration });
                    // We're not going to poll each color component separately
                }
            }
            else if (property === "hexColor") {
                // No property key, this is the hex color #rrggbb
                if (typeof value !== "string") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "string", typeof value);
                }
                const duration = core_1.Duration.from(options?.transitionDuration);
                return this.set({ hexColor: value, duration });
            }
            else {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
        this[_b] = async ({ property, propertyKey, }) => {
            if (propertyKey == undefined) {
                (0, API_1.throwMissingPropertyKey)(this.ccId, property);
            }
            else if (typeof propertyKey !== "number") {
                (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
            }
            switch (property) {
                case "currentColor":
                    return (await this.get(propertyKey))?.currentValue;
                case "targetColor":
                    return (await this.get(propertyKey))?.targetValue;
                case "duration":
                    return (await this.get(propertyKey))?.duration;
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.ColorSwitchCommand.SupportedGet:
            case _Types_1.ColorSwitchCommand.Get:
                return this.isSinglecast();
            case _Types_1.ColorSwitchCommand.Set:
            case _Types_1.ColorSwitchCommand.StartLevelChange:
            case _Types_1.ColorSwitchCommand.StopLevelChange:
                return true; // These are mandatory
        }
        return super.supportsCommand(cmd);
    }
    async getSupported() {
        this.assertSupportsCommand(_Types_1.ColorSwitchCommand, _Types_1.ColorSwitchCommand.SupportedGet);
        const cc = new ColorSwitchCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.supportedColorComponents;
    }
    async get(component) {
        __assertType("component", "ColorComponent", __assertType__ColorComponent.bind(void 0, component));
        this.assertSupportsCommand(_Types_1.ColorSwitchCommand, _Types_1.ColorSwitchCommand.Get);
        const cc = new ColorSwitchCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            colorComponent: component,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_1.pick)(response, ["currentValue", "targetValue", "duration"]);
        }
    }
    async set(options) {
        __assertType("options", "ColorSwitchCCSetOptions", __assertType__ColorSwitchCCSetOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.ColorSwitchCommand, _Types_1.ColorSwitchCommand.Set);
        const cc = new ColorSwitchCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...options,
        });
        const result = await this.applHost.sendCommand(cc, this.commandOptions);
        if ((0, core_1.isUnsupervisedOrSucceeded)(result)) {
            // If the command did not fail, assume that it succeeded and update the values accordingly
            // TODO: The API methods should not modify the value DB directly, but to do so
            // this requires a nicer way of synchronizing hexColor with the others
            if (this.isSinglecast()) {
                // Update each color component separately and record the changes to the compound value
                this.updateCurrentColor(this.getValueDB(), cc.colorTable);
            }
            else if (this.isMulticast()) {
                // Figure out which nodes were affected by this command
                const affectedNodes = this.endpoint.node.physicalNodes.filter((node) => node
                    .getEndpoint(this.endpoint.index)
                    ?.supportsCC(this.ccId));
                // and optimistically update the currentColor
                for (const node of affectedNodes) {
                    const valueDB = this.applHost.tryGetValueDB(node.id);
                    if (valueDB) {
                        this.updateCurrentColor(valueDB, cc.colorTable);
                    }
                }
            }
        }
        return result;
    }
    /** Updates the current color for a given node by merging in the given changes */
    updateCurrentColor(valueDB, colorTable) {
        let updatedRGB = false;
        const currentColorValueId = exports.ColorSwitchCCValues.currentColor.endpoint(this.endpoint.index);
        const targetColorValueId = exports.ColorSwitchCCValues.targetColor.endpoint(this.endpoint.index);
        const currentCompoundColor = valueDB.getValue(currentColorValueId) ?? {};
        const targetCompoundColor = valueDB.getValue(targetColorValueId) ?? {};
        for (const [key, value] of Object.entries(colorTable)) {
            const component = colorTableKeyToComponent(key);
            if (component === _Types_1.ColorComponent.Red ||
                component === _Types_1.ColorComponent.Green ||
                component === _Types_1.ColorComponent.Blue) {
                updatedRGB = true;
            }
            valueDB.setValue(exports.ColorSwitchCCValues.currentColorChannel(component).endpoint(this.endpoint.index), value);
            // Update the compound value
            if (key in _Types_1.ColorComponentMap) {
                currentCompoundColor[key] = value;
                targetCompoundColor[key] = value;
            }
        }
        // And store the updated compound values
        valueDB.setValue(currentColorValueId, currentCompoundColor);
        valueDB.setValue(targetColorValueId, targetCompoundColor);
        // and hex color if necessary
        const supportsHex = valueDB.getValue(exports.ColorSwitchCCValues.supportsHexColor.endpoint(this.endpoint.index));
        if (supportsHex && updatedRGB) {
            const hexValueId = exports.ColorSwitchCCValues.hexColor.endpoint(this.endpoint.index);
            const [r, g, b] = [
                _Types_1.ColorComponent.Red,
                _Types_1.ColorComponent.Green,
                _Types_1.ColorComponent.Blue,
            ].map((c) => valueDB.getValue(exports.ColorSwitchCCValues.currentColorChannel(c).endpoint(this.endpoint.index)) ?? 0);
            const hexValue = (r << 16) | (g << 8) | b;
            valueDB.setValue(hexValueId, hexValue.toString(16).padStart(6, "0"));
        }
    }
    async startLevelChange(options) {
        __assertType("options", "ColorSwitchCCStartLevelChangeOptions", __assertType__ColorSwitchCCStartLevelChangeOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.ColorSwitchCommand, _Types_1.ColorSwitchCommand.StartLevelChange);
        const cc = new ColorSwitchCCStartLevelChange(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...options,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async stopLevelChange(colorComponent) {
        __assertType("colorComponent", "ColorComponent", __assertType__ColorComponent.bind(void 0, colorComponent));
        this.assertSupportsCommand(_Types_1.ColorSwitchCommand, _Types_1.ColorSwitchCommand.StopLevelChange);
        const cc = new ColorSwitchCCStopLevelChange(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            colorComponent,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    isSetValueOptimistic(_valueId) {
        return false; // Color Switch CC handles updating the value DB itself
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
ColorSwitchCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(core_1.CommandClasses["Color Switch"])
], ColorSwitchCCAPI);
exports.ColorSwitchCCAPI = ColorSwitchCCAPI;
let ColorSwitchCC = class ColorSwitchCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(core_1.CommandClasses["Color Switch"], applHost, endpoint).withOptions({
            priority: core_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying supported colors...",
            direction: "outbound",
        });
        const supportedColors = await api.getSupported();
        if (!supportedColors) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Querying supported colors timed out, skipping interview...",
                level: "warn",
            });
            return;
        }
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `received supported colors:${supportedColors
                .map((c) => `\n· ${(0, safe_1.getEnumMemberName)(_Types_1.ColorComponent, c)}`)
                .join("")}`,
            direction: "outbound",
        });
        // Create metadata for the separate color channels
        for (const color of supportedColors) {
            const currentColorChannelValue = exports.ColorSwitchCCValues.currentColorChannel(color);
            this.setMetadata(applHost, currentColorChannelValue);
            const targetColorChannelValue = exports.ColorSwitchCCValues.targetColorChannel(color);
            this.setMetadata(applHost, targetColorChannelValue);
        }
        // And the compound one
        const currentColorValue = exports.ColorSwitchCCValues.currentColor;
        this.setMetadata(applHost, currentColorValue);
        const targetColorValue = exports.ColorSwitchCCValues.targetColor;
        this.setMetadata(applHost, targetColorValue);
        // Create the collective HEX color values
        const supportsHex = [
            _Types_1.ColorComponent.Red,
            _Types_1.ColorComponent.Green,
            _Types_1.ColorComponent.Blue,
        ].every((c) => supportedColors.includes(c));
        this.setValue(applHost, exports.ColorSwitchCCValues.supportsHexColor, supportsHex);
        if (supportsHex) {
            const hexColorValue = exports.ColorSwitchCCValues.hexColor;
            this.setMetadata(applHost, hexColorValue);
        }
        // Query all color components
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(core_1.CommandClasses["Color Switch"], applHost, endpoint).withOptions({
            priority: core_1.MessagePriority.NodeQuery,
        });
        const supportedColors = this.getValue(applHost, exports.ColorSwitchCCValues.supportedColorComponents) ?? [];
        for (const color of supportedColors) {
            // Some devices report invalid colors, but the CC API checks
            // for valid values and throws otherwise.
            if (!(0, safe_1.isEnumMember)(_Types_1.ColorComponent, color))
                continue;
            const colorName = (0, safe_1.getEnumMemberName)(_Types_1.ColorComponent, color);
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `querying current color state (${colorName})`,
                direction: "outbound",
            });
            await api.get(color);
        }
    }
    translatePropertyKey(applHost, property, propertyKey) {
        if ((property === "currentColor" || property === "targetColor") &&
            typeof propertyKey === "number") {
            const translated = _Types_1.ColorComponent[propertyKey];
            if (translated)
                return translated;
        }
        return super.translatePropertyKey(applHost, property, propertyKey);
    }
};
ColorSwitchCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(core_1.CommandClasses["Color Switch"]),
    (0, CommandClassDecorators_1.implementedVersion)(3),
    (0, CommandClassDecorators_1.ccValues)(exports.ColorSwitchCCValues)
], ColorSwitchCC);
exports.ColorSwitchCC = ColorSwitchCC;
let ColorSwitchCCSupportedReport = class ColorSwitchCCSupportedReport extends ColorSwitchCC {
    constructor(host, options) {
        super(host, options);
        // Docs say 'variable length', but the table shows 2 bytes.
        (0, core_1.validatePayload)(this.payload.length >= 2);
        this.supportedColorComponents = (0, core_1.parseBitMask)(this.payload.slice(0, 2), _Types_1.ColorComponent["Warm White"]);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supported color components": this.supportedColorComponents
                    .map((c) => `\n· ${(0, safe_1.getEnumMemberName)(_Types_1.ColorComponent, c)}`)
                    .join(""),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ColorSwitchCCValues.supportedColorComponents)
], ColorSwitchCCSupportedReport.prototype, "supportedColorComponents", void 0);
ColorSwitchCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ColorSwitchCommand.SupportedReport)
], ColorSwitchCCSupportedReport);
exports.ColorSwitchCCSupportedReport = ColorSwitchCCSupportedReport;
let ColorSwitchCCSupportedGet = class ColorSwitchCCSupportedGet extends ColorSwitchCC {
};
ColorSwitchCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ColorSwitchCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ColorSwitchCCSupportedReport)
], ColorSwitchCCSupportedGet);
exports.ColorSwitchCCSupportedGet = ColorSwitchCCSupportedGet;
let ColorSwitchCCReport = class ColorSwitchCCReport extends ColorSwitchCC {
    constructor(host, options) {
        super(host, options);
        (0, core_1.validatePayload)(this.payload.length >= 2);
        this.colorComponent = this.payload[0];
        this.currentValue = this.payload[1];
        if (this.version >= 3 && this.payload.length >= 4) {
            this.targetValue = this.payload[2];
            this.duration = core_1.Duration.parseReport(this.payload[3]);
        }
    }
    persistValues(applHost) {
        // Duration is stored globally instead of per component
        if (!super.persistValues(applHost))
            return false;
        // Update compound current value
        const colorTableKey = colorComponentToTableKey(this.colorComponent);
        if (colorTableKey) {
            const compoundCurrentColorValue = exports.ColorSwitchCCValues.currentColor;
            const compoundCurrentColor = this.getValue(applHost, compoundCurrentColorValue) ?? {};
            compoundCurrentColor[colorTableKey] = this.currentValue;
            this.setValue(applHost, compoundCurrentColorValue, compoundCurrentColor);
            // and target value
            if (this.targetValue != undefined) {
                const compoundTargetColorValue = exports.ColorSwitchCCValues.targetColor;
                const compoundTargetColor = this.getValue(applHost, compoundTargetColorValue) ?? {};
                compoundTargetColor[colorTableKey] = this.targetValue;
                this.setValue(applHost, compoundTargetColorValue, compoundTargetColor);
            }
        }
        // Update collective hex value if required
        const supportsHex = !!this.getValue(applHost, exports.ColorSwitchCCValues.supportsHexColor);
        if (supportsHex &&
            (this.colorComponent === _Types_1.ColorComponent.Red ||
                this.colorComponent === _Types_1.ColorComponent.Green ||
                this.colorComponent === _Types_1.ColorComponent.Blue)) {
            const hexColorValue = exports.ColorSwitchCCValues.hexColor;
            const hexValue = this.getValue(applHost, hexColorValue) ?? "000000";
            const byteOffset = _Types_1.ColorComponent.Blue - this.colorComponent;
            const byteMask = 0xff << (byteOffset * 8);
            let hexValueNumeric = parseInt(hexValue, 16);
            hexValueNumeric =
                (hexValueNumeric & ~byteMask) |
                    (this.currentValue << (byteOffset * 8));
            this.setValue(applHost, hexColorValue, hexValueNumeric.toString(16).padStart(6, "0"));
        }
        return true;
    }
    toLogEntry(applHost) {
        const message = {
            "color component": (0, safe_1.getEnumMemberName)(_Types_1.ColorComponent, this.colorComponent),
            "current value": this.currentValue,
        };
        if (this.targetValue != undefined) {
            message["target value"] = this.targetValue;
        }
        if (this.duration != undefined) {
            message.duration = this.duration.toString();
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ColorSwitchCCValues.currentColorChannel, (self) => [self.colorComponent])
], ColorSwitchCCReport.prototype, "currentValue", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ColorSwitchCCValues.targetColorChannel, (self) => [self.colorComponent])
], ColorSwitchCCReport.prototype, "targetValue", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ColorSwitchCCValues.duration)
], ColorSwitchCCReport.prototype, "duration", void 0);
ColorSwitchCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ColorSwitchCommand.Report)
], ColorSwitchCCReport);
exports.ColorSwitchCCReport = ColorSwitchCCReport;
function testResponseForColorSwitchGet(sent, received) {
    return sent.colorComponent === received.colorComponent;
}
let ColorSwitchCCGet = class ColorSwitchCCGet extends ColorSwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this._colorComponent = options.colorComponent;
        }
    }
    get colorComponent() {
        return this._colorComponent;
    }
    set colorComponent(value) {
        if (!_Types_1.ColorComponent[value]) {
            throw new core_1.ZWaveError("colorComponent must be a valid color component index.", core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        this._colorComponent = value;
    }
    serialize() {
        this.payload = Buffer.from([this._colorComponent]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "color component": (0, safe_1.getEnumMemberName)(_Types_1.ColorComponent, this.colorComponent),
            },
        };
    }
};
ColorSwitchCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ColorSwitchCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(ColorSwitchCCReport, testResponseForColorSwitchGet)
], ColorSwitchCCGet);
exports.ColorSwitchCCGet = ColorSwitchCCGet;
let ColorSwitchCCSet = class ColorSwitchCCSet extends ColorSwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            // Populate properties from options object
            if ("hexColor" in options) {
                const match = hexColorRegex.exec(options.hexColor);
                if (!match) {
                    throw new core_1.ZWaveError(`${options.hexColor} is not a valid HEX color string`, core_1.ZWaveErrorCodes.Argument_Invalid);
                }
                this.colorTable = {
                    red: parseInt(match.groups.red, 16),
                    green: parseInt(match.groups.green, 16),
                    blue: parseInt(match.groups.blue, 16),
                };
            }
            else {
                this.colorTable = (0, safe_1.pick)(options, colorTableKeys);
            }
            this.duration = core_1.Duration.from(options.duration);
        }
    }
    serialize() {
        const populatedColorCount = Object.keys(this.colorTable).length;
        this.payload = Buffer.allocUnsafe(1 + populatedColorCount * 2 + (this.version >= 2 ? 1 : 0));
        this.payload[0] = populatedColorCount & 0b11111;
        let i = 1;
        for (const [key, value] of Object.entries(this.colorTable)) {
            const component = colorTableKeyToComponent(key);
            this.payload[i] = component;
            this.payload[i + 1] = (0, math_1.clamp)(value, 0, 0xff);
            i += 2;
        }
        if (this.version >= 2) {
            this.payload[i] = (this.duration ?? core_1.Duration.from("default")).serializeSet();
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {};
        for (const [key, value] of Object.entries(this.colorTable)) {
            const realKey = key in _Types_1.ColorComponentMap
                ? _Types_1.ColorComponent[_Types_1.ColorComponentMap[key]]
                : _Types_1.ColorComponent[key];
            message[realKey] = value;
        }
        if (this.duration != undefined) {
            message.duration = this.duration.toString();
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ColorSwitchCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ColorSwitchCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], ColorSwitchCCSet);
exports.ColorSwitchCCSet = ColorSwitchCCSet;
let ColorSwitchCCStartLevelChange = class ColorSwitchCCStartLevelChange extends ColorSwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.duration = core_1.Duration.from(options.duration);
            this.ignoreStartLevel = options.ignoreStartLevel;
            this.startLevel = options.startLevel ?? 0;
            this.direction = options.direction;
            this.colorComponent = options.colorComponent;
        }
    }
    serialize() {
        const controlByte = (_Types_1.LevelChangeDirection[this.direction] << 6) |
            (this.ignoreStartLevel ? 32 : 0);
        const payload = [controlByte, this.colorComponent, this.startLevel];
        if (this.version >= 3 && this.duration) {
            payload.push(this.duration.serializeSet());
        }
        this.payload = Buffer.from(payload);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "color component": (0, safe_1.getEnumMemberName)(_Types_1.ColorComponent, this.colorComponent),
            "start level": `${this.startLevel}${this.ignoreStartLevel ? " (ignored)" : ""}`,
            direction: this.direction,
        };
        if (this.duration != undefined) {
            message.duration = this.duration.toString();
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ColorSwitchCCStartLevelChange = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ColorSwitchCommand.StartLevelChange),
    (0, CommandClassDecorators_1.useSupervision)()
], ColorSwitchCCStartLevelChange);
exports.ColorSwitchCCStartLevelChange = ColorSwitchCCStartLevelChange;
let ColorSwitchCCStopLevelChange = class ColorSwitchCCStopLevelChange extends ColorSwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.colorComponent = options.colorComponent;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.colorComponent]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "color component": (0, safe_1.getEnumMemberName)(_Types_1.ColorComponent, this.colorComponent),
            },
        };
    }
};
ColorSwitchCCStopLevelChange = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ColorSwitchCommand.StopLevelChange),
    (0, CommandClassDecorators_1.useSupervision)()
], ColorSwitchCCStopLevelChange);
exports.ColorSwitchCCStopLevelChange = ColorSwitchCCStopLevelChange;
//# sourceMappingURL=ColorSwitchCC.js.map