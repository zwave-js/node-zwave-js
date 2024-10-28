import type { NVMIO } from "./definitions";

export async function nvmReadUInt32LE(
	io: NVMIO,
	position: number,
): Promise<number> {
	const { buffer } = await io.read(position, 4);
	return buffer.readUInt32LE(0);
}

export async function nvmReadUInt16LE(
	io: NVMIO,
	position: number,
): Promise<number> {
	const { buffer } = await io.read(position, 2);
	return buffer.readUInt16LE(0);
}

export async function nvmReadUInt32BE(
	io: NVMIO,
	position: number,
): Promise<number> {
	const { buffer } = await io.read(position, 4);
	return buffer.readUInt32BE(0);
}

export async function nvmReadUInt16BE(
	io: NVMIO,
	position: number,
): Promise<number> {
	const { buffer } = await io.read(position, 2);
	return buffer.readUInt16BE(0);
}

export async function nvmReadUInt8(
	io: NVMIO,
	position: number,
): Promise<number> {
	const { buffer } = await io.read(position, 1);
	return buffer.readUInt8(0);
}

export async function nvmWriteBuffer(
	io: NVMIO,
	position: number,
	buffer: Buffer,
): Promise<void> {
	const chunkSize = await io.determineChunkSize();
	let offset = 0;
	while (offset < buffer.length) {
		const chunk = buffer.subarray(offset, offset + chunkSize);
		const { bytesWritten } = await io.write(position + offset, chunk);
		offset += bytesWritten;
	}
}

export async function nvmReadBuffer(
	io: NVMIO,
	position: number,
	length: number,
): Promise<Buffer> {
	const ret = new Buffer(length);
	const chunkSize = await io.determineChunkSize();
	let offset = 0;
	while (offset < length) {
		const { buffer, endOfFile } = await io.read(
			position + offset,
			Math.min(chunkSize, length - offset),
		);
		buffer.copy(ret, offset);
		offset += buffer.length;
		if (endOfFile) break;
	}
	return ret.subarray(0, offset);
}
