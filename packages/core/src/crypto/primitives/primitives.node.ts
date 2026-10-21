import crypto from "node:crypto";

import { Bytes, type BytesView } from "@zwave-js/shared";
import type { CryptoPrimitives, KeyPair } from "@zwave-js/shared/bindings";

import {
	BLOCK_SIZE,
	decodeX25519KeyDER,
	encodeX25519KeyDERPKCS8,
	encodeX25519KeyDERSPKI,
	zeroPad,
} from "../shared.js";

// For Node.js, we use the built-in crypto module since it has better support
// for some algorithms Z-Wave needs than the Web Crypto API, so we can implement
// those without additional operations.

function randomBytes(length: number): BytesView {
	return crypto.randomBytes(length);
}

function encrypt(
	algorithm: string,
	blockSize: number,
	trimToInputLength: boolean,
	input: BytesView,
	key: BytesView,
	iv: BytesView,
): BytesView {
	const cipher = crypto.createCipheriv(algorithm, key, iv);
	cipher.setAutoPadding(false);

	const { output: plaintext, paddingLength } = zeroPad(input, blockSize);
	const ret = Bytes.concat([cipher.update(plaintext), cipher.final()]);

	if (trimToInputLength && paddingLength > 0) {
		return ret.subarray(0, -paddingLength);
	} else {
		return ret;
	}
}

function decrypt(
	algorithm: string,
	blockSize: number,
	trimToInputLength: boolean,
	input: BytesView,
	key: BytesView,
	iv: BytesView,
): BytesView {
	const cipher = crypto.createDecipheriv(algorithm, key, iv);
	cipher.setAutoPadding(false);

	const { output: ciphertext, paddingLength } = zeroPad(input, blockSize);
	const ret = Bytes.concat([cipher.update(ciphertext), cipher.final()]);

	if (trimToInputLength && paddingLength > 0) {
		return ret.subarray(0, -paddingLength);
	} else {
		return ret;
	}
}

/** Encrypts a payload using AES-128-ECB (as described in SDS10865) */
function encryptAES128ECB(
	plaintext: BytesView,
	key: BytesView,
): Promise<BytesView> {
	return Promise.resolve(
		encrypt(
			"aes-128-ecb",
			BLOCK_SIZE,
			false,
			plaintext,
			key,
			new Uint8Array(),
		),
	);
}

/** Encrypts a payload using AES-OFB (as described in SDS10865) */
function encryptAES128OFB(
	plaintext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	return Promise.resolve(
		encrypt("aes-128-ofb", BLOCK_SIZE, true, plaintext, key, iv),
	);
}

/** Decrypts a payload using AES-OFB */
function decryptAES128OFB(
	ciphertext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	return Promise.resolve(
		decrypt("aes-128-ofb", BLOCK_SIZE, true, ciphertext, key, iv),
	);
}

/** Encrypts a payload using AES-256-OFB */
function encryptAES256OFB(
	plaintext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	return Promise.resolve(
		encrypt("aes-256-ofb", BLOCK_SIZE, true, plaintext, key, iv),
	);
}

/** Decrypts a payload using AES-256-OFB */
function decryptAES256OFB(
	ciphertext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	return Promise.resolve(
		decrypt("aes-256-ofb", BLOCK_SIZE, true, ciphertext, key, iv),
	);
}

function encryptAES128CBC(
	plaintext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	return Promise.resolve(
		encrypt("aes-128-cbc", BLOCK_SIZE, false, plaintext, key, iv),
	);
}

/** Decrypts a payload using AES-256-CBC */
function decryptAES256CBC(
	ciphertext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	return Promise.resolve(
		decrypt("aes-256-cbc", BLOCK_SIZE, true, ciphertext, key, iv),
	);
}

function encryptAES128CCM(
	plaintext: BytesView,
	key: BytesView,
	iv: BytesView,
	additionalData: BytesView,
	authTagLength: number,
): Promise<{ ciphertext: BytesView; authTag: BytesView }> {
	// prepare encryption
	const algorithm = `aes-128-ccm`;
	const cipher = crypto.createCipheriv(algorithm, key, iv, { authTagLength });
	cipher.setAAD(additionalData, { plaintextLength: plaintext.length });

	// do encryption
	const ciphertext = cipher.update(plaintext);
	cipher.final();
	const authTag = cipher.getAuthTag();

	return Promise.resolve({ ciphertext, authTag });
}

function decryptAES128CCM(
	ciphertext: BytesView,
	key: BytesView,
	iv: BytesView,
	additionalData: BytesView,
	authTag: BytesView,
): Promise<{ plaintext: BytesView; authOK: boolean }> {
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
	} catch {
		/* nothing to do */
	}
	// Like the browser implementation, don't return unauthenticated plaintext
	return Promise.resolve({
		plaintext: authOK ? plaintext : new Uint8Array(),
		authOK,
	});
}

