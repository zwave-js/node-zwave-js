"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageIsPing = exports.NoOperationCC = exports.NoOperationCCAPI = void 0;
const safe_1 = require("@zwave-js/core/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const ICommandClassContainer_1 = require("../lib/ICommandClassContainer");
// @noSetValueAPI This CC has no set-type commands
// @noInterview There's nothing to interview here
let NoOperationCCAPI = class NoOperationCCAPI extends API_1.PhysicalCCAPI {
    async send() {
        await this.applHost.sendCommand(new NoOperationCC(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        }), {
            ...this.commandOptions,
            // Don't retry sending ping packets
            maxSendAttempts: 1,
            // Pings have their own dedicated priority, since they
            // are used to test whether a node is awake/alive
            priority: safe_1.MessagePriority.Ping,
        });
    }
};
NoOperationCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["No Operation"])
], NoOperationCCAPI);
exports.NoOperationCCAPI = NoOperationCCAPI;
let NoOperationCC = class NoOperationCC extends CommandClass_1.CommandClass {
};
NoOperationCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["No Operation"]),
    (0, CommandClassDecorators_1.implementedVersion)(1)
], NoOperationCC);
exports.NoOperationCC = NoOperationCC;
/**
 * @publicAPI
 * Tests if a given message is a ping
 */
function messageIsPing(msg) {
    return (0, ICommandClassContainer_1.isCommandClassContainer)(msg) && msg.command instanceof NoOperationCC;
}
exports.messageIsPing = messageIsPing;
//# sourceMappingURL=NoOperationCC.js.map