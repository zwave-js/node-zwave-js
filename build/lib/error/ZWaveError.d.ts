export declare enum ZWaveErrorCodes {
    PacketFormat_Truncated = 0,
    PacketFormat_Invalid = 1,
    PacketFormat_Checksum = 2,
    Driver_Reset = 3,
    Driver_Destroyed = 4,
    Driver_NotReady = 5,
    Driver_InvalidDataReceived = 6,
    Driver_NotSupported = 7,
    Driver_NoPriority = 8,
    Controller_MessageDropped = 9,
    Controller_InclusionFailed = 10,
}
export declare class ZWaveError extends Error {
    readonly message: string;
    readonly code: ZWaveErrorCodes;
    constructor(message: string, code: ZWaveErrorCodes);
}
