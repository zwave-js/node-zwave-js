import * as crypto from "node:crypto";
import {
	decodeX25519KeyDER,
	encodeX25519KeyDERPKCS8,
	encodeX25519KeyDERSPKI,
} from "./shared.js";

export interface KeyPair {
	publicKey: crypto.KeyObject;
	privateKey: crypto.KeyObject;
}

/** Generates an x25519 / ECDH key pair */
export function generateECDHKeyPair(): KeyPair {
	return crypto.generateKeyPairSync("x25519");
}

export function keyPairFromRawECDHPrivateKey(privateKey: Uint8Array): KeyPair {
	const privateKeyObject = importRawECDHPrivateKey(privateKey);
	const publicKeyObject = crypto.createPublicKey(privateKeyObject);
	return {
		privateKey: privateKeyObject,
		publicKey: publicKeyObject,
	};
}

/** Takes an ECDH public KeyObject and returns the raw key as a buffer */
export function extractRawECDHPublicKey(
	publicKey: crypto.KeyObject,
): Uint8Array {
	return decodeX25519KeyDER(
		publicKey.export({
			type: "spki",
			format: "der",
		}),
	);
}

/** Converts a raw public key to an ECDH KeyObject */
export function importRawECDHPublicKey(
	publicKey: Uint8Array,
): crypto.KeyObject {
	return crypto.createPublicKey({
		// eslint-disable-next-line no-restricted-globals -- crypto API requires Buffer instances
		key: Buffer.from(encodeX25519KeyDERSPKI(publicKey).buffer),
		format: "der",
		type: "spki",
	});
}

/** Takes an ECDH private KeyObject and returns the raw key as a buffer */
export function extractRawECDHPrivateKey(
	privateKey: crypto.KeyObject,
): Uint8Array {
	return decodeX25519KeyDER(
		privateKey.export({
			type: "pkcs8",
			format: "der",
		}),
	);
}

/** Converts a raw private key to an ECDH KeyObject */
export function importRawECDHPrivateKey(
	privateKey: Uint8Array,
): crypto.KeyObject {
	return crypto.createPrivateKey({
		// eslint-disable-next-line no-restricted-globals -- crypto API requires Buffer instances
		key: Buffer.from(encodeX25519KeyDERPKCS8(privateKey).buffer),
		format: "der",
		type: "pkcs8",
	});
}

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
