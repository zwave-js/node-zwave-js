"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumidityControlModeCCSupportedGet = exports.HumidityControlModeCCSupportedReport = exports.HumidityControlModeCCGet = exports.HumidityControlModeCCReport = exports.HumidityControlModeCCSet = exports.HumidityControlModeCC = exports.HumidityControlModeCCAPI = exports.HumidityControlModeCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__HumidityControlMode = $o => {
    function su__1__2__3__4_eu($o) {
        return ![0, 1, 2, 3].includes($o) ? {} : null;
    }
    return su__1__2__3__4_eu($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.HumidityControlModeCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Humidity Control Mode"], {
        ...Values_1.V.staticProperty("mode", {
            ...safe_1.ValueMetadata.UInt8,
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.HumidityControlMode),
            label: "Humidity control mode",
        }),
        ...Values_1.V.staticProperty("supportedModes", undefined, { internal: true }),
    }),
});
let HumidityControlModeCCAPI = class HumidityControlModeCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value) => {
            if (property === "mode") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
            }
            else {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            const result = await this.set(value);
            // Verify the change after a delay, unless the command was supervised and successful
            if (this.isSinglecast() && !(0, safe_1.supervisedCommandSucceeded)(result)) {
                this.schedulePoll({ property }, value);
            }
            return result;
        };
        this[_b] = async ({ property, }) => {
            switch (property) {
                case "mode":
                    return this.get();
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.HumidityControlModeCommand.Get:
            case _Types_1.HumidityControlModeCommand.SupportedGet:
                return this.isSinglecast();
            case _Types_1.HumidityControlModeCommand.Set:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    async get() {
        this.assertSupportsCommand(_Types_1.HumidityControlModeCommand, _Types_1.HumidityControlModeCommand.Get);
        const cc = new HumidityControlModeCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return response?.mode;
        }
    }
    async set(mode) {
        __assertType("mode", "HumidityControlMode", __assertType__HumidityControlMode.bind(void 0, mode));
        this.assertSupportsCommand(_Types_1.HumidityControlModeCommand, _Types_1.HumidityControlModeCommand.Set);
        const cc = new HumidityControlModeCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            mode,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getSupportedModes() {
        this.assertSupportsCommand(_Types_1.HumidityControlModeCommand, _Types_1.HumidityControlModeCommand.SupportedGet);
        const cc = new HumidityControlModeCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.supportedModes;
    }
};
_a = API_1.SET_VALUE, _b = API_1.POLL_VALUE;
HumidityControlModeCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Humidity Control Mode"])
], HumidityControlModeCCAPI);
exports.HumidityControlModeCCAPI = HumidityControlModeCCAPI;
let HumidityControlModeCC = class HumidityControlModeCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Humidity Control Mode"], applHost, endpoint).withOptions({
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
            message: "querying supported humidity control modes...",
            direction: "outbound",
        });
        const supportedModes = await api.getSupportedModes();
        if (supportedModes) {
            const logMessage = `received supported humidity control modes:${supportedModes
                .map((mode) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.HumidityControlMode, mode)}`)
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
                message: "Querying supported humidity control modes timed out, skipping interview...",
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
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Humidity Control Mode"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        // Query the current status
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying current humidity control mode...",
            direction: "outbound",
        });
        const currentMode = await api.get();
        if (currentMode) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "received current humidity control mode: " +
                    (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlMode, currentMode),
                direction: "inbound",
            });
        }
    }
};
HumidityControlModeCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Humidity Control Mode"]),
    (0, CommandClassDecorators_1.implementedVersion)(2),
    (0, CommandClassDecorators_1.ccValues)(exports.HumidityControlModeCCValues)
], HumidityControlModeCC);
exports.HumidityControlModeCC = HumidityControlModeCC;
let HumidityControlModeCCSet = class HumidityControlModeCCSet extends HumidityControlModeCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.mode = options.mode;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.mode & 0b1111]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                mode: (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlMode, this.mode),
            },
        };
    }
};
HumidityControlModeCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlModeCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], HumidityControlModeCCSet);
exports.HumidityControlModeCCSet = HumidityControlModeCCSet;
let HumidityControlModeCCReport = class HumidityControlModeCCReport extends HumidityControlModeCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.mode = this.payload[0] & 0b1111;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                mode: (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlMode, this.mode),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.HumidityControlModeCCValues.mode)
], HumidityControlModeCCReport.prototype, "mode", void 0);
HumidityControlModeCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlModeCommand.Report)
], HumidityControlModeCCReport);
exports.HumidityControlModeCCReport = HumidityControlModeCCReport;
let HumidityControlModeCCGet = class HumidityControlModeCCGet extends HumidityControlModeCC {
};
HumidityControlModeCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlModeCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(HumidityControlModeCCReport)
], HumidityControlModeCCGet);
exports.HumidityControlModeCCGet = HumidityControlModeCCGet;
let HumidityControlModeCCSupportedReport = class HumidityControlModeCCSupportedReport extends HumidityControlModeCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this._supportedModes = (0, safe_1.parseBitMask)(this.payload, _Types_1.HumidityControlMode.Off);
        if (!this._supportedModes.includes(_Types_1.HumidityControlMode.Off)) {
            this._supportedModes.unshift(_Types_1.HumidityControlMode.Off);
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Use this information to create the metadata for the mode property
        const modeValue = exports.HumidityControlModeCCValues.mode;
        this.setMetadata(applHost, modeValue, {
            ...modeValue.meta,
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.HumidityControlMode, this._supportedModes),
        });
        return true;
    }
    get supportedModes() {
        return this._supportedModes;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supported modes": this.supportedModes
                    .map((mode) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.HumidityControlMode, mode)}`)
                    .join(""),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.HumidityControlModeCCValues.supportedModes)
], HumidityControlModeCCSupportedReport.prototype, "supportedModes", null);
HumidityControlModeCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlModeCommand.SupportedReport)
], HumidityControlModeCCSupportedReport);
exports.HumidityControlModeCCSupportedReport = HumidityControlModeCCSupportedReport;
let HumidityControlModeCCSupportedGet = class HumidityControlModeCCSupportedGet extends HumidityControlModeCC {
};
HumidityControlModeCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlModeCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(HumidityControlModeCCSupportedReport)
], HumidityControlModeCCSupportedGet);
exports.HumidityControlModeCCSupportedGet = HumidityControlModeCCSupportedGet;
//# sourceMappingURL=HumidityControlModeCC.js.map