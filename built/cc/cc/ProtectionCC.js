"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtectionCCTimeoutSet = exports.ProtectionCCTimeoutGet = exports.ProtectionCCTimeoutReport = exports.ProtectionCCExclusiveControlSet = exports.ProtectionCCExclusiveControlGet = exports.ProtectionCCExclusiveControlReport = exports.ProtectionCCSupportedGet = exports.ProtectionCCSupportedReport = exports.ProtectionCCGet = exports.ProtectionCCReport = exports.ProtectionCCSet = exports.ProtectionCC = exports.ProtectionCCAPI = exports.ProtectionCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__LocalProtectionState = $o => {
    function su__1__2__3_eu($o) {
        return ![0, 1, 2].includes($o) ? {} : null;
    }
    return su__1__2__3_eu($o);
};
const __assertType__optional_RFProtectionState = $o => {
    function su__1__2__3_eu($o) {
        return ![0, 1, 2].includes($o) ? {} : null;
    }
    function optional_su__1__2__3_eu($o) {
        if ($o !== undefined) {
            const error = su__1__2__3_eu($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional_su__1__2__3_eu($o);
};
const __assertType__number = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    return _number($o);
};
const __assertType__Timeout = $o => {
    function _0($o) {
        return !($o instanceof require("@zwave-js/core/safe").Timeout) ? {} : null;
    }
    return _0($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const strings_1 = require("alcalzone-shared/strings");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.ProtectionCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses.Protection, {
        ...Values_1.V.staticProperty("exclusiveControlNodeId", {
            ...safe_1.ValueMetadata.UInt8,
            min: 1,
            max: safe_1.MAX_NODES,
            label: "Node ID with exclusive control",
        }, { minVersion: 2 }),
        ...Values_1.V.staticPropertyWithName("localProtectionState", "local", {
            ...safe_1.ValueMetadata.Number,
            label: "Local protection state",
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.LocalProtectionState),
        }),
        ...Values_1.V.staticPropertyWithName("rfProtectionState", "rf", {
            ...safe_1.ValueMetadata.Number,
            label: "RF protection state",
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.RFProtectionState),
        }, { minVersion: 2 }),
        ...Values_1.V.staticProperty("timeout", {
            ...safe_1.ValueMetadata.UInt8,
            label: "RF protection timeout",
        }, { minVersion: 2 }),
        ...Values_1.V.staticProperty("supportsExclusiveControl", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportsTimeout", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportedLocalStates", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportedRFStates", undefined, {
            internal: true,
        }),
    }),
});
let ProtectionCCAPI = class ProtectionCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value) => {
            const valueDB = this.tryGetValueDB();
            if (property === "local") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                // We need to set both values together, so retrieve the other one from the value DB
                const rf = valueDB?.getValue(exports.ProtectionCCValues.rfProtectionState.endpoint(this.endpoint.index));
                return this.set(value, rf);
            }
            else if (property === "rf") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                // We need to set both values together, so retrieve the other one from the value DB
                const local = valueDB?.getValue(exports.ProtectionCCValues.localProtectionState.endpoint(this.endpoint.index));
                return this.set(local ?? _Types_1.LocalProtectionState.Unprotected, value);
            }
            else if (property === "exclusiveControlNodeId") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                return this.setExclusiveControl(value);
            }
            else {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
        this[_b] = async ({ property, }) => {
            switch (property) {
                case "local":
                case "rf":
                    return (await this.get())?.[property];
                case "exclusiveControlNodeId":
                    return this.getExclusiveControl();
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.ProtectionCommand.Get:
                return this.isSinglecast();
            case _Types_1.ProtectionCommand.Set:
                return true; // This is mandatory
            case _Types_1.ProtectionCommand.SupportedGet:
                return this.version >= 2 && this.isSinglecast();
            case _Types_1.ProtectionCommand.TimeoutGet:
            case _Types_1.ProtectionCommand.TimeoutSet: {
                return (this.isSinglecast() &&
                    (this.tryGetValueDB()?.getValue(exports.ProtectionCCValues.supportsTimeout.endpoint(this.endpoint.index)) ??
                        safe_1.unknownBoolean));
            }
            case _Types_1.ProtectionCommand.ExclusiveControlGet:
            case _Types_1.ProtectionCommand.ExclusiveControlSet: {
                return (this.isSinglecast() &&
                    (this.tryGetValueDB()?.getValue(exports.ProtectionCCValues.supportsExclusiveControl.endpoint(this.endpoint.index)) ??
                        safe_1.unknownBoolean));
            }
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.ProtectionCommand, _Types_1.ProtectionCommand.Get);
        const cc = new ProtectionCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["local", "rf"]);
        }
    }
    async set(local, rf) {
        __assertType("local", "LocalProtectionState", __assertType__LocalProtectionState.bind(void 0, local));
        __assertType("rf", "(optional) RFProtectionState", __assertType__optional_RFProtectionState.bind(void 0, rf));
        this.assertSupportsCommand(_Types_1.ProtectionCommand, _Types_1.ProtectionCommand.Set);
        const cc = new ProtectionCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            local,
            rf,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getSupported() {
        this.assertSupportsCommand(_Types_1.ProtectionCommand, _Types_1.ProtectionCommand.SupportedGet);
        const cc = new ProtectionCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "supportsExclusiveControl",
                "supportsTimeout",
                "supportedLocalStates",
                "supportedRFStates",
            ]);
        }
    }
    async getExclusiveControl() {
        this.assertSupportsCommand(_Types_1.ProtectionCommand, _Types_1.ProtectionCommand.ExclusiveControlGet);
        const cc = new ProtectionCCExclusiveControlGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.exclusiveControlNodeId;
    }
    async setExclusiveControl(nodeId) {
        __assertType("nodeId", "number", __assertType__number.bind(void 0, nodeId));
        this.assertSupportsCommand(_Types_1.ProtectionCommand, _Types_1.ProtectionCommand.ExclusiveControlSet);
        const cc = new ProtectionCCExclusiveControlSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            exclusiveControlNodeId: nodeId,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getTimeout() {
        this.assertSupportsCommand(_Types_1.ProtectionCommand, _Types_1.ProtectionCommand.TimeoutGet);
        const cc = new ProtectionCCTimeoutGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.timeout;
    }
    async setTimeout(timeout) {
        __assertType("timeout", "Timeout", __assertType__Timeout.bind(void 0, timeout));
        this.assertSupportsCommand(_Types_1.ProtectionCommand, _Types_1.ProtectionCommand.TimeoutSet);
        const cc = new ProtectionCCTimeoutSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            timeout,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
ProtectionCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Protection)
], ProtectionCCAPI);
exports.ProtectionCCAPI = ProtectionCCAPI;
let ProtectionCC = class ProtectionCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Protection, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // We need to do some queries after a potential timeout
        // In this case, do now mark this CC as interviewed completely
        let hadCriticalTimeout = false;
        // First find out what the device supports
        if (this.version >= 2) {
            applHost.controllerLog.logNode(node.id, {
                message: "querying protection capabilities...",
                direction: "outbound",
            });
            const resp = await api.getSupported();
            if (resp) {
                const logMessage = `received protection capabilities:
exclusive control:       ${resp.supportsExclusiveControl}
timeout:                 ${resp.supportsTimeout}
local protection states: ${resp.supportedLocalStates
                    .map((local) => (0, safe_2.getEnumMemberName)(_Types_1.LocalProtectionState, local))
                    .map((str) => `\n· ${str}`)
                    .join("")}
RF protection states:    ${resp.supportedRFStates
                    .map((local) => (0, safe_2.getEnumMemberName)(_Types_1.RFProtectionState, local))
                    .map((str) => `\n· ${str}`)
                    .join("")}`;
                applHost.controllerLog.logNode(node.id, {
                    message: logMessage,
                    direction: "inbound",
                });
            }
            else {
                hadCriticalTimeout = true;
            }
        }
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        if (!hadCriticalTimeout)
            this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Protection, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        const supportsExclusiveControl = !!this.getValue(applHost, exports.ProtectionCCValues.supportsExclusiveControl);
        const supportsTimeout = !!this.getValue(applHost, exports.ProtectionCCValues.supportsTimeout);
        // Query the current state
        applHost.controllerLog.logNode(node.id, {
            message: "querying protection status...",
            direction: "outbound",
        });
        const protectionResp = await api.get();
        if (protectionResp) {
            let logMessage = `received protection status:
local: ${(0, safe_2.getEnumMemberName)(_Types_1.LocalProtectionState, protectionResp.local)}`;
            if (protectionResp.rf != undefined) {
                logMessage += `
rf     ${(0, safe_2.getEnumMemberName)(_Types_1.RFProtectionState, protectionResp.rf)}`;
            }
            applHost.controllerLog.logNode(node.id, {
                message: logMessage,
                direction: "inbound",
            });
        }
        if (supportsTimeout) {
            // Query the current timeout
            applHost.controllerLog.logNode(node.id, {
                message: "querying protection timeout...",
                direction: "outbound",
            });
            const timeout = await api.getTimeout();
            if (timeout) {
                applHost.controllerLog.logNode(node.id, {
                    message: `received timeout: ${timeout.toString()}`,
                    direction: "inbound",
                });
            }
        }
        if (supportsExclusiveControl) {
            // Query the current timeout
            applHost.controllerLog.logNode(node.id, {
                message: "querying exclusive control node...",
                direction: "outbound",
            });
            const nodeId = await api.getExclusiveControl();
            if (nodeId != undefined) {
                applHost.controllerLog.logNode(node.id, {
                    message: (nodeId !== 0
                        ? `Node ${(0, strings_1.padStart)(nodeId.toString(), 3, "0")}`
                        : `no node`) + ` has exclusive control`,
                    direction: "inbound",
                });
            }
        }
    }
};
ProtectionCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Protection),
    (0, CommandClassDecorators_1.implementedVersion)(2),
    (0, CommandClassDecorators_1.ccValues)(exports.ProtectionCCValues)
], ProtectionCC);
exports.ProtectionCC = ProtectionCC;
let ProtectionCCSet = class ProtectionCCSet extends ProtectionCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.local = options.local;
            this.rf = options.rf;
        }
    }
    serialize() {
        const payload = [this.local & 0b1111];
        if (this.version >= 2 && this.rf != undefined) {
            payload.push(this.rf & 0b1111);
        }
        this.payload = Buffer.from(payload);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            local: (0, safe_2.getEnumMemberName)(_Types_1.LocalProtectionState, this.local),
        };
        if (this.rf != undefined) {
            message.rf = (0, safe_2.getEnumMemberName)(_Types_1.RFProtectionState, this.rf);
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ProtectionCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ProtectionCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], ProtectionCCSet);
exports.ProtectionCCSet = ProtectionCCSet;
let ProtectionCCReport = class ProtectionCCReport extends ProtectionCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.local = this.payload[0] & 0b1111;
        if (this.payload.length >= 2) {
            this.rf = this.payload[1] & 0b1111;
        }
    }
    toLogEntry(applHost) {
        const message = {
            local: (0, safe_2.getEnumMemberName)(_Types_1.LocalProtectionState, this.local),
        };
        if (this.rf != undefined) {
            message.rf = (0, safe_2.getEnumMemberName)(_Types_1.RFProtectionState, this.rf);
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ProtectionCCValues.localProtectionState)
], ProtectionCCReport.prototype, "local", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ProtectionCCValues.rfProtectionState)
], ProtectionCCReport.prototype, "rf", void 0);
ProtectionCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ProtectionCommand.Report)
], ProtectionCCReport);
exports.ProtectionCCReport = ProtectionCCReport;
let ProtectionCCGet = class ProtectionCCGet extends ProtectionCC {
};
ProtectionCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ProtectionCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(ProtectionCCReport)
], ProtectionCCGet);
exports.ProtectionCCGet = ProtectionCCGet;
let ProtectionCCSupportedReport = class ProtectionCCSupportedReport extends ProtectionCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 5);
        this.supportsTimeout = !!(this.payload[0] & 0b1);
        this.supportsExclusiveControl = !!(this.payload[0] & 0b10);
        this.supportedLocalStates = (0, safe_1.parseBitMask)(this.payload.slice(1, 3), _Types_1.LocalProtectionState.Unprotected);
        this.supportedRFStates = (0, safe_1.parseBitMask)(this.payload.slice(3, 5), _Types_1.RFProtectionState.Unprotected);
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // update metadata (partially) for the local and rf values
        const localStateValue = exports.ProtectionCCValues.localProtectionState;
        this.setMetadata(applHost, localStateValue, {
            ...localStateValue.meta,
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.LocalProtectionState, this.supportedLocalStates),
        });
        const rfStateValue = exports.ProtectionCCValues.rfProtectionState;
        this.setMetadata(applHost, rfStateValue, {
            ...rfStateValue.meta,
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.RFProtectionState, this.supportedRFStates),
        });
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supports exclusive control": this.supportsExclusiveControl,
                "supports timeout": this.supportsTimeout,
                "local protection states": this.supportedLocalStates
                    .map((local) => (0, safe_2.getEnumMemberName)(_Types_1.LocalProtectionState, local))
                    .map((str) => `\n· ${str}`)
                    .join(""),
                "RF protection states": this.supportedRFStates
                    .map((rf) => (0, safe_2.getEnumMemberName)(_Types_1.RFProtectionState, rf))
                    .map((str) => `\n· ${str}`)
                    .join(""),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ProtectionCCValues.supportsExclusiveControl)
], ProtectionCCSupportedReport.prototype, "supportsExclusiveControl", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ProtectionCCValues.supportsTimeout)
], ProtectionCCSupportedReport.prototype, "supportsTimeout", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ProtectionCCValues.supportedLocalStates)
], ProtectionCCSupportedReport.prototype, "supportedLocalStates", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ProtectionCCValues.supportedRFStates)
], ProtectionCCSupportedReport.prototype, "supportedRFStates", void 0);
ProtectionCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ProtectionCommand.SupportedReport)
], ProtectionCCSupportedReport);
exports.ProtectionCCSupportedReport = ProtectionCCSupportedReport;
let ProtectionCCSupportedGet = class ProtectionCCSupportedGet extends ProtectionCC {
};
ProtectionCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ProtectionCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ProtectionCCSupportedReport)
], ProtectionCCSupportedGet);
exports.ProtectionCCSupportedGet = ProtectionCCSupportedGet;
let ProtectionCCExclusiveControlReport = class ProtectionCCExclusiveControlReport extends ProtectionCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.exclusiveControlNodeId = this.payload[0];
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "exclusive control node id": this.exclusiveControlNodeId,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ProtectionCCValues.exclusiveControlNodeId)
], ProtectionCCExclusiveControlReport.prototype, "exclusiveControlNodeId", void 0);
ProtectionCCExclusiveControlReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ProtectionCommand.ExclusiveControlReport)
], ProtectionCCExclusiveControlReport);
exports.ProtectionCCExclusiveControlReport = ProtectionCCExclusiveControlReport;
let ProtectionCCExclusiveControlGet = class ProtectionCCExclusiveControlGet extends ProtectionCC {
};
ProtectionCCExclusiveControlGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ProtectionCommand.ExclusiveControlGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ProtectionCCExclusiveControlReport)
], ProtectionCCExclusiveControlGet);
exports.ProtectionCCExclusiveControlGet = ProtectionCCExclusiveControlGet;
let ProtectionCCExclusiveControlSet = class ProtectionCCExclusiveControlSet extends ProtectionCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.exclusiveControlNodeId = options.exclusiveControlNodeId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.exclusiveControlNodeId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "exclusive control node id": this.exclusiveControlNodeId,
            },
        };
    }
};
ProtectionCCExclusiveControlSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ProtectionCommand.ExclusiveControlSet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ProtectionCCReport),
    (0, CommandClassDecorators_1.useSupervision)()
], ProtectionCCExclusiveControlSet);
exports.ProtectionCCExclusiveControlSet = ProtectionCCExclusiveControlSet;
let ProtectionCCTimeoutReport = class ProtectionCCTimeoutReport extends ProtectionCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.timeout = safe_1.Timeout.parse(this.payload[0]);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { timeout: this.timeout.toString() },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ProtectionCCValues.timeout)
], ProtectionCCTimeoutReport.prototype, "timeout", void 0);
ProtectionCCTimeoutReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ProtectionCommand.TimeoutReport)
], ProtectionCCTimeoutReport);
exports.ProtectionCCTimeoutReport = ProtectionCCTimeoutReport;
let ProtectionCCTimeoutGet = class ProtectionCCTimeoutGet extends ProtectionCC {
};
ProtectionCCTimeoutGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ProtectionCommand.TimeoutGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ProtectionCCTimeoutReport)
], ProtectionCCTimeoutGet);
exports.ProtectionCCTimeoutGet = ProtectionCCTimeoutGet;
let ProtectionCCTimeoutSet = class ProtectionCCTimeoutSet extends ProtectionCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.timeout = options.timeout;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.timeout.serialize()]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { timeout: this.timeout.toString() },
        };
    }
};
ProtectionCCTimeoutSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ProtectionCommand.TimeoutSet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ProtectionCCReport),
    (0, CommandClassDecorators_1.useSupervision)()
], ProtectionCCTimeoutSet);
exports.ProtectionCCTimeoutSet = ProtectionCCTimeoutSet;
//# sourceMappingURL=ProtectionCC.js.map