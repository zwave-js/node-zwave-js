"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetControllerCapabilitiesResponse = exports.GetControllerCapabilitiesRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
let GetControllerCapabilitiesRequest = class GetControllerCapabilitiesRequest extends serial_1.Message {
};
GetControllerCapabilitiesRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.GetControllerCapabilities),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.GetControllerCapabilities),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], GetControllerCapabilitiesRequest);
exports.GetControllerCapabilitiesRequest = GetControllerCapabilitiesRequest;
let GetControllerCapabilitiesResponse = class GetControllerCapabilitiesResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            const capabilityFlags = this.payload[0];
            this.isSecondary = !!(capabilityFlags & core_1.ControllerCapabilityFlags.Secondary);
            this.isUsingHomeIdFromOtherNetwork = !!(capabilityFlags & core_1.ControllerCapabilityFlags.OnOtherNetwork);
            this.isSISPresent = !!(capabilityFlags & core_1.ControllerCapabilityFlags.SISPresent);
            this.wasRealPrimary = !!(capabilityFlags & core_1.ControllerCapabilityFlags.WasRealPrimary);
            this.isStaticUpdateController = !!(capabilityFlags & core_1.ControllerCapabilityFlags.SUC);
        }
        else {
            this.isSecondary = options.isSecondary;
            this.isUsingHomeIdFromOtherNetwork =
                options.isUsingHomeIdFromOtherNetwork;
            this.isSISPresent = options.isSISPresent;
            this.wasRealPrimary = options.wasRealPrimary;
            this.isStaticUpdateController = options.isStaticUpdateController;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            (this.isSecondary ? core_1.ControllerCapabilityFlags.Secondary : 0) |
                (this.isUsingHomeIdFromOtherNetwork
                    ? core_1.ControllerCapabilityFlags.OnOtherNetwork
                    : 0) |
                (this.isSISPresent ? core_1.ControllerCapabilityFlags.SISPresent : 0) |
                (this.wasRealPrimary
                    ? core_1.ControllerCapabilityFlags.WasRealPrimary
                    : 0) |
                (this.isStaticUpdateController
                    ? core_1.ControllerCapabilityFlags.SUC
                    : 0),
        ]);
        return super.serialize();
    }
};
GetControllerCapabilitiesResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.GetControllerCapabilities)
], GetControllerCapabilitiesResponse);
exports.GetControllerCapabilitiesResponse = GetControllerCapabilitiesResponse;
//# sourceMappingURL=GetControllerCapabilitiesMessages.js.map