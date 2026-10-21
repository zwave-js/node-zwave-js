import type { webcrypto } from "node:crypto";

import { Bytes, type BytesView } from "@zwave-js/shared";
import type { CryptoPrimitives, KeyPair } from "@zwave-js/shared/bindings";

import {
	BLOCK_SIZE,
	decodeX25519KeyDER,
	encodeX25519KeyDERPKCS8,
	xor,
	zeroPad,
} from "../shared.js";

function randomBytes(length: number): BytesView {
	const buffer = new Uint8Array(length);
	return crypto.getRandomValues(buffer);
}

/** Encrypts a payload using AES-128-ECB */
async function encryptAES128ECB(
	plaintext: BytesView,
	key: BytesView,
): Promise<BytesView> {
	// ECB for a single block is identical to the CBC mode, with an IV of all zeros
	// FIXME: Assert that both the plaintext and the key are 16 bytes long
	return encryptAES128CBC(plaintext, key, new Uint8Array(BLOCK_SIZE).fill(0));
}

/** Encrypts a payload using AES-128-CBC */
async function encryptAES128CBC(
	plaintext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		key,
		{ name: "AES-CBC" },
		true,
		["encrypt"],
	);
	// Like the Node.js implementation, zero-pad the plaintext to a multiple of the block size
	const { output: paddedPlaintext } = zeroPad(plaintext, BLOCK_SIZE);
	const ciphertext = await crypto.subtle.encrypt(
		{
			name: "AES-CBC",
			iv,
		},
		cryptoKey,
		paddedPlaintext,
	);

	// The WebCrypto API adds PKCS#7 padding, but we're only interested
	// in the blocks which correspond to the plaintext
	return new Uint8Array(ciphertext, 0, paddedPlaintext.length);
}

/** Decrypts a payload using AES-256-CBC */
async function decryptAES256CBC(
	ciphertext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		key,
		{ name: "AES-CBC" },
		true,
		["decrypt"],
	);

	const plaintext = await crypto.subtle.decrypt(
		{
			name: "AES-CBC",
			iv,
		},
		cryptoKey,
		ciphertext,
	);

	// Padding is removed automatically
	return new Uint8Array(plaintext);
}

function assertKeyLength(key: BytesView, expected: number): void {
	if (key.length !== expected) {
		throw new Error(
			`Invalid key length ${key.length}, expected ${expected} bytes`,
		);
	}
}

// Encrypts a payload using AES-OFB, independent of key length
async function encryptAESOFB(
	plaintext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	// The Web Crypto API does not support OFB mode, but it supports CTR mode.
	// We can use that to fake OFB mode, by using the IV as the value for the counter
	// when encrypting block 1, and ciphertext N-1 XOR plaintext N-1 as the counter
	// when encrypting block N.

	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		key,
		{ name: "AES-CTR" },
		true,
		["encrypt", "decrypt"],
	);

	const ret = new Uint8Array(plaintext.length);
	let counter = zeroPad(iv, BLOCK_SIZE).output;

	for (let offset = 0; offset < plaintext.length; offset += BLOCK_SIZE) {
		const input = plaintext.slice(offset, offset + BLOCK_SIZE);
		const ciphertextBuffer = await crypto.subtle.encrypt(
			{
				name: "AES-CTR",
				counter,
				length: BLOCK_SIZE * 8,
			},
			cryptoKey,
			input,
		);
		const ciphertext = new Uint8Array(ciphertextBuffer);
		ret.set(ciphertext, offset);

		// Determine the next counter value
		counter = zeroPad(xor(ciphertext, input), BLOCK_SIZE).output;
	}

	return ret;
}

