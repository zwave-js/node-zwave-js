export declare enum ZWaveErrorCodes {
    PacketFormat_Truncated = 0,
    PacketFormat_Invalid = 1,
    PacketFormat_Checksum = 2,
}
export declare class ZWaveError extends Error {
    readonly message: string;
    readonly code: ZWaveErrorCodes;
    constructor(message: string, code: ZWaveErrorCodes);
}
