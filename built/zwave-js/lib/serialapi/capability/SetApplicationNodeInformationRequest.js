"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetApplicationNodeInformationRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
let SetApplicationNodeInformationRequest = class SetApplicationNodeInformationRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.isListening = options.isListening;
        this.genericDeviceClass = options.genericDeviceClass;
        this.specificDeviceClass = options.specificDeviceClass;
        this.supportedCCs = options.supportedCCs;
        this.controlledCCs = options.controlledCCs;
    }
    serialize() {
        const ccList = [
            ...this.supportedCCs,
            core_1.CommandClasses["Support/Control Mark"],
            ...this.controlledCCs,
        ];
        const ccListLength = Math.min(ccList.length, 35);
        this.payload = Buffer.from([
            this.isListening ? 0x01 : 0,
            this.genericDeviceClass,
            this.specificDeviceClass,
            ccListLength,
            ...ccList.slice(0, ccListLength),
        ]);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "is listening": this.isListening,
                "generic device class": (0, shared_1.num2hex)(this.genericDeviceClass),
                "specific device class": (0, shared_1.num2hex)(this.specificDeviceClass),
                "supported CCs": this.supportedCCs
                    .map((cc) => `\n· ${(0, core_1.getCCName)(cc)}`)
                    .join(""),
                "controlled CCs": this.controlledCCs
                    .map((cc) => `\n· ${(0, core_1.getCCName)(cc)}`)
                    .join(""),
            },
        };
    }
};
SetApplicationNodeInformationRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.SetApplicationNodeInformation),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], SetApplicationNodeInformationRequest);
exports.SetApplicationNodeInformationRequest = SetApplicationNodeInformationRequest;
//# sourceMappingURL=SetApplicationNodeInformationRequest.js.map