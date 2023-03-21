"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardResetCallback = exports.HardResetRequest = exports.HardResetRequestBase = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
let HardResetRequestBase = class HardResetRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            if (options.origin === serial_1.MessageOrigin.Host &&
                new.target !== HardResetRequest) {
                return new HardResetRequest(host, options);
            }
            else if (options.origin !== serial_1.MessageOrigin.Host &&
                new.target !== HardResetCallback) {
                return new HardResetCallback(host, options);
            }
        }
        super(host, options);
    }
};
HardResetRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.HardReset),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], HardResetRequestBase);
exports.HardResetRequestBase = HardResetRequestBase;
let HardResetRequest = class HardResetRequest extends HardResetRequestBase {
    serialize() {
        this.payload = Buffer.from([this.callbackId]);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "callback id": this.callbackId,
            },
        };
    }
};
HardResetRequest = __decorate([
    (0, serial_1.expectedCallback)(serial_1.FunctionType.HardReset)
], HardResetRequest);
exports.HardResetRequest = HardResetRequest;
class HardResetCallback extends HardResetRequestBase {
    constructor(host, options) {
        super(host, options);
        this.callbackId = this.payload[0];
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "callback id": this.callbackId,
            },
        };
    }
}
exports.HardResetCallback = HardResetCallback;
//# sourceMappingURL=HardResetRequest.js.map