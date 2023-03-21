"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InclusionControllerCCInitiate = exports.InclusionControllerCCComplete = exports.InclusionControllerCCAPI = exports.InclusionControllerCC = void 0;
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const _Types_1 = require("../lib/_Types");
let InclusionControllerCC = class InclusionControllerCC extends CommandClass_1.CommandClass {
};
InclusionControllerCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(core_1.CommandClasses["Inclusion Controller"]),
    (0, CommandClassDecorators_1.implementedVersion)(1)
], InclusionControllerCC);
exports.InclusionControllerCC = InclusionControllerCC;
let InclusionControllerCCAPI = class InclusionControllerCCAPI extends API_1.CCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.InclusionControllerCommand.Initiate:
            case _Types_1.InclusionControllerCommand.Complete:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    /** Instruct the target to initiate the given inclusion step for the given node */
    async initiateStep(nodeId, step) {
        this.assertSupportsCommand(_Types_1.InclusionControllerCommand, _Types_1.InclusionControllerCommand.Initiate);
        const cc = new InclusionControllerCCInitiate(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            includedNodeId: nodeId,
            step,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
    /** Indicate to the other node that the given inclusion step has been completed */
    async completeStep(step, status) {
        this.assertSupportsCommand(_Types_1.InclusionControllerCommand, _Types_1.InclusionControllerCommand.Complete);
        const cc = new InclusionControllerCCComplete(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            step,
            status,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
};
InclusionControllerCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(core_1.CommandClasses["Inclusion Controller"])
], InclusionControllerCCAPI);
exports.InclusionControllerCCAPI = InclusionControllerCCAPI;
let InclusionControllerCCComplete = class InclusionControllerCCComplete extends InclusionControllerCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.step = this.payload[0];
            core_1.validatePayload.withReason("Invalid inclusion controller step")(this.step in _Types_1.InclusionControllerStep);
            this.status = this.payload[1];
        }
        else {
            this.step = options.step;
            this.status = options.status;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.step, this.status]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                step: (0, shared_1.getEnumMemberName)(_Types_1.InclusionControllerStep, this.step),
                status: (0, shared_1.getEnumMemberName)(_Types_1.InclusionControllerStatus, this.status),
            },
        };
    }
};
InclusionControllerCCComplete = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.InclusionControllerCommand.Complete)
], InclusionControllerCCComplete);
exports.InclusionControllerCCComplete = InclusionControllerCCComplete;
let InclusionControllerCCInitiate = class InclusionControllerCCInitiate extends InclusionControllerCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.includedNodeId = this.payload[0];
            this.step = this.payload[1];
            core_1.validatePayload.withReason("Invalid inclusion controller step")(this.step in _Types_1.InclusionControllerStep);
        }
        else {
            this.includedNodeId = options.includedNodeId;
            this.step = options.step;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.includedNodeId, this.step]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "included node id": this.includedNodeId,
                step: (0, shared_1.getEnumMemberName)(_Types_1.InclusionControllerStep, this.step),
            },
        };
    }
};
InclusionControllerCCInitiate = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.InclusionControllerCommand.Initiate)
], InclusionControllerCCInitiate);
exports.InclusionControllerCCInitiate = InclusionControllerCCInitiate;
//# sourceMappingURL=InclusionControllerCC.js.map