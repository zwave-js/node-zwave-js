// A pseudo-random number generator using AES-ECB as described in NIST SP 800-90A
// This does not implement the full standard, but only the necessary subset needed for Z-Wave Security S2

// The used crypto primitives are sync, so the methods in this implementation are sync as well

import { encryptAES128ECB as encryptAES128ECBSync } from "../crypto/operations.sync.js";
import { increment, xor } from "../crypto/shared.js";

// Warning: This code expects ctr_len to equal BLOCK_LEN.
// See specification on how to handle other cases

const KEY_LEN = 16;
const BLOCK_LEN = 16;
const SEED_LEN = KEY_LEN + BLOCK_LEN;

export class CtrDrbgSync {
	private key = new Uint8Array(KEY_LEN);
	private v = new Uint8Array(BLOCK_LEN);
	// Reseed counter is not used

	public saveState(): { key: Uint8Array; v: Uint8Array } {
		return { key: Uint8Array.from(this.key), v: Uint8Array.from(this.v) };
	}

	public restoreState(state: { key: Uint8Array; v: Uint8Array }): void {
		this.key = state.key;
		this.v = state.v;
	}

	public init(entropy: Uint8Array, personalizationString?: Uint8Array): void {
		if (entropy.length !== SEED_LEN) {
			throw new Error(`entropy must be ${SEED_LEN} bytes long`);
		}

		if (personalizationString) {
			if (personalizationString.length > SEED_LEN) {
				throw new Error("Personalization string is too long.");
			}
			for (let i = 0; i < personalizationString.length; i++) {
				entropy[i] ^= personalizationString[i];
			}
		}

		this.update(entropy);
	}

	public update(providedData: Uint8Array | undefined): void {
		if (providedData && providedData.length !== SEED_LEN) {
			throw new Error(`providedData must be ${SEED_LEN} bytes long`);
		}

		let temp = new Uint8Array(SEED_LEN);
		let tempOffset = 0;
		while (tempOffset < SEED_LEN) {
			increment(this.v);
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			const encrypted = encryptAES128ECBSync(this.v, this.key);
			// We know that we're only dealing with full blocks here, otherwise
			// the following line may throw when trying to set a too long last block
			temp.set(encrypted, tempOffset);
			tempOffset += BLOCK_LEN;
		}

		if (providedData) {
			temp = xor(temp, providedData);
		}

		this.key = temp.subarray(0, KEY_LEN);
		this.v = temp.subarray(KEY_LEN);
	}

	public generate(len: number): Uint8Array {
		// Additional input is not used
		const temp = new Uint8Array(Math.ceil(len / BLOCK_LEN) * BLOCK_LEN);
		let tempOffset = 0;
		while (tempOffset < len) {
			increment(this.v);
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			const encrypted = encryptAES128ECBSync(this.v, this.key);
			// The size of temp is a multiple of the block size, so this is safe to do:
			temp.set(encrypted, tempOffset);
			tempOffset += BLOCK_LEN;
		}

		this.update(undefined);

		return temp.subarray(0, len);
	}

	protected reseed(entropy: Uint8Array): void {
		// Reseeding isn't necessary for this implementation, but all test vectors use it
		this.update(entropy);
	}
}
