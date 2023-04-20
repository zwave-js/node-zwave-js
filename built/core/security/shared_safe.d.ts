/**
 * Tries to extract a DSK from a scanned QR code. If the string is a valid DSK (prefixed with "zws2dsk:" or unprefixed), the DSK will be returned.
 * This can then be used to initiate an S2 inclusion with pre-filled DSK.
 */
export declare function tryParseDSKFromQRCodeString(qr: string): string | undefined;
export declare function isValidDSK(dsk: string): boolean;
//# sourceMappingURL=shared_safe.d.ts.map