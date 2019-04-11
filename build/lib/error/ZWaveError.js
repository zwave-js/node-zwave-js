"use strict";
/* eslint-disable @typescript-eslint/camelcase */
Object.defineProperty(exports, "__esModule", { value: true });
var ZWaveErrorCodes;
(function (ZWaveErrorCodes) {
    ZWaveErrorCodes[ZWaveErrorCodes["PacketFormat_Truncated"] = 0] = "PacketFormat_Truncated";
    ZWaveErrorCodes[ZWaveErrorCodes["PacketFormat_Invalid"] = 1] = "PacketFormat_Invalid";
    ZWaveErrorCodes[ZWaveErrorCodes["PacketFormat_Checksum"] = 2] = "PacketFormat_Checksum";
    ZWaveErrorCodes[ZWaveErrorCodes["Driver_Reset"] = 3] = "Driver_Reset";
    ZWaveErrorCodes[ZWaveErrorCodes["Driver_Destroyed"] = 4] = "Driver_Destroyed";
    ZWaveErrorCodes[ZWaveErrorCodes["Driver_NotReady"] = 5] = "Driver_NotReady";
    ZWaveErrorCodes[ZWaveErrorCodes["Driver_InvalidDataReceived"] = 6] = "Driver_InvalidDataReceived";
    ZWaveErrorCodes[ZWaveErrorCodes["Driver_NotSupported"] = 7] = "Driver_NotSupported";
    ZWaveErrorCodes[ZWaveErrorCodes["Driver_NoPriority"] = 8] = "Driver_NoPriority";
    ZWaveErrorCodes[ZWaveErrorCodes["Driver_InvalidCache"] = 9] = "Driver_InvalidCache";
    ZWaveErrorCodes[ZWaveErrorCodes["Controller_MessageDropped"] = 10] = "Controller_MessageDropped";
    ZWaveErrorCodes[ZWaveErrorCodes["Controller_InclusionFailed"] = 11] = "Controller_InclusionFailed";
    ZWaveErrorCodes[ZWaveErrorCodes["Node_NotResponding"] = 12] = "Node_NotResponding";
    ZWaveErrorCodes[ZWaveErrorCodes["CC_Invalid"] = 13] = "CC_Invalid";
    ZWaveErrorCodes[ZWaveErrorCodes["CC_NotSupported"] = 14] = "CC_NotSupported";
    ZWaveErrorCodes[ZWaveErrorCodes["CC_NoNodeID"] = 15] = "CC_NoNodeID";
    ZWaveErrorCodes[ZWaveErrorCodes["Arithmetic"] = 16] = "Arithmetic";
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
