"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThermostatFanModeCCSupportedGet = exports.ThermostatFanModeCCSupportedReport = exports.ThermostatFanModeCCGet = exports.ThermostatFanModeCCReport = exports.ThermostatFanModeCCSet = exports.ThermostatFanModeCC = exports.ThermostatFanModeCCAPI = exports.ThermostatFanModeCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__ThermostatFanMode = $o => {
    function su__1__2__3__4__5__6__7__8__9__10__11__12_eu($o) {
        return ![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes($o) ? {} : null;
    }
    return su__1__2__3__4__5__6__7__8__9__10__11__12_eu($o);
};
const __assertType__optional_boolean = $o => {
    function _boolean($o) {
        return typeof $o !== "boolean" ? {} : null;
    }
    function optional__boolean($o) {
        if ($o !== undefined) {
            const error = _boolean($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional__boolean($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.ThermostatFanModeCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Thermostat Fan Mode"], {
        ...Values_1.V.staticPropertyWithName("turnedOff", "off", {
            ...safe_1.ValueMetadata.Boolean,
            label: "Thermostat fan turned off",
        }, { minVersion: 3 }),
        ...Values_1.V.staticPropertyWithName("fanMode", "mode", {
            ...safe_1.ValueMetadata.UInt8,
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.ThermostatFanMode),
            label: "Thermostat fan mode",
        }),
        ...Values_1.V.staticPropertyWithName("supportedFanModes", "supportedModes", undefined, { internal: true }),
    }),
});
let ThermostatFanModeCCAPI = class ThermostatFanModeCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value) => {
            const valueDB = this.getValueDB();
            let result;
            if (property === "mode") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                // Preserve the value of the "off" flag
                const off = valueDB.getValue(exports.ThermostatFanModeCCValues.turnedOff.endpoint(this.endpoint.index));
                result = await this.set(value, off);
            }
            else if (property === "off") {
                if (typeof value !== "boolean") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "boolean", typeof value);
                }
                const mode = valueDB.getValue(exports.ThermostatFanModeCCValues.fanMode.endpoint(this.endpoint.index));
                if (mode == undefined) {
                    throw new safe_1.ZWaveError(`The "off" property cannot be changed before the fan mode is known!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                }
                result = await this.set(mode, value);
            }
            else {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            // Verify the current value after a delay, unless the command was supervised and successful
            if (this.isSinglecast() && !(0, safe_1.supervisedCommandSucceeded)(result)) {
                // TODO: Ideally this would be a short delay, but some thermostats like Remotec ZXT-600
                // aren't able to handle the GET this quickly.
                this.schedulePoll({ property }, value);
            }
            return result;
        };
        this[_b] = async ({ property, }) => {
            switch (property) {
                case "mode":
                case "off":
                    return (await this.get())?.[property];
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.ThermostatFanModeCommand.Get:
            case _Types_1.ThermostatFanModeCommand.SupportedGet:
                return this.isSinglecast();
            case _Types_1.ThermostatFanModeCommand.Set:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.ThermostatFanModeCommand, _Types_1.ThermostatFanModeCommand.Get);
        const cc = new ThermostatFanModeCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["mode", "off"]);
        }
    }
    async set(mode, off) {
        __assertType("mode", "ThermostatFanMode", __assertType__ThermostatFanMode.bind(void 0, mode));
        __assertType("off", "(optional) boolean", __assertType__optional_boolean.bind(void 0, off));
        this.assertSupportsCommand(_Types_1.ThermostatFanModeCommand, _Types_1.ThermostatFanModeCommand.Set);
        const cc = new ThermostatFanModeCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            mode,
            off,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getSupportedModes() {
        this.assertSupportsCommand(_Types_1.ThermostatFanModeCommand, _Types_1.ThermostatFanModeCommand.SupportedGet);
        const cc = new ThermostatFanModeCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.supportedModes;
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
ThermostatFanModeCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Thermostat Fan Mode"])
], ThermostatFanModeCCAPI);
exports.ThermostatFanModeCCAPI = ThermostatFanModeCCAPI;
let ThermostatFanModeCC = class ThermostatFanModeCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Thermostat Fan Mode"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // First query the possible modes to set the metadata
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying supported thermostat fan modes...",
            direction: "outbound",
        });
        const supportedModes = await api.getSupportedModes();
        if (supportedModes) {
            const logMessage = `received supported thermostat fan modes:${supportedModes
                .map((mode) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.ThermostatFanMode, mode)}`)
                .join("")}`;
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
        else {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Querying supported thermostat fan modes timed out, skipping interview...",
            });
            return;
        }
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Thermostat Fan Mode"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        // Query the current status
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying current thermostat fan mode...",
            direction: "outbound",
        });
        const currentStatus = await api.get();
        if (currentStatus) {
            let logMessage = `received current thermostat fan mode: ${(0, safe_2.getEnumMemberName)(_Types_1.ThermostatFanMode, currentStatus.mode)}`;
            if (currentStatus.off != undefined) {
                logMessage += ` (turned off)`;
            }
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
    }
};
ThermostatFanModeCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Thermostat Fan Mode"]),
    (0, CommandClassDecorators_1.implementedVersion)(5),
    (0, CommandClassDecorators_1.ccValues)(exports.ThermostatFanModeCCValues)
], ThermostatFanModeCC);
exports.ThermostatFanModeCC = ThermostatFanModeCC;
let ThermostatFanModeCCSet = class ThermostatFanModeCCSet extends ThermostatFanModeCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.mode = options.mode;
            this.off = options.off;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            (this.version >= 2 && this.off ? 128 : 0) |
                (this.mode & 0b1111),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            mode: (0, safe_2.getEnumMemberName)(_Types_1.ThermostatFanMode, this.mode),
        };
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ThermostatFanModeCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatFanModeCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], ThermostatFanModeCCSet);
exports.ThermostatFanModeCCSet = ThermostatFanModeCCSet;
let ThermostatFanModeCCReport = class ThermostatFanModeCCReport extends ThermostatFanModeCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.mode = this.payload[0] & 0b1111;
        if (this.version >= 3) {
            this.off = !!(this.payload[0] & 128);
        }
    }
    toLogEntry(applHost) {
        const message = {
            mode: (0, safe_2.getEnumMemberName)(_Types_1.ThermostatFanMode, this.mode),
        };
        if (this.off != undefined) {
            message.off = this.off;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ThermostatFanModeCCValues.fanMode)
], ThermostatFanModeCCReport.prototype, "mode", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ThermostatFanModeCCValues.turnedOff)
], ThermostatFanModeCCReport.prototype, "off", void 0);
ThermostatFanModeCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatFanModeCommand.Report)
], ThermostatFanModeCCReport);
exports.ThermostatFanModeCCReport = ThermostatFanModeCCReport;
let ThermostatFanModeCCGet = class ThermostatFanModeCCGet extends ThermostatFanModeCC {
};
ThermostatFanModeCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatFanModeCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(ThermostatFanModeCCReport)
], ThermostatFanModeCCGet);
exports.ThermostatFanModeCCGet = ThermostatFanModeCCGet;
let ThermostatFanModeCCSupportedReport = class ThermostatFanModeCCSupportedReport extends ThermostatFanModeCC {
    constructor(host, options) {
        super(host, options);
        this.supportedModes = (0, safe_1.parseBitMask)(this.payload, _Types_1.ThermostatFanMode["Auto low"]);
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Remember which fan modes are supported
        const fanModeValue = exports.ThermostatFanModeCCValues.fanMode;
        this.setMetadata(applHost, fanModeValue, {
            ...fanModeValue.meta,
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.ThermostatFanMode, this.supportedModes),
        });
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supported modes": this.supportedModes
                    .map((mode) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.ThermostatFanMode, mode)}`)
                    .join(""),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ThermostatFanModeCCValues.supportedFanModes)
], ThermostatFanModeCCSupportedReport.prototype, "supportedModes", void 0);
ThermostatFanModeCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatFanModeCommand.SupportedReport)
], ThermostatFanModeCCSupportedReport);
exports.ThermostatFanModeCCSupportedReport = ThermostatFanModeCCSupportedReport;
let ThermostatFanModeCCSupportedGet = class ThermostatFanModeCCSupportedGet extends ThermostatFanModeCC {
};
ThermostatFanModeCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatFanModeCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ThermostatFanModeCCSupportedReport)
], ThermostatFanModeCCSupportedGet);
exports.ThermostatFanModeCCSupportedGet = ThermostatFanModeCCSupportedGet;
//# sourceMappingURL=ThermostatFanModeCC.js.map