// Decrypts a payload using AES-OFB, independent of key length
async function decryptAESOFB(
	ciphertext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	// The Web Crypto API does not support OFB mode, but it supports CTR mode.
	// We can use that to fake OFB mode, by using the IV as the value for the counter
	// when encrypting block 1, and ciphertext N-1 XOR plaintext N-1 as the counter
	// when encrypting block N.

	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		key,
		{ name: "AES-CTR" },
		true,
		["encrypt", "decrypt"],
	);

	const ret = new Uint8Array(ciphertext.length);
	let counter = zeroPad(iv, BLOCK_SIZE).output;

	for (let offset = 0; offset < ciphertext.length; offset += BLOCK_SIZE) {
		const input = ciphertext.slice(offset, offset + BLOCK_SIZE);
		const plaintextBuffer = await crypto.subtle.decrypt(
			{
				name: "AES-CTR",
				counter,
				length: BLOCK_SIZE * 8,
			},
			cryptoKey,
			input,
		);
		const plaintext = new Uint8Array(plaintextBuffer);
		ret.set(plaintext, offset);

		// Determine the next counter value
		counter = zeroPad(xor(plaintext, input), BLOCK_SIZE).output;
	}

	return ret;
}

/** Encrypts a payload using AES-128-OFB */
function encryptAES128OFB(
	plaintext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	assertKeyLength(key, 16);
	return encryptAESOFB(plaintext, key, iv);
}

/** Decrypts a payload using AES-128-OFB */
function decryptAES128OFB(
	ciphertext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	assertKeyLength(key, 16);
	return decryptAESOFB(ciphertext, key, iv);
}

/** Encrypts a payload using AES-256-OFB */
function encryptAES256OFB(
	plaintext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	assertKeyLength(key, 32);
	return encryptAESOFB(plaintext, key, iv);
}

/** Decrypts a payload using AES-256-OFB */
function decryptAES256OFB(
	ciphertext: BytesView,
	key: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	assertKeyLength(key, 32);
	return decryptAESOFB(ciphertext, key, iv);
}

async function encryptAES128CCM(
	plaintext: BytesView,
	key: BytesView,
	iv: BytesView,
	additionalData: BytesView,
	authTagLength: number,
): Promise<{ ciphertext: BytesView; authTag: BytesView }> {
	// FIXME: Validate iv and authTagLength

	const M = (authTagLength - 2) >> 1;
	const L = 15 - iv.length;
	const hasAData = additionalData.length > 0;

	const plaintextBlocks = getCCMPlaintextBlocks(plaintext);

	// First step: Authentication
	const B = getCCMAuthenticationBlocks(
		hasAData,
		M,
		L,
		iv,
		plaintext,
		additionalData,
		plaintextBlocks,
	);
	const X = await computeCBCMac(B, key);

	// Second step: Encryption
	const A0 = new Uint8Array(BLOCK_SIZE);
	A0[0] = (L - 1) & 0b111;
	A0.set(iv, 1);
	// remaining bytes are initially 0

	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		key,
		{ name: "AES-CTR" },
		true,
		["encrypt"],
	);

	const encryptionInput = Bytes.concat([X, plaintextBlocks]);
	const encryptionOutput = await crypto.subtle.encrypt(
		{
			name: "AES-CTR",
			counter: A0,
			length: BLOCK_SIZE * 8,
		},
		cryptoKey,
		encryptionInput,
	);
	const authTagAndCiphertext = new Uint8Array(encryptionOutput);

	const authTag = authTagAndCiphertext.slice(0, authTagLength);
	const ciphertext = authTagAndCiphertext
		.slice(BLOCK_SIZE)
		.slice(0, plaintext.length);

	return { ciphertext, authTag };
}

async function computeCBCMac(B: Bytes, key: BytesView) {
	// There is an opportunity here to optimize memory usage by keeping only the last block
	// during the encryption process
	const macOutput = await encryptAES128CBC(
		B,
		key,
		new Uint8Array(BLOCK_SIZE).fill(0),
	);
	const X = macOutput.subarray(-BLOCK_SIZE);
	return X;
}

