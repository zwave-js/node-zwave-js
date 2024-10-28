/*!
 * ctr-drbg.js - ctr-drbg implementation for bcrypto
 * Copyright (c) 2019, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcrypto
 *
 * Parts of this software are based on google/boringssl:
 *   https://github.com/google/boringssl
 *
 * Resources:
 *   https://csrc.nist.gov/publications/detail/sp/800-90a/archive/2012-01-23
 *   https://github.com/google/boringssl/blob/master/crypto/fipsmodule/rand/ctrdrbg.c
 *   https://github.com/google/boringssl/blob/master/crypto/fipsmodule/rand/internal.h
 *   https://github.com/openssl/openssl/blob/master/crypto/rand/drbg_lib.c
 *   https://github.com/cryptocoinjs/drbg.js/blob/master/ctr.js
 *   https://github.com/netroby/jdk9-dev/blob/master/jdk/src/java.base/share/classes/sun/security/provider/CtrDrbg.java
 */

import { Bytes } from "@zwave-js/shared/safe";
import { increment } from "./bufferUtils";
import { encryptAES128ECB } from "./crypto";

const MAX_GENERATE_LENGTH = 65536;
// const RESEED_INTERVAL = 0x1000000000000;

export class CtrDRBG {
	constructor(
		bits: 128,
		derivation: boolean,
		entropy?: Uint8Array,
		nonce?: Uint8Array,
		pers?: Uint8Array,
	) {
		this.ctr = new Uint8Array(16).fill(0);
		this.keySize = bits >>> 3;
		this.blkSize = 16;
		this.entSize = this.keySize + this.blkSize;
		this.slab = new Uint8Array(this.entSize);
		this.K = this.slab.subarray(0, this.keySize);
		this.V = this.slab.subarray(this.keySize);
		this.derivation = derivation;
		// this.rounds = 0;
		this.initialized = false;

		if (entropy) this.init(entropy, nonce, pers);
	}

	/** The internal counter */
	private ctr: Uint8Array;
	private readonly keySize: number;
	private readonly blkSize: number;
	private readonly entSize: number;
	private slab: Uint8Array;
	private K: Uint8Array;
	private V: Uint8Array;
	private readonly derivation: boolean;
	// private rounds: number;
	private initialized: boolean;

	init(
		entropy: Uint8Array,
		nonce: Uint8Array = new Uint8Array(),
		pers: Uint8Array = new Uint8Array(),
	): this {
		let seed: Uint8Array;

		if (this.derivation) {
			seed = this.derive(entropy, nonce, pers);
		} else {
			if (entropy.length + nonce.length > this.entSize) {
				throw new Error("Entropy is too long.");
			}

			if (pers.length > this.entSize) {
				throw new Error("Personalization string is too long.");
			}

			seed = new Uint8Array(this.entSize).fill(0);
			seed.set(entropy, 0);
			seed.set(nonce, entropy.length);

			for (let i = 0; i < pers.length; i++) seed[i] ^= pers[i];
		}

		this.slab.fill(0);
		this.ctr.set(this.V, 0);
		this.update(seed);
		this.initialized = true;
		// this.rounds = 1;

		return this;
	}

	reseed(entropy: Uint8Array, add: Uint8Array = new Uint8Array()): this {
		// if (this.rounds === 0)
		if (!this.initialized) throw new Error("DRBG not initialized.");

		let seed: Uint8Array;

		if (this.derivation) {
			seed = this.derive(entropy, add);
		} else {
			if (add.length > this.entSize) {
				throw new Error("Additional data is too long.");
			}

			seed = new Uint8Array(this.entSize).fill(0x00);
			seed.set(entropy, 0);
			for (let i = 0; i < add.length; i++) seed[i] ^= add[i];
		}

		this.update(seed);
		// this.rounds = 1;

		return this;
	}

	private next(): Uint8Array {
		increment(this.ctr);
		return encryptAES128ECB(this.ctr, this.K);
	}

