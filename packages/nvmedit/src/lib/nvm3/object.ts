import { Bytes } from "@zwave-js/shared";
import {
	FragmentType,
	NVM3_CODE_LARGE_SHIFT,
	NVM3_CODE_SMALL_SHIFT,
	NVM3_COUNTER_SIZE,
	NVM3_OBJ_FRAGTYPE_MASK,
	NVM3_OBJ_FRAGTYPE_SHIFT,
	NVM3_OBJ_HEADER_SIZE_LARGE,
	NVM3_OBJ_HEADER_SIZE_SMALL,
	NVM3_OBJ_KEY_MASK,
	NVM3_OBJ_KEY_SHIFT,
	NVM3_OBJ_LARGE_LEN_MASK,
	NVM3_OBJ_TYPE_MASK,
	NVM3_WORD_SIZE,
	ObjectType,
} from "./consts.js";
import { computeBergerCode, computeBergerCodeMulti } from "./utils.js";

export interface NVM3ObjectHeader {
	offset: number;
	type: ObjectType;
	key: number;
	fragmentType: FragmentType;
	/** The length of the header */
	headerSize: number;
	/** The length of the object data */
	fragmentSize: number;
	/** The total length of the object in the NVM */
	alignedSize: number;
}

export interface NVM3Object {
	type: ObjectType;
	fragmentType: FragmentType;
	key: number;
	data?: Uint8Array;
}

export function serializeObject(obj: NVM3Object): Uint8Array {
	const isLarge = obj.type === ObjectType.DataLarge
		|| obj.type === ObjectType.CounterLarge;
	const headerSize = isLarge
		? NVM3_OBJ_HEADER_SIZE_LARGE
		: NVM3_OBJ_HEADER_SIZE_SMALL;
	const dataLength = obj.data?.length ?? 0;
	const ret = new Bytes(dataLength + headerSize);

	// Write header
	if (isLarge) {
		let hdr2 = dataLength & NVM3_OBJ_LARGE_LEN_MASK;

		const hdr1 = (obj.type & NVM3_OBJ_TYPE_MASK)
			| ((obj.key & NVM3_OBJ_KEY_MASK) << NVM3_OBJ_KEY_SHIFT)
			| ((obj.fragmentType & NVM3_OBJ_FRAGTYPE_MASK)
				<< NVM3_OBJ_FRAGTYPE_SHIFT);

		const bergerCode = computeBergerCodeMulti(
			[hdr1, hdr2],
			32 + NVM3_CODE_LARGE_SHIFT,
		);
		hdr2 |= bergerCode << NVM3_CODE_LARGE_SHIFT;

		ret.writeInt32LE(hdr1, 0);
		ret.writeInt32LE(hdr2, 4);
	} else {
		let typeAndLen = obj.type;
		if (typeAndLen === ObjectType.DataSmall && dataLength > 0) {
			typeAndLen += dataLength;
		}
		let hdr1 = (typeAndLen & NVM3_OBJ_TYPE_MASK)
			| ((obj.key & NVM3_OBJ_KEY_MASK) << NVM3_OBJ_KEY_SHIFT);
		const bergerCode = computeBergerCode(hdr1, NVM3_CODE_SMALL_SHIFT);
		hdr1 |= bergerCode << NVM3_CODE_SMALL_SHIFT;

		ret.writeInt32LE(hdr1, 0);
	}

	// Write data
	if (obj.data) {
		ret.set(obj.data, headerSize);
	}
	return ret;
}

export function fragmentLargeObject(
	obj: NVM3Object & { type: ObjectType.DataLarge | ObjectType.CounterLarge },
	maxFirstFragmentSizeWithHeader: number,
	maxFragmentSizeWithHeader: number,
): NVM3Object[] {
	const ret: NVM3Object[] = [];

	if (
		obj.data!.length + NVM3_OBJ_HEADER_SIZE_LARGE
			<= maxFirstFragmentSizeWithHeader
	) {
		return [obj];
	}

	let offset = 0;
	while (offset < obj.data!.length) {
		const fragmentSize = offset === 0
			? maxFirstFragmentSizeWithHeader - NVM3_OBJ_HEADER_SIZE_LARGE
			: maxFragmentSizeWithHeader - NVM3_OBJ_HEADER_SIZE_LARGE;
		const data = obj.data!.subarray(offset, offset + fragmentSize);

		ret.push({
			type: obj.type,
			key: obj.key,
			fragmentType: offset === 0
				? FragmentType.First
				: data.length + NVM3_OBJ_HEADER_SIZE_LARGE
						< maxFragmentSizeWithHeader
				? FragmentType.Last
				: FragmentType.Next,
			data,
		});

		offset += fragmentSize;
	}

	return ret;
}

export function getAlignedSize(size: number): number {
	return (size + NVM3_WORD_SIZE - 1) & ~(NVM3_WORD_SIZE - 1);
}

export function getHeaderSize(obj: NVM3Object): number {
	switch (obj.type) {
		case ObjectType.Deleted:
		case ObjectType.CounterSmall:
		case ObjectType.DataSmall:
			return NVM3_OBJ_HEADER_SIZE_SMALL;
		case ObjectType.CounterLarge:
		case ObjectType.DataLarge:
			return NVM3_OBJ_HEADER_SIZE_LARGE;
	}
}

export function getFragmentSize(obj: NVM3Object): number {
	switch (obj.type) {
		case ObjectType.Deleted:
			return 0;
		case ObjectType.CounterSmall:
			return NVM3_COUNTER_SIZE;
		case ObjectType.DataSmall:
		case ObjectType.DataLarge:
		case ObjectType.CounterLarge:
			return obj.data?.length ?? 0;
	}
}

export function getRequiredSpace(obj: NVM3Object): number {
	return getHeaderSize(obj) + getAlignedSize(getFragmentSize(obj));
}

export function getObjectHeader(
	obj: NVM3Object,
	offset: number,
): NVM3ObjectHeader {
	const headerSize = getHeaderSize(obj);
	const fragmentSize = getFragmentSize(obj);
	return {
		offset,
		key: obj.key,
		type: obj.type,
		fragmentType: obj.fragmentType,
		headerSize,
		fragmentSize,
		alignedSize: headerSize + getAlignedSize(fragmentSize),
	};
}
