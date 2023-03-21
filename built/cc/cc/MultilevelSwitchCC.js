"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultilevelSwitchCCSupportedGet = exports.MultilevelSwitchCCSupportedReport = exports.MultilevelSwitchCCStopLevelChange = exports.MultilevelSwitchCCStartLevelChange = exports.MultilevelSwitchCCGet = exports.MultilevelSwitchCCReport = exports.MultilevelSwitchCCSet = exports.MultilevelSwitchCC = exports.MultilevelSwitchCCAPI = exports.MultilevelSwitchCCValues = void 0;
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
const __assertType__optional_su__string__2_eu = $o => {
    function _string($o) {
        return typeof $o !== "string" ? {} : null;
    }
    function _2($o) {
        return !($o instanceof require("@zwave-js/core/safe").Duration) ? {} : null;
    }
    function su__string__2_eu($o) {
        const conditions = [_string, _2];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function optional_su__string__2_eu($o) {
        if ($o !== undefined) {
            const error = su__string__2_eu($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional_su__string__2_eu($o);
};
const __assertType__MultilevelSwitchCCStartLevelChangeOptions = $o => {
    function _8($o) {
        return $o !== "up" ? {} : null;
    }
    function _9($o) {
        return $o !== "down" ? {} : null;
    }
    function su__8__9_eu($o) {
        const conditions = [_8, _9];
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
        if ("direction" in $o && $o["direction"] !== undefined) {
            const error = su__8__9_eu($o["direction"]);
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
    function _12($o) {
        return !($o instanceof require("@zwave-js/core/safe").Duration) ? {} : null;
    }
    function su__string__12_eu($o) {
        const conditions = [_string, _12];
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
            const error = su__string__12_eu($o["duration"]);
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
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
/**
 * Translates a switch type into two actions that may be performed. Unknown types default to Down/Up
 */
function switchTypeToActions(switchType) {
    if (!switchType.includes("/"))
        switchType = _Types_1.SwitchType[0x02]; // Down/Up
    return switchType.split("/", 2);
}
/**
 * The property names are organized so that positive motions are at odd indices and negative motions at even indices
 */
const switchTypeProperties = Object.keys(_Types_1.SwitchType)
    .filter((key) => key.indexOf("/") > -1)
    .map((key) => switchTypeToActions(key))
    .reduce((acc, cur) => acc.concat(...cur), []);
exports.MultilevelSwitchCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Multilevel Switch"], {
        ...Values_1.V.staticProperty("currentValue", {
            ...safe_1.ValueMetadata.ReadOnlyLevel,
            label: "Current value",
        }),
        ...Values_1.V.staticProperty("targetValue", {
            ...safe_1.ValueMetadata.Level,
            label: "Target value",
            valueChangeOptions: ["transitionDuration"],
        }),
        ...Values_1.V.staticProperty("duration", {
            ...safe_1.ValueMetadata.ReadOnlyDuration,
            label: "Remaining duration",
        }),
        ...Values_1.V.staticProperty("restorePrevious", {
            ...safe_1.ValueMetadata.WriteOnlyBoolean,
            label: "Restore previous value",
        }),
        ...Values_1.V.staticPropertyWithName("compatEvent", "event", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: "Event value",
        }, {
            stateful: false,
            autoCreate: (applHost, endpoint) => !!applHost.getDeviceConfig?.(endpoint.nodeId)?.compat
                ?.treatMultilevelSwitchSetAsEvent,
        }),
        ...Values_1.V.staticProperty("switchType", undefined, { internal: true }),
        // TODO: Solve this differently
        ...Values_1.V.staticProperty("superviseStartStopLevelChange", undefined, {
            internal: true,
            supportsEndpoints: false,
        }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Multilevel Switch"], {
        ...Values_1.V.dynamicPropertyWithName("levelChangeUp", 
        // This is called "up" here, but the actual property name will depend on
        // the given switch type
        (switchType) => {
            const switchTypeName = (0, safe_2.getEnumMemberName)(_Types_1.SwitchType, switchType);
            const [, up] = switchTypeToActions(switchTypeName);
            return up;
        }, ({ property }) => typeof property === "string" &&
            switchTypeProperties.indexOf(property) % 2 === 1, (switchType) => {
            const switchTypeName = (0, safe_2.getEnumMemberName)(_Types_1.SwitchType, switchType);
            const [, up] = switchTypeToActions(switchTypeName);
            return {
                ...safe_1.ValueMetadata.WriteOnlyBoolean,
                label: `Perform a level change (${up})`,
                valueChangeOptions: ["transitionDuration"],
                ccSpecific: { switchType },
            };
        }),
        ...Values_1.V.dynamicPropertyWithName("levelChangeDown", 
        // This is called "down" here, but the actual property name will depend on
        // the given switch type
        (switchType) => {
            const switchTypeName = (0, safe_2.getEnumMemberName)(_Types_1.SwitchType, switchType);
            const [down] = switchTypeToActions(switchTypeName);
            return down;
        }, ({ property }) => typeof property === "string" &&
            switchTypeProperties.indexOf(property) % 2 === 0, (switchType) => {
            const switchTypeName = (0, safe_2.getEnumMemberName)(_Types_1.SwitchType, switchType);
            const [down] = switchTypeToActions(switchTypeName);
            return {
                ...safe_1.ValueMetadata.WriteOnlyBoolean,
                label: `Perform a level change (${down})`,
                valueChangeOptions: ["transitionDuration"],
                ccSpecific: { switchType },
            };
        }),
    }),
});
let MultilevelSwitchCCAPI = class MultilevelSwitchCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value, options) => {
            // Enable restoring the previous non-zero value
            if (property === "restorePrevious") {
                property = "targetValue";
                value = 255;
            }
            if (property === "targetValue") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                const duration = safe_1.Duration.from(options?.transitionDuration);
                const currentValueValueId = exports.MultilevelSwitchCCValues.currentValue.endpoint(this.endpoint.index);
                // Multilevel Switch commands may take some time to be executed.
                // Therefore we try to supervise the command execution and delay the
                // optimistic update until the final result is received.
                const result = await this.withOptions(value !== 255
                    ? {
                        requestStatusUpdates: true,
                        onUpdate: (update) => {
                            if (update.status === safe_1.SupervisionStatus.Success) {
                                this.tryGetValueDB()?.setValue(currentValueValueId, value);
                            }
                            else if (update.status === safe_1.SupervisionStatus.Fail) {
                                // The transition failed, so now we don't know the status
                                // Refresh the current value
                                // eslint-disable-next-line @typescript-eslint/no-empty-function
                                void this.get().catch(() => { });
                            }
                        },
                    }
                    : {}).set(value, duration);
                // If the command did not fail, assume that it succeeded and update the currentValue accordingly
                // so UIs have immediate feedback
                const shouldUpdateOptimistically = 
                // For unsupervised commands, make the choice to update optimistically dependent on the driver options
                (!this.applHost.options.disableOptimisticValueUpdate &&
                    result == undefined) ||
                    ((0, safe_1.isSupervisionResult)(result) &&
                        result.status === safe_1.SupervisionStatus.Success);
                if (this.isSinglecast()) {
                    // Only update currentValue for valid target values
                    if (shouldUpdateOptimistically && value >= 0 && value <= 99) {
                        this.tryGetValueDB()?.setValue(currentValueValueId, value);
                    }
                    // Verify the current value after a delay, unless...
                    // ...the command was supervised and successful
                    // ...and we know the actual value
                    if (!(0, safe_1.supervisedCommandSucceeded)(result) || value === 255) {
                        // We query currentValue instead of targetValue to make sure that unsolicited updates cancel the scheduled poll
                        if (property === "targetValue")
                            property = "currentValue";
                        this.schedulePoll({ property }, value === 255 ? undefined : value, { duration });
                    }
                }
                else if (this.isMulticast()) {
                    // Only update currentValue for valid target values
                    if (shouldUpdateOptimistically && value >= 0 && value <= 99) {
                        // Figure out which nodes were affected by this command
                        const affectedNodes = this.endpoint.node.physicalNodes.filter((node) => node
                            .getEndpoint(this.endpoint.index)
                            ?.supportsCC(this.ccId));
                        // and optimistically update the currentValue
                        for (const node of affectedNodes) {
                            this.applHost
                                .tryGetValueDB(node.id)
                                ?.setValue(exports.MultilevelSwitchCCValues.currentValue.endpoint(this.endpoint.index), value);
                        }
                    }
                    else if (value === 255) {
                        // We generally don't want to poll for multicasts because of how much traffic it can cause
                        // However, when setting the value 255 (ON), we don't know the actual state
                        // We query currentValue instead of targetValue to make sure that unsolicited updates cancel the scheduled poll
                        if (property === "targetValue")
                            property = "currentValue";
                        this.schedulePoll({ property }, undefined, {
                            duration,
                        });
                    }
                }
                return result;
            }
            else if (switchTypeProperties.includes(property)) {
                // Since the switch only supports one of the switch types, we would
                // need to check if the correct one is used. But since the names are
                // purely cosmetic, we just accept all of them
                if (typeof value !== "boolean") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                if (value) {
                    // The property names are organized so that positive motions are
                    // at odd indices and negative motions at even indices
                    const direction = switchTypeProperties.indexOf(property) % 2 === 0
                        ? "down"
                        : "up";
                    // Singlecast only: Try to retrieve the current value to use as the start level,
                    // even if the target node is going to ignore it. There might
                    // be some bugged devices that ignore the ignore start level flag.
                    const startLevel = this.tryGetValueDB()?.getValue(exports.MultilevelSwitchCCValues.currentValue.endpoint(this.endpoint.index));
                    // And perform the level change
                    const duration = safe_1.Duration.from(options?.transitionDuration);
                    return this.startLevelChange({
                        direction,
                        ignoreStartLevel: true,
                        startLevel: typeof startLevel === "number" ? startLevel : undefined,
                        duration,
                    });
                }
                else {
                    return this.stopLevelChange();
                }
            }
            else {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
        this[_b] = async ({ property, }) => {
            switch (property) {
                case "currentValue":
                case "targetValue":
                case "duration":
                    return (await this.get())?.[property];
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.MultilevelSwitchCommand.Get:
                return this.isSinglecast();
            case _Types_1.MultilevelSwitchCommand.Set:
            case _Types_1.MultilevelSwitchCommand.StartLevelChange:
            case _Types_1.MultilevelSwitchCommand.StopLevelChange:
                return true; // This is mandatory
            case _Types_1.MultilevelSwitchCommand.SupportedGet:
                return this.version >= 3 && this.isSinglecast();
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.MultilevelSwitchCommand, _Types_1.MultilevelSwitchCommand.Get);
        const cc = new MultilevelSwitchCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["currentValue", "targetValue", "duration"]);
        }
    }
    /**
     * Sets the switch to a new value
     * @param targetValue The new target value for the switch
     * @param duration The duration after which the target value should be reached. Can be a Duration instance or a user-friendly duration string like `"1m17s"`. Only supported in V2 and above.
     * @returns A promise indicating whether the command was completed
     */
    async set(targetValue, duration) {
        __assertType("targetValue", "number", __assertType__number.bind(void 0, targetValue));
        __assertType("duration", undefined, __assertType__optional_su__string__2_eu.bind(void 0, duration));
        this.assertSupportsCommand(_Types_1.MultilevelSwitchCommand, _Types_1.MultilevelSwitchCommand.Set);
        const cc = new MultilevelSwitchCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            targetValue,
            duration,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async startLevelChange(options) {
        __assertType("options", "MultilevelSwitchCCStartLevelChangeOptions", __assertType__MultilevelSwitchCCStartLevelChangeOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.MultilevelSwitchCommand, _Types_1.MultilevelSwitchCommand.StartLevelChange);
        const cc = new MultilevelSwitchCCStartLevelChange(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...options,
        });
        return this.applHost.sendCommand(cc);
    }
    async stopLevelChange() {
        this.assertSupportsCommand(_Types_1.MultilevelSwitchCommand, _Types_1.MultilevelSwitchCommand.StopLevelChange);
        const cc = new MultilevelSwitchCCStopLevelChange(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        return this.applHost.sendCommand(cc);
    }
    async getSupported() {
        this.assertSupportsCommand(_Types_1.MultilevelSwitchCommand, _Types_1.MultilevelSwitchCommand.SupportedGet);
        const cc = new MultilevelSwitchCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.switchType;
    }
};
_a = API_1.SET_VALUE, _b = API_1.POLL_VALUE;
MultilevelSwitchCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Multilevel Switch"])
], MultilevelSwitchCCAPI);
exports.MultilevelSwitchCCAPI = MultilevelSwitchCCAPI;
let MultilevelSwitchCC = class MultilevelSwitchCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Multilevel Switch"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        if (this.version >= 3) {
            // Find out which kind of switch this is
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "requesting switch type...",
                direction: "outbound",
            });
            const switchType = await api.getSupported();
            if (switchType != undefined) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `has switch type ${(0, safe_2.getEnumMemberName)(_Types_1.SwitchType, switchType)}`,
                    direction: "inbound",
                });
            }
        }
        else {
            // requesting the switch type automatically creates the up/down actions
            // We need to do this manually for V1 and V2
            this.createMetadataForLevelChangeActions(applHost);
        }
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Multilevel Switch"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "requesting current switch state...",
            direction: "outbound",
        });
        await api.get();
    }
    setMappedBasicValue(applHost, value) {
        this.setValue(applHost, exports.MultilevelSwitchCCValues.currentValue, value);
        return true;
    }
    createMetadataForLevelChangeActions(applHost, 
    // SDS13781: The Primary Switch Type SHOULD be 0x02 (Up/Down)
    switchType = _Types_1.SwitchType["Down/Up"]) {
        this.ensureMetadata(applHost, exports.MultilevelSwitchCCValues.levelChangeUp(switchType));
        this.ensureMetadata(applHost, exports.MultilevelSwitchCCValues.levelChangeDown(switchType));
    }
};
MultilevelSwitchCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Multilevel Switch"]),
    (0, CommandClassDecorators_1.implementedVersion)(4),
    (0, CommandClassDecorators_1.ccValues)(exports.MultilevelSwitchCCValues)
], MultilevelSwitchCC);
exports.MultilevelSwitchCC = MultilevelSwitchCC;
let MultilevelSwitchCCSet = class MultilevelSwitchCCSet extends MultilevelSwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.targetValue = this.payload[0];
            if (this.payload.length >= 2) {
                this.duration = safe_1.Duration.parseReport(this.payload[1]);
            }
        }
        else {
            this.targetValue = options.targetValue;
            this.duration = safe_1.Duration.from(options.duration);
        }
    }
    serialize() {
        const payload = [this.targetValue];
        if (this.version >= 2 && this.duration) {
            payload.push(this.duration.serializeSet());
        }
        this.payload = Buffer.from(payload);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "target value": this.targetValue,
        };
        if (this.duration) {
            message.duration = this.duration.toString();
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
MultilevelSwitchCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultilevelSwitchCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], MultilevelSwitchCCSet);
exports.MultilevelSwitchCCSet = MultilevelSwitchCCSet;
let MultilevelSwitchCCReport = class MultilevelSwitchCCReport extends MultilevelSwitchCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this._currentValue = (0, safe_1.parseMaybeNumber)(this.payload[0]);
        if (this.version >= 4 && this.payload.length >= 3) {
            this.targetValue = (0, safe_1.parseNumber)(this.payload[1]);
            this.duration = safe_1.Duration.parseReport(this.payload[2]);
        }
    }
    persistValues(applHost) {
        if (this.currentValue === safe_1.unknownNumber &&
            !applHost.options.preserveUnknownValues) {
            this._currentValue = undefined;
        }
        return super.persistValues(applHost);
    }
    get currentValue() {
        return this._currentValue;
    }
    toLogEntry(applHost) {
        const message = {
            "current value": this.currentValue,
        };
        if (this.targetValue != undefined && this.duration) {
            message["target value"] = this.targetValue;
            message.duration = this.duration.toString();
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultilevelSwitchCCValues.targetValue)
], MultilevelSwitchCCReport.prototype, "targetValue", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultilevelSwitchCCValues.duration)
], MultilevelSwitchCCReport.prototype, "duration", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultilevelSwitchCCValues.currentValue)
], MultilevelSwitchCCReport.prototype, "currentValue", null);
MultilevelSwitchCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultilevelSwitchCommand.Report)
], MultilevelSwitchCCReport);
exports.MultilevelSwitchCCReport = MultilevelSwitchCCReport;
let MultilevelSwitchCCGet = class MultilevelSwitchCCGet extends MultilevelSwitchCC {
};
MultilevelSwitchCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultilevelSwitchCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(MultilevelSwitchCCReport)
], MultilevelSwitchCCGet);
exports.MultilevelSwitchCCGet = MultilevelSwitchCCGet;
let MultilevelSwitchCCStartLevelChange = class MultilevelSwitchCCStartLevelChange extends MultilevelSwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 2);
            const ignoreStartLevel = (this.payload[0] & 32) >>> 5;
            this.ignoreStartLevel = !!ignoreStartLevel;
            const direction = (this.payload[0] & 64) >>> 6;
            this.direction = direction ? "down" : "up";
            this.startLevel = this.payload[1];
            if (this.payload.length >= 3) {
                this.duration = safe_1.Duration.parseSet(this.payload[2]);
            }
        }
        else {
            this.duration = safe_1.Duration.from(options.duration);
            this.ignoreStartLevel = options.ignoreStartLevel;
            this.startLevel = options.startLevel ?? 0;
            this.direction = options.direction;
        }
    }
    serialize() {
        const controlByte = (_Types_1.LevelChangeDirection[this.direction] << 6) |
            (this.ignoreStartLevel ? 32 : 0);
        const payload = [controlByte, this.startLevel];
        if (this.version >= 2 && this.duration) {
            payload.push(this.duration.serializeSet());
        }
        this.payload = Buffer.from(payload);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            startLevel: `${this.startLevel}${this.ignoreStartLevel ? " (ignored)" : ""}`,
            direction: this.direction,
        };
        if (this.duration) {
            message.duration = this.duration.toString();
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
MultilevelSwitchCCStartLevelChange = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultilevelSwitchCommand.StartLevelChange),
    (0, CommandClassDecorators_1.useSupervision)()
], MultilevelSwitchCCStartLevelChange);
exports.MultilevelSwitchCCStartLevelChange = MultilevelSwitchCCStartLevelChange;
let MultilevelSwitchCCStopLevelChange = class MultilevelSwitchCCStopLevelChange extends MultilevelSwitchCC {
};
MultilevelSwitchCCStopLevelChange = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultilevelSwitchCommand.StopLevelChange),
    (0, CommandClassDecorators_1.useSupervision)()
], MultilevelSwitchCCStopLevelChange);
exports.MultilevelSwitchCCStopLevelChange = MultilevelSwitchCCStopLevelChange;
let MultilevelSwitchCCSupportedReport = class MultilevelSwitchCCSupportedReport extends MultilevelSwitchCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.switchType = this.payload[0] & 0b11111;
        // We do not support the deprecated secondary switch type
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        this.createMetadataForLevelChangeActions(applHost, this.switchType);
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "switch type": (0, safe_2.getEnumMemberName)(_Types_1.SwitchType, this.switchType),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultilevelSwitchCCValues.switchType)
], MultilevelSwitchCCSupportedReport.prototype, "switchType", void 0);
MultilevelSwitchCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultilevelSwitchCommand.SupportedReport)
], MultilevelSwitchCCSupportedReport);
exports.MultilevelSwitchCCSupportedReport = MultilevelSwitchCCSupportedReport;
let MultilevelSwitchCCSupportedGet = class MultilevelSwitchCCSupportedGet extends MultilevelSwitchCC {
};
MultilevelSwitchCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultilevelSwitchCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(MultilevelSwitchCCSupportedReport)
], MultilevelSwitchCCSupportedGet);
exports.MultilevelSwitchCCSupportedGet = MultilevelSwitchCCSupportedGet;
//# sourceMappingURL=MultilevelSwitchCC.js.map