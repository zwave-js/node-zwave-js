// Wrapper class for both sync and async CtrDrbg implementations.

import { CtrDrbgAsync } from "./ctr_drbg.async.js";
import { CtrDrbgSync } from "./ctr_drbg.sync.js";

export class CtrDRBG {
	private drbgSync = new CtrDrbgSync();
	private drbgAsync = new CtrDrbgAsync();

	public initSync(
		entropy: Uint8Array,
		personalizationString?: Uint8Array,
	): void {
		this.drbgSync.init(entropy, personalizationString);
		this.drbgAsync.restoreState(this.drbgSync.saveState());
	}

	public async initAsync(
		entropy: Uint8Array,
		personalizationString?: Uint8Array,
	): Promise<void> {
		await this.drbgAsync.init(entropy, personalizationString);
		this.drbgSync.restoreState(this.drbgAsync.saveState());
	}

	public updateSync(providedData: Uint8Array | undefined): void {
		this.drbgSync.update(providedData);
		this.drbgAsync.restoreState(this.drbgSync.saveState());
	}

	public async updateAsync(
		providedData: Uint8Array | undefined,
	): Promise<void> {
		await this.drbgAsync.update(providedData);
		this.drbgSync.restoreState(this.drbgAsync.saveState());
	}

	public generateSync(len: number): Uint8Array {
		const ret = this.drbgSync.generate(len);
		this.drbgAsync.restoreState(this.drbgSync.saveState());
		return ret;
	}

	public async generateAsync(len: number): Promise<Uint8Array> {
		const ret = await this.drbgAsync.generate(len);
		this.drbgSync.restoreState(this.drbgAsync.saveState());
		return ret;
	}
}
