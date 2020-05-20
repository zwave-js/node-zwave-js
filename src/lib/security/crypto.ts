import * as crypto from "crypto";

function encrypt(
	algorithm: string,
	plaintext: Buffer,
	key: Buffer,
	iv: Buffer,
): Buffer {
	const cipher = crypto.createCipheriv(algorithm, key, iv);
	return Buffer.concat([cipher.update(plaintext), cipher.final()]);
}

function decrypt(
	algorithm: string,
	ciphertext: Buffer,
	key: Buffer,
	iv: Buffer,
): Buffer {
	const cipher = crypto.createDecipheriv(algorithm, key, iv);
	return Buffer.concat([cipher.update(ciphertext), cipher.final()]);
}

/** Encrypts a payload using AES-128-ECB (as described in SDS10865) */
export function encryptAES128ECB(plaintext: Buffer, key: Buffer): Buffer {
	return encrypt("aes-128-ecb", plaintext, key, Buffer.from([]));
}

/** Encrypts a payload using AES-OFB (as described in SDS10865) */
export const encryptAES128OFB = encrypt.bind(undefined, "aes-128-ofb");

/** Decrypts a payload using AES-OFB (as described in SDS10865) */
export const decryptAES128OFB = decrypt.bind(undefined, "aes-128-ofb");

/** Computes a message authentication code (as described in SDS10865) */
export function computeMAC(authData: Buffer, key: Buffer): Buffer {
	const padding =
		authData.length === 16
			? Buffer.from([])
			: Buffer.alloc(16 - (authData.length % 16), 0);
	const plaintext = Buffer.concat([authData, padding]);
	const ciphertext = encrypt(
		"aes-128-cbc",
		plaintext,
		key,
		Buffer.alloc(16, 0),
	);
	// The MAC is the first 8 bytes of the last 16 byte block
	return ciphertext.slice(-16, -8);
}
