import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core/safe";
import { buffer2hex, num2hex } from "@zwave-js/shared";
import { type NVM3 } from "../NVM3.js";
import { FragmentType, ObjectType, PageStatus } from "./consts.js";
import { NVMFile } from "./files/NVMFile.js";
import type { NVM3Object } from "./object.js";

/** Counts the number of unset bits in the given word */
export function computeBergerCode(word: number, numBits: number = 32): number {
	let ret = word;

	// Mask the number of bits we're interested in
	if (numBits < 32) {
		ret &= (1 << numBits) - 1;
	}

	// And count the bits, see http://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetParallel
	ret = ret - ((ret >> 1) & 0x55555555);
	ret = (ret & 0x33333333) + ((ret >> 2) & 0x33333333);
	ret = (((ret + (ret >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;

	return numBits - ret;
}

export function validateBergerCode(
	word: number,
	code: number,
	numBits: number = 32,
): void {
	if (computeBergerCode(word, numBits) !== code) {
		throw new ZWaveError(
			"Berger Code validation failed!",
			ZWaveErrorCodes.NVM_InvalidFormat,
		);
	}
}

export function computeBergerCodeMulti(
	words: number[],
	numBits: number,
): number {
	let ret = 0;
	for (const word of words) {
		ret += computeBergerCode(word, Math.min(numBits, 32));
		if (numBits < 32) break;
		numBits -= 32;
	}
	return ret;
}

export function validateBergerCodeMulti(
	words: number[],
	numBits: number,
): void {
	let actual = 0;
	let expected: number;
	for (const word of words) {
		actual += computeBergerCode(word, Math.min(numBits, 32));
		if (numBits < 32) {
			const maskSize = 32 - numBits;
			const mask = (1 << maskSize) - 1;
			expected = (word >>> numBits) & mask;
			break;
		}
		numBits -= 32;
	}
	if (actual !== expected!) {
		throw new ZWaveError(
			"Berger Code validation failed!",
			ZWaveErrorCodes.NVM_InvalidFormat,
		);
	}
}

export function mapToObject<T, TMap extends Map<string | number, T>>(
	map: TMap,
): Record<string, T> {
	const obj: Record<string | number, T> = {};
	for (const [key, value] of map) {
		obj[key] = value;
	}
	return obj;
}

function dumpObject(
	obj: NVM3Object & { offset: number },
	json: boolean = false,
): void {
	try {
		if (json) {
			const file = NVMFile.from(obj.key, obj.data!, "7.0.0");
			console.log(
				JSON.stringify(
					{
						offset: num2hex(obj.offset),
						...file.toJSON(),
					},
					null,
					2,
				),
			);
			console.log();
			return;
		}
	} catch {
		// ignore
	}
	const prefix = json ? "" : "  ";
	console.log(`${prefix}· offset: ${num2hex(obj.offset)}`);
	console.log(`${prefix}  key: 0x${obj.key.toString(16)}`);
	console.log(`${prefix}  type: ${ObjectType[obj.type]}`);
	console.log(`${prefix}  fragment type: ${FragmentType[obj.fragmentType]}`);
	if (obj.data) {
		console.log(
			`${prefix}  data: ${
				buffer2hex(obj.data)
			} (${obj.data.length} bytes)`,
		);
	}
	console.log();
}

export async function dumpNVM(nvm: NVM3): Promise<void> {
	for (const [name, section] of Object.entries(nvm.info!.sections)) {
		console.log(`NVM section: ${name}`);

		for (const page of section.pages) {
			console.log("");
			console.log(`page (offset 0x${page.offset.toString(16)}):`);
			console.log(`  version: ${page.version}`);
			console.log(`  eraseCount: ${page.eraseCount}`);
			console.log(`  status: ${PageStatus[page.status]}`);
			console.log(`  encrypted: ${page.encrypted}`);
			console.log(`  pageSize: ${page.pageSize}`);
			console.log(`  writeSize: ${page.writeSize}`);
			console.log(`  memoryMapped: ${page.memoryMapped}`);
			console.log(`  deviceFamily: ${page.deviceFamily}`);
			console.log("");
			if (page.objects.length) {
				console.log(`  raw objects:`);

				for (const objectHeader of page.objects) {
					const objectData = objectHeader.type !== ObjectType.Deleted
						? await nvm.readObjectData(objectHeader)
						: undefined;
					dumpObject({
						offset: objectHeader.offset,
						key: objectHeader.key,
						type: objectHeader.type,
						fragmentType: objectHeader.fragmentType,
						data: objectData,
					}, false);
				}
			}
		}

		console.log();
		console.log();
	}

	for (const [name, section] of Object.entries(nvm.info!.sections)) {
		console.log(`${name} objects:`);
		for (const [fileId, pageIndex] of section.objectLocations) {
			const page = section.pages[pageIndex];
			const objectHeader = page.objects.findLast((o) => o.key === fileId);
			if (!objectHeader) continue;
			const objectData = await nvm.get(fileId);

			dumpObject({
				offset: objectHeader.offset,
				key: fileId,
				type: objectHeader.type,
				fragmentType: FragmentType.None,
				data: objectData,
			}, true);
		}

		console.log();
	}
}
