import { Bytes } from "@zwave-js/shared/safe";
import { type NVMAccess, type NVMIO } from "../common/definitions.js";

interface BufferedChunk {
	offset: number;
	data: Uint8Array;
}

export class BufferedNVMReader implements NVMIO {
	public constructor(inner: NVMIO) {
		this._inner = inner;
	}

	private _inner: NVMIO;
	// Already-read chunks. There are a few rules to follow:
	// - Offsets MUST be multiples of the chunk size
	// - The size of each chunk must be exactly the chunk size
	private _buffer: BufferedChunk[] = [];

	open(access: NVMAccess.Read | NVMAccess.Write): Promise<NVMAccess> {
		return this._inner.open(access);
	}
	get size(): number {
		return this._inner.size;
	}
	get accessMode(): NVMAccess {
		return this._inner.accessMode;
	}
	determineChunkSize(): Promise<number> {
		return this._inner.determineChunkSize();
	}

	private async readBuffered(
		alignedOffset: number,
		chunkSize: number,
	): Promise<Uint8Array> {
		let buffered = this._buffer.find((chunk) =>
			chunk.offset === alignedOffset
		);
		if (!buffered) {
			const { buffer: data } = await this._inner.read(
				alignedOffset,
				chunkSize,
			);
			buffered = { data, offset: alignedOffset };
			this._buffer.push(buffered);
		}
		return buffered.data;
	}

	async read(
		offset: number,
		length: number,
	): Promise<{ buffer: Uint8Array; endOfFile: boolean }> {
		// Limit the read size to the chunk size. This ensures we have to deal with maximum 2 chunks or read requests
		const chunkSize = await this.determineChunkSize();
		length = Math.min(length, chunkSize);

		// Figure out at which offsets to read
		const firstChunkStart = offset - offset % chunkSize;
		const secondChunkStart = (offset + length)
			- (offset + length) % chunkSize;

		// Read one or two chunks, depending on how many are needed
		const chunks: Uint8Array[] = [];
		chunks.push(await this.readBuffered(firstChunkStart, chunkSize));
		if (secondChunkStart > firstChunkStart) {
			chunks.push(await this.readBuffered(secondChunkStart, chunkSize));
		}
		const alignedBuffer = Bytes.concat(chunks);

		// Then slice out the section we need
		const endOfFile = offset + length >= this.size;
		const buffer = alignedBuffer.subarray(
			offset - firstChunkStart,
			offset - firstChunkStart + length,
		);

		return {
			buffer,
			endOfFile,
		};
	}

	async write(
		offset: number,
		data: Uint8Array,
	): Promise<{ bytesWritten: number; endOfFile: boolean }> {
		const ret = await this._inner.write(offset, data);

		// Invalidate cached chunks
		const chunkSize = await this.determineChunkSize();
		// Figure out at which offsets to read
		const firstChunkStart = offset - offset % chunkSize;
		const lastChunkStart = (offset + ret.bytesWritten)
			- (offset + ret.bytesWritten) % chunkSize;

		// TODO: We should update existing chunks where possible
		for (let i = firstChunkStart; i <= lastChunkStart; i += chunkSize) {
			const index = this._buffer.findIndex((chunk) => chunk.offset === i);
			if (index !== -1) {
				this._buffer.splice(index, 1);
			}
		}

		return ret;
	}

	close(): Promise<void> {
		return this._inner.close();
	}
}
