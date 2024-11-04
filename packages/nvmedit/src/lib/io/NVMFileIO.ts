import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import fs, { type FileHandle } from "node:fs/promises";
import { NVMAccess, type NVMIO } from "../common/definitions.js";

/** An implementation of NVMIO for the filesystem */
export class NVMFileIO implements NVMIO {
	public constructor(path: string) {
		this._path = path;
		this._accessMode = NVMAccess.None;
	}

	private _path: string;
	private _handle: FileHandle | undefined;
	private _chunkSize = 16 * 1024; // We could read more, but 16 KB chunks are more than enough for reading NVM contents

	async open(access: NVMAccess): Promise<NVMAccess> {
		let flags: string;
		switch (access) {
			case NVMAccess.Read:
				flags = "r";
				break;
			case NVMAccess.Write:
			case NVMAccess.ReadWrite:
				// Read/Write, don't create, don't truncate
				flags = "r+";
				access = NVMAccess.ReadWrite;
				break;
			default:
				throw new Error("Invalid access mode");
		}
		this._handle = await fs.open(this._path, flags);
		this._size = (await this._handle.stat()).size;

		this._accessMode = access;
		return access;
	}

	private _size: number | undefined;
	get size(): number {
		if (this._size == undefined) {
			throw new ZWaveError(
				"The NVM file is not open",
				ZWaveErrorCodes.NVM_NotOpen,
			);
		}
		return this._size;
	}

	private _accessMode: NVMAccess;
	get accessMode(): NVMAccess {
		return this._accessMode;
	}

	determineChunkSize(): Promise<number> {
		return Promise.resolve(this._chunkSize);
	}

	async read(
		offset: number,
		length: number,
	): Promise<{ buffer: Uint8Array; endOfFile: boolean }> {
		if (this._handle == undefined) {
			throw new ZWaveError(
				"The NVM file is not open",
				ZWaveErrorCodes.NVM_NotOpen,
			);
		}
		const readResult = await this._handle.read({
			buffer: new Uint8Array(length),
			position: offset,
		});

		const endOfFile = offset + readResult.bytesRead >= this.size;
		return {
			buffer: readResult.buffer.subarray(0, readResult.bytesRead),
			endOfFile,
		};
	}

	async write(
		offset: number,
		data: Uint8Array,
	): Promise<{ bytesWritten: number; endOfFile: boolean }> {
		if (this._handle == undefined) {
			throw new ZWaveError(
				"The NVM file is not open",
				ZWaveErrorCodes.NVM_NotOpen,
			);
		}
		if (offset + data.length > this.size) {
			throw new ZWaveError(
				"Write would exceed the NVM size",
				ZWaveErrorCodes.NVM_NoSpace,
			);
		}
		const writeResult = await this._handle.write(
			data,
			0,
			data.length,
			offset,
		);
		const endOfFile = offset + writeResult.bytesWritten >= this.size;
		return { bytesWritten: writeResult.bytesWritten, endOfFile };
	}

	async close(): Promise<void> {
		await this._handle?.close();
		this._handle = undefined;
		this._accessMode = NVMAccess.None;
		this._size = undefined;
	}
}
