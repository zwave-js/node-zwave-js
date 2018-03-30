"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Message_1 = require("../message/Message");
let GetControllerCapabilitiesRequest = class GetControllerCapabilitiesRequest extends Message_1.Message {
};
GetControllerCapabilitiesRequest = __decorate([
    Message_1.messageTypes(Message_1.MessageType.Request, Message_1.FunctionType.GetControllerCapabilities),
    Message_1.expectedResponse(Message_1.FunctionType.GetControllerCapabilities)
], GetControllerCapabilitiesRequest);
exports.GetControllerCapabilitiesRequest = GetControllerCapabilitiesRequest;
let GetControllerCapabilitiesResponse = class GetControllerCapabilitiesResponse extends Message_1.Message {
    get isSecondary() {
        return (this._capabilityFlags & 1 /* Secondary */) !== 0;
    }
    get isUsingHomeIdFromOtherNetwork() {
        return (this._capabilityFlags & 2 /* OnOtherNetwork */) !== 0;
    }
    get isSISPresent() {
        return (this._capabilityFlags & 4 /* SISPresent */) !== 0;
    }
    get wasRealPrimary() {
        return (this._capabilityFlags & 8 /* WasRealPrimary */) !== 0;
    }
    get isStaticUpdateController() {
        return (this._capabilityFlags & 16 /* SUC */) !== 0;
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        // only one byte (flags) payload
        this._capabilityFlags = this.payload[0];
        return ret;
    }
    toJSON() {
        return super.toJSONInherited({
            isSecondary: this.isSecondary,
            isUsingHomeIdFromOtherNetwork: this.isUsingHomeIdFromOtherNetwork,
            isSISPresent: this.isSISPresent,
            wasRealPrimary: this.wasRealPrimary,
            isStaticUpdateController: this.isStaticUpdateController,
        });
    }
};
GetControllerCapabilitiesResponse = __decorate([
    Message_1.messageTypes(Message_1.MessageType.Response, Message_1.FunctionType.GetControllerCapabilities)
], GetControllerCapabilitiesResponse);
exports.GetControllerCapabilitiesResponse = GetControllerCapabilitiesResponse;
