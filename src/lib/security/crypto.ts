import * as crypto from "crypto";

function zeroPad(
	input: Buffer,
	blockSize: number,
): { output: Buffer; paddingLength: number } {
	const padding =
		input.length % blockSize === 0
			? Buffer.from([])
			: Buffer.alloc(blockSize - (input.length % blockSize), 0);
	return {
		output: Buffer.concat([input, padding]),
		paddingLength: padding.length,
	};
}

function encrypt(
	algorithm: string,
	blockSize: number,
	trimToInputLength: boolean,
	input: Buffer,
	key: Buffer,
	iv: Buffer,
): Buffer {
	const cipher = crypto.createCipheriv(algorithm, key, iv);
	cipher.setAutoPadding(false);

	const { output: plaintext, paddingLength } = zeroPad(input, blockSize);
	const ret = Buffer.concat([cipher.update(plaintext), cipher.final()]);

	if (trimToInputLength && paddingLength > 0) {
		return ret.slice(0, -paddingLength);
	} else {
		return ret;
	}
}

function decrypt(
	algorithm: string,
	blockSize: number,
	trimToInputLength: boolean,
	input: Buffer,
	key: Buffer,
	iv: Buffer,
): Buffer {
	const cipher = crypto.createDecipheriv(algorithm, key, iv);
	cipher.setAutoPadding(false);

	const { output: ciphertext, paddingLength } = zeroPad(input, blockSize);
	const ret = Buffer.concat([cipher.update(ciphertext), cipher.final()]);

	if (trimToInputLength && paddingLength > 0) {
		return ret.slice(0, -paddingLength);
	} else {
		return ret;
	}
}

/** Encrypts a payload using AES-128-ECB (as described in SDS10865) */
export function encryptAES128ECB(plaintext: Buffer, key: Buffer): Buffer {
	return encrypt("aes-128-ecb", 16, false, plaintext, key, Buffer.from([]));
}

/** Encrypts a payload using AES-OFB (as described in SDS10865) */
export const encryptAES128OFB = encrypt.bind(
	undefined,
	"aes-128-ofb",
	16,
	true,
);

/** Decrypts a payload using AES-OFB (as described in SDS10865) */
export const decryptAES128OFB = decrypt.bind(
	undefined,
	"aes-128-ofb",
	16,
	true,
);

/** Computes a message authentication code (as described in SDS10865) */
export function computeMAC(
	authData: Buffer,
	key: Buffer,
	iv: Buffer = Buffer.alloc(16, 0),
): Buffer {
	const ciphertext = encrypt("aes-128-cbc", 16, false, authData, key, iv);
	// The MAC is the first 8 bytes of the last 16 byte block
	return ciphertext.slice(-16, -8);
}
