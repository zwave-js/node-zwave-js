import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { NVMAccess, type NVMIO } from "@zwave-js/nvmedit";
import { FunctionType } from "@zwave-js/serial";
import { nvmSizeToBufferSize } from "@zwave-js/serial/serialapi";
import { type ZWaveController } from "./Controller.js";

/** NVM IO over serial for 500 series controllers */
export class SerialNVMIO500 implements NVMIO {
	public constructor(controller: ZWaveController) {
		this._controller = controller;
	}

	private _controller: ZWaveController;
	private _size: number | undefined;
	private _chunkSize: number | undefined;

	public async open(_access: NVMAccess): Promise<NVMAccess> {
		this._size = nvmSizeToBufferSize(
			(await this._controller.getNVMId()).memorySize,
		);
		if (!this._size) {
			throw new ZWaveError(
				"Unknown NVM size - cannot backup!",
				ZWaveErrorCodes.Controller_NotSupported,
			);
		}
		return NVMAccess.ReadWrite;
	}

	get size(): number {
		if (this._size == undefined) {
			throw new ZWaveError(
				"The NVM is not open",
				ZWaveErrorCodes.NVM_NotOpen,
			);
		}
		return this._size;
	}

	get accessMode(): NVMAccess {
		if (this._size == undefined) {
			return NVMAccess.None;
		} else {
			return NVMAccess.ReadWrite;
		}
	}

	async determineChunkSize(): Promise<number> {
		if (this._size == undefined) {
			throw new ZWaveError(
				"The NVM is not open",
				ZWaveErrorCodes.NVM_NotOpen,
			);
		}

		if (!this._chunkSize) {
			// Try reading the maximum size at first, the Serial API should return chunks in a size it supports
			// For some reason, there is no documentation and no official command for this
			const chunk = await this._controller.externalNVMReadBuffer(
				0,
				0xffff,
			);
			// Some SDK versions return an empty buffer when trying to read a buffer that is too long
			// Fallback to a sane (but maybe slow) size
			this._chunkSize = chunk.length || 48;
		}
		return this._chunkSize;
	}

	async read(
		offset: number,
		length: number,
	): Promise<{ buffer: Uint8Array; endOfFile: boolean }> {
		// Ensure we're not reading out of bounds
		const size = this.size;
		if (offset < 0 || offset >= size) {
			throw new ZWaveError(
				"Cannot read outside of the NVM",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const chunkSize = await this.determineChunkSize();
		const readSize = Math.min(length, chunkSize, size - offset);

		const buffer = await this._controller.externalNVMReadBuffer(
			offset,
			readSize,
		);
		const endOfFile = offset + readSize >= size;
		return {
			buffer,
			endOfFile,
		};
	}

	async write(
		offset: number,
		data: Uint8Array,
	): Promise<{ bytesWritten: number; endOfFile: boolean }> {
		// Ensure we're not writing out of bounds
		const size = this.size;
		if (offset < 0 || offset >= size) {
			throw new ZWaveError(
				"Cannot read outside of the NVM",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		// Write requests need 5 bytes more than read requests, which limits our chunk size
		const chunkSize = await this.determineChunkSize() - 5;
		const writeSize = Math.min(data.length, chunkSize, size - offset);

		await this._controller.externalNVMWriteBuffer(
			offset,
			data.subarray(0, writeSize),
		);
		const endOfFile = offset + writeSize >= size;
		return {
			bytesWritten: writeSize,
			endOfFile,
		};
	}

	close(): Promise<void> {
		// Nothing to do really
		return Promise.resolve();
	}
}

/** NVM IO over serial for 700+ series controllers */
export class SerialNVMIO700 implements NVMIO {
	public constructor(controller: ZWaveController) {
		this._controller = controller;
		if (
			controller.isFunctionSupported(
				FunctionType.ExtendedNVMOperations,
			)
		) {
			this._open = async () => {
				const { size } = await controller.externalNVMOpenExt();
				return size;
			};
			this._read = (offset, length) =>
				controller.externalNVMReadBufferExt(offset, length);
			this._write = (offset, buffer) =>
				controller.externalNVMWriteBufferExt(offset, buffer);
			this._close = () => controller.externalNVMCloseExt();
		} else {
			this._open = () => controller.externalNVMOpen();
			this._read = (offset, length) =>
				controller.externalNVMReadBuffer700(offset, length);
			this._write = (offset, buffer) =>
				controller.externalNVMWriteBuffer700(offset, buffer);
			this._close = () => controller.externalNVMClose();
		}
	}

	private _controller: ZWaveController;

	private _open: () => Promise<number>;
	private _read: (
		offset: number,
		length: number,
	) => Promise<{ buffer: Uint8Array; endOfFile: boolean }>;
	private _write: (
		offset: number,
		buffer: Uint8Array,
	) => Promise<{ endOfFile: boolean }>;
	private _close: () => Promise<void>;

	private _size: number | undefined;
	private _chunkSize: number | undefined;
	private _accessMode: NVMAccess = NVMAccess.None;

	public async open(
		access: NVMAccess.Read | NVMAccess.Write,
	): Promise<NVMAccess> {
		this._size = await this._open();
		// We only support reading or writing, not both
		this._accessMode = access;
		return access;
	}

	get size(): number {
		if (this._size == undefined) {
			throw new ZWaveError(
				"The NVM is not open",
				ZWaveErrorCodes.NVM_NotOpen,
			);
		}
		return this._size;
	}

	get accessMode(): NVMAccess {
		return this._accessMode;
	}

	async determineChunkSize(): Promise<number> {
		if (!this._chunkSize) {
			// The write requests have the same size as the read response - if this yields no
			// data, default to a sane (but maybe slow) size
			this._chunkSize = (await this._read(0, 0xff)).buffer.length || 48;
		}

		return this._chunkSize;
	}

	async read(
		offset: number,
		length: number,
	): Promise<{ buffer: Uint8Array; endOfFile: boolean }> {
		// Ensure we're not reading out of bounds
		const size = this.size;
		if (offset < 0 || offset >= size) {
			throw new ZWaveError(
				"Cannot read outside of the NVM",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const chunkSize = await this.determineChunkSize();

		return this._read(
			offset,
			Math.min(length, chunkSize, size - offset),
		);
	}

	async write(
		offset: number,
		data: Uint8Array,
	): Promise<{ bytesWritten: number; endOfFile: boolean }> {
		// Ensure we're not writing out of bounds
		const size = this.size;
		if (offset < 0 || offset >= size) {
			throw new ZWaveError(
				"Cannot read outside of the NVM",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const chunkSize = await this.determineChunkSize();
		const writeSize = Math.min(data.length, chunkSize, size - offset);

		const { endOfFile } = await this._write(
			offset,
			data.subarray(0, writeSize),
		);
		return {
			bytesWritten: writeSize,
			endOfFile,
		};
	}

	close(): Promise<void> {
		this._accessMode = NVMAccess.None;
		return this._close();
	}
}
