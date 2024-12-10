import { type CryptoPrimitives } from "@zwave-js/shared/bindings";
import { Bytes } from "@zwave-js/shared/safe";
import crypto from "node:crypto";
import { BLOCK_SIZE, zeroPad } from "../shared.js";

// For Node.js, we use the built-in crypto module since it has better support
// for some algorithms Z-Wave needs than the Web Crypto API, so we can implement
// those without additional operations.

function randomBytes(length: number): Uint8Array {
	return crypto.randomBytes(length);
}

function encrypt(
	algorithm: string,
	blockSize: number,
	trimToInputLength: boolean,
	input: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
): Uint8Array {
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
	input: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
): Uint8Array {
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
	plaintext: Uint8Array,
	key: Uint8Array,
): Promise<Uint8Array> {
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
	plaintext: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
): Promise<Uint8Array> {
	return Promise.resolve(
		encrypt(
			"aes-128-ofb",
			BLOCK_SIZE,
			true,
			plaintext,
			key,
			iv,
		),
	);
}

/** Decrypts a payload using AES-OFB */
function decryptAES128OFB(
	ciphertext: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
): Promise<Uint8Array> {
	return Promise.resolve(
		decrypt(
			"aes-128-ofb",
			BLOCK_SIZE,
			true,
			ciphertext,
			key,
			iv,
		),
	);
}

function encryptAES128CBC(
	plaintext: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
): Promise<Uint8Array> {
	return Promise.resolve(
		encrypt(
			"aes-128-cbc",
			BLOCK_SIZE,
			false,
			plaintext,
			key,
			iv,
		),
	);
}

/** Decrypts a payload using AES-256-CBC */
function decryptAES256CBC(
	ciphertext: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
): Promise<Uint8Array> {
	return Promise.resolve(
		decrypt(
			"aes-256-cbc",
			BLOCK_SIZE,
			true,
			ciphertext,
			key,
			iv,
		),
	);
}

function encryptAES128CCM(
	plaintext: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
	additionalData: Uint8Array,
	authTagLength: number,
): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }> {
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
	ciphertext: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array,
	additionalData: Uint8Array,
	authTag: Uint8Array,
): Promise<{ plaintext: Uint8Array; authOK: boolean }> {
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
	return Promise.resolve({ plaintext, authOK });
}

function digest(
	algorithm: "md5" | "sha-1" | "sha-256",
	data: Uint8Array,
): Promise<Uint8Array> {
	const hash = crypto.createHash(algorithm);
	hash.update(data);
	return Promise.resolve(hash.digest());
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
	digest,
} satisfies CryptoPrimitives;
