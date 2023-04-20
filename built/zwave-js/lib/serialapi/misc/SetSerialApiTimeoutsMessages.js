"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetSerialApiTimeoutsResponse = exports.SetSerialApiTimeoutsRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
let SetSerialApiTimeoutsRequest = class SetSerialApiTimeoutsRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.ackTimeout = options.ackTimeout;
        this.byteTimeout = options.byteTimeout;
    }
    serialize() {
        this.payload = Buffer.from([
            Math.round(this.ackTimeout / 10),
            Math.round(this.byteTimeout / 10),
        ]);
        return super.serialize();
    }
};
SetSerialApiTimeoutsRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.SetSerialApiTimeouts),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.SetSerialApiTimeouts),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], SetSerialApiTimeoutsRequest);
exports.SetSerialApiTimeoutsRequest = SetSerialApiTimeoutsRequest;
let SetSerialApiTimeoutsResponse = class SetSerialApiTimeoutsResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this._oldAckTimeout = this.payload[0] * 10;
        this._oldByteTimeout = this.payload[1] * 10;
    }
    get oldAckTimeout() {
        return this._oldAckTimeout;
    }
    get oldByteTimeout() {
        return this._oldByteTimeout;
    }
};
SetSerialApiTimeoutsResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.SetSerialApiTimeouts)
], SetSerialApiTimeoutsResponse);
exports.SetSerialApiTimeoutsResponse = SetSerialApiTimeoutsResponse;
//# sourceMappingURL=SetSerialApiTimeoutsMessages.js.map