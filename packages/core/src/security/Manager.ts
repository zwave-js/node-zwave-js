import { randomBytes } from "crypto";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { encryptAES128ECB } from "./crypto";

const authKeyBase = Buffer.alloc(16, 0x55);
const encryptionKeyBase = Buffer.alloc(16, 0xaa);

export function generateAuthKey(networkKey: Buffer): Buffer {
	return encryptAES128ECB(authKeyBase, networkKey);
}

export function generateEncryptionKey(networkKey: Buffer): Buffer {
	return encryptAES128ECB(encryptionKeyBase, networkKey);
}

interface NonceKey {
	nodeId: number;
	nonceId: number;
}

export interface SecurityManagerOptions {
	networkKey: Buffer;
	ownNodeId: number;
	nonceTimeout: number;
}

export class SecurityManager {
	public constructor(options: SecurityManagerOptions) {
		this.networkKey = options.networkKey;
		this.ownNodeId = options.ownNodeId;
		this.nonceTimeout = options.nonceTimeout;
	}

	private ownNodeId: number;
	private nonceTimeout: number;

	private _networkKey!: Buffer;
	public get networkKey(): Buffer {
		return this._networkKey;
	}
	public set networkKey(v: Buffer) {
		if (v.length !== 16) {
			throw new ZWaveError(
				`The network key must be 16 bytes long!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this._networkKey = v;
		this._authKey = generateAuthKey(this._networkKey);
		this._encryptionKey = generateEncryptionKey(this._networkKey);
	}

	private _authKey!: Buffer;
	public get authKey(): Buffer {
		return this._authKey;
	}

	private _encryptionKey!: Buffer;
	public get encryptionKey(): Buffer {
		return this._encryptionKey;
	}

	private _nonceStore = new Map<string, Buffer>();
	private _nonceTimers = new Map<string, NodeJS.Timeout>();

	private normalizeId(id: number | NonceKey): string {
		let ret: NonceKey;
		if (typeof id === "number") {
			ret = {
				nodeId: this.ownNodeId,
				nonceId: id,
			};
		} else {
			ret = {
				nodeId: id.nodeId,
				nonceId: id.nonceId,
			};
		}
		return JSON.stringify(ret);
	}

	/** Generates a nonce for the current node */
	public generateNonce(length: number): Buffer {
		let ret: Buffer;
		let nonceId: number;
		do {
			ret = randomBytes(length);
			nonceId = this.getNonceId(ret);
		} while (this.hasNonce(nonceId));

		this.setNonce(nonceId, ret);
		return ret;
	}

	public getNonceId(nonce: Buffer): number {
		return nonce[0];
	}

	public setNonce(id: number | NonceKey, nonce: Buffer): void {
		const key = this.normalizeId(id);
		if (this._nonceTimers.has(key)) {
			clearTimeout(this._nonceTimers.get(key)!);
		}
		this._nonceStore.set(key, nonce);
		this._nonceTimers.set(
			key,
			setTimeout(() => {
				this.expireNonce(key);
			}, this.nonceTimeout),
		);
	}

	public deleteNonce(id: number | NonceKey): void {
		const key = this.normalizeId(id);
		if (this._nonceTimers.has(key)) {
			clearTimeout(this._nonceTimers.get(key)!);
		}
		this._nonceStore.delete(key);
		this._nonceTimers.delete(key);
	}

	private expireNonce(key: string): void {
		this._nonceStore.delete(key);
		this._nonceTimers.delete(key);
	}

	public getNonce(id: number | NonceKey): Buffer | undefined {
		return this._nonceStore.get(this.normalizeId(id));
	}

	public hasNonce(id: number | NonceKey): boolean {
		return this._nonceStore.has(this.normalizeId(id));
	}
}
