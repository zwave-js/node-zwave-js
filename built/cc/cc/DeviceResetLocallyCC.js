"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceResetLocallyCCNotification = exports.DeviceResetLocallyCC = void 0;
const safe_1 = require("@zwave-js/core/safe");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const _Types_1 = require("../lib/_Types");
// @noAPI: We can only receive this command
// @noInterview: We can only receive this command
let DeviceResetLocallyCC = class DeviceResetLocallyCC extends CommandClass_1.CommandClass {
};
DeviceResetLocallyCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Device Reset Locally"]),
    (0, CommandClassDecorators_1.implementedVersion)(1)
], DeviceResetLocallyCC);
exports.DeviceResetLocallyCC = DeviceResetLocallyCC;
let DeviceResetLocallyCCNotification = class DeviceResetLocallyCCNotification extends DeviceResetLocallyCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // We need to make sure this doesn't get parsed accidentally, e.g. because of a bit flip
            // This CC has no payload
            (0, safe_1.validatePayload)(this.payload.length === 0);
            // It MUST be issued by the root device
            (0, safe_1.validatePayload)(this.endpointIndex === 0);
        }
    }
};
DeviceResetLocallyCCNotification = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.DeviceResetLocallyCommand.Notification)
], DeviceResetLocallyCCNotification);
exports.DeviceResetLocallyCCNotification = DeviceResetLocallyCCNotification;
//# sourceMappingURL=DeviceResetLocallyCC.js.map