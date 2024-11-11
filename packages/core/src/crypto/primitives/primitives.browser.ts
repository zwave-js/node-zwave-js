import { Bytes } from "@zwave-js/shared/safe";
import { BLOCK_SIZE, xor, zeroPad } from "../shared.js";
import { type CryptoPrimitives } from "./primitives.js";

const webcrypto = typeof process !== "undefined"
		&& (globalThis as any).crypto === undefined
		&& typeof require === "function"
	// Node.js <= 18
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	? require("node:crypto").webcrypto
	// @ts-expect-error Node.js 18 is missing the types for this
	: globalThis.crypto as typeof import("node:crypto").webcrypto;

const { subtle } = webcrypto;

function randomBytes(length: number): Uint8Array {
	const buffer = new Uint8Array(length);
	return webcrypto.getRandomValues(buffer);
}

/** Encrypts a payload using AES-128-ECB */
async function encryptAES128ECB(
	plaintext: Uint8Array,
	key: Uint8Array,
): Promise<Uint8Array> {
	// ECB for a single block is identical to the CBC mode, with an IV of all zeros
	// FIXME: Assert that both the plaintext and the key are 16 bytes long
	return encryptAES128CBC(plaintext, key, new Uint8Array(BLOCK_SIZE).fill(0));
}

/** Encrypts a payload using AES-128-CBC */
async function encryptAES128CBC(
	plaintext: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
): Promise<Uint8Array> {
	const cryptoKey = await subtle.importKey(
		"raw",
		key,
		{ name: "AES-CBC" },
		true,
		["encrypt"],
	);
	const ciphertext = await subtle.encrypt(
		{
			name: "AES-CBC",
			iv,
		},
		cryptoKey,
		plaintext,
	);

	// The WebCrypto API adds 16 bytes PKCS#7 padding, but we're only interested
	// in the blocks which correspond to the plaintext
	const paddedLength = Math.ceil(plaintext.length / BLOCK_SIZE) * BLOCK_SIZE;
	return new Uint8Array(ciphertext, 0, paddedLength);
}

/** Encrypts a payload using AES-128-OFB */
async function encryptAES128OFB(
	plaintext: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
): Promise<Uint8Array> {
	// The Web Crypto API does not support OFB mode, but it supports CTR mode.
	// We can use that to fake OFB mode, by using the IV as the value for the counter
	// when encrypting block 1, and ciphertext N-1 XOR plaintext N-1 as the counter
	// when encrypting block N.

	const cryptoKey = await subtle.importKey(
		"raw",
		key,
		{ name: "AES-CTR" },
		true,
		[
			"encrypt",
			"decrypt",
		],
	);

	const ret = new Uint8Array(plaintext.length);
	let counter = zeroPad(iv, BLOCK_SIZE).output;

	for (let offset = 0; offset < plaintext.length - 1; offset += BLOCK_SIZE) {
		const input = plaintext.slice(offset, offset + BLOCK_SIZE);
		const ciphertextBuffer = await subtle.encrypt(
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
		counter = zeroPad(
			xor(ciphertext, input),
			BLOCK_SIZE,
		).output;
	}

	return ret;
}

/** Decrypts a payload using AES-128-OFB */
async function decryptAES128OFB(
	ciphertext: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
): Promise<Uint8Array> {
	// The Web Crypto API does not support OFB mode, but it supports CTR mode.
	// We can use that to fake OFB mode, by using the IV as the value for the counter
	// when encrypting block 1, and ciphertext N-1 XOR plaintext N-1 as the counter
	// when encrypting block N.

	const cryptoKey = await subtle.importKey(
		"raw",
		key,
		{ name: "AES-CTR" },
		true,
		[
			"encrypt",
			"decrypt",
		],
	);

	const ret = new Uint8Array(ciphertext.length);
	let counter = zeroPad(iv, BLOCK_SIZE).output;

	for (let offset = 0; offset < ciphertext.length - 1; offset += BLOCK_SIZE) {
		const input = ciphertext.slice(offset, offset + BLOCK_SIZE);
		const plaintextBuffer = await subtle.decrypt(
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
		counter = zeroPad(
			xor(plaintext, input),
			BLOCK_SIZE,
		).output;
	}

	return ret;
}

async function encryptAES128CCM(
	plaintext: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
	additionalData: Uint8Array,
	authTagLength: number,
): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }> {
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

	const cryptoKey = await subtle.importKey(
		"raw",
		key,
		{ name: "AES-CTR" },
		true,
		["encrypt"],
	);

	const encryptionInput = Bytes.concat([X, plaintextBlocks]);
	const encryptionOutput = await subtle.encrypt(
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
	const ciphertext = authTagAndCiphertext.slice(BLOCK_SIZE).slice(
		0,
		plaintext.length,
	);

	return { ciphertext, authTag };
}

async function computeCBCMac(B: Bytes, key: Uint8Array) {
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

function getCCMPlaintextBlocks(plaintext: Uint8Array) {
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
	iv: Uint8Array,
	plaintext: Uint8Array,
	additionalData: Uint8Array,
	plaintextBlocks: Bytes,
) {
	const B0 = new Bytes(BLOCK_SIZE);
	B0[0] = (hasAData ? 64 : 0)
		| ((M & 0b111) << 3)
		| ((L - 1) & 0b111);
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
	ciphertext: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
	additionalData: Uint8Array,
	authTag: Uint8Array,
): Promise<{ plaintext: Uint8Array; authOK: boolean }> {
	const M = (authTag.length - 2) >> 1;
	const L = 15 - iv.length;
	const hasAData = additionalData.length > 0;

	// First step: Decryption
	const A0 = new Uint8Array(BLOCK_SIZE);
	A0[0] = (L - 1) & 0b111;
	A0.set(iv, 1);
	// remaining bytes are initially 0

	const cryptoKey = await subtle.importKey(
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
	const decryptionOutput = await subtle.decrypt(
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

function digest(
	algorithm: "md5" | "sha-1" | "sha-256",
	data: Uint8Array,
): Promise<Uint8Array> {
	// The WebCrypto API does not support MD5, but we don't actually care.
	// MD5 is only used for hashing cached device configurations, and if anyone
	// is going to use these methods, they should be on a new installation anyways.
	if (algorithm === "md5") {
		algorithm = "sha-256";
	}
	return subtle.digest(algorithm, data);
}

export default {
	randomBytes,
	encryptAES128ECB,
	encryptAES128CBC,
	encryptAES128OFB,
	decryptAES128OFB,
	encryptAES128CCM,
	decryptAES128CCM,
	digest,
} satisfies CryptoPrimitives;
