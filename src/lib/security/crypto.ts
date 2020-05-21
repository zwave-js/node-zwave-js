import * as crypto from "crypto";

function encrypt(
	algorithm: string,
	final: boolean,
	plaintext: Buffer,
	key: Buffer,
	iv: Buffer,
): Buffer {
	const cipher = crypto.createCipheriv(algorithm, key, iv);
	const buffers = [cipher.update(plaintext)];
	if (final) buffers.push(cipher.final());
	return Buffer.concat(buffers);
}

function decrypt(
	algorithm: string,
	final: boolean,
	ciphertext: Buffer,
	key: Buffer,
	iv: Buffer,
): Buffer {
	const cipher = crypto.createDecipheriv(algorithm, key, iv);
	const buffers = [cipher.update(ciphertext)];
	if (final) buffers.push(cipher.final());
	return Buffer.concat(buffers);
}

/** Encrypts a payload using AES-128-ECB (as described in SDS10865) */
export function encryptAES128ECB(plaintext: Buffer, key: Buffer): Buffer {
	return encrypt("aes-128-ecb", false, plaintext, key, Buffer.from([]));
}

/** Encrypts a payload using AES-OFB (as described in SDS10865) */
export const encryptAES128OFB = encrypt.bind(undefined, "aes-128-ofb", true);

/** Decrypts a payload using AES-OFB (as described in SDS10865) */
export const decryptAES128OFB = decrypt.bind(undefined, "aes-128-ofb", true);

/** Computes a message authentication code (as described in SDS10865) */
export function computeMAC(
	authData: Buffer,
	key: Buffer,
	iv: Buffer = Buffer.alloc(16, 0),
): Buffer {
	const padding =
		authData.length === 16
			? Buffer.from([])
			: Buffer.alloc(16 - (authData.length % 16), 0);
	const plaintext = Buffer.concat([authData, padding]);
	const ciphertext = encrypt("aes-128-cbc", false, plaintext, key, iv);
	// The MAC is the first 8 bytes of the last 16 byte block
	return ciphertext.slice(-16, -8);
}
