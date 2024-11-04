import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { NVMAccess, type NVMIO } from "../common/definitions.js";

/** An im-memory implementation of NVMIO */
export class NVMMemoryIO implements NVMIO {
	public constructor(buffer: Uint8Array) {
		this._buffer = buffer;
	}

	private _buffer: Uint8Array;

	open(_access: NVMAccess.Read | NVMAccess.Write): Promise<NVMAccess> {
		// Nothing to do
		return Promise.resolve(NVMAccess.ReadWrite);
	}

	get size(): number {
		return this._buffer.length;
	}

	get accessMode(): NVMAccess {
		return NVMAccess.ReadWrite;
	}

	determineChunkSize(): Promise<number> {
		// We can read the entire buffer at once
		return Promise.resolve(this._buffer.length);
	}

	read(
		offset: number,
		length: number,
	): Promise<{ buffer: Uint8Array; endOfFile: boolean }> {
		return Promise.resolve({
			buffer: this._buffer.subarray(offset, offset + length),
			endOfFile: offset + length >= this._buffer.length,
		});
	}

	write(
		offset: number,
		data: Uint8Array,
	): Promise<{ bytesWritten: number; endOfFile: boolean }> {
		if (offset + data.length > this.size) {
			throw new ZWaveError(
				"Write would exceed the NVM size",
				ZWaveErrorCodes.NVM_NoSpace,
			);
		}

		this._buffer.set(data, offset);
		return Promise.resolve({
			bytesWritten: data.length,
			endOfFile: offset + data.length >= this._buffer.length,
		});
	}

	close(): Promise<void> {
		// Nothing to do
		return Promise.resolve();
	}
}
