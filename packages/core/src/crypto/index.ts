import { webcrypto } from "#webcrypto";
import { xor, zeroPad } from "../security/bufferUtils.js";

const { subtle } = webcrypto;

const BLOCK_SIZE = 16;

export function randomBytes(length: number): Uint8Array {
	const buffer = new Uint8Array(length);
	return webcrypto.getRandomValues(buffer);
}

/** Encrypts a payload using AES-128-ECB */
export async function encryptAES128ECB(
	plaintext: Uint8Array,
	key: Uint8Array,
): Promise<Uint8Array> {
	// ECB for a single block is identical to the CBC mode, with an IV of all zeros
	// FIXME: Assert that both the plaintext and the key are 16 bytes long
	const iv = new Uint8Array(BLOCK_SIZE).fill(0);
	const cryptoKey = await subtle.importKey(
		"raw",
		key,
		{ name: "AES-CBC" },
		true,
		[
			"encrypt",
			"decrypt",
		],
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
	// in the 16 bytes corresponding to the plaintext
	return new Uint8Array(ciphertext, 0, plaintext.byteLength);
}

/** Encrypts a payload using AES-128-OFB */
export async function encryptAES128OFB(
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
export async function decryptAES128OFB(
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

/** Computes a message authentication code for Security S0 (as described in SDS10865) */
export async function computeMAC(
	authData: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array = new Uint8Array(BLOCK_SIZE).fill(0),
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
		authData,
	);

	// The MAC is the first 8 bytes of the last 16 byte block that corresponds
	// to the authData. The WebCrypto API adds 16 bytes PKCS#7 padding, so those
	// need to be discarded when determining the block that contains the MAC.
	const paddedLength = Math.ceil(authData.length / BLOCK_SIZE) * BLOCK_SIZE;
	return new Uint8Array(ciphertext, paddedLength - BLOCK_SIZE, 8);
}