function getCCMPlaintextBlocks(plaintext: BytesView) {
	const plaintextBlocks = new Bytes(
		// plaintext | ...padding
		Math.ceil(plaintext.length / BLOCK_SIZE) * BLOCK_SIZE,
	);
	plaintextBlocks.set(plaintext, 0);
	return plaintextBlocks;
}

function getCCMAuthenticationBlocks(
	hasAData: boolean,
	M: number,
	L: number,
	iv: BytesView,
	plaintext: BytesView,
	additionalData: BytesView,
	plaintextBlocks: Bytes,
) {
	const B0 = new Bytes(BLOCK_SIZE);
	B0[0] = (hasAData ? 64 : 0) | ((M & 0b111) << 3) | ((L - 1) & 0b111);
	B0.set(iv, 1);
	B0.writeUIntBE(plaintext.length, 16 - L, L);

	let aDataLength: Bytes;
	if (additionalData.length === 0) {
		aDataLength = new Bytes(0);
	} else if (additionalData.length < 0xff00) {
		aDataLength = new Bytes(2);
		aDataLength.writeUInt16BE(additionalData.length, 0);
	} else if (additionalData.length <= 4294967295) {
		aDataLength = new Bytes(6);
		aDataLength.writeUInt16BE(0xfffe, 0);
		aDataLength.writeUInt32BE(additionalData.length, 2);
	} else {
		// Technically goes up to 2^64-1, but JS can only handle up to 2^53-1
		aDataLength = new Bytes(10);
		aDataLength.writeUInt16BE(0xffff, 0);
		aDataLength.writeBigUInt64BE(BigInt(additionalData.length), 2);
	}

	const aDataBlocks = new Bytes(
		// B0 | aDataLength | additionalData | ...padding
		Math.ceil(
			(BLOCK_SIZE + aDataLength.length + additionalData.length)
				/ BLOCK_SIZE,
		) * BLOCK_SIZE,
	);
	aDataBlocks.set(B0, 0);
	aDataBlocks.set(aDataLength, BLOCK_SIZE);
	aDataBlocks.set(additionalData, BLOCK_SIZE + aDataLength.length);

	const B = Bytes.concat([aDataBlocks, plaintextBlocks]);
	return B;
}

async function decryptAES128CCM(
	ciphertext: BytesView,
	key: BytesView,
	iv: BytesView,
	additionalData: BytesView,
	authTag: BytesView,
): Promise<{ plaintext: BytesView; authOK: boolean }> {
	const M = (authTag.length - 2) >> 1;
	const L = 15 - iv.length;
	const hasAData = additionalData.length > 0;

	// First step: Decryption
	const A0 = new Uint8Array(BLOCK_SIZE);
	A0[0] = (L - 1) & 0b111;
	A0.set(iv, 1);
	// remaining bytes are initially 0

	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		key,
		{ name: "AES-CTR" },
		true,
		["decrypt"],
	);

	// Input to the decryption function is the padded auth tag
	// and the ciphertext: authTag | 0... | ciphertext
	const paddedAuthTag = new Bytes(BLOCK_SIZE);
	paddedAuthTag.set(authTag, 0);
	const decryptionInput = Bytes.concat([paddedAuthTag, ciphertext]);
	const decryptionOutput = await crypto.subtle.decrypt(
		{
			name: "AES-CTR",
			counter: A0,
			length: BLOCK_SIZE * 8,
		},
		cryptoKey,
		decryptionInput,
	);
	const plaintextAndT = new Uint8Array(decryptionOutput);
	const T = plaintextAndT.slice(0, authTag.length);
	const plaintext = plaintextAndT.slice(BLOCK_SIZE);

	const plaintextBlocks = getCCMPlaintextBlocks(plaintext);
	const B = getCCMAuthenticationBlocks(
		hasAData,
		M,
		L,
		iv,
		plaintext,
		additionalData,
		plaintextBlocks,
	);
	const X = await computeCBCMac(B, key);

	const expectedAuthTag = X.subarray(0, authTag.length);

	// Compare the expected and actual auth tags in constant time
	const emptyPlaintext = new Uint8Array();
	let result = 0;

	if (T.length !== expectedAuthTag.length) {
		return { plaintext: emptyPlaintext, authOK: false };
	}
	for (let i = 0; i < T.length; i++) {
		result |= T[i] ^ expectedAuthTag[i];
	}
	if (result === 0) {
		return { plaintext, authOK: true };
	} else {
		return { plaintext: emptyPlaintext, authOK: false };
	}
}

