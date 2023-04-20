/// <reference types="node" />
/** Encrypts a payload using AES-128-ECB (as described in SDS10865) */
export declare function encryptAES128ECB(plaintext: Buffer, key: Buffer): Buffer;
/** Encrypts a payload using AES-OFB (as described in SDS10865) */
export declare const encryptAES128OFB: (input: Buffer, key: Buffer, iv: Buffer) => Buffer;
/** Decrypts a payload using AES-OFB (as described in SDS10865) */
export declare const decryptAES128OFB: (input: Buffer, key: Buffer, iv: Buffer) => Buffer;
/** Computes a message authentication code for Security S0 (as described in SDS10865) */
export declare function computeMAC(authData: Buffer, key: Buffer, iv?: Buffer): Buffer;
/** Decodes a DER-encoded x25519 key (PKCS#8 or SPKI) */
export declare function decodeX25519KeyDER(key: Buffer): Buffer;
/** Encodes an x25519 key from a raw buffer with DER/PKCS#8 */
export declare function encodeX25519KeyDERPKCS8(key: Buffer): Buffer;
/** Encodes an x25519 key from a raw buffer with DER/SPKI */
export declare function encodeX25519KeyDERSPKI(key: Buffer): Buffer;
/** Computes a message authentication code for Security S2 (as described in SDS13783) */
export declare function computeCMAC(message: Buffer, key: Buffer): Buffer;
/** Computes the Pseudo Random Key (PRK) used to derive auth, encryption and nonce keys */
export declare function computePRK(ecdhSharedSecret: Buffer, pubKeyA: Buffer, pubKeyB: Buffer): Buffer;
/** Derives the temporary auth, encryption and nonce keys from the PRK */
export declare function deriveTempKeys(PRK: Buffer): {
    tempKeyCCM: Buffer;
    tempPersonalizationString: Buffer;
};
/** Derives the CCM, MPAN keys and the personalization string from the permanent network key (PNK) */
export declare function deriveNetworkKeys(PNK: Buffer): {
    keyCCM: Buffer;
    keyMPAN: Buffer;
    personalizationString: Buffer;
};
/** Computes the Pseudo Random Key (PRK) used to derive the mixed entropy input (MEI) for nonce generation */
export declare function computeNoncePRK(senderEI: Buffer, receiverEI: Buffer): Buffer;
/** Derives the MEI from the nonce PRK */
export declare function deriveMEI(noncePRK: Buffer): Buffer;
export declare const SECURITY_S2_AUTH_TAG_LENGTH = 8;
export declare function encryptAES128CCM(key: Buffer, iv: Buffer, plaintext: Buffer, additionalData: Buffer, authTagLength: number): {
    ciphertext: Buffer;
    authTag: Buffer;
};
export declare function decryptAES128CCM(key: Buffer, iv: Buffer, ciphertext: Buffer, additionalData: Buffer, authTag: Buffer): {
    plaintext: Buffer;
    authOK: boolean;
};
//# sourceMappingURL=crypto.d.ts.map