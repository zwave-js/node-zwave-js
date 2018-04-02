"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ZWaveErrorCodes;
(function (ZWaveErrorCodes) {
    ZWaveErrorCodes[ZWaveErrorCodes["PacketFormat_Truncated"] = 0] = "PacketFormat_Truncated";
    ZWaveErrorCodes[ZWaveErrorCodes["PacketFormat_Invalid"] = 1] = "PacketFormat_Invalid";
    ZWaveErrorCodes[ZWaveErrorCodes["PacketFormat_Checksum"] = 2] = "PacketFormat_Checksum";
    ZWaveErrorCodes[ZWaveErrorCodes["Driver_Destroyed"] = 3] = "Driver_Destroyed";
    ZWaveErrorCodes[ZWaveErrorCodes["Driver_NotReady"] = 4] = "Driver_NotReady";
    ZWaveErrorCodes[ZWaveErrorCodes["Driver_InvalidDataReceived"] = 5] = "Driver_InvalidDataReceived";
    ZWaveErrorCodes[ZWaveErrorCodes["Driver_NotSupported"] = 6] = "Driver_NotSupported";
    ZWaveErrorCodes[ZWaveErrorCodes["Driver_NoPriority"] = 7] = "Driver_NoPriority";
    ZWaveErrorCodes[ZWaveErrorCodes["Controller_MessageDropped"] = 8] = "Controller_MessageDropped";
    ZWaveErrorCodes[ZWaveErrorCodes["Controller_InclusionFailed"] = 9] = "Controller_InclusionFailed";
})(ZWaveErrorCodes = exports.ZWaveErrorCodes || (exports.ZWaveErrorCodes = {}));
class ZWaveError extends Error {
    constructor(message, code) {
        super(message);
        this.message = message;
        this.code = code;
        // We need to set the prototype explicitly
        Object.setPrototypeOf(this, ZWaveError.prototype);
    }
}
exports.ZWaveError = ZWaveError;
