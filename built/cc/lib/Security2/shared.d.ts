/** @publicAPI */
export declare enum KEXSchemes {
    KEXScheme1 = 1
}
/** @publicAPI */
export declare enum ECDHProfiles {
    Curve25519 = 0
}
/** @publicAPI */
export declare enum KEXFailType {
    NoKeyMatch = 1,
    NoSupportedScheme = 2,
    NoSupportedCurve = 3,
    Decrypt = 5,
    BootstrappingCanceled = 6,
    WrongSecurityLevel = 7,
    KeyNotGranted = 8,
    NoVerify = 9,
    DifferentKey = 10
}
/** @publicAPI */
export declare const inclusionTimeouts: Readonly<{
    readonly TA1: 10000;
    readonly TA2: 10000;
    readonly TA3: 10000;
    readonly TA4: 10000;
    readonly TA5: 10000;
    readonly TAI1: 240000;
    readonly TAI2: 240000;
}>;
//# sourceMappingURL=shared.d.ts.map