async function digest(
	algorithm: "md5" | "sha-1" | "sha-256",
	data: BytesView,
): Promise<BytesView> {
	// The WebCrypto API does not support MD5, but we don't actually care.
	// MD5 is only used for hashing cached device configurations, and if anyone
	// is going to use these methods, they should be on a new installation anyways.
	if (algorithm === "md5") {
		algorithm = "sha-256";
	}
	const output = await crypto.subtle.digest(algorithm, data);
	return new Uint8Array(output);
}

async function hmacSHA256(key: BytesView, data: BytesView): Promise<BytesView> {
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		key,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
	return new Uint8Array(signature);
}

// ChaCha20-Poly1305 is not supported in the browser environment.
// Web Crypto API does not provide ChaCha20-Poly1305.
// These functions will throw if called; a proper solution needs to be implemented.

async function encryptChaCha20Poly1305(
	_key: BytesView,
	_nonce: BytesView,
	_additionalData: BytesView,
	_plaintext: BytesView,
): Promise<{ ciphertext: BytesView; authTag: BytesView }> {
	throw new Error(
		"ChaCha20-Poly1305 is not supported in the browser environment",
	);
}

async function decryptChaCha20Poly1305(
	_key: BytesView,
	_nonce: BytesView,
	_additionalData: BytesView,
	_ciphertext: BytesView,
	_authTag: BytesView,
): Promise<{ plaintext: BytesView; authOK: boolean }> {
	throw new Error(
		"ChaCha20-Poly1305 is not supported in the browser environment",
	);
}

async function generateECDHKeyPair(): Promise<KeyPair> {
	const pair = (await crypto.subtle.generateKey("X25519", true, [
		"deriveKey",
	])) as webcrypto.CryptoKeyPair;

	const publicKey = new Uint8Array(
		await crypto.subtle.exportKey("raw", pair.publicKey),
	);
	const privateKey = decodeX25519KeyDER(
		new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey)),
	);

	return { publicKey, privateKey };
}

async function keyPairFromRawECDHPrivateKey(
	privateKey: BytesView,
): Promise<KeyPair> {
	const privateKeyObject = await crypto.subtle.importKey(
		"pkcs8",
		encodeX25519KeyDERPKCS8(privateKey),
		"X25519",
		true,
		["deriveKey"],
	);

	// Turn the private key into a public key by removing the private key portion
	// in the JWK representation
	// https://stackoverflow.com/a/72153942
	const jwk = await crypto.subtle.exportKey("jwk", privateKeyObject);
	delete jwk.d;
	const publicKeyObject = await crypto.subtle.importKey(
		"jwk",
		jwk,
		"X25519",
		true,
		[],
	);

	const publicKey = new Uint8Array(
		await crypto.subtle.exportKey("raw", publicKeyObject),
	);

	return { publicKey, privateKey };
}

async function deriveSharedECDHSecret(keyPair: KeyPair): Promise<BytesView> {
	const publicKey = await crypto.subtle.importKey(
		"raw",
		keyPair.publicKey,
		"X25519",
		true,
		[],
	);

	const privateKey = await crypto.subtle.importKey(
		"pkcs8",
		encodeX25519KeyDERPKCS8(keyPair.privateKey),
		"X25519",
		true,
		["deriveBits"],
	);

	const secret = await crypto.subtle.deriveBits(
		{
			name: "X25519",
			public: publicKey,
		},
		privateKey,
		null,
	);

	return new Uint8Array(secret);
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
