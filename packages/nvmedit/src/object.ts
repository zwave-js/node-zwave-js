import { validateBergerCodeMulti } from "./utils";

const OBJ_KEY_SHIFT = 7;
const OBJ_KEY_SIZE = 20;
const OBJ_KEY_MASK = (1 << OBJ_KEY_SIZE) - 1;
const OBJ_TYPE_MASK = 0b111_1111;
const OBJ_LARGE_LEN_SIZE = 26;
const OBJ_LARGE_LEN_MASK = (1 << OBJ_LARGE_LEN_SIZE) - 1;
const FRAG_TYPE_SHIFT = 27;
const FRAG_TYPE_MASK = 0b11;
const CODE_SMALL_SHIFT = 27;
const CODE_LARGE_SHIFT = 26;

// Everything is word-aligned
const NVM3_WORD_SIZE = 4;

const COUNTER_SIZE = 204;

export enum ObjectType {
	DataLarge = 0,
	CounterLarge = 1,
	CounterSmall = 2,
	Deleted = 3,
	DataSmall = 7,
}

export enum FragmentType {
	None = 0,
	First = 1,
	Next = 2,
	Last = 3,
}

export interface NVMObject {
	type: ObjectType;
	fragmentType: FragmentType;
	key: number;
	data?: Buffer;
}

export function readObject(
	nvmVersion: number,
	buffer: Buffer,
	offset: number,
):
	| {
			object: NVMObject;
			bytesRead: number;
	  }
	| undefined {
	let headerSize = 4;
	const hdr1 = buffer.readUInt32LE(offset);

	// Skip over blank page areas
	if (hdr1 === 0xffffffff) return;

	const key = (hdr1 >> OBJ_KEY_SHIFT) & OBJ_KEY_MASK;
	let objType: ObjectType = hdr1 & OBJ_TYPE_MASK;
	let fragmentLength = 0;
	let hdr2: number | undefined;
	const isLarge =
		objType === ObjectType.DataLarge || objType === ObjectType.CounterLarge;
	if (isLarge) {
		hdr2 = buffer.readUInt32LE(offset + 4);
		headerSize += 4;
		fragmentLength = hdr2 & OBJ_LARGE_LEN_MASK;
	} else if (objType > ObjectType.DataSmall) {
		// In small objects with data, the length and object type are stored in the same value
		fragmentLength = objType - ObjectType.DataSmall;
		objType = ObjectType.DataSmall;
	} else if (objType === ObjectType.CounterSmall) {
		fragmentLength = COUNTER_SIZE;
	}

	const fragmentType: FragmentType = isLarge
		? (hdr1 >>> FRAG_TYPE_SHIFT) & FRAG_TYPE_MASK
		: FragmentType.None;

	if (isLarge) {
		validateBergerCodeMulti([hdr1, hdr2!], 32 + CODE_LARGE_SHIFT);
	} else {
		validateBergerCodeMulti([hdr1], CODE_SMALL_SHIFT);
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

	const obj: NVMObject = {
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

export function readObjects(
	nvmVersion: number,
	buffer: Buffer,
): {
	objects: NVMObject[];
	bytesRead: number;
} {
	let offset = 0;
	const objects: NVMObject[] = [];
	while (offset < buffer.length) {
		const result = readObject(nvmVersion, buffer, offset);
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

/**
 * Takes the raw list of objects from the pages ring buffer and compresses
 * them so that each object is only stored once.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function compressObjects(objects: NVMObject[]) {
	const ret = new Map<number, NVMObject>();
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
