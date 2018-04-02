export declare enum ZWaveErrorCodes {
    PacketFormat_Truncated = 0,
    PacketFormat_Invalid = 1,
    PacketFormat_Checksum = 2,
    Driver_Destroyed = 3,
    Driver_NotReady = 4,
    Driver_InvalidDataReceived = 5,
    Driver_NotSupported = 6,
    Driver_NoPriority = 7,
    Controller_MessageDropped = 8,
    Controller_InclusionFailed = 9,
}
export declare class ZWaveError extends Error {
    readonly message: string;
    readonly code: ZWaveErrorCodes;
    constructor(message: string, code: ZWaveErrorCodes);
}
