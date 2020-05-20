import { randomBytes } from "crypto";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { encryptAES128ECB } from "./crypto";

const authKeyBase = Buffer.alloc(16, 0x55);
const encryptionKeyBase = Buffer.alloc(16, 0xaa);

export class SecurityManager {
	public constructor(networkKey: Buffer) {
		this.networkKey = networkKey;
	}

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
		this._authKey = encryptAES128ECB(authKeyBase, this._networkKey);
		this._encryptionKey = encryptAES128ECB(
			encryptionKeyBase,
			this._networkKey,
		);
	}

	private _authKey!: Buffer;
	public get authKey(): Buffer {
		return this._authKey;
	}

	private _encryptionKey!: Buffer;
	public get encryptionKey(): Buffer {
		return this._encryptionKey;
	}

	private _nonceStore = new Map<number, Buffer>();

	public generateNonce(length: number): Buffer {
		let ret: Buffer;
		let nonceId: number;
		do {
			ret = randomBytes(length);
			nonceId = this.getNonceId(ret);
		} while (this._nonceStore.has(nonceId));

		this._nonceStore.set(nonceId, ret);
		return ret;
	}

	public getNonceId(nonce: Buffer): number {
		return nonce[0];
	}

	public getNonce(id: number): Buffer | undefined {
		return this._nonceStore.get(id);
	}
}
