import { Bytes } from "@zwave-js/shared/safe";
import type { NVMIO } from "./definitions.js";

export async function nvmReadUInt32LE(
	io: NVMIO,
	position: number,
): Promise<number> {
	const { buffer } = await io.read(position, 4);
	const bytes = Bytes.view(buffer);
	return bytes.readUInt32LE(0);
}

export async function nvmReadUInt16LE(
	io: NVMIO,
	position: number,
): Promise<number> {
	const { buffer } = await io.read(position, 2);
	const bytes = Bytes.view(buffer);
	return bytes.readUInt16LE(0);
}

export async function nvmReadUInt32BE(
	io: NVMIO,
	position: number,
): Promise<number> {
	const { buffer } = await io.read(position, 4);
	const bytes = Bytes.view(buffer);
	return bytes.readUInt32BE(0);
}

export async function nvmReadUInt16BE(
	io: NVMIO,
	position: number,
): Promise<number> {
	const { buffer } = await io.read(position, 2);
	const bytes = Bytes.view(buffer);
	return bytes.readUInt16BE(0);
}

export async function nvmReadUInt8(
	io: NVMIO,
	position: number,
): Promise<number> {
	const { buffer } = await io.read(position, 1);
	const bytes = Bytes.view(buffer);
	return bytes.readUInt8(0);
}

export async function nvmWriteBuffer(
	io: NVMIO,
	position: number,
	buffer: Uint8Array,
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
): Promise<Uint8Array> {
	const ret = new Uint8Array(length);
	const chunkSize = await io.determineChunkSize();
	let offset = 0;
	while (offset < length) {
		const { buffer, endOfFile } = await io.read(
			position + offset,
			Math.min(chunkSize, length - offset),
		);
		ret.set(buffer, offset);
		offset += buffer.length;
		if (endOfFile) break;
	}
	return ret.subarray(0, offset);
}
