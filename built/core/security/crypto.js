"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptAES128CCM = exports.encryptAES128CCM = exports.SECURITY_S2_AUTH_TAG_LENGTH = exports.deriveMEI = exports.computeNoncePRK = exports.deriveNetworkKeys = exports.deriveTempKeys = exports.computePRK = exports.computeCMAC = exports.encodeX25519KeyDERSPKI = exports.encodeX25519KeyDERPKCS8 = exports.decodeX25519KeyDER = exports.computeMAC = exports.decryptAES128OFB = exports.encryptAES128OFB = exports.encryptAES128ECB = void 0;
const crypto = __importStar(require("crypto"));
const bufferUtils_1 = require("./bufferUtils");
function encrypt(algorithm, blockSize, trimToInputLength, input, key, iv) {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    cipher.setAutoPadding(false);
    const { output: plaintext, paddingLength } = (0, bufferUtils_1.zeroPad)(input, blockSize);
    const ret = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    if (trimToInputLength && paddingLength > 0) {
        return ret.slice(0, -paddingLength);
    }
    else {
        return ret;
    }
}
function decrypt(algorithm, blockSize, trimToInputLength, input, key, iv) {
    const cipher = crypto.createDecipheriv(algorithm, key, iv);
    cipher.setAutoPadding(false);
    const { output: ciphertext, paddingLength } = (0, bufferUtils_1.zeroPad)(input, blockSize);
    const ret = Buffer.concat([cipher.update(ciphertext), cipher.final()]);
    if (trimToInputLength && paddingLength > 0) {
        return ret.slice(0, -paddingLength);
    }
    else {
        return ret;
    }
}
/** Encrypts a payload using AES-128-ECB (as described in SDS10865) */
function encryptAES128ECB(plaintext, key) {
    return encrypt("aes-128-ecb", 16, false, plaintext, key, Buffer.from([]));
}
exports.encryptAES128ECB = encryptAES128ECB;
/** Encrypts a payload using AES-OFB (as described in SDS10865) */
exports.encryptAES128OFB = encrypt.bind(undefined, "aes-128-ofb", 16, true);
/** Decrypts a payload using AES-OFB (as described in SDS10865) */
exports.decryptAES128OFB = decrypt.bind(undefined, "aes-128-ofb", 16, true);
/** Computes a message authentication code for Security S0 (as described in SDS10865) */
function computeMAC(authData, key, iv = Buffer.alloc(16, 0)) {
    const ciphertext = encrypt("aes-128-cbc", 16, false, authData, key, iv);
    // The MAC is the first 8 bytes of the last 16 byte block
    return ciphertext.slice(-16, -8);
}
exports.computeMAC = computeMAC;
/** Decodes a DER-encoded x25519 key (PKCS#8 or SPKI) */
function decodeX25519KeyDER(key) {
    // We could parse this with asn1js but that doesn't seem necessary for now
    return key.slice(-32);
}
exports.decodeX25519KeyDER = decodeX25519KeyDER;
/** Encodes an x25519 key from a raw buffer with DER/PKCS#8 */
function encodeX25519KeyDERPKCS8(key) {
    // We could encode this with asn1js but that doesn't seem necessary for now
    return Buffer.concat([
        Buffer.from("302e020100300506032b656e04220420", "hex"),
        key,
    ]);
}
exports.encodeX25519KeyDERPKCS8 = encodeX25519KeyDERPKCS8;
/** Encodes an x25519 key from a raw buffer with DER/SPKI */
function encodeX25519KeyDERSPKI(key) {
    // We could encode this with asn1js but that doesn't seem necessary for now
    return Buffer.concat([Buffer.from("302a300506032b656e032100", "hex"), key]);
}
exports.encodeX25519KeyDERSPKI = encodeX25519KeyDERSPKI;
// Decoding with asn1js for reference:
// const asn1 = require("asn1js");
// const public = asn1.fromBER(keypair.publicKey.buffer);
// const private = asn1.fromBER(keypair.privateKey.buffer);
// const privateKeyBER = private.result.valueBlock.value[2].valueBlock.valueHex;
// const privateKey = Buffer.from(
// 	asn1.fromBER(privateKeyBER).result.valueBlock.valueHex,
// );
// const publicKey = Buffer.from(
// 	public.result.valueBlock.value[1].valueBlock.valueHex,
// );
const Z128 = Buffer.alloc(16, 0);
const R128 = Buffer.from("00000000000000000000000000000087", "hex");
function generateAES128CMACSubkeys(key) {
    // NIST SP 800-38B, chapter 6.1
    const L = encryptAES128ECB(Z128, key);
    const k1 = !(L[0] & 0x80) ? (0, bufferUtils_1.leftShift1)(L) : (0, bufferUtils_1.xor)((0, bufferUtils_1.leftShift1)(L), R128);
    const k2 = !(k1[0] & 0x80) ? (0, bufferUtils_1.leftShift1)(k1) : (0, bufferUtils_1.xor)((0, bufferUtils_1.leftShift1)(k1), R128);
    return [k1, k2];
}
/** Computes a message authentication code for Security S2 (as described in SDS13783) */
function computeCMAC(message, key) {
    const blockSize = 16;
    const numBlocks = Math.ceil(message.length / blockSize);
    let lastBlock = message.slice((numBlocks - 1) * blockSize);
    const lastBlockIsComplete = message.length > 0 && message.length % blockSize === 0;
    if (!lastBlockIsComplete) {
        lastBlock = (0, bufferUtils_1.zeroPad)(Buffer.concat([lastBlock, Buffer.from([0x80])]), blockSize).output;
    }
    // Compute all steps but the last one
    let ret = Z128;
    for (let i = 0; i < numBlocks - 1; i++) {
        ret = (0, bufferUtils_1.xor)(ret, message.slice(i * blockSize, (i + 1) * blockSize));
        ret = encryptAES128ECB(ret, key);
    }
    // Compute the last step
    const [k1, k2] = generateAES128CMACSubkeys(key);
    ret = (0, bufferUtils_1.xor)(ret, (0, bufferUtils_1.xor)(lastBlockIsComplete ? k1 : k2, lastBlock));
    ret = encryptAES128ECB(ret, key);
    return ret.slice(0, blockSize);
}
exports.computeCMAC = computeCMAC;
const constantPRK = Buffer.alloc(16, 0x33);
/** Computes the Pseudo Random Key (PRK) used to derive auth, encryption and nonce keys */
function computePRK(ecdhSharedSecret, pubKeyA, pubKeyB) {
    const message = Buffer.concat([ecdhSharedSecret, pubKeyA, pubKeyB]);
    return computeCMAC(message, constantPRK);
}
exports.computePRK = computePRK;
const constantTE = Buffer.alloc(15, 0x88);
/** Derives the temporary auth, encryption and nonce keys from the PRK */
function deriveTempKeys(PRK) {
    const T1 = computeCMAC(Buffer.concat([constantTE, Buffer.from([0x01])]), PRK);
    const T2 = computeCMAC(Buffer.concat([T1, constantTE, Buffer.from([0x02])]), PRK);
    const T3 = computeCMAC(Buffer.concat([T2, constantTE, Buffer.from([0x03])]), PRK);
    return {
        tempKeyCCM: T1,
        tempPersonalizationString: Buffer.concat([T2, T3]),
    };
}
exports.deriveTempKeys = deriveTempKeys;
const constantNK = Buffer.alloc(15, 0x55);
/** Derives the CCM, MPAN keys and the personalization string from the permanent network key (PNK) */
function deriveNetworkKeys(PNK) {
    const T1 = computeCMAC(Buffer.concat([constantNK, Buffer.from([0x01])]), PNK);
    const T2 = computeCMAC(Buffer.concat([T1, constantNK, Buffer.from([0x02])]), PNK);
    const T3 = computeCMAC(Buffer.concat([T2, constantNK, Buffer.from([0x03])]), PNK);
    const T4 = computeCMAC(Buffer.concat([T3, constantNK, Buffer.from([0x04])]), PNK);
    return {
        keyCCM: T1,
        keyMPAN: T4,
        personalizationString: Buffer.concat([T2, T3]),
    };
}
exports.deriveNetworkKeys = deriveNetworkKeys;
const constantNonce = Buffer.alloc(16, 0x26);
/** Computes the Pseudo Random Key (PRK) used to derive the mixed entropy input (MEI) for nonce generation */
function computeNoncePRK(senderEI, receiverEI) {
    const message = Buffer.concat([senderEI, receiverEI]);
    return computeCMAC(message, constantNonce);
}
exports.computeNoncePRK = computeNoncePRK;
const constantEI = Buffer.alloc(15, 0x88);
/** Derives the MEI from the nonce PRK */
function deriveMEI(noncePRK) {
    const T1 = computeCMAC(Buffer.concat([
        constantEI,
        Buffer.from([0x00]),
        constantEI,
        Buffer.from([0x01]),
    ]), noncePRK);
    const T2 = computeCMAC(Buffer.concat([T1, constantEI, Buffer.from([0x02])]), noncePRK);
    return Buffer.concat([T1, T2]);
}
exports.deriveMEI = deriveMEI;
exports.SECURITY_S2_AUTH_TAG_LENGTH = 8;
function encryptAES128CCM(key, iv, plaintext, additionalData, authTagLength) {
    // prepare encryption
    const algorithm = `aes-128-ccm`;
    const cipher = crypto.createCipheriv(algorithm, key, iv, { authTagLength });
    cipher.setAAD(additionalData, { plaintextLength: plaintext.length });
    // do encryption
    const ciphertext = cipher.update(plaintext);
    cipher.final();
    const authTag = cipher.getAuthTag();
    return { ciphertext, authTag };
}
exports.encryptAES128CCM = encryptAES128CCM;
function decryptAES128CCM(key, iv, ciphertext, additionalData, authTag) {
    // prepare decryption
    const algorithm = `aes-128-ccm`;
    const decipher = crypto.createDecipheriv(algorithm, key, iv, {
        authTagLength: authTag.length,
    });
    decipher.setAuthTag(authTag);
    decipher.setAAD(additionalData, { plaintextLength: ciphertext.length });
    // do decryption
    const plaintext = decipher.update(ciphertext);
    // verify decryption
    let authOK = false;
    try {
        decipher.final();
        authOK = true;
    }
    catch (e) {
        /* nothing to do */
    }
    return { plaintext, authOK };
}
exports.decryptAES128CCM = decryptAES128CCM;
//# sourceMappingURL=crypto.js.map