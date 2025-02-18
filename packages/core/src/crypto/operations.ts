import { Bytes } from "@zwave-js/shared/safe";
import { BLOCK_SIZE, leftShift1, xor, zeroPad } from "./shared.js";

// Import the correct primitives based on the environment
import { primitives } from "#crypto_primitives";
const {
	decryptAES128OFB,
	encryptAES128CBC,
	encryptAES128ECB,
	encryptAES128OFB,
	encryptAES128CCM,
	decryptAES128CCM,
	decryptAES256CBC,
	randomBytes,
	digest,
	generateECDHKeyPair,
	deriveSharedECDHSecret,
	keyPairFromRawECDHPrivateKey,
} = primitives;

export {
	decryptAES128CCM,
	decryptAES128OFB,
	decryptAES256CBC,
	deriveSharedECDHSecret,
	digest,
	encryptAES128CBC,
	encryptAES128CCM,
	encryptAES128ECB,
	encryptAES128OFB,
	generateECDHKeyPair,
	keyPairFromRawECDHPrivateKey,
	randomBytes,
};

const Z128 = new Uint8Array(16).fill(0);
const R128 = Bytes.from("00000000000000000000000000000087", "hex");
const constantPRK = new Uint8Array(16).fill(0x33);
const constantTE = new Uint8Array(15).fill(0x88);
const constantNK = new Uint8Array(15).fill(0x55);
const constantNonce = new Uint8Array(16).fill(0x26);
const constantEI = new Uint8Array(15).fill(0x88);

/** Computes a message authentication code for Security S0 (as described in SDS10865) */
export async function computeMAC(
	authData: Uint8Array,
	key: Uint8Array,
	iv: Uint8Array = new Uint8Array(BLOCK_SIZE).fill(0),
): Promise<Uint8Array> {
	const ciphertext = await encryptAES128CBC(authData, key, iv);
	// The MAC is the first 8 bytes of the last 16 byte block
	return ciphertext.subarray(ciphertext.length - BLOCK_SIZE).subarray(0, 8);
}

async function generateAES128CMACSubkeys(
	key: Uint8Array,
): Promise<[k1: Uint8Array, k2: Uint8Array]> {
	// NIST SP 800-38B, chapter 6.1
	const L = await encryptAES128ECB(Z128, key);
	const k1 = !(L[0] & 0x80) ? leftShift1(L) : xor(leftShift1(L), R128);
	const k2 = !(k1[0] & 0x80) ? leftShift1(k1) : xor(leftShift1(k1), R128);
	return [k1, k2];
}

/** Computes a message authentication code for Security S2 (as described in SDS13783) */
export async function computeCMAC(
	message: Uint8Array,
	key: Uint8Array,
): Promise<Uint8Array> {
	const blockSize = 16;
	const numBlocks = Math.ceil(message.length / blockSize);
	let lastBlock = message.subarray((numBlocks - 1) * blockSize);
	const lastBlockIsComplete = message.length > 0
		&& message.length % blockSize === 0;
	if (!lastBlockIsComplete) {
		lastBlock = zeroPad(
			Bytes.concat([lastBlock, Bytes.from([0x80])]),
			blockSize,
		).output;
	}

	// Compute all steps but the last one
	let ret = Z128;
	for (let i = 0; i < numBlocks - 1; i++) {
		ret = xor(ret, message.subarray(i * blockSize, (i + 1) * blockSize));
		ret = await encryptAES128ECB(ret, key);
	}
	// Compute the last step
	const [k1, k2] = await generateAES128CMACSubkeys(key);
	ret = xor(ret, xor(lastBlockIsComplete ? k1 : k2, lastBlock));
	ret = await encryptAES128ECB(ret, key);

	return ret.subarray(0, blockSize);
}

/** Computes the Pseudo Random Key (PRK) used to derive auth, encryption and nonce keys */
export function computePRK(
	ecdhSharedSecret: Uint8Array,
	pubKeyA: Uint8Array,
	pubKeyB: Uint8Array,
): Promise<Uint8Array> {
	const message = Bytes.concat([ecdhSharedSecret, pubKeyA, pubKeyB]);
	return computeCMAC(message, constantPRK);
}

/** Derives the temporary auth, encryption and nonce keys from the PRK */
export async function deriveTempKeys(
	PRK: Uint8Array,
): Promise<{ tempKeyCCM: Uint8Array; tempPersonalizationString: Uint8Array }> {
	const T1 = await computeCMAC(
		Bytes.concat([constantTE, [0x01]]),
		PRK,
	);
	const T2 = await computeCMAC(
		Bytes.concat([T1, constantTE, [0x02]]),
		PRK,
	);
	const T3 = await computeCMAC(
		Bytes.concat([T2, constantTE, [0x03]]),
		PRK,
	);
	return {
		tempKeyCCM: T1,
		tempPersonalizationString: Bytes.concat([T2, T3]),
	};
}

/** Derives the CCM, MPAN keys and the personalization string from the permanent network key (PNK) */
export async function deriveNetworkKeys(
	PNK: Uint8Array,
): Promise<
	{
		keyCCM: Uint8Array;
		keyMPAN: Uint8Array;
		personalizationString: Uint8Array;
	}
> {
	const T1 = await computeCMAC(
		Bytes.concat([constantNK, [0x01]]),
		PNK,
	);
	const T2 = await computeCMAC(
		Bytes.concat([T1, constantNK, [0x02]]),
		PNK,
	);
	const T3 = await computeCMAC(
		Bytes.concat([T2, constantNK, [0x03]]),
		PNK,
	);
	const T4 = await computeCMAC(
		Bytes.concat([T3, constantNK, [0x04]]),
		PNK,
	);
	return {
		keyCCM: T1,
		keyMPAN: T4,
		personalizationString: Bytes.concat([T2, T3]),
	};
}

/** Computes the Pseudo Random Key (PRK) used to derive the mixed entropy input (MEI) for nonce generation */
export function computeNoncePRK(
	senderEI: Uint8Array,
	receiverEI: Uint8Array,
): Promise<Uint8Array> {
	const message = Bytes.concat([senderEI, receiverEI]);
	return computeCMAC(message, constantNonce);
}

/** Derives the MEI from the nonce PRK */
export async function deriveMEI(noncePRK: Uint8Array): Promise<Uint8Array> {
	const T1 = await computeCMAC(
		Bytes.concat([
			constantEI,
			[0x00],
			constantEI,
			[0x01],
		]),
		noncePRK,
	);
	const T2 = await computeCMAC(
		Bytes.concat([T1, constantEI, [0x02]]),
		noncePRK,
	);
	return Bytes.concat([T1, T2]);
}
