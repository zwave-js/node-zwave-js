import { randomBytes } from "crypto";

export class SecurityManager {
	public constructor() {
		// TODO:
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
