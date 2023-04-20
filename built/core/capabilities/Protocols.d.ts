export declare enum Protocols {
    ZWave = 0,
    ZWaveLongRange = 1
}
export declare enum ZWaveDataRate {
    "9k6" = 1,
    "40k" = 2,
    "100k" = 3
}
export declare enum ProtocolDataRate {
    ZWave_9k6 = 1,
    ZWave_40k = 2,
    ZWave_100k = 3,
    LongRange_100k = 4
}
export declare function protocolDataRateToString(rate: ProtocolDataRate): string;
export declare enum RouteProtocolDataRate {
    Unspecified = 0,
    ZWave_9k6 = 1,
    ZWave_40k = 2,
    ZWave_100k = 3,
    LongRange_100k = 4
}
export declare const protocolDataRateMask = 7;
export declare enum ProtocolType {
    "Z-Wave" = 0,
    "Z-Wave AV" = 1,
    "Z-Wave for IP" = 2
}
//# sourceMappingURL=Protocols.d.ts.map