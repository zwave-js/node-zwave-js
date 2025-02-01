/** Management class and utils for Security S0 */

import { type Timer, setTimer } from "@zwave-js/shared";
import { encryptAES128ECB, randomBytes } from "../crypto/index.js";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError.js";

const authKeyBase = new Uint8Array(16).fill(0x55);
const encryptionKeyBase = new Uint8Array(16).fill(0xaa);

export function generateAuthKey(
	networkKey: Uint8Array,
): Promise<Uint8Array> {
	return encryptAES128ECB(authKeyBase, networkKey);
}

export function generateEncryptionKey(
	networkKey: Uint8Array,
): Promise<Uint8Array> {
	return encryptAES128ECB(encryptionKeyBase, networkKey);
}

interface NonceKey {
	/** The node that has created this nonce */
	issuer: number;
	nonceId: number;
}

interface NonceEntry {
	nonce: Uint8Array;
	/** The node this nonce was created for */
	receiver: number;
}

export interface SecurityManagerOptions {
	networkKey: Uint8Array;
	ownNodeId: number;
	nonceTimeout: number;
}

export interface SetNonceOptions {
	free?: boolean;
}

export class SecurityManager {
	public constructor(options: SecurityManagerOptions) {
		this.networkKey = options.networkKey;
		this.ownNodeId = options.ownNodeId;
		this.nonceTimeout = options.nonceTimeout;
	}

	private ownNodeId: number;
	private nonceTimeout: number;

	private _networkKey!: Uint8Array;
	public get networkKey(): Uint8Array {
		return this._networkKey;
	}
	public set networkKey(v: Uint8Array) {
		if (v.length !== 16) {
			throw new ZWaveError(
				`The network key must be 16 bytes long!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this._networkKey = v;
		this._authKey = undefined;
		this._encryptionKey = undefined;
	}

	private _authKey: Uint8Array | undefined;
	public async getAuthKey(): Promise<Uint8Array> {
		if (!this._authKey) {
			this._authKey = await generateAuthKey(this.networkKey);
		}
		return this._authKey;
	}

	private _encryptionKey: Uint8Array | undefined;
	public async getEncryptionKey(): Promise<Uint8Array> {
		if (!this._encryptionKey) {
			this._encryptionKey = await generateEncryptionKey(
				this.networkKey,
			);
		}
		return this._encryptionKey;
	}

	private _nonceStore = new Map<string, NonceEntry>();
	private _freeNonceIDs = new Set<string>();
	private _nonceTimers = new Map<string, Timer>();

	private normalizeId(id: number | NonceKey): string {
		let ret: NonceKey;
		if (typeof id === "number") {
			ret = {
				issuer: this.ownNodeId,
				nonceId: id,
			};
		} else {
			ret = {
				issuer: id.issuer,
				nonceId: id.nonceId,
			};
		}
		return JSON.stringify(ret);
	}

	/** Generates a nonce for the current node */
	public generateNonce(receiver: number, length: number): Uint8Array {
		let nonce: Uint8Array;
		let nonceId: number;
		do {
			nonce = randomBytes(length);
			nonceId = this.getNonceId(nonce);
		} while (this.hasNonce(nonceId));

		this.setNonce(nonceId, { receiver, nonce }, { free: false });
		return nonce;
	}

	public getNonceId(nonce: Uint8Array): number {
		return nonce[0];
	}

	public setNonce(
		id: number | NonceKey,
		entry: NonceEntry,
		{ free = true }: SetNonceOptions = {},
	): void {
		const key = this.normalizeId(id);
		this._nonceTimers.get(key)?.clear();
		this._nonceStore.set(key, entry);
		if (free) this._freeNonceIDs.add(key);
		this._nonceTimers.set(
			key,
			setTimer(() => {
				this.expireNonce(key);
			}, this.nonceTimeout).unref(),
		);
	}

	/** Deletes ALL nonces that were issued for a given node */
	public deleteAllNoncesForReceiver(receiver: number): void {
		for (const [key, entry] of this._nonceStore) {
			if (entry.receiver === receiver) {
				this.deleteNonceInternal(key);
			}
		}
	}

	public deleteNonce(id: number | NonceKey): void {
		const key = this.normalizeId(id);
		const nonceReceiver = this._nonceStore.get(key)?.receiver;
		// Delete the nonce that was requested to be deleted
		this.deleteNonceInternal(key);
		// And all others for the same receiver aswell
		if (nonceReceiver) {
			this.deleteAllNoncesForReceiver(nonceReceiver);
		}
	}

	private deleteNonceInternal(key: string) {
		this._nonceTimers.get(key)?.clear();
		this._nonceStore.delete(key);
		this._nonceTimers.delete(key);
		this._freeNonceIDs.delete(key);
	}

	private expireNonce(key: string): void {
		this.deleteNonceInternal(key);
	}

	public getNonce(id: number | NonceKey): Uint8Array | undefined {
		return this._nonceStore.get(this.normalizeId(id))?.nonce;
	}

	public hasNonce(id: number | NonceKey): boolean {
		return this._nonceStore.has(this.normalizeId(id));
	}

	public getFreeNonce(nodeId: number): Uint8Array | undefined {
		// Iterate through the known free nonce IDs to find one for the given node
		for (const key of this._freeNonceIDs) {
			const nonceKey = JSON.parse(key) as NonceKey;
			if (nonceKey.issuer === nodeId) {
				this._freeNonceIDs.delete(key);
				return this._nonceStore.get(key)?.nonce;
			}
		}
	}
}
