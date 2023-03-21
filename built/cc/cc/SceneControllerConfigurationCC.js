"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
var SceneControllerConfigurationCC_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneControllerConfigurationCCGet = exports.SceneControllerConfigurationCCReport = exports.SceneControllerConfigurationCCSet = exports.SceneControllerConfigurationCC = exports.SceneControllerConfigurationCCAPI = exports.SceneControllerConfigurationCCValues = void 0;
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
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
const AssociationCC_1 = require("./AssociationCC");
exports.SceneControllerConfigurationCCValues = Object.freeze({
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Scene Controller Configuration"], {
        ...Values_1.V.dynamicPropertyAndKeyWithName("sceneId", "sceneId", (groupId) => groupId, ({ property, propertyKey }) => property === "sceneId" && typeof propertyKey === "number", (groupId) => ({
            ...safe_1.ValueMetadata.UInt8,
            label: `Associated Scene ID (${groupId})`,
            valueChangeOptions: ["transitionDuration"],
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("dimmingDuration", "dimmingDuration", (groupId) => groupId, ({ property, propertyKey }) => property === "dimmingDuration" &&
            typeof propertyKey === "number", (groupId) => ({
            ...safe_1.ValueMetadata.Duration,
            label: `Dimming duration (${groupId})`,
        })),
    }),
});
let SceneControllerConfigurationCCAPI = class SceneControllerConfigurationCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, propertyKey }, value, options) => {
            if (propertyKey == undefined) {
                (0, API_1.throwMissingPropertyKey)(this.ccId, property);
            }
            else if (typeof propertyKey !== "number") {
                (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
            }
            if (property === "sceneId") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                if (value === 0) {
                    // Disable Group ID / Scene ID
                    return this.disable(propertyKey);
                }
                else {
                    // We need to set the dimming duration along with the scene ID
                    // Dimming duration is chosen with the following precedence:
                    // 1. options.transitionDuration
                    // 2. current stored value
                    // 3. default value
                    const dimmingDuration = safe_1.Duration.from(options?.transitionDuration) ??
                        this.tryGetValueDB()?.getValue(exports.SceneControllerConfigurationCCValues.dimmingDuration(propertyKey).endpoint(this.endpoint.index)) ??
                        new safe_1.Duration(0, "default");
                    return this.set(propertyKey, value, dimmingDuration);
                }
            }
            else if (property === "dimmingDuration") {
                if (typeof value !== "string" && !(value instanceof safe_1.Duration)) {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "duration", typeof value);
                }
                const dimmingDuration = safe_1.Duration.from(value);
                if (dimmingDuration == undefined) {
                    throw new safe_1.ZWaveError(`${(0, safe_1.getCCName)(this.ccId)}: "${property}" could not be set. ${JSON.stringify(value)} is not a valid duration.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                }
                const valueDB = this.tryGetValueDB();
                const sceneId = valueDB?.getValue(exports.SceneControllerConfigurationCCValues.sceneId(propertyKey).endpoint(this.endpoint.index));
                if (sceneId == undefined || sceneId === 0) {
                    if (valueDB) {
                        // Can't actually send dimmingDuration without valid sceneId
                        // So we save it in the valueDB without sending it to the node
                        const dimmingDurationValueId = exports.SceneControllerConfigurationCCValues.dimmingDuration(propertyKey).endpoint(this.endpoint.index);
                        valueDB.setValue(dimmingDurationValueId, dimmingDuration);
                    }
                    return;
                }
                return this.set(propertyKey, sceneId, dimmingDuration);
            }
            else {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
        this[_b] = async ({ property, propertyKey, }) => {
            switch (property) {
                case "sceneId":
                case "dimmingDuration": {
                    if (propertyKey == undefined) {
                        (0, API_1.throwMissingPropertyKey)(this.ccId, property);
                    }
                    else if (typeof propertyKey !== "number") {
                        (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
                    }
                    return (await this.get(propertyKey))?.[property];
                }
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.SceneControllerConfigurationCommand.Get:
                return this.isSinglecast();
            case _Types_1.SceneControllerConfigurationCommand.Set:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    async disable(groupId) {
        __assertType("groupId", "number", __assertType__number.bind(void 0, groupId));
        this.assertSupportsCommand(_Types_1.SceneControllerConfigurationCommand, _Types_1.SceneControllerConfigurationCommand.Set);
        return this.set(groupId, 0, new safe_1.Duration(0, "seconds"));
    }
    async set(groupId, sceneId, dimmingDuration) {
        __assertType("groupId", "number", __assertType__number.bind(void 0, groupId));
        __assertType("sceneId", "number", __assertType__number.bind(void 0, sceneId));
        __assertType("dimmingDuration", undefined, __assertType__optional_su__string__2_eu.bind(void 0, dimmingDuration));
        this.assertSupportsCommand(_Types_1.SceneControllerConfigurationCommand, _Types_1.SceneControllerConfigurationCommand.Set);
        if (!this.endpoint.virtual) {
            const groupCount = SceneControllerConfigurationCC.getGroupCountCached(this.applHost, this.endpoint);
            // The client SHOULD NOT specify group 1 (the life-line group).
            // We don't block it here, because the specs don't forbid it,
            // and it may be needed for some devices.
            if (groupId < 1 || groupId > groupCount) {
                throw new safe_1.ZWaveError(`${this.constructor.name}: The group ID must be between 1 and the number of supported groups ${groupCount}.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
        }
        else if (groupId < 1) {
            throw new safe_1.ZWaveError(`The group ID must be greater than 0.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const cc = new SceneControllerConfigurationCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            groupId,
            sceneId,
            dimmingDuration,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getLastActivated() {
        this.assertSupportsCommand(_Types_1.SceneControllerConfigurationCommand, _Types_1.SceneControllerConfigurationCommand.Get);
        const cc = new SceneControllerConfigurationCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            groupId: 0,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        // Return value includes "groupId", because
        // the returned report will include the actual groupId of the
        // last activated groupId / sceneId
        if (response) {
            return (0, safe_2.pick)(response, ["groupId", "sceneId", "dimmingDuration"]);
        }
    }
    async get(groupId) {
        __assertType("groupId", "number", __assertType__number.bind(void 0, groupId));
        this.assertSupportsCommand(_Types_1.SceneControllerConfigurationCommand, _Types_1.SceneControllerConfigurationCommand.Get);
        if (groupId === 0) {
            throw new safe_1.ZWaveError(`Invalid group ID 0. To get the last activated group / scene, use getLastActivated() instead.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        else if (groupId < 0) {
            throw new safe_1.ZWaveError(`The group ID must be greater than 0.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const cc = new SceneControllerConfigurationCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            groupId,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        // Since groupId is not allowed to be 0, only Reports with
        // groupId equal to the requested groupId will be accepted,
        // so we can omit groupId from the return.
        if (response) {
            return (0, safe_2.pick)(response, ["sceneId", "dimmingDuration"]);
        }
    }
};
_a = API_1.SET_VALUE, _b = API_1.POLL_VALUE;
SceneControllerConfigurationCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Scene Controller Configuration"])
], SceneControllerConfigurationCCAPI);
exports.SceneControllerConfigurationCCAPI = SceneControllerConfigurationCCAPI;
let SceneControllerConfigurationCC = SceneControllerConfigurationCC_1 = class SceneControllerConfigurationCC extends CommandClass_1.CommandClass {
    determineRequiredCCInterviews() {
        // AssociationCC is required and MUST be interviewed
        // before SceneControllerConfigurationCC to supply groupCount
        return [
            ...super.determineRequiredCCInterviews(),
            safe_1.CommandClasses.Association,
        ];
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        const groupCount = SceneControllerConfigurationCC_1.getGroupCountCached(applHost, endpoint);
        if (groupCount === 0) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `skipping Scene Controller Configuration interview because Association group count is unknown`,
                direction: "none",
                level: "warn",
            });
            return;
        }
        // Create metadata for each scene, but don't query their actual configuration
        // since some devices only support setting scenes
        for (let groupId = 1; groupId <= groupCount; groupId++) {
            const sceneIdValue = exports.SceneControllerConfigurationCCValues.sceneId(groupId);
            this.ensureMetadata(applHost, sceneIdValue);
            const dimmingDurationValue = exports.SceneControllerConfigurationCCValues.dimmingDuration(groupId);
            this.ensureMetadata(applHost, dimmingDurationValue);
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Scene Controller Configuration"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        const groupCount = SceneControllerConfigurationCC_1.getGroupCountCached(applHost, endpoint);
        applHost.controllerLog.logNode(node.id, {
            message: "querying all scene controller configurations...",
            direction: "outbound",
        });
        for (let groupId = 1; groupId <= groupCount; groupId++) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `querying scene configuration for group #${groupId}...`,
                direction: "outbound",
            });
            const group = await api.get(groupId);
            if (group != undefined) {
                const logMessage = `received scene configuration for group #${groupId}:
scene ID:         ${group.sceneId}
dimming duration: ${group.dimmingDuration.toString()}`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
        }
    }
    /**
     * Returns the number of association groups reported by the node.
     * This only works AFTER the node has been interviewed by this CC
     * or the AssociationCC.
     */
    static getGroupCountCached(applHost, endpoint) {
        return (applHost.getDeviceConfig?.(endpoint.nodeId)?.compat
            ?.forceSceneControllerGroupCount ??
            AssociationCC_1.AssociationCC.getGroupCountCached(applHost, endpoint) ??
            0);
    }
};
SceneControllerConfigurationCC = SceneControllerConfigurationCC_1 = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Scene Controller Configuration"]),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.SceneControllerConfigurationCCValues)
], SceneControllerConfigurationCC);
exports.SceneControllerConfigurationCC = SceneControllerConfigurationCC;
let SceneControllerConfigurationCCSet = class SceneControllerConfigurationCCSet extends SceneControllerConfigurationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.groupId = options.groupId;
            this.sceneId = options.sceneId;
            // if dimmingDuration was missing, use default duration.
            this.dimmingDuration =
                safe_1.Duration.from(options.dimmingDuration) ??
                    new safe_1.Duration(0, "default");
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.groupId,
            this.sceneId,
            this.dimmingDuration.serializeSet(),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "group id": this.groupId,
                "scene id": this.sceneId,
                "dimming duration": this.dimmingDuration.toString(),
            },
        };
    }
};
SceneControllerConfigurationCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SceneControllerConfigurationCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], SceneControllerConfigurationCCSet);
exports.SceneControllerConfigurationCCSet = SceneControllerConfigurationCCSet;
let SceneControllerConfigurationCCReport = class SceneControllerConfigurationCCReport extends SceneControllerConfigurationCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 3);
        this.groupId = this.payload[0];
        this.sceneId = this.payload[1];
        this.dimmingDuration =
            safe_1.Duration.parseReport(this.payload[2]) ?? new safe_1.Duration(0, "unknown");
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // If groupId = 0, values are meaningless
        if (this.groupId === 0)
            return false;
        const sceneIdValue = exports.SceneControllerConfigurationCCValues.sceneId(this.groupId);
        this.ensureMetadata(applHost, sceneIdValue);
        const dimmingDurationValue = exports.SceneControllerConfigurationCCValues.dimmingDuration(this.groupId);
        this.ensureMetadata(applHost, dimmingDurationValue);
        this.setValue(applHost, sceneIdValue, this.sceneId);
        this.setValue(applHost, dimmingDurationValue, this.dimmingDuration);
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "group id": this.groupId,
                "scene id": this.sceneId,
                "dimming duration": this.dimmingDuration.toString(),
            },
        };
    }
};
SceneControllerConfigurationCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SceneControllerConfigurationCommand.Report)
], SceneControllerConfigurationCCReport);
exports.SceneControllerConfigurationCCReport = SceneControllerConfigurationCCReport;
function testResponseForSceneControllerConfigurationGet(sent, received) {
    // We expect a Scene Controller Configuration Report that matches
    // the requested groupId, unless groupId 0 was requested
    return sent.groupId === 0 || received.groupId === sent.groupId;
}
let SceneControllerConfigurationCCGet = class SceneControllerConfigurationCCGet extends SceneControllerConfigurationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.groupId = options.groupId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.groupId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "group id": this.groupId },
        };
    }
};
SceneControllerConfigurationCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SceneControllerConfigurationCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(SceneControllerConfigurationCCReport, testResponseForSceneControllerConfigurationGet)
], SceneControllerConfigurationCCGet);
exports.SceneControllerConfigurationCCGet = SceneControllerConfigurationCCGet;
//# sourceMappingURL=SceneControllerConfigurationCC.js.map