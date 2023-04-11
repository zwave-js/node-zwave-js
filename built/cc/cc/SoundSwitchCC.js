"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoundSwitchCCTonePlayGet = exports.SoundSwitchCCTonePlayReport = exports.SoundSwitchCCTonePlaySet = exports.SoundSwitchCCConfigurationGet = exports.SoundSwitchCCConfigurationReport = exports.SoundSwitchCCConfigurationSet = exports.SoundSwitchCCToneInfoGet = exports.SoundSwitchCCToneInfoReport = exports.SoundSwitchCCTonesNumberGet = exports.SoundSwitchCCTonesNumberReport = exports.SoundSwitchCC = exports.SoundSwitchCCAPI = exports.SoundSwitchCCValues = void 0;
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
const math_1 = require("alcalzone-shared/math");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.SoundSwitchCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Sound Switch"], {
        ...Values_1.V.staticProperty("volume", {
            ...safe_1.ValueMetadata.UInt8,
            min: 0,
            max: 100,
            unit: "%",
            label: "Volume",
            states: {
                0: "default",
            },
        }),
        ...Values_1.V.staticProperty("toneId", {
            ...safe_1.ValueMetadata.UInt8,
            label: "Play Tone",
            valueChangeOptions: ["volume"],
        }),
        ...Values_1.V.staticProperty("defaultVolume", {
            ...safe_1.ValueMetadata.Number,
            min: 0,
            max: 100,
            unit: "%",
            label: "Default volume",
        }),
        ...Values_1.V.staticProperty("defaultToneId", {
            ...safe_1.ValueMetadata.Number,
            min: 0,
            max: 254,
            label: "Default tone ID",
        }),
    }),
});
let SoundSwitchCCAPI = class SoundSwitchCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value, options) => {
            if (property === "defaultToneId") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                return this.setConfiguration(value, 0xff /* keep current volume */);
            }
            else if (property === "defaultVolume") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                return this.setConfiguration(0x00 /* keep current tone */, value);
            }
            else if (property === "toneId") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                let result;
                if (value > 0) {
                    // Use provided volume or try to use the current volume if it exists
                    const volume = options?.volume !== undefined
                        ? options.volume
                        : this.tryGetValueDB()?.getValue(exports.SoundSwitchCCValues.volume.endpoint(this.endpoint.index));
                    result = await this.play(value, volume);
                }
                else {
                    result = await this.stopPlaying();
                }
                if (this.isSinglecast() && !(0, safe_1.supervisedCommandSucceeded)(result)) {
                    // Verify the current value after a (short) delay, unless the command was supervised and successful
                    this.schedulePoll({ property }, value, { transition: "fast" });
                }
                return result;
            }
            else {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
        this[_b] = async ({ property, }) => {
            switch (property) {
                case "defaultToneId":
                case "defaultVolume":
                    return (await this.getConfiguration())?.[property];
                case "toneId":
                case "volume":
                    return (await this.getPlaying())?.[property];
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.SoundSwitchCommand.TonesNumberGet:
            case _Types_1.SoundSwitchCommand.ToneInfoGet:
            case _Types_1.SoundSwitchCommand.ConfigurationGet:
            case _Types_1.SoundSwitchCommand.TonePlayGet:
                return this.isSinglecast();
            case _Types_1.SoundSwitchCommand.ConfigurationSet:
            case _Types_1.SoundSwitchCommand.TonePlaySet:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    async getToneCount() {
        this.assertSupportsCommand(_Types_1.SoundSwitchCommand, _Types_1.SoundSwitchCommand.TonesNumberGet);
        const cc = new SoundSwitchCCTonesNumberGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.toneCount;
    }
    async getToneInfo(toneId) {
        __assertType("toneId", "number", __assertType__number.bind(void 0, toneId));
        this.assertSupportsCommand(_Types_1.SoundSwitchCommand, _Types_1.SoundSwitchCommand.ToneInfoGet);
        const cc = new SoundSwitchCCToneInfoGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            toneId,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response)
            return (0, safe_2.pick)(response, ["duration", "name"]);
    }
    async setConfiguration(defaultToneId, defaultVolume) {
        __assertType("defaultToneId", "number", __assertType__number.bind(void 0, defaultToneId));
        __assertType("defaultVolume", "number", __assertType__number.bind(void 0, defaultVolume));
        this.assertSupportsCommand(_Types_1.SoundSwitchCommand, _Types_1.SoundSwitchCommand.ConfigurationSet);
        const cc = new SoundSwitchCCConfigurationSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            defaultToneId,
            defaultVolume,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getConfiguration() {
        this.assertSupportsCommand(_Types_1.SoundSwitchCommand, _Types_1.SoundSwitchCommand.ConfigurationGet);
        const cc = new SoundSwitchCCConfigurationGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["defaultToneId", "defaultVolume"]);
        }
    }
    async play(toneId, volume) {
        __assertType("toneId", "number", __assertType__number.bind(void 0, toneId));
        __assertType("volume", "(optional) number", __assertType__optional_number.bind(void 0, volume));
        this.assertSupportsCommand(_Types_1.SoundSwitchCommand, _Types_1.SoundSwitchCommand.TonePlaySet);
        if (toneId === 0) {
            throw new safe_1.ZWaveError(`Tone ID must be > 0. Use stopPlaying to stop the tone.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const cc = new SoundSwitchCCTonePlaySet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            toneId,
            volume,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async stopPlaying() {
        this.assertSupportsCommand(_Types_1.SoundSwitchCommand, _Types_1.SoundSwitchCommand.TonePlaySet);
        const cc = new SoundSwitchCCTonePlaySet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            toneId: 0x00,
            volume: 0x00,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getPlaying() {
        this.assertSupportsCommand(_Types_1.SoundSwitchCommand, _Types_1.SoundSwitchCommand.TonePlayGet);
        const cc = new SoundSwitchCCTonePlayGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["toneId", "volume"]);
        }
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
SoundSwitchCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Sound Switch"])
], SoundSwitchCCAPI);
exports.SoundSwitchCCAPI = SoundSwitchCCAPI;
let SoundSwitchCC = class SoundSwitchCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Sound Switch"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        applHost.controllerLog.logNode(node.id, {
            message: "requesting current sound configuration...",
            direction: "outbound",
        });
        const config = await api.getConfiguration();
        if (config) {
            const logMessage = `received current sound configuration:
default tone ID: ${config.defaultToneId}
default volume: ${config.defaultVolume}`;
            applHost.controllerLog.logNode(node.id, {
                message: logMessage,
                direction: "inbound",
            });
        }
        applHost.controllerLog.logNode(node.id, {
            message: "requesting tone count...",
            direction: "outbound",
        });
        const toneCount = await api.getToneCount();
        if (toneCount != undefined) {
            const logMessage = `supports ${toneCount} tones`;
            applHost.controllerLog.logNode(node.id, {
                message: logMessage,
                direction: "inbound",
            });
        }
        else {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Querying tone count timed out, skipping interview...",
                level: "warn",
            });
            return;
        }
        const metadataStates = {
            0: "off",
        };
        for (let toneId = 1; toneId <= toneCount; toneId++) {
            applHost.controllerLog.logNode(node.id, {
                message: `requesting info for tone #${toneId}`,
                direction: "outbound",
            });
            const info = await api.getToneInfo(toneId);
            if (!info)
                continue;
            const logMessage = `received info for tone #${toneId}:
name:     ${info.name}
duration: ${info.duration} seconds`;
            applHost.controllerLog.logNode(node.id, {
                message: logMessage,
                direction: "inbound",
            });
            metadataStates[toneId] = `${info.name} (${info.duration} sec)`;
        }
        metadataStates[0xff] = "default";
        // Remember tone count and info on the tone ID metadata
        this.setMetadata(applHost, exports.SoundSwitchCCValues.toneId, {
            ...exports.SoundSwitchCCValues.toneId.meta,
            min: 0,
            max: toneCount,
            states: metadataStates,
        });
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
};
SoundSwitchCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Sound Switch"]),
    (0, CommandClassDecorators_1.implementedVersion)(2),
    (0, CommandClassDecorators_1.ccValues)(exports.SoundSwitchCCValues)
], SoundSwitchCC);
exports.SoundSwitchCC = SoundSwitchCC;
let SoundSwitchCCTonesNumberReport = class SoundSwitchCCTonesNumberReport extends SoundSwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.toneCount = this.payload[0];
        }
        else {
            this.toneCount = options.toneCount;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.toneCount]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "# of tones": this.toneCount },
        };
    }
};
SoundSwitchCCTonesNumberReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SoundSwitchCommand.TonesNumberReport)
], SoundSwitchCCTonesNumberReport);
exports.SoundSwitchCCTonesNumberReport = SoundSwitchCCTonesNumberReport;
let SoundSwitchCCTonesNumberGet = class SoundSwitchCCTonesNumberGet extends SoundSwitchCC {
};
SoundSwitchCCTonesNumberGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SoundSwitchCommand.TonesNumberGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(SoundSwitchCCTonesNumberReport)
], SoundSwitchCCTonesNumberGet);
exports.SoundSwitchCCTonesNumberGet = SoundSwitchCCTonesNumberGet;
let SoundSwitchCCToneInfoReport = class SoundSwitchCCToneInfoReport extends SoundSwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 4);
            this.toneId = this.payload[0];
            this.duration = this.payload.readUInt16BE(1);
            const nameLength = this.payload[3];
            (0, safe_1.validatePayload)(this.payload.length >= 4 + nameLength);
            this.name = this.payload.slice(4, 4 + nameLength).toString("utf8");
        }
        else {
            this.toneId = options.toneId;
            this.duration = options.duration;
            this.name = options.name;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.toneId, 0, 0, this.name.length]),
            Buffer.from(this.name, "utf8"),
        ]);
        this.payload.writeUInt16BE(this.duration, 1);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "tone id": this.toneId,
                duration: `${this.duration} seconds`,
                name: this.name,
            },
        };
    }
};
SoundSwitchCCToneInfoReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SoundSwitchCommand.ToneInfoReport)
], SoundSwitchCCToneInfoReport);
exports.SoundSwitchCCToneInfoReport = SoundSwitchCCToneInfoReport;
const testResponseForSoundSwitchToneInfoGet = (sent, received) => {
    return received.toneId === sent.toneId;
};
let SoundSwitchCCToneInfoGet = class SoundSwitchCCToneInfoGet extends SoundSwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.toneId = this.payload[0];
        }
        else {
            this.toneId = options.toneId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.toneId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "tone id": this.toneId },
        };
    }
};
SoundSwitchCCToneInfoGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SoundSwitchCommand.ToneInfoGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(SoundSwitchCCToneInfoReport, testResponseForSoundSwitchToneInfoGet)
], SoundSwitchCCToneInfoGet);
exports.SoundSwitchCCToneInfoGet = SoundSwitchCCToneInfoGet;
let SoundSwitchCCConfigurationSet = class SoundSwitchCCConfigurationSet extends SoundSwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.defaultVolume = options.defaultVolume;
            this.defaultToneId = options.defaultToneId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.defaultVolume, this.defaultToneId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "default volume": `${this.defaultVolume} %`,
                "default tone id": this.defaultToneId,
            },
        };
    }
};
SoundSwitchCCConfigurationSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SoundSwitchCommand.ConfigurationSet),
    (0, CommandClassDecorators_1.useSupervision)()
], SoundSwitchCCConfigurationSet);
exports.SoundSwitchCCConfigurationSet = SoundSwitchCCConfigurationSet;
let SoundSwitchCCConfigurationReport = class SoundSwitchCCConfigurationReport extends SoundSwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 2);
            this.defaultVolume = (0, math_1.clamp)(this.payload[0], 0, 100);
            this.defaultToneId = this.payload[1];
        }
        else {
            this.defaultVolume = options.defaultVolume;
            this.defaultToneId = options.defaultToneId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.defaultVolume, this.defaultToneId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "default volume": `${this.defaultVolume} %`,
                "default tone id": this.defaultToneId,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.SoundSwitchCCValues.defaultVolume)
], SoundSwitchCCConfigurationReport.prototype, "defaultVolume", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.SoundSwitchCCValues.defaultToneId)
], SoundSwitchCCConfigurationReport.prototype, "defaultToneId", void 0);
SoundSwitchCCConfigurationReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SoundSwitchCommand.ConfigurationReport)
], SoundSwitchCCConfigurationReport);
exports.SoundSwitchCCConfigurationReport = SoundSwitchCCConfigurationReport;
let SoundSwitchCCConfigurationGet = class SoundSwitchCCConfigurationGet extends SoundSwitchCC {
};
SoundSwitchCCConfigurationGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SoundSwitchCommand.ConfigurationGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(SoundSwitchCCConfigurationReport)
], SoundSwitchCCConfigurationGet);
exports.SoundSwitchCCConfigurationGet = SoundSwitchCCConfigurationGet;
let SoundSwitchCCTonePlaySet = class SoundSwitchCCTonePlaySet extends SoundSwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.toneId = options.toneId;
            this.volume = options.volume;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.toneId]);
        if (this.version >= 2 && this.volume != undefined) {
            this.payload = Buffer.concat([
                this.payload,
                Buffer.from([this.volume]),
            ]);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "tone id": this.toneId,
        };
        if (this.volume != undefined) {
            message.volume = this.volume === 0 ? "default" : `${this.volume} %`;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
SoundSwitchCCTonePlaySet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SoundSwitchCommand.TonePlaySet),
    (0, CommandClassDecorators_1.useSupervision)()
], SoundSwitchCCTonePlaySet);
exports.SoundSwitchCCTonePlaySet = SoundSwitchCCTonePlaySet;
let SoundSwitchCCTonePlayReport = class SoundSwitchCCTonePlayReport extends SoundSwitchCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.toneId = this.payload[0];
        if (this.toneId !== 0 && this.payload.length >= 2) {
            this.volume = this.payload[1];
        }
    }
    toLogEntry(applHost) {
        const message = {
            "tone id": this.toneId,
        };
        if (this.volume != undefined) {
            message.volume = this.volume === 0 ? "default" : `${this.volume} %`;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.SoundSwitchCCValues.toneId)
], SoundSwitchCCTonePlayReport.prototype, "toneId", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.SoundSwitchCCValues.volume)
], SoundSwitchCCTonePlayReport.prototype, "volume", void 0);
SoundSwitchCCTonePlayReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SoundSwitchCommand.TonePlayReport)
], SoundSwitchCCTonePlayReport);
exports.SoundSwitchCCTonePlayReport = SoundSwitchCCTonePlayReport;
let SoundSwitchCCTonePlayGet = class SoundSwitchCCTonePlayGet extends SoundSwitchCC {
};
SoundSwitchCCTonePlayGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SoundSwitchCommand.TonePlayGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(SoundSwitchCCTonePlayReport)
], SoundSwitchCCTonePlayGet);
exports.SoundSwitchCCTonePlayGet = SoundSwitchCCTonePlayGet;
//# sourceMappingURL=SoundSwitchCC.js.map