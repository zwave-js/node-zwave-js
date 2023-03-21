"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThermostatModeCCSupportedGet = exports.ThermostatModeCCSupportedReport = exports.ThermostatModeCCGet = exports.ThermostatModeCCReport = exports.ThermostatModeCCSet = exports.ThermostatModeCC = exports.ThermostatModeCCAPI = exports.ThermostatModeCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__ThermostatMode = $o => {
    function su__1__2__3__4__5__6__7__8__9__10__11__12__13__14__15__16_eu($o) {
        return ![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 31].includes($o) ? {} : null;
    }
    return su__1__2__3__4__5__6__7__8__9__10__11__12__13__14__15__16_eu($o);
};
const __assertType__optional_Buffer = $o => {
    function _buffer($o) {
        return !Buffer.isBuffer($o) ? {} : null;
    }
    function optional__buffer($o) {
        if ($o !== undefined) {
            const error = _buffer($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional__buffer($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.ThermostatModeCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Thermostat Mode"], {
        ...Values_1.V.staticPropertyWithName("thermostatMode", "mode", {
            ...safe_1.ValueMetadata.UInt8,
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.ThermostatMode),
            label: "Thermostat mode",
        }),
        ...Values_1.V.staticProperty("manufacturerData", {
            ...safe_1.ValueMetadata.ReadOnlyBuffer,
            label: "Manufacturer data",
        }),
        ...Values_1.V.staticProperty("supportedModes", undefined, { internal: true }),
    }),
});
let ThermostatModeCCAPI = class ThermostatModeCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value) => {
            if (property !== "mode") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (typeof value !== "number") {
                (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
            }
            const result = await this.set(value);
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
                    return (await this.get())?.[property];
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.ThermostatModeCommand.Get:
            case _Types_1.ThermostatModeCommand.SupportedGet:
                return this.isSinglecast();
            case _Types_1.ThermostatModeCommand.Set:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.ThermostatModeCommand, _Types_1.ThermostatModeCommand.Get);
        const cc = new ThermostatModeCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["mode", "manufacturerData"]);
        }
    }
    async set(mode, manufacturerData) {
        __assertType("mode", "ThermostatMode", __assertType__ThermostatMode.bind(void 0, mode));
        __assertType("manufacturerData", "(optional) Buffer", __assertType__optional_Buffer.bind(void 0, manufacturerData));
        this.assertSupportsCommand(_Types_1.ThermostatModeCommand, _Types_1.ThermostatModeCommand.Set);
        const cc = new ThermostatModeCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            mode,
            manufacturerData: manufacturerData,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getSupportedModes() {
        this.assertSupportsCommand(_Types_1.ThermostatModeCommand, _Types_1.ThermostatModeCommand.SupportedGet);
        const cc = new ThermostatModeCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.supportedModes;
    }
};
_a = API_1.SET_VALUE, _b = API_1.POLL_VALUE;
ThermostatModeCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Thermostat Mode"])
], ThermostatModeCCAPI);
exports.ThermostatModeCCAPI = ThermostatModeCCAPI;
let ThermostatModeCC = class ThermostatModeCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Thermostat Mode"], applHost, endpoint).withOptions({
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
            message: "querying supported thermostat modes...",
            direction: "outbound",
        });
        const supportedModes = await api.getSupportedModes();
        if (supportedModes) {
            const logMessage = `received supported thermostat modes:${supportedModes
                .map((mode) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.ThermostatMode, mode)}`)
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
                message: "Querying supported thermostat modes timed out, skipping interview...",
                level: "warn",
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
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Thermostat Mode"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        // Query the current status
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying current thermostat mode...",
            direction: "outbound",
        });
        const currentStatus = await api.get();
        if (currentStatus) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "received current thermostat mode: " +
                    (0, safe_2.getEnumMemberName)(_Types_1.ThermostatMode, currentStatus.mode),
                direction: "inbound",
            });
        }
    }
};
ThermostatModeCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Thermostat Mode"]),
    (0, CommandClassDecorators_1.implementedVersion)(3),
    (0, CommandClassDecorators_1.ccValues)(exports.ThermostatModeCCValues)
], ThermostatModeCC);
exports.ThermostatModeCC = ThermostatModeCC;
let ThermostatModeCCSet = class ThermostatModeCCSet extends ThermostatModeCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            const manufacturerDataLength = (this.payload[0] >>> 5) & 0b111;
            this.mode = this.payload[0] & 0b11111;
            if (manufacturerDataLength > 0) {
                (0, safe_1.validatePayload)(this.payload.length >= 1 + manufacturerDataLength);
                this.manufacturerData = this.payload.slice(1, 1 + manufacturerDataLength);
            }
        }
        else {
            this.mode = options.mode;
            if ("manufacturerData" in options)
                this.manufacturerData = options.manufacturerData;
        }
    }
    serialize() {
        const manufacturerData = this.version >= 3 &&
            this.mode === _Types_1.ThermostatMode["Manufacturer specific"] &&
            this.manufacturerData
            ? this.manufacturerData
            : Buffer.from([]);
        const manufacturerDataLength = manufacturerData.length;
        this.payload = Buffer.concat([
            Buffer.from([
                ((manufacturerDataLength & 0b111) << 5) + (this.mode & 0b11111),
            ]),
            manufacturerData,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            mode: (0, safe_2.getEnumMemberName)(_Types_1.ThermostatMode, this.mode),
        };
        if (this.manufacturerData != undefined) {
            message["manufacturer data"] = (0, safe_2.buffer2hex)(this.manufacturerData);
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ThermostatModeCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatModeCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], ThermostatModeCCSet);
exports.ThermostatModeCCSet = ThermostatModeCCSet;
let ThermostatModeCCReport = class ThermostatModeCCReport extends ThermostatModeCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.mode = this.payload[0] & 0b11111;
        if (this.version >= 3) {
            const manufacturerDataLength = this.payload[0] >>> 5;
            (0, safe_1.validatePayload)(this.payload.length >= 1 + manufacturerDataLength);
            if (manufacturerDataLength) {
                this.manufacturerData = this.payload.slice(1, 1 + manufacturerDataLength);
            }
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Update the supported modes if a mode is used that wasn't previously
        // reported to be supported. This shouldn't happen, but well... it does anyways
        const thermostatModeValue = exports.ThermostatModeCCValues.thermostatMode;
        const supportedModesValue = exports.ThermostatModeCCValues.supportedModes;
        const supportedModes = this.getValue(applHost, supportedModesValue);
        if (supportedModes &&
            this.mode in _Types_1.ThermostatMode &&
            !supportedModes.includes(this.mode)) {
            supportedModes.push(this.mode);
            supportedModes.sort();
            this.setMetadata(applHost, thermostatModeValue, {
                ...thermostatModeValue.meta,
                states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.ThermostatMode, supportedModes),
            });
            this.setValue(applHost, supportedModesValue, supportedModes);
        }
        return true;
    }
    toLogEntry(applHost) {
        const message = {
            mode: (0, safe_2.getEnumMemberName)(_Types_1.ThermostatMode, this.mode),
        };
        if (this.manufacturerData != undefined) {
            message["manufacturer data"] = (0, safe_2.buffer2hex)(this.manufacturerData);
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ThermostatModeCCValues.thermostatMode)
], ThermostatModeCCReport.prototype, "mode", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ThermostatModeCCValues.manufacturerData)
], ThermostatModeCCReport.prototype, "manufacturerData", void 0);
ThermostatModeCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatModeCommand.Report)
], ThermostatModeCCReport);
exports.ThermostatModeCCReport = ThermostatModeCCReport;
let ThermostatModeCCGet = class ThermostatModeCCGet extends ThermostatModeCC {
};
ThermostatModeCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatModeCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(ThermostatModeCCReport)
], ThermostatModeCCGet);
exports.ThermostatModeCCGet = ThermostatModeCCGet;
let ThermostatModeCCSupportedReport = class ThermostatModeCCSupportedReport extends ThermostatModeCC {
    constructor(host, options) {
        super(host, options);
        this.supportedModes = (0, safe_1.parseBitMask)(this.payload, _Types_1.ThermostatMode.Off);
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Use this information to create the metadata for the mode property
        const thermostatModeValue = exports.ThermostatModeCCValues.thermostatMode;
        this.setMetadata(applHost, thermostatModeValue, {
            ...thermostatModeValue.meta,
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.ThermostatMode, this.supportedModes),
        });
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supported modes": this.supportedModes
                    .map((mode) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.ThermostatMode, mode)}`)
                    .join(""),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ThermostatModeCCValues.supportedModes)
], ThermostatModeCCSupportedReport.prototype, "supportedModes", void 0);
ThermostatModeCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatModeCommand.SupportedReport)
], ThermostatModeCCSupportedReport);
exports.ThermostatModeCCSupportedReport = ThermostatModeCCSupportedReport;
let ThermostatModeCCSupportedGet = class ThermostatModeCCSupportedGet extends ThermostatModeCC {
};
ThermostatModeCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatModeCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ThermostatModeCCSupportedReport)
], ThermostatModeCCSupportedGet);
exports.ThermostatModeCCSupportedGet = ThermostatModeCCSupportedGet;
//# sourceMappingURL=ThermostatModeCC.js.map