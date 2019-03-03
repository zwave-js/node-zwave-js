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
    Driver_InvalidCache = 9,
    Controller_MessageDropped = 10,
    Controller_InclusionFailed = 11,
    CC_Invalid = 12,
    CC_NotSupported = 13,
    CC_NoNodeID = 14
}
export declare class ZWaveError extends Error {
    readonly message: string;
    readonly code: ZWaveErrorCodes;
    constructor(message: string, code: ZWaveErrorCodes);
}
