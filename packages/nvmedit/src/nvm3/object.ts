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
} from "./consts";
import {
	computeBergerCode,
	computeBergerCodeMulti,
	validateBergerCodeMulti,
} from "./utils";

export interface NVM3Object {
	type: ObjectType;
	fragmentType: FragmentType;
	key: number;
	data?: Buffer;
}

export function readObject(
	buffer: Buffer,
	offset: number,
):
	| {
			object: NVM3Object;
			bytesRead: number;
	  }
	| undefined {
	let headerSize = 4;
	const hdr1 = buffer.readUInt32LE(offset);

	// Skip over blank page areas
	if (hdr1 === 0xffffffff) return;

	const key = (hdr1 >> NVM3_OBJ_KEY_SHIFT) & NVM3_OBJ_KEY_MASK;
	let objType: ObjectType = hdr1 & NVM3_OBJ_TYPE_MASK;
	let fragmentLength = 0;
	let hdr2: number | undefined;
	const isLarge =
		objType === ObjectType.DataLarge || objType === ObjectType.CounterLarge;
	if (isLarge) {
		hdr2 = buffer.readUInt32LE(offset + 4);
		headerSize += 4;
		fragmentLength = hdr2 & NVM3_OBJ_LARGE_LEN_MASK;
	} else if (objType > ObjectType.DataSmall) {
		// In small objects with data, the length and object type are stored in the same value
		fragmentLength = objType - ObjectType.DataSmall;
		objType = ObjectType.DataSmall;
	} else if (objType === ObjectType.CounterSmall) {
		fragmentLength = NVM3_COUNTER_SIZE;
	}

	const fragmentType: FragmentType = isLarge
		? (hdr1 >>> NVM3_OBJ_FRAGTYPE_SHIFT) & NVM3_OBJ_FRAGTYPE_MASK
		: FragmentType.None;

	if (isLarge) {
		validateBergerCodeMulti([hdr1, hdr2!], 32 + NVM3_CODE_LARGE_SHIFT);
	} else {
		validateBergerCodeMulti([hdr1], NVM3_CODE_SMALL_SHIFT);
	}

	if (buffer.length < offset + headerSize + fragmentLength) {
		throw new Error("Incomplete object in buffer!");
	}

	let data: Buffer | undefined;
	if (fragmentLength > 0) {
		data = buffer.slice(
			offset + headerSize,
			offset + headerSize + fragmentLength,
		);
	}

	const alignedLength =
		(fragmentLength + NVM3_WORD_SIZE - 1) & ~(NVM3_WORD_SIZE - 1);
	const bytesRead = headerSize + alignedLength;

	const obj: NVM3Object = {
		type: objType,
		fragmentType,
		key,
		data,
	};
	return {
		object: obj,
		bytesRead,
	};
}

export function readObjects(buffer: Buffer): {
	objects: NVM3Object[];
	bytesRead: number;
} {
	let offset = 0;
	const objects: NVM3Object[] = [];
	while (offset < buffer.length) {
		const result = readObject(buffer, offset);
		if (!result) break;

		const { object, bytesRead } = result;
		objects.push(object);

		offset += bytesRead;
	}

	return {
		objects,
		bytesRead: offset,
	};
}

export function writeObject(obj: NVM3Object): Buffer {
	const isLarge =
		obj.type === ObjectType.DataLarge ||
		obj.type === ObjectType.CounterLarge;
	const headerSize = isLarge
		? NVM3_OBJ_HEADER_SIZE_LARGE
		: NVM3_OBJ_HEADER_SIZE_SMALL;
	const dataLength = obj.data?.length ?? 0;
	const ret = Buffer.allocUnsafe(dataLength + headerSize);

	// Write header
	if (isLarge) {
		let hdr2 = dataLength & NVM3_OBJ_LARGE_LEN_MASK;

		const hdr1 =
			(obj.type & NVM3_OBJ_TYPE_MASK) |
			((obj.key & NVM3_OBJ_KEY_MASK) << NVM3_OBJ_KEY_SHIFT) |
			((obj.fragmentType & NVM3_OBJ_FRAGTYPE_MASK) <<
				NVM3_OBJ_FRAGTYPE_SHIFT);

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
		let hdr1 =
			(typeAndLen & NVM3_OBJ_TYPE_MASK) |
			((obj.key & NVM3_OBJ_KEY_MASK) << NVM3_OBJ_KEY_SHIFT);
		const bergerCode = computeBergerCode(hdr1, NVM3_CODE_SMALL_SHIFT);
		hdr1 |= bergerCode << NVM3_CODE_SMALL_SHIFT;

		ret.writeInt32LE(hdr1, 0);
	}

	// Write data
	if (obj.data) {
		obj.data.copy(ret, headerSize);
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
		obj.data!.length + NVM3_OBJ_HEADER_SIZE_LARGE <=
		maxFirstFragmentSizeWithHeader
	) {
		return [obj];
	}

	let offset = 0;
	while (offset < obj.data!.length) {
		const fragmentSize =
			offset === 0
				? maxFirstFragmentSizeWithHeader - NVM3_OBJ_HEADER_SIZE_LARGE
				: maxFragmentSizeWithHeader - NVM3_OBJ_HEADER_SIZE_LARGE;
		const data = obj.data!.slice(offset, offset + fragmentSize);

		ret.push({
			type: obj.type,
			key: obj.key,
			fragmentType:
				offset === 0
					? FragmentType.First
					: data.length + NVM3_OBJ_HEADER_SIZE_LARGE <
					  maxFragmentSizeWithHeader
					? FragmentType.Last
					: FragmentType.Next,
			data,
		});

		offset += fragmentSize;
	}

	return ret;
}

/**
 * Takes the raw list of objects from the pages ring buffer and compresses
 * them so that each object is only stored once.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function compressObjects(objects: NVM3Object[]) {
	const ret = new Map<number, NVM3Object>();
	// Only insert valid objects. This means non-fragmented ones, non-deleted ones
	// and fragmented ones in the correct and complete order
	outer: for (let i = 0; i < objects.length; i++) {
		const obj = objects[i];
		if (obj.type === ObjectType.Deleted) {
			ret.delete(obj.key);
			continue;
		} else if (obj.fragmentType === FragmentType.None) {
			ret.set(obj.key, obj);
			continue;
		} else if (obj.fragmentType !== FragmentType.First || !obj.data) {
			// This is the broken rest of an overwritten object, skip it
			continue;
		}

		// We're looking at the first fragment of a fragmented object
		const parts: Buffer[] = [obj.data];
		for (let j = i + 1; j < objects.length; j++) {
			// The next objects must have the same key and either be the
			// next or the last fragment with data
			const next = objects[j];
			if (next.key !== obj.key || !next.data) {
				// Invalid object, skipping
				continue outer;
			} else if (next.fragmentType === FragmentType.Next) {
				parts.push(next.data);
			} else if (next.fragmentType === FragmentType.Last) {
				parts.push(next.data);
				break;
			}
		}
		// Combine all fragments into a single readable object
		ret.set(obj.key, {
			key: obj.key,
			fragmentType: FragmentType.None,
			type: obj.type,
			data: Buffer.concat(parts),
		});
	}
	return ret;
}