function digest(
	algorithm: "md5" | "sha-1" | "sha-256",
	data: BytesView,
): Promise<BytesView> {
	// Node.js uses slightly different algorithm names than WebCrypto
	const nodeAlgorithm =
		algorithm === "sha-1"
			? "sha1"
			: algorithm === "sha-256"
				? "sha256"
				: algorithm;
	const hash = crypto.createHash(nodeAlgorithm);
	hash.update(data);
	return Promise.resolve(hash.digest());
}

function hmacSHA256(key: BytesView, data: BytesView): Promise<BytesView> {
	const hmac = crypto.createHmac("sha256", key);
	hmac.update(data);
	return Promise.resolve(hmac.digest());
}

function encryptChaCha20Poly1305(
	key: BytesView,
	nonce: BytesView,
	additionalData: BytesView,
	plaintext: BytesView,
): Promise<{ ciphertext: BytesView; authTag: BytesView }> {
	const cipher = crypto.createCipheriv("chacha20-poly1305", key, nonce, {
		authTagLength: 16,
	});
	cipher.setAAD(additionalData, { plaintextLength: plaintext.length });

	const ciphertext = Bytes.concat([cipher.update(plaintext), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return Promise.resolve({ ciphertext, authTag });
}

function decryptChaCha20Poly1305(
	key: BytesView,
	nonce: BytesView,
	additionalData: BytesView,
	ciphertext: BytesView,
	authTag: BytesView,
): Promise<{ plaintext: BytesView; authOK: boolean }> {
	const decipher = crypto.createDecipheriv("chacha20-poly1305", key, nonce, {
		authTagLength: 16,
	});
	decipher.setAAD(additionalData, { plaintextLength: ciphertext.length });
	decipher.setAuthTag(authTag);

	let authOK = false;
	let plaintext: BytesView;
	try {
		plaintext = Bytes.concat([
			decipher.update(ciphertext),
			decipher.final(),
		]);
		authOK = true;
	} catch {
		plaintext = new Uint8Array();
	}

	return Promise.resolve({ plaintext, authOK });
}

/** Takes an ECDH public KeyObject and returns the raw key as a buffer */
function extractRawECDHPublicKey(publicKey: crypto.KeyObject): BytesView {
	return decodeX25519KeyDER(
		publicKey.export({
			type: "spki",
			format: "der",
		}),
	);
}

/** Converts a raw public key to an ECDH KeyObject */
function importRawECDHPublicKey(publicKey: BytesView): crypto.KeyObject {
	return crypto.createPublicKey({
		// oxlint-disable-next-line eslint/no-restricted-globals -- crypto API requires Buffer instances
		key: Buffer.from(encodeX25519KeyDERSPKI(publicKey).buffer),
		format: "der",
		type: "spki",
	});
}

/** Takes an ECDH private KeyObject and returns the raw key as a buffer */
function extractRawECDHPrivateKey(privateKey: crypto.KeyObject): BytesView {
	return decodeX25519KeyDER(
		privateKey.export({
			type: "pkcs8",
			format: "der",
		}),
	);
}

/** Converts a raw private key to an ECDH KeyObject */
function importRawECDHPrivateKey(privateKey: BytesView): crypto.KeyObject {
	return crypto.createPrivateKey({
		// oxlint-disable-next-line eslint/no-restricted-globals -- crypto API requires Buffer instances
		key: Buffer.from(encodeX25519KeyDERPKCS8(privateKey).buffer),
		format: "der",
		type: "pkcs8",
	});
}

/** Generates an x25519 / ECDH key pair */
function generateECDHKeyPair(): Promise<KeyPair> {
	const pair = crypto.generateKeyPairSync("x25519");
	const publicKey = extractRawECDHPublicKey(pair.publicKey);
	const privateKey = extractRawECDHPrivateKey(pair.privateKey);

	return Promise.resolve({ publicKey, privateKey });
}

function keyPairFromRawECDHPrivateKey(privateKey: BytesView): Promise<KeyPair> {
	const privateKeyObject = importRawECDHPrivateKey(privateKey);
	const publicKeyObject = crypto.createPublicKey(privateKeyObject);
	const publicKey = extractRawECDHPublicKey(publicKeyObject);
	return Promise.resolve({
		privateKey,
		publicKey,
	});
}

function deriveSharedECDHSecret(keyPair: KeyPair): Promise<BytesView> {
	const publicKey = importRawECDHPublicKey(keyPair.publicKey);
	const privateKey = importRawECDHPrivateKey(keyPair.privateKey);
	const ret = crypto.diffieHellman({ publicKey, privateKey });
	return Promise.resolve(ret);
}

export const primitives = {
	randomBytes,
	encryptAES128ECB,
	encryptAES128CBC,
	encryptAES128OFB,
	decryptAES128OFB,
	encryptAES128CCM,
	decryptAES128CCM,
	decryptAES256CBC,
	encryptAES256OFB,
	decryptAES256OFB,
	digest,
	hmacSHA256,
	encryptChaCha20Poly1305,
	decryptChaCha20Poly1305,
	generateECDHKeyPair,
	keyPairFromRawECDHPrivateKey,
	deriveSharedECDHSecret,
} satisfies CryptoPrimitives;
