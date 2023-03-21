"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SupervisionCC_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupervisionCCGet = exports.SupervisionCCReport = exports.SupervisionCC = exports.SupervisionCCAPI = exports.SupervisionCCValues = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.SupervisionCCValues = Object.freeze({
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses.Supervision, {
        // Used to remember whether a node supports supervision-encapsulation of the given CC
        ...Values_1.V.dynamicPropertyAndKeyWithName("ccSupported", "ccSupported", (ccId) => ccId, ({ property, propertyKey }) => property === "commandSupported" &&
            typeof propertyKey === "number", undefined, { internal: true, supportsEndpoints: false }),
    }),
});
// @noSetValueAPI - This CC has no values to set
// @noInterview - This CC is only used for encapsulation
// @noValidateArgs - Encapsulation CCs are used internally and too frequently that we
// want to pay the cost of validating each call
let SupervisionCCAPI = class SupervisionCCAPI extends API_1.PhysicalCCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.SupervisionCommand.Get:
            case _Types_1.SupervisionCommand.Report:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    async sendReport(options) {
        // Here we don't assert support - some devices only half-support Supervision, so we treat them
        // as if they don't support it. We still need to be able to respond to the Get command though.
        const { encapsulationFlags = safe_1.EncapsulationFlags.None, ...cmdOptions } = options;
        const cc = new SupervisionCCReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...cmdOptions,
        });
        // The report must be sent back with the same encapsulation order
        cc.encapsulationFlags = encapsulationFlags;
        try {
            await this.applHost.sendCommand(cc, {
                ...this.commandOptions,
                // Supervision Reports must be prioritized over normal messages
                priority: safe_1.MessagePriority.Supervision,
                // But we don't want to wait for an ACK because this can lock up the network for seconds
                // if the target node is asleep or unreachable
                transmitOptions: safe_1.TransmitOptions.DEFAULT_NOACK,
                // Only try sending the report once. If it fails, the node will ask again
                maxSendAttempts: 1,
            });
        }
        catch (e) {
            if ((0, safe_1.isTransmissionError)(e)) {
                // Swallow errors related to transmission failures
                return;
            }
            else {
                // Pass other errors through
                throw e;
            }
        }
    }
};
SupervisionCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Supervision)
], SupervisionCCAPI);
exports.SupervisionCCAPI = SupervisionCCAPI;
let SupervisionCC = SupervisionCC_1 = class SupervisionCC extends CommandClass_1.CommandClass {
    /** Tests if a command should be supervised and thus requires encapsulation */
    static requiresEncapsulation(cc) {
        return (!!(cc.encapsulationFlags & safe_1.EncapsulationFlags.Supervision) &&
            !(cc instanceof SupervisionCCGet) &&
            !(cc instanceof SupervisionCCReport));
    }
    /** Encapsulates a command that targets a specific endpoint */
    static encapsulate(host, cc, requestStatusUpdates = true) {
        if (!cc.isSinglecast()) {
            throw new safe_1.ZWaveError(`Supervision is only possible for singlecast commands!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const ret = new SupervisionCCGet(host, {
            nodeId: cc.nodeId,
            // Supervision CC is wrapped inside MultiChannel CCs, so the endpoint must be copied
            endpoint: cc.endpointIndex,
            encapsulated: cc,
            requestStatusUpdates,
        });
        // Copy the encapsulation flags from the encapsulated command
        // but omit Supervision, since we're doing that right now
        ret.encapsulationFlags =
            cc.encapsulationFlags & ~safe_1.EncapsulationFlags.Supervision;
        return ret;
    }
    /**
     * Given a CC instance, this returns the Supervision session ID which is used for this command.
     * Returns `undefined` when there is no session ID or the command was sent as multicast.
     */
    static getSessionId(command) {
        if (command.isEncapsulatedWith(safe_1.CommandClasses.Supervision, _Types_1.SupervisionCommand.Get)) {
            const supervisionEncapsulation = command.getEncapsulatingCC(safe_1.CommandClasses.Supervision, _Types_1.SupervisionCommand.Get);
            if (!supervisionEncapsulation.isMulticast()) {
                return supervisionEncapsulation.sessionId;
            }
        }
    }
    /**
     * Returns whether a node supports the given CC with Supervision encapsulation.
     */
    static getCCSupportedWithSupervision(applHost, endpoint, ccId) {
        // By default assume supervision is supported for all CCs, unless we've remembered one not to be
        return (applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.SupervisionCCValues.ccSupported(ccId).endpoint(endpoint.index)) ?? true);
    }
    /**
     * Remembers whether a node supports the given CC with Supervision encapsulation.
     */
    static setCCSupportedWithSupervision(applHost, endpoint, ccId, supported) {
        applHost
            .getValueDB(endpoint.nodeId)
            .setValue(exports.SupervisionCCValues.ccSupported(ccId).endpoint(endpoint.index), supported);
    }
    /** Returns whether this is a valid command to send supervised */
    static mayUseSupervision(applHost, command) {
        // Supervision may only be used for singlecast CCs that expect no response
        // The specs mention that Supervision CAN be used for S2 multicast, but conveniently fail to explain how to respond to that.
        if (!command.isSinglecast())
            return false;
        if (command.expectsCCResponse())
            return false;
        // with a valid node and endpoint
        const node = command.getNode(applHost);
        if (!node)
            return false;
        const endpoint = command.getEndpoint(applHost);
        if (!endpoint)
            return false;
        // and only if ...
        return (
        // ... the node supports it
        node.supportsCC(safe_1.CommandClasses.Supervision) &&
            // ... the command is marked as "should use supervision"
            (0, CommandClassDecorators_1.shouldUseSupervision)(command) &&
            // ... and we haven't previously determined that the node doesn't properly support it
            SupervisionCC_1.getCCSupportedWithSupervision(applHost, endpoint, command.ccId));
    }
};
SupervisionCC = SupervisionCC_1 = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Supervision),
    (0, CommandClassDecorators_1.implementedVersion)(2)
], SupervisionCC);
exports.SupervisionCC = SupervisionCC;
let SupervisionCCReport = class SupervisionCCReport extends SupervisionCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 3);
            this.moreUpdatesFollow = !!(this.payload[0] & 128);
            this.requestWakeUpOnDemand = !!(this.payload[0] & 64);
            this.sessionId = this.payload[0] & 0b111111;
            this.status = this.payload[1];
            this.duration = safe_1.Duration.parseReport(this.payload[2]);
        }
        else {
            this.moreUpdatesFollow = options.moreUpdatesFollow;
            this.requestWakeUpOnDemand = !!options.requestWakeUpOnDemand;
            this.sessionId = options.sessionId;
            this.status = options.status;
            if (options.status === safe_1.SupervisionStatus.Working) {
                this.duration = options.duration;
            }
            else {
                this.duration = new safe_1.Duration(0, "seconds");
            }
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([
                (this.moreUpdatesFollow ? 128 : 0) |
                    (this.requestWakeUpOnDemand ? 64 : 0) |
                    (this.sessionId & 0b111111),
                this.status,
            ]),
        ]);
        if (this.duration) {
            this.payload = Buffer.concat([
                this.payload,
                Buffer.from([this.duration.serializeReport()]),
            ]);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "session id": this.sessionId,
            "more updates follow": this.moreUpdatesFollow,
            status: (0, safe_2.getEnumMemberName)(safe_1.SupervisionStatus, this.status),
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
SupervisionCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SupervisionCommand.Report)
], SupervisionCCReport);
exports.SupervisionCCReport = SupervisionCCReport;
function testResponseForSupervisionCCGet(sent, received) {
    return received.sessionId === sent.sessionId;
}
let SupervisionCCGet = class SupervisionCCGet extends SupervisionCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 3);
            this.requestStatusUpdates = !!(this.payload[0] & 128);
            this.sessionId = this.payload[0] & 0b111111;
            this.encapsulated = CommandClass_1.CommandClass.from(this.host, {
                data: this.payload.slice(2),
                fromEncapsulation: true,
                encapCC: this,
                origin: options.origin,
            });
        }
        else {
            this.sessionId = host.getNextSupervisionSessionId();
            this.requestStatusUpdates = options.requestStatusUpdates;
            this.encapsulated = options.encapsulated;
            options.encapsulated.encapsulatingCC = this;
        }
    }
    serialize() {
        const encapCC = this.encapsulated.serialize();
        this.payload = Buffer.concat([
            Buffer.from([
                (this.requestStatusUpdates ? 128 : 0) |
                    (this.sessionId & 0b111111),
                encapCC.length,
            ]),
            encapCC,
        ]);
        return super.serialize();
    }
    computeEncapsulationOverhead() {
        // Supervision CC adds two bytes (control byte + cc length)
        return super.computeEncapsulationOverhead() + 2;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "session id": this.sessionId,
                "request updates": this.requestStatusUpdates,
            },
        };
    }
};
SupervisionCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.SupervisionCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(SupervisionCCReport, testResponseForSupervisionCCGet)
], SupervisionCCGet);
exports.SupervisionCCGet = SupervisionCCGet;
//# sourceMappingURL=SupervisionCC.js.map