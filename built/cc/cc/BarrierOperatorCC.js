"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarrierOperatorCCEventSignalingGet = exports.BarrierOperatorCCEventSignalingReport = exports.BarrierOperatorCCEventSignalingSet = exports.BarrierOperatorCCSignalingCapabilitiesGet = exports.BarrierOperatorCCSignalingCapabilitiesReport = exports.BarrierOperatorCCGet = exports.BarrierOperatorCCReport = exports.BarrierOperatorCCSet = exports.BarrierOperatorCC = exports.BarrierOperatorCCAPI = exports.BarrierOperatorCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__su__1__2_eu = $o => {
    function _1($o) {
        return $o !== 0 ? {} : null;
    }
    function _2($o) {
        return $o !== 255 ? {} : null;
    }
    function su__1__2_eu($o) {
        const conditions = [_1, _2];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su__1__2_eu($o);
};
const __assertType__SubsystemType = $o => {
    function su__1__2_eu($o) {
        return ![1, 2].includes($o) ? {} : null;
    }
    return su__1__2_eu($o);
};
const __assertType__SubsystemState = $o => {
    function su__1__2_eu($o) {
        return ![0, 255].includes($o) ? {} : null;
    }
    return su__1__2_eu($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.BarrierOperatorCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Barrier Operator"], {
        ...Values_1.V.staticProperty("supportedSubsystemTypes", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("position", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: "Barrier Position",
            unit: "%",
            max: 100,
        }),
        ...Values_1.V.staticProperty("targetState", {
            ...safe_1.ValueMetadata.UInt8,
            label: "Target Barrier State",
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.BarrierState, [
                _Types_1.BarrierState.Open,
                _Types_1.BarrierState.Closed,
            ]),
        }),
        ...Values_1.V.staticProperty("currentState", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: "Current Barrier State",
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.BarrierState),
        }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Barrier Operator"], {
        ...Values_1.V.dynamicPropertyAndKeyWithName("signalingState", "signalingState", (subsystemType) => subsystemType, ({ property, propertyKey }) => property === "signalingState" &&
            typeof propertyKey === "number", (subsystemType) => ({
            ...safe_1.ValueMetadata.UInt8,
            label: `Signaling State (${(0, safe_2.getEnumMemberName)(_Types_1.SubsystemType, subsystemType)})`,
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.SubsystemState),
        })),
    }),
});
let BarrierOperatorCCAPI = class BarrierOperatorCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, propertyKey }, value) => {
            if (property === "targetState") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                const targetValue = value === _Types_1.BarrierState.Closed
                    ? _Types_1.BarrierState.Closed
                    : _Types_1.BarrierState.Open;
                const result = await this.set(targetValue);
                // Verify the change after a delay, unless the command was supervised and successful
                if (this.isSinglecast() && !(0, safe_1.supervisedCommandSucceeded)(result)) {
                    this.schedulePoll({ property }, targetValue);
                }
                return result;
            }
            else if (property === "signalingState") {
                if (propertyKey == undefined) {
                    (0, API_1.throwMissingPropertyKey)(this.ccId, property);
                }
                else if (typeof propertyKey !== "number") {
                    (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
                }
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                const result = await this.setEventSignaling(propertyKey, value);
                // Verify the change after a short delay, unless the command was supervised and successful
                if (this.isSinglecast() && !(0, safe_1.supervisedCommandSucceeded)(result)) {
                    this.schedulePoll({ property }, value, { transition: "fast" });
                }
                return result;
            }
            else {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
        this[_b] = async ({ property, propertyKey, }) => {
            switch (property) {
                case "currentState":
                case "position":
                    return (await this.get())?.[property];
                case "signalingState":
                    if (propertyKey == undefined) {
                        (0, API_1.throwMissingPropertyKey)(this.ccId, property);
                    }
                    else if (typeof propertyKey !== "number") {
                        (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
                    }
                    return this.getEventSignaling(propertyKey);
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.BarrierOperatorCommand.Get:
            case _Types_1.BarrierOperatorCommand.Set:
            case _Types_1.BarrierOperatorCommand.SignalingCapabilitiesGet:
            case _Types_1.BarrierOperatorCommand.EventSignalingGet:
            case _Types_1.BarrierOperatorCommand.EventSignalingSet:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.BarrierOperatorCommand, _Types_1.BarrierOperatorCommand.Get);
        const cc = new BarrierOperatorCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["currentState", "position"]);
        }
    }
    async set(targetState) {
        __assertType("targetState", undefined, __assertType__su__1__2_eu.bind(void 0, targetState));
        this.assertSupportsCommand(_Types_1.BarrierOperatorCommand, _Types_1.BarrierOperatorCommand.Set);
        const cc = new BarrierOperatorCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            targetState,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getSignalingCapabilities() {
        this.assertSupportsCommand(_Types_1.BarrierOperatorCommand, _Types_1.BarrierOperatorCommand.SignalingCapabilitiesGet);
        const cc = new BarrierOperatorCCSignalingCapabilitiesGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.supportedSubsystemTypes;
    }
    async getEventSignaling(subsystemType) {
        __assertType("subsystemType", "SubsystemType", __assertType__SubsystemType.bind(void 0, subsystemType));
        this.assertSupportsCommand(_Types_1.BarrierOperatorCommand, _Types_1.BarrierOperatorCommand.EventSignalingGet);
        const cc = new BarrierOperatorCCEventSignalingGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            subsystemType,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.subsystemState;
    }
    async setEventSignaling(subsystemType, subsystemState) {
        __assertType("subsystemType", "SubsystemType", __assertType__SubsystemType.bind(void 0, subsystemType));
        __assertType("subsystemState", "SubsystemState", __assertType__SubsystemState.bind(void 0, subsystemState));
        this.assertSupportsCommand(_Types_1.BarrierOperatorCommand, _Types_1.BarrierOperatorCommand.EventSignalingSet);
        const cc = new BarrierOperatorCCEventSignalingSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            subsystemType,
            subsystemState,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.SET_VALUE, _b = API_1.POLL_VALUE;
BarrierOperatorCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Barrier Operator"])
], BarrierOperatorCCAPI);
exports.BarrierOperatorCCAPI = BarrierOperatorCCAPI;
let BarrierOperatorCC = class BarrierOperatorCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Barrier Operator"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // Create targetState value if it does not exist
        this.ensureMetadata(applHost, exports.BarrierOperatorCCValues.targetState);
        applHost.controllerLog.logNode(node.id, {
            message: "Querying signaling capabilities...",
            direction: "outbound",
        });
        const resp = await api.getSignalingCapabilities();
        if (resp) {
            applHost.controllerLog.logNode(node.id, {
                message: `Received supported subsystem types: ${resp
                    .map((t) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.SubsystemType, t)}`)
                    .join("")}`,
                direction: "inbound",
            });
        }
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Barrier Operator"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        const supportedSubsystems = this.getValue(applHost, exports.BarrierOperatorCCValues.supportedSubsystemTypes) ?? [];
        for (const subsystemType of supportedSubsystems) {
            // Some devices report invalid subsystem types, but the CC API checks
            // for valid values and throws otherwise.
            if (!(0, safe_2.isEnumMember)(_Types_1.SubsystemType, subsystemType))
                continue;
            applHost.controllerLog.logNode(node.id, {
                message: `Querying event signaling state for subsystem ${(0, safe_2.getEnumMemberName)(_Types_1.SubsystemType, subsystemType)}...`,
                direction: "outbound",
            });
            const state = await api.getEventSignaling(subsystemType);
            if (state != undefined) {
                applHost.controllerLog.logNode(node.id, {
                    message: `Subsystem ${(0, safe_2.getEnumMemberName)(_Types_1.SubsystemType, subsystemType)} has state ${(0, safe_2.getEnumMemberName)(_Types_1.SubsystemState, state)}`,
                    direction: "inbound",
                });
            }
        }
        applHost.controllerLog.logNode(node.id, {
            message: "querying current barrier state...",
            direction: "outbound",
        });
        await api.get();
    }
};
BarrierOperatorCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Barrier Operator"]),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.BarrierOperatorCCValues)
], BarrierOperatorCC);
exports.BarrierOperatorCC = BarrierOperatorCC;
let BarrierOperatorCCSet = class BarrierOperatorCCSet extends BarrierOperatorCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.targetState = options.targetState;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.targetState]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "target state": this.targetState },
        };
    }
};
BarrierOperatorCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BarrierOperatorCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], BarrierOperatorCCSet);
exports.BarrierOperatorCCSet = BarrierOperatorCCSet;
let BarrierOperatorCCReport = class BarrierOperatorCCReport extends BarrierOperatorCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        // return values state and position value
        // if state is 0 - 99 or FF (100%) return the appropriate values.
        // if state is different just use the table and
        // return undefined position
        const payloadValue = this.payload[0];
        this.currentState = payloadValue;
        this.position = undefined;
        if (payloadValue <= 99) {
            this.position = payloadValue;
            if (payloadValue > 0) {
                this.currentState = undefined;
            }
        }
        else if (payloadValue === 255) {
            this.position = 100;
            this.currentState = payloadValue;
        }
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "barrier position": this.position,
                "barrier state": this.currentState != undefined
                    ? (0, safe_2.getEnumMemberName)(_Types_1.BarrierState, this.currentState)
                    : "unknown",
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BarrierOperatorCCValues.currentState)
], BarrierOperatorCCReport.prototype, "currentState", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BarrierOperatorCCValues.position)
], BarrierOperatorCCReport.prototype, "position", void 0);
BarrierOperatorCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BarrierOperatorCommand.Report)
], BarrierOperatorCCReport);
exports.BarrierOperatorCCReport = BarrierOperatorCCReport;
let BarrierOperatorCCGet = class BarrierOperatorCCGet extends BarrierOperatorCC {
};
BarrierOperatorCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BarrierOperatorCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(BarrierOperatorCCReport)
], BarrierOperatorCCGet);
exports.BarrierOperatorCCGet = BarrierOperatorCCGet;
let BarrierOperatorCCSignalingCapabilitiesReport = class BarrierOperatorCCSignalingCapabilitiesReport extends BarrierOperatorCC {
    constructor(host, options) {
        super(host, options);
        this.supportedSubsystemTypes = (0, safe_1.parseBitMask)(this.payload, _Types_1.SubsystemType.Audible);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supported types": this.supportedSubsystemTypes
                    .map((t) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.SubsystemType, t)}`)
                    .join(""),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BarrierOperatorCCValues.supportedSubsystemTypes)
], BarrierOperatorCCSignalingCapabilitiesReport.prototype, "supportedSubsystemTypes", void 0);
BarrierOperatorCCSignalingCapabilitiesReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BarrierOperatorCommand.SignalingCapabilitiesReport)
], BarrierOperatorCCSignalingCapabilitiesReport);
exports.BarrierOperatorCCSignalingCapabilitiesReport = BarrierOperatorCCSignalingCapabilitiesReport;
let BarrierOperatorCCSignalingCapabilitiesGet = class BarrierOperatorCCSignalingCapabilitiesGet extends BarrierOperatorCC {
};
BarrierOperatorCCSignalingCapabilitiesGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BarrierOperatorCommand.SignalingCapabilitiesGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(BarrierOperatorCCSignalingCapabilitiesReport)
], BarrierOperatorCCSignalingCapabilitiesGet);
exports.BarrierOperatorCCSignalingCapabilitiesGet = BarrierOperatorCCSignalingCapabilitiesGet;
let BarrierOperatorCCEventSignalingSet = class BarrierOperatorCCEventSignalingSet extends BarrierOperatorCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.subsystemType = options.subsystemType;
            this.subsystemState = options.subsystemState;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.subsystemType, this.subsystemState]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "subsystem type": (0, safe_2.getEnumMemberName)(_Types_1.SubsystemType, this.subsystemType),
                "subsystem state": (0, safe_2.getEnumMemberName)(_Types_1.SubsystemState, this.subsystemState),
            },
        };
    }
};
BarrierOperatorCCEventSignalingSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BarrierOperatorCommand.EventSignalingSet),
    (0, CommandClassDecorators_1.useSupervision)()
], BarrierOperatorCCEventSignalingSet);
exports.BarrierOperatorCCEventSignalingSet = BarrierOperatorCCEventSignalingSet;
let BarrierOperatorCCEventSignalingReport = class BarrierOperatorCCEventSignalingReport extends BarrierOperatorCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.subsystemType = this.payload[0];
        this.subsystemState = this.payload[1];
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        const signalingStateValue = exports.BarrierOperatorCCValues.signalingState(this.subsystemType);
        this.ensureMetadata(applHost, signalingStateValue);
        this.setValue(applHost, signalingStateValue, this.subsystemState);
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "subsystem type": (0, safe_2.getEnumMemberName)(_Types_1.SubsystemType, this.subsystemType),
                "subsystem state": (0, safe_2.getEnumMemberName)(_Types_1.SubsystemState, this.subsystemState),
            },
        };
    }
};
BarrierOperatorCCEventSignalingReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BarrierOperatorCommand.EventSignalingReport)
], BarrierOperatorCCEventSignalingReport);
exports.BarrierOperatorCCEventSignalingReport = BarrierOperatorCCEventSignalingReport;
let BarrierOperatorCCEventSignalingGet = class BarrierOperatorCCEventSignalingGet extends BarrierOperatorCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.subsystemType = options.subsystemType;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.subsystemType]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "subsystem type": (0, safe_2.getEnumMemberName)(_Types_1.SubsystemType, this.subsystemType),
            },
        };
    }
};
BarrierOperatorCCEventSignalingGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BarrierOperatorCommand.EventSignalingGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(BarrierOperatorCCEventSignalingReport)
], BarrierOperatorCCEventSignalingGet);
exports.BarrierOperatorCCEventSignalingGet = BarrierOperatorCCEventSignalingGet;
//# sourceMappingURL=BarrierOperatorCC.js.map