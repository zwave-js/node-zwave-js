"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerialAPIStartedRequest = exports.SerialAPIWakeUpReason = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
var SerialAPIWakeUpReason;
(function (SerialAPIWakeUpReason) {
    /** The Z-Wave API Module has been woken up by reset or external interrupt. */
    SerialAPIWakeUpReason[SerialAPIWakeUpReason["Reset"] = 0] = "Reset";
    /** The Z-Wave API Module has been woken up by a timer. */
    SerialAPIWakeUpReason[SerialAPIWakeUpReason["WakeUpTimer"] = 1] = "WakeUpTimer";
    /** The Z-Wave API Module has been woken up by a Wake Up Beam. */
    SerialAPIWakeUpReason[SerialAPIWakeUpReason["WakeUpBeam"] = 2] = "WakeUpBeam";
    /** The Z-Wave API Module has been woken up by a reset triggered by the watchdog. */
    SerialAPIWakeUpReason[SerialAPIWakeUpReason["WatchdogReset"] = 3] = "WatchdogReset";
    /** The Z-Wave API Module has been woken up by an external interrupt. */
    SerialAPIWakeUpReason[SerialAPIWakeUpReason["ExternalInterrupt"] = 4] = "ExternalInterrupt";
    /** The Z-Wave API Module has been woken up by a powering up. */
    SerialAPIWakeUpReason[SerialAPIWakeUpReason["PowerUp"] = 5] = "PowerUp";
    /** The Z-Wave API Module has been woken up by USB Suspend. */
    SerialAPIWakeUpReason[SerialAPIWakeUpReason["USBSuspend"] = 6] = "USBSuspend";
    /** The Z-Wave API Module has been woken up by a reset triggered by software. */
    SerialAPIWakeUpReason[SerialAPIWakeUpReason["SoftwareReset"] = 7] = "SoftwareReset";
    /** The Z-Wave API Module has been woken up by an emergency watchdog reset. */
    SerialAPIWakeUpReason[SerialAPIWakeUpReason["EmergencyWatchdogReset"] = 8] = "EmergencyWatchdogReset";
    /** The Z-Wave API Module has been woken up by a reset triggered by brownout circuit. */
    SerialAPIWakeUpReason[SerialAPIWakeUpReason["BrownoutCircuit"] = 9] = "BrownoutCircuit";
    /** The Z-Wave API Module has been woken up by an unknown reason. */
    SerialAPIWakeUpReason[SerialAPIWakeUpReason["Unknown"] = 255] = "Unknown";
})(SerialAPIWakeUpReason = exports.SerialAPIWakeUpReason || (exports.SerialAPIWakeUpReason = {}));
let SerialAPIStartedRequest = class SerialAPIStartedRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.supportsLongRange = false;
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            this.wakeUpReason = this.payload[0];
            this.watchdogEnabled = this.payload[1] === 0x01;
            const deviceOption = this.payload[2];
            this.isListening = !!(deviceOption & 128);
            this.genericDeviceClass = this.payload[3];
            this.specificDeviceClass = this.payload[4];
            // Parse list of CCs
            const numCCBytes = this.payload[5];
            const ccBytes = this.payload.slice(6, 6 + numCCBytes);
            const ccList = (0, core_1.parseCCList)(ccBytes);
            this.supportedCCs = ccList.supportedCCs;
            this.controlledCCs = ccList.controlledCCs;
            // Parse supported protocols
            if (this.payload.length >= 6 + numCCBytes + 1) {
                const protocols = this.payload[6 + numCCBytes];
                this.supportsLongRange = !!(protocols & 0b1);
            }
        }
        else {
            this.wakeUpReason = options.wakeUpReason;
            this.watchdogEnabled = options.watchdogEnabled;
            this.isListening = options.isListening;
            this.genericDeviceClass = options.genericDeviceClass;
            this.specificDeviceClass = options.specificDeviceClass;
            this.supportedCCs = options.supportedCCs;
            this.controlledCCs = options.controlledCCs;
            this.supportsLongRange = options.supportsLongRange;
        }
    }
    serialize() {
        const ccList = (0, core_1.encodeCCList)(this.supportedCCs, this.controlledCCs);
        const numCCBytes = ccList.length;
        this.payload = Buffer.allocUnsafe(6 + numCCBytes + 1);
        this.payload[0] = this.wakeUpReason;
        this.payload[1] = this.watchdogEnabled ? 0b1 : 0;
        this.payload[2] = this.isListening ? 128 : 0;
        this.payload[3] = this.genericDeviceClass;
        this.payload[4] = this.specificDeviceClass;
        this.payload[5] = numCCBytes;
        ccList.copy(this.payload, 6);
        this.payload[6 + numCCBytes] = this.supportsLongRange ? 0b1 : 0;
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "wake up reason": (0, shared_1.getEnumMemberName)(SerialAPIWakeUpReason, this.wakeUpReason),
                "watchdog enabled": this.watchdogEnabled,
                "generic device class": (0, shared_1.num2hex)(this.genericDeviceClass),
                "specific device class": (0, shared_1.num2hex)(this.specificDeviceClass),
                "always listening": this.isListening,
                // Not sure why this information is needed here. At the very least it stretches the log
                // "supported CCs": this.supportedCCs
                // 	.map((cc) => `\n· ${getCCName(cc)}`)
                // 	.join(""),
                // "controlled CCs": this.controlledCCs
                // 	.map((cc) => `\n· ${getCCName(cc)}`)
                // 	.join(""),
                "supports Long Range": this.supportsLongRange,
            },
        };
    }
};
SerialAPIStartedRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.SerialAPIStarted)
    // This does not expect a response. The controller sends us this when the Serial API is started
    ,
    (0, serial_1.priority)(core_1.MessagePriority.Normal)
], SerialAPIStartedRequest);
exports.SerialAPIStartedRequest = SerialAPIStartedRequest;
//# sourceMappingURL=SerialAPIStartedRequest.js.map