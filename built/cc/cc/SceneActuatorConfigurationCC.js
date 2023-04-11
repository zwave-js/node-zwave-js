"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneActuatorConfigurationCCGet = exports.SceneActuatorConfigurationCCReport = exports.SceneActuatorConfigurationCCSet = exports.SceneActuatorConfigurationCC = exports.SceneActuatorConfigurationCCAPI = exports.SceneActuatorConfigurationCCValues = void 0;
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
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.SceneActuatorConfigurationCCValues = Object.freeze({
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Scene Actuator Configuration"], {
        ...Values_1.V.dynamicPropertyAndKeyWithName("level", "level", (sceneId) => sceneId, ({ property, propertyKey }) => property === "level" && typeof propertyKey === "number", (sceneId) => ({
            ...safe_1.ValueMetadata.UInt8,
            label: `Level (${sceneId})`,
            valueChangeOptions: ["transitionDuration"],
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("dimmingDuration", "dimmingDuration", (sceneId) => sceneId, ({ property, propertyKey }) => property === "dimmingDuration" &&
            typeof propertyKey === "number", (sceneId) => ({
            ...safe_1.ValueMetadata.Duration,
            label: `Dimming duration (${sceneId})`,
        })),
    }),
});
let SceneActuatorConfigurationCCAPI = class SceneActuatorConfigurationCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, propertyKey }, value, options) => {
            if (propertyKey == undefined) {
                (0, API_1.throwMissingPropertyKey)(this.ccId, property);
            }
            else if (typeof propertyKey !== "number") {
                (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
            }
            if (property === "level") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                // We need to set the dimming duration along with the level.
                // Dimming duration is chosen with the following precedence:
                // 1. options.transitionDuration
                // 2. current stored value
                // 3. default
                const dimmingDuration = safe_1.Duration.from(options?.transitionDuration) ??
                    this.tryGetValueDB()?.getValue(exports.SceneActuatorConfigurationCCValues.dimmingDuration(propertyKey).endpoint(this.endpoint.index));
                return this.set(propertyKey, dimmingDuration, value);
            }
            else if (property === "dimmingDuration") {
                if (typeof value !== "string" && !(value instanceof safe_1.Duration)) {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "duration", typeof value);
                }
                const dimmingDuration = safe_1.Duration.from(value);
                if (dimmingDuration == undefined) {
                    throw new safe_1.ZWaveError(`${(0, safe_1.getCCName)(this.ccId)}: "${property}" could not be set. ${JSON.stringify(value)} is not a valid duration.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                }
                // Must set the level along with the dimmingDuration,
                // Use saved value, if it's defined. Otherwise the default
                // will be used.
                const level = this.tryGetValueDB()?.getValue(exports.SceneActuatorConfigurationCCValues.level(propertyKey).endpoint(this.endpoint.index));
                return this.set(propertyKey, dimmingDuration, level);
            }
            else {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
        this[_b] = async ({ property, propertyKey, }) => {
            switch (property) {
                case "level":
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
            case _Types_1.SceneActuatorConfigurationCommand.Get:
                return this.isSinglecast();
            case _Types_1.SceneActuatorConfigurationCommand.Set:
                return true;
        }
        return super.supportsCommand(cmd);
    }
    async set(sceneId, dimmingDuration, level) {
        __assertType("sceneId", "number", __assertType__number.bind(void 0, sceneId));
        __assertType("dimmingDuration", undefined, __assertType__optional_su__string__2_eu.bind(void 0, dimmingDuration));
        __assertType("level", "(optional) number", __assertType__optional_number.bind(void 0, level));
        this.assertSupportsCommand(_Types_1.SceneActuatorConfigurationCommand, _Types_1.SceneActuatorConfigurationCommand.Set);
        // Undefined `dimmingDuration` defaults to 0 seconds to simplify the call
        // for actuators that don't support non-instant `dimmingDuration`
        // Undefined `level` uses the actuator's current value (override = 0).
        const cc = new SceneActuatorConfigurationCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            sceneId,
            dimmingDuration: safe_1.Duration.from(dimmingDuration) ?? new safe_1.Duration(0, "seconds"),
            level,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getActive() {
        this.assertSupportsCommand(_Types_1.SceneActuatorConfigurationCommand, _Types_1.SceneActuatorConfigurationCommand.Get);
        const cc = new SceneActuatorConfigurationCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            sceneId: 0,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["sceneId", "level", "dimmingDuration"]);
        }
    }
    async get(sceneId) {
        __assertType("sceneId", "number", __assertType__number.bind(void 0, sceneId));
        this.assertSupportsCommand(_Types_1.SceneActuatorConfigurationCommand, _Types_1.SceneActuatorConfigurationCommand.Get);
        if (sceneId === 0) {
            throw new safe_1.ZWaveError(`Invalid scene ID 0. To get the currently active scene, use getActive() instead.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const cc = new SceneActuatorConfigurationCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            sceneId: sceneId,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["level", "dimmingDuration"]);
        }
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
SceneActuatorConfigurationCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Scene Actuator Configuration"])
], SceneActuatorConfigurationCCAPI);
exports.SceneActuatorConfigurationCCAPI = SceneActuatorConfigurationCCAPI;
let SceneActuatorConfigurationCC = class SceneActuatorConfigurationCC extends CommandClass_1.CommandClass {
    // eslint-disable-next-line @typescript-eslint/require-await
    async interview(applHost) {
        const node = this.getNode(applHost);
        applHost.controllerLog.logNode(node.id, {
            message: `${this.constructor.name}: setting metadata`,
            direction: "none",
        });
        // Create Metadata for all scenes
        for (let sceneId = 1; sceneId <= 255; sceneId++) {
            const levelValue = exports.SceneActuatorConfigurationCCValues.level(sceneId);
            this.ensureMetadata(applHost, levelValue);
            const dimmingDurationValue = exports.SceneActuatorConfigurationCCValues.dimmingDuration(sceneId);
            this.ensureMetadata(applHost, dimmingDurationValue);
        }
        this.setInterviewComplete(applHost, true);
    }
};
SceneActuatorConfigurationCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Scene Actuator Configuration"]),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.SceneActuatorConfigurationCCValues)
], SceneActuatorConfigurationCC);
exports.SceneActuatorConfigurationCC = SceneActuatorConfigurationCC;
let SceneActuatorConfigurationCCSet = class SceneActuatorConfigurationCCSet extends SceneActuatorConfigurationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.sceneId < 1 || options.sceneId > 255) {
                throw new safe_1.ZWaveError(`The scene id ${options.sceneId} must be between 1 and 255!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.sceneId = options.sceneId;
            this.dimmingDuration = options.dimmingDuration;
            this.level = options.level;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.sceneId,
            this.dimmingDuration.serializeSet(),
            this.level != undefined ? 128 : 0,
            this.level ?? 0xff,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                sceneId: this.sceneId,
                level: this.level,
                dimmingDuration: this.dimmingDuration?.toString(),
            },
        };
    }
};
SceneActuatorConfigurationCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SceneActuatorConfigurationCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], SceneActuatorConfigurationCCSet);
exports.SceneActuatorConfigurationCCSet = SceneActuatorConfigurationCCSet;
let SceneActuatorConfigurationCCReport = class SceneActuatorConfigurationCCReport extends SceneActuatorConfigurationCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 3);
        this.sceneId = this.payload[0];
        if (this.sceneId !== 0) {
            this.level = this.payload[1];
            this.dimmingDuration =
                safe_1.Duration.parseReport(this.payload[2]) ??
                    new safe_1.Duration(0, "unknown");
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Do not persist values for an inactive scene
        if (this.sceneId === 0 ||
            this.level == undefined ||
            this.dimmingDuration == undefined) {
            return false;
        }
        const levelValue = exports.SceneActuatorConfigurationCCValues.level(this.sceneId);
        this.ensureMetadata(applHost, levelValue);
        const dimmingDurationValue = exports.SceneActuatorConfigurationCCValues.dimmingDuration(this.sceneId);
        this.ensureMetadata(applHost, dimmingDurationValue);
        this.setValue(applHost, levelValue, this.level);
        this.setValue(applHost, dimmingDurationValue, this.dimmingDuration);
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                sceneId: this.sceneId,
                level: this.level,
                dimmingDuration: this.dimmingDuration?.toString(),
            },
        };
    }
};
SceneActuatorConfigurationCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SceneActuatorConfigurationCommand.Report)
], SceneActuatorConfigurationCCReport);
exports.SceneActuatorConfigurationCCReport = SceneActuatorConfigurationCCReport;
function testResponseForSceneActuatorConfigurationGet(sent, received) {
    // We expect a Scene Actuator Configuration Report that matches
    // the requested sceneId, unless groupId 0 was requested
    return sent.sceneId === 0 || received.sceneId === sent.sceneId;
}
let SceneActuatorConfigurationCCGet = class SceneActuatorConfigurationCCGet extends SceneActuatorConfigurationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.sceneId = options.sceneId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.sceneId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "scene id": this.sceneId },
        };
    }
};
SceneActuatorConfigurationCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SceneActuatorConfigurationCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(SceneActuatorConfigurationCCReport, testResponseForSceneActuatorConfigurationGet)
], SceneActuatorConfigurationCCGet);
exports.SceneActuatorConfigurationCCGet = SceneActuatorConfigurationCCGet;
//# sourceMappingURL=SceneActuatorConfigurationCC.js.map