	generate(len: number, add?: Uint8Array): Uint8Array {
		// if (this.rounds === 0)
		if (!this.initialized) throw new Error("DRBG not initialized.");

		// if (this.rounds > RESEED_INTERVAL)
		// 	throw new Error("Reseed is required.");

		if (len > MAX_GENERATE_LENGTH) {
			throw new Error("Requested length is too long.");
		}

		if (add && add.length > 0) {
			if (this.derivation) add = this.derive(add);

			this.update(add);
		}

		const blocks = Math.ceil(len / this.blkSize);
		const out = new Uint8Array(blocks * this.blkSize);

		for (let i = 0; i < blocks; i++) {
			const ciphertext = this.next();
			out.set(ciphertext, i * this.blkSize);
		}

		this.update(add);
		// this.rounds += 1;
		this.initialized = true;

		return out.subarray(0, len);
	}

	/*
	 * Helpers
	 */

	update(seed: Uint8Array = new Uint8Array()): this {
		if (seed.length > this.entSize) throw new Error("Seed is too long.");

		const newSlab = new Uint8Array(this.slab.length).fill(0);
		// this.slab.fill(0);

		for (let i = 0; i < this.entSize; i += this.blkSize) {
			newSlab.set(this.next(), i);
			// ciphertext.copy(this.slab, i);
		}

		// for (let i = 0; i < seed.length; i++) this.slab[i] ^= seed[i];
		for (let i = 0; i < seed.length; i++) newSlab[i] ^= seed[i];

		this.slab.set(newSlab, 0);
		this.ctr.set(this.V, 0);

		return this;
	}

	serialize(...input: Uint8Array[]): Uint8Array {
		const N = this.entSize;

		let L = 0;

		for (const item of input) L += item.length;

		let size = this.blkSize + 4 + 4 + L + 1;

		if (size % this.blkSize) size += this.blkSize - (size % this.blkSize);

		// S = IV || (L || N || input || 0x80 || 0x00...)
		const S = new Uint8Array(size).fill(0x00);
		const view = Bytes.view(S);

		let pos = this.blkSize;
		view.writeUInt32BE(L, pos);
		pos += 4;
		view.writeUInt32BE(N, pos);
		pos += 4;

		for (const item of input) {
			S.set(item, pos);
			pos += item.length;
		}

		S[pos++] = 0x80;

		return S;
	}

	derive(...input: Uint8Array[]): Uint8Array {
		const S = this.serialize(...input);
		const view = Bytes.view(S);
		const N = S.length / this.blkSize;
		const K = new Uint8Array(this.keySize);
		const blocks = Math.ceil(this.entSize / this.blkSize);
		const slab = new Uint8Array(blocks * this.blkSize);
		const out = new Uint8Array(blocks * this.blkSize);
		const chain = new Uint8Array(this.blkSize);

		for (let i = 0; i < K.length; i++) K[i] = i;

		for (let i = 0; i < blocks; i++) {
			chain.fill(0);

			view.writeUInt32BE(i, 0);

			// chain = BCC(K, IV || S)
			for (let j = 0; j < N; j++) {
				for (let k = 0; k < chain.length; k++) {
					chain[k] ^= S[j * this.blkSize + k];
				}

				// encrypt in-place
				chain.set(encryptAES128ECB(chain, K), 0);
				// ctx.encrypt(chain, 0, chain, 0);
			}
			slab.set(chain, i * this.blkSize);
		}

		const k = slab.subarray(0, this.keySize);
		const x = slab.subarray(this.keySize, this.entSize);

		for (let i = 0; i < blocks; i++) {
			// encrypt in-place
			x.set(encryptAES128ECB(x, k), 0);
			// ctx.encrypt(x, 0, x, 0);
			out.set(x, i * this.blkSize);
		}

		return out.subarray(0, this.entSize);
	}
}
