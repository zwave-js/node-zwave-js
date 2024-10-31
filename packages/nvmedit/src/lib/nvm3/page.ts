import { Bytes } from "@zwave-js/shared";
import {
	NVM3_MIN_PAGE_SIZE,
	NVM3_PAGE_COUNTER_MASK,
	NVM3_PAGE_COUNTER_SIZE,
	NVM3_PAGE_HEADER_SIZE,
	NVM3_PAGE_MAGIC,
	type PageStatus,
	type PageWriteSize,
} from "./consts.js";
import { type NVM3Object } from "./object.js";
import { computeBergerCode } from "./utils.js";

export interface NVM3PageHeader {
	offset: number;
	version: number;
	eraseCount: number;
	status: PageStatus;
	encrypted: boolean;
	pageSize: number;
	writeSize: PageWriteSize;
	memoryMapped: boolean;
	deviceFamily: number;
}

export interface NVM3Page {
	header: NVM3PageHeader;
	objects: NVM3Object[];
}

// The page size field has a value from 0 to 7 describing page sizes from 512 to 65536 bytes
export function pageSizeToBits(pageSize: number): number {
	return Math.ceil(Math.log2(pageSize) - Math.log2(NVM3_MIN_PAGE_SIZE));
}

export function pageSizeFromBits(bits: number): number {
	return NVM3_MIN_PAGE_SIZE * Math.pow(2, bits);
}

export function serializePageHeader(
	header: Omit<NVM3PageHeader, "offset">,
): Uint8Array {
	const ret = new Bytes(NVM3_PAGE_HEADER_SIZE);

	ret.writeUInt16LE(header.version, 0);
	ret.writeUInt16LE(NVM3_PAGE_MAGIC, 2);

	let eraseCount = header.eraseCount & NVM3_PAGE_COUNTER_MASK;
	const eraseCountCode = computeBergerCode(
		eraseCount,
		NVM3_PAGE_COUNTER_SIZE,
	);
	eraseCount |= eraseCountCode << NVM3_PAGE_COUNTER_SIZE;
	ret.writeInt32LE(eraseCount, 4);

	let eraseCountInv = ~header.eraseCount & NVM3_PAGE_COUNTER_MASK;
	const eraseCountInvCode = computeBergerCode(
		eraseCountInv,
		NVM3_PAGE_COUNTER_SIZE,
	);
	eraseCountInv |= eraseCountInvCode << NVM3_PAGE_COUNTER_SIZE;
	ret.writeInt32LE(eraseCountInv, 8);

	ret.writeUInt32LE(header.status, 12);

	const devInfo = (header.deviceFamily & 0x7ff)
		| ((header.writeSize & 0b1) << 11)
		| ((header.memoryMapped ? 1 : 0) << 12)
		| (pageSizeToBits(header.pageSize) << 13);
	ret.writeUInt16LE(devInfo, 16);

	const formatInfo = header.encrypted ? 0xfffe : 0xffff;
	ret.writeUInt16LE(formatInfo, 18);

	return ret;
}
