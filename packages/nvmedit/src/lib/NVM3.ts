import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { Bytes, getEnumMemberName, num2hex } from "@zwave-js/shared";
import { type NVM, NVMAccess, type NVMIO } from "./common/definitions.js";
import {
	nvmReadBuffer,
	nvmReadUInt32LE,
	nvmWriteBuffer,
} from "./common/utils.js";
import {
	FLASH_MAX_PAGE_SIZE_700,
	FLASH_MAX_PAGE_SIZE_800,
	FragmentType,
	NVM3_CODE_LARGE_SHIFT,
	NVM3_CODE_SMALL_SHIFT,
	NVM3_COUNTER_SIZE,
	NVM3_MAX_OBJ_SIZE_SMALL,
	NVM3_OBJ_FRAGTYPE_MASK,
	NVM3_OBJ_FRAGTYPE_SHIFT,
	NVM3_OBJ_HEADER_SIZE_LARGE,
	NVM3_OBJ_KEY_MASK,
	NVM3_OBJ_KEY_SHIFT,
	NVM3_OBJ_LARGE_LEN_MASK,
	NVM3_OBJ_TYPE_MASK,
	NVM3_PAGE_COUNTER_MASK,
	NVM3_PAGE_COUNTER_SIZE,
	NVM3_PAGE_HEADER_SIZE,
	NVM3_PAGE_MAGIC,
	ObjectType,
	PageStatus,
	PageWriteSize,
	ZWAVE_APPLICATION_NVM_SIZE,
} from "./nvm3/consts.js";
import {
	ApplicationVersionFile800ID,
	type NVMSection,
	getNVMSectionByFileID,
} from "./nvm3/files/index.js";
import {
	type NVM3Object,
	type NVM3ObjectHeader,
	fragmentLargeObject,
	getAlignedSize,
	getObjectHeader,
	getRequiredSpace,
	serializeObject,
} from "./nvm3/object.js";
import {
	type NVM3PageHeader,
	pageSizeFromBits,
	serializePageHeader,
} from "./nvm3/page.js";
import { validateBergerCode, validateBergerCodeMulti } from "./nvm3/utils.js";

// TODO: Possible optimizations:
// Investigate if there is a better way to determine whether the NVM
// uses a shared FS or not. The current implementation scans all objects
// to find the 800 series application version file.
// Alternatively, we could simply check if each page starts with an object header.
// If yes, read the objects lazily when needed. If not, remember that the page is empty.

export type NVM3PageInfo = NVM3PageHeader & {
	objects: NVM3ObjectHeader[];
};

export interface NVM3SectionInfo {
	pages: NVM3PageInfo[];
	/** The index of the current page */
	currentPage: number;
	/** The next byte to write in the current page */
	offsetInPage: number;
	/** A map of file IDs and page indizes in which their last copy resides */
	objectLocations: Map<number, number>;
}

export type NVM3FileSystemInfo = {
	isSharedFileSystem: true;
	sections: Record<"all", NVM3SectionInfo>;
} | {
	isSharedFileSystem: false;
	sections: Record<NVMSection, NVM3SectionInfo>;
};

export interface NVM3Meta {
	sharedFileSystem: boolean;
	pageSize: number;
	deviceFamily: number;
	writeSize: PageWriteSize;
	memoryMapped: boolean;
}

export type NVM3EraseOptions = Partial<NVM3Meta>;

export class NVM3 implements NVM<number, Uint8Array> {
	public constructor(io: NVMIO) {
		this._io = io;
	}

	private _io: NVMIO;
	private _access: NVMAccess = NVMAccess.None;

	private _info: NVM3FileSystemInfo | undefined;
	public get info(): NVM3FileSystemInfo | undefined {
		return this._info;
	}

	private async ensureReadable(): Promise<void> {
		if (
			this._access === NVMAccess.Read
			|| this._access === NVMAccess.ReadWrite
		) {
			return;
		}
		if (this._access === NVMAccess.Write) {
			await this._io.close();
		}
		this._access = await this._io.open(NVMAccess.Read);
	}

	private async ensureWritable(): Promise<void> {
		if (
			this._access === NVMAccess.Write
			|| this._access === NVMAccess.ReadWrite
		) {
			return;
		}
		if (this._access === NVMAccess.Read) {
			await this._io.close();
		}
		this._access = await this._io.open(NVMAccess.Write);
	}

	public async init(): Promise<NVM3FileSystemInfo> {
		await this.ensureReadable();

		let pageOffset = 0;
		// Determine NVM size, scan pages
		const pages: NVM3PageInfo[] = [];
		let isSharedFileSystem = false;
		while (pageOffset < this._io.size) {
			// console.debug(
			// 	`NVM3 init() - reading page header at offset ${
			// 		num2hex(pageOffset)
			// 	}`,
			// );
			const header = await readPageHeader(this._io, pageOffset);
			pages.push({
				...header,
				objects: [],
			});
			pageOffset += header.pageSize;
		}

		// Scan each page for objects
		for (const page of pages) {
			// Scan objects in this page
			let objectOffset = page.offset + NVM3_PAGE_HEADER_SIZE;
			const nextPageOffset = page.offset + page.pageSize;
			while (objectOffset < nextPageOffset) {
				// console.debug(
				// 	`NVM3 init() - reading object header. page offset ${
				// 		num2hex(page.offset)
				// 	}, object offset ${num2hex(objectOffset)}`,
				// );
				const objectHeader = await readObjectHeader(
					this._io,
					objectOffset,
				);
				if (objectHeader) {
					page.objects.push(objectHeader);
					objectOffset += objectHeader.alignedSize;

					// Detect the 800 series shared protocol & application NVM file system
					// by looking for the 800 series application version file
					if (objectHeader.key === ApplicationVersionFile800ID) {
						isSharedFileSystem = true;
					}
				} else {
					// Reached the end of the data in this page
					break;
				}
			}
		}

		// By convention, we only use the applicationPages in that case
		let applicationPages: NVM3PageInfo[];
		let protocolPages: NVM3PageInfo[];

		if (isSharedFileSystem) {
			applicationPages = pages;
			protocolPages = [];
		} else {
			applicationPages = pages.filter(
				(p) => p.offset < ZWAVE_APPLICATION_NVM_SIZE,
			);
			protocolPages = pages.filter(
				(p) => p.offset >= ZWAVE_APPLICATION_NVM_SIZE,
			);
		}

		// NVM3 layouts pages in a ring buffer. Pages are written from front to back, then occupied pages
		// are erased and overwritten. Pages at the start of the memory section may have an erase count that's 1 higher
		// than the pages at the end.
		const pageInfoToSectionInfo = (
			pages: NVM3PageInfo[],
		): NVM3SectionInfo => {
			// Find the current page, which is either:
			// - The last page with the high erase count that contains an object
			const maxEraseCount = Math.max(...pages.map((p) => p.eraseCount));
			let currentPageIndex = pages.findLastIndex((p) =>
				p.eraseCount === maxEraseCount && p.objects.length > 0
			);
			// - or if there is none, the last page with the lower erase count that contains an object
			if (currentPageIndex === -1) {
				currentPageIndex = pages.findLastIndex((p) =>
					p.objects.length > 0
				);
			}
			// - Or if no objects exist at all, the beginning of the section
			if (currentPageIndex === -1) currentPageIndex = 0;

			// Find the next free byte of the current page
			const currentPage = pages[currentPageIndex];
			let offset = NVM3_PAGE_HEADER_SIZE;
			for (const object of currentPage.objects) {
				offset += object.alignedSize;
			}

			const objectLocations = new Map<number, number>();
			for (let i = 0; i < pages.length; i++) {
				const page = pages[i];
				for (const object of page.objects) {
					const location = objectLocations.get(object.key);
					if (location == undefined) {
						// Object seen for the first time, remember the page it is in
						objectLocations.set(object.key, i);
					} else if (
						(object.fragmentType === FragmentType.None
							|| object.fragmentType === FragmentType.First)
						&& (page.eraseCount >= pages[location].eraseCount)
					) {
						// Object was seen before. Only remember it if it is the only
						// or first fragment and the object appears in a later location
						// of the ring buffer
						objectLocations.set(object.key, i);
					}
				}
			}

			return {
				pages,
				offsetInPage: offset,
				currentPage: currentPageIndex,
				objectLocations,
			};
		};

		if (isSharedFileSystem) {
			this._info = {
				isSharedFileSystem: true,
				sections: {
					all: pageInfoToSectionInfo(applicationPages),
				},
			};
		} else {
			this._info = {
				isSharedFileSystem: false,
				sections: {
					application: pageInfoToSectionInfo(applicationPages),
					protocol: pageInfoToSectionInfo(protocolPages),
				},
			};
		}

		return this._info;
	}

	private getNVMSectionForFile(fileId: number): NVM3SectionInfo {
		// Determine which ring buffer to read in
		return this._info!.isSharedFileSystem
			? this._info!.sections.all
			: this._info!.sections[getNVMSectionByFileID(fileId)];
	}

	public async has(fileId: number): Promise<boolean> {
		this._info ??= await this.init();

		// Determine which ring buffer to read in
		const section = this.getNVMSectionForFile(fileId);

		return section.objectLocations.has(fileId);
	}

	public readObjectData(object: NVM3ObjectHeader): Promise<Uint8Array> {
		return nvmReadBuffer(
			this._io,
			object.offset + object.headerSize,
			object.fragmentSize,
		);
	}

	public async get(fileId: number): Promise<Uint8Array | undefined> {
		this._info ??= await this.init();

		// Determine which ring buffer to read in
		const section = this.getNVMSectionForFile(fileId);

		const pages = section.pages;

		// TODO: There should be no need for scanning, since we know the object locations after init().

		// Start scanning backwards through the pages ring buffer, starting with the current page
		let parts: Uint8Array[] | undefined;
		let complete = false;
		let objType: ObjectType | undefined;
		const resetFragments = () => {
			// if (parts?.length) {
			// 	console.debug("Resetting fragmented object");
			// }
			parts = undefined;
			complete = false;
		};
		pages: for (let offset = 0; offset < pages.length; offset++) {
			const index = (section.currentPage - offset + pages.length)
				% pages.length;
			const page = pages[index];
			// console.debug(
			// 	`NVM3.get(${fileId}): scanning page ${index} at offset ${
			// 		num2hex(page.offset)
			// 	}`,
			// );
			// Scan objects in this page, read backwards.
			// The last non-deleted object wins
			objects: for (let j = page.objects.length - 1; j >= 0; j--) {
				const object = page.objects[j];

				const readObject = () => this.readObjectData(object);

				if (object.key !== fileId) {
					// Reset any fragmented objects when encountering a different key
					resetFragments();
					continue objects;
				}

				if (object.type === ObjectType.Deleted) {
					// Last action for this object was a deletion. There is no data.
					return;
				} else if (object.fragmentType === FragmentType.None) {
					// console.debug(
					// 	`NVM3.get(${fileId}): found complete object - header offset ${
					// 		num2hex(object.offset)
					// 	}, content offset ${
					// 		num2hex(object.offset + object.headerSize)
					// 	}, length ${object.fragmentSize}`,
					// );
					// This is a complete object
					parts = [await readObject()];
					objType = object.type;
					complete = true;
					break pages;
				} else if (object.fragmentType === FragmentType.Last) {
					// console.debug(
					// 	`NVM3.get(${fileId}): found LAST fragment - header offset ${
					// 		num2hex(object.offset)
					// 	}, content offset ${
					// 		num2hex(object.offset + object.headerSize)
					// 	}, length ${object.fragmentSize}`,
					// );
					parts = [await readObject()];
					objType = object.type;
					complete = false;
				} else if (object.fragmentType === FragmentType.Next) {
					if (parts?.length && objType === object.type) {
						// console.debug(
						// 	`NVM3.get(${fileId}): found NEXT fragment - header offset ${
						// 		num2hex(object.offset)
						// 	}, content offset ${
						// 		num2hex(object.offset + object.headerSize)
						// 	}, length ${object.fragmentSize}`,
						// );
						parts.unshift(await readObject());
					} else {
						// This shouldn't be here
						resetFragments();
					}
				} else if (object.fragmentType === FragmentType.First) {
					if (parts?.length && objType === object.type) {
						// console.debug(
						// 	`NVM3.get(${fileId}): found FIRST fragment - header offset ${
						// 		num2hex(object.offset)
						// 	}, content offset ${
						// 		num2hex(object.offset + object.headerSize)
						// 	}, length ${object.fragmentSize}`,
						// );
						parts.unshift(await readObject());
						complete = true;
						break pages;
					} else {
						// This shouldn't be here
						resetFragments();
					}
				}
			}
		}

		if (!parts?.length || !complete || objType == undefined) return;

		return Bytes.concat(parts);
	}

	private async writeObjects(objects: NVM3Object[]): Promise<void> {
		const section = this.getNVMSectionForFile(objects[0].key);

		let page = section.pages[section.currentPage];
		let remainingSpace = page.pageSize
			- NVM3_PAGE_HEADER_SIZE
			- section.offsetInPage;

		// TODO: See if we can avoid double writes on a page change

		/** Moves to the next page and erases it if necessary */
		const nextPage = async () => {
			section.currentPage = (section.currentPage + 1)
				% section.pages.length;
			page = section.pages[section.currentPage];

			// Find headers of objects that need to be preserved
			const toPreserve = [...section.objectLocations].filter((
				[, pageIndex],
			) => pageIndex === section.currentPage)
				.map(([fileID]) =>
					page.objects.findLast((h) => h.key === fileID)
				)
				.filter((h) => h != undefined)
				.filter((h) => h.type !== ObjectType.Deleted);
			// And add the objects to the TODO list
			for (const header of toPreserve) {
				const data = await this.get(header.key);
				console.error(`Need to preserve object ${num2hex(header.key)}
  page index: ${section.currentPage}
  object type: ${getEnumMemberName(ObjectType, header.type)}
  data:        ${data != undefined ? `${data.length} bytes` : "(no data)"}`);
				objects.push({
					key: header.key,
					type: header.type,
					fragmentType: FragmentType.None,
					data,
				});
			}

			if (page.objects.length > 0) {
				// The page needs to be erased
				page.eraseCount++;
				page.objects = [];

				const pageHeaderBuffer = serializePageHeader(page);
				const pageBuffer = new Uint8Array(page.pageSize).fill(0xff);
				pageBuffer.set(pageHeaderBuffer, 0);

				await nvmWriteBuffer(this._io, page.offset, pageBuffer);
			}

			section.offsetInPage = NVM3_PAGE_HEADER_SIZE;
			remainingSpace = page.pageSize - NVM3_PAGE_HEADER_SIZE;
		};

		// Go through the list of objects and write all of them to the NVM
		for (const object of objects) {
			const isLargeObject = object.type === ObjectType.DataLarge
				|| object.type === ObjectType.CounterLarge;

			let fragments: NVM3Object[] | undefined;

			if (isLargeObject) {
				// Large objects may be fragmented

				// We need to start a new page, if the remaining space is not enough for
				// the object header plus additional data
				if (remainingSpace <= NVM3_OBJ_HEADER_SIZE_LARGE) {
					await nextPage();
				}

				fragments = fragmentLargeObject(
					object as any,
					remainingSpace,
					page.pageSize - NVM3_PAGE_HEADER_SIZE,
				);
			} else {
				// Small objects cannot be fragmented. If they don't fit,
				// they need to go on the next page.
				const requiredSpace = getRequiredSpace(object);
				if (requiredSpace > remainingSpace) {
					await nextPage();
				}
				fragments = [object];
			}

			// Write each fragment to the NVM. If there are multiple fragments,
			// each one but the first needs to be written at the beginning of a new page
			for (let i = 0; i < fragments.length; i++) {
				if (i > 0) await nextPage();
				const fragment = fragments[i];

				const objBuffer = serializeObject(fragment);
				const objOffset = page.offset + section.offsetInPage;
				await this._io.write(objOffset, objBuffer);
				const requiredSpace = getRequiredSpace(fragment);
				section.offsetInPage += requiredSpace;
				remainingSpace -= requiredSpace;

				// Remember which objects exist in this page
				page.objects.push(getObjectHeader(object, objOffset));

				// And remember where this object lives
				if (object.type === ObjectType.Deleted) {
					section.objectLocations.delete(object.key);
				} else if (
					fragment.fragmentType === FragmentType.None
					|| fragment.fragmentType === FragmentType.First
				) {
					section.objectLocations.set(
						fragment.key,
						section.currentPage,
					);
				}
			}
		}
	}

	public async set(property: number, value: Uint8Array): Promise<void> {
		if (!this._info) await this.init();
		await this.ensureWritable();

		await this.writeObjects([{
			key: property,
			type: value.length <= NVM3_MAX_OBJ_SIZE_SMALL
				? ObjectType.DataSmall
				: ObjectType.DataLarge,
			// writeObject deals with fragmentation
			fragmentType: FragmentType.None,
			data: value,
		}]);
	}

	/** Writes multiple values to the NVM at once. `null` / `undefined` cause the value to be deleted */
	public async setMany(
		values: [number, Uint8Array | null | undefined][],
	): Promise<void> {
		if (!this._info) await this.init();
		await this.ensureWritable();

		// Group objects by their NVM section
		const objectsBySection = new Map<
			number, /* offset */
			[number, Uint8Array | null | undefined][]
		>();
		for (const [key, value] of values) {
			const sectionOffset =
				this.getNVMSectionForFile(key).pages[0].offset;
			if (!objectsBySection.has(sectionOffset)) {
				objectsBySection.set(sectionOffset, []);
			}
			objectsBySection.get(sectionOffset)!.push([key, value]);
		}

		// And call writeObjects for each group
		for (const objectGroups of objectsBySection.values()) {
			await this.writeObjects(
				objectGroups.map(([key, value]) => (value
					? {
						key,
						type: value.length <= NVM3_MAX_OBJ_SIZE_SMALL
							? ObjectType.DataSmall
							: ObjectType.DataLarge,
						// writeObject deals with fragmentation
						fragmentType: FragmentType.None,
						data: value,
					}
					: {
						key,
						type: ObjectType.Deleted,
						fragmentType: FragmentType.None,
					})
				),
			);
		}
	}

	public async delete(property: number): Promise<void> {
		if (!this._info) await this.init();
		await this.ensureWritable();

		await this.writeObjects([{
			key: property,
			type: ObjectType.Deleted,
			fragmentType: FragmentType.None,
		}]);
	}

	public async erase(options?: NVM3EraseOptions): Promise<void> {
		const {
			deviceFamily = 2047,
			writeSize = PageWriteSize.WRITE_SIZE_16,
			memoryMapped = true,
			sharedFileSystem = false,
		} = options ?? {};
		const maxPageSize = sharedFileSystem
			? FLASH_MAX_PAGE_SIZE_800
			: FLASH_MAX_PAGE_SIZE_700;
		const pageSize = Math.min(
			options?.pageSize ?? maxPageSize,
			maxPageSize,
		);

		// Make sure we won't be writing incomplete pages
		if (this._io.size % pageSize !== 0) {
			throw new ZWaveError(
				`Invalid page size. NVM size ${this._io.size} must be a multiple of the page size ${pageSize}.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (
			!sharedFileSystem && ZWAVE_APPLICATION_NVM_SIZE % pageSize !== 0
		) {
			throw new ZWaveError(
				`Invalid page size. The application NVM size ${ZWAVE_APPLICATION_NVM_SIZE} must be a multiple of the page size ${pageSize}.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (
			!sharedFileSystem
			&& (this._io.size - ZWAVE_APPLICATION_NVM_SIZE) % pageSize !== 0
		) {
			throw new ZWaveError(
				`Invalid page size. The protocol NVM size ${
					this._io.size
					- ZWAVE_APPLICATION_NVM_SIZE
				} must be a multiple of the page size ${pageSize}.`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		await this.ensureWritable();

		// Create empty pages, write them to the NVM
		const applicationPages: NVM3PageInfo[] = [];
		const protocolPages: NVM3PageInfo[] = [];

		const numPages = this._io.size / pageSize;
		for (let i = 0; i < numPages; i++) {
			const offset = i * pageSize;
			const pageBuffer = new Uint8Array(pageSize).fill(0xff);
			const pageHeader: NVM3PageHeader = {
				offset,
				version: 0x01,
				eraseCount: 0,
				encrypted: false,
				deviceFamily,
				memoryMapped,
				pageSize,
				status: PageStatus.OK,
				writeSize,
			};
			pageBuffer.set(serializePageHeader(pageHeader), 0);
			await nvmWriteBuffer(this._io, offset, pageBuffer);

			if (sharedFileSystem || offset < ZWAVE_APPLICATION_NVM_SIZE) {
				applicationPages.push({ ...pageHeader, objects: [] });
			} else {
				protocolPages.push({ ...pageHeader, objects: [] });
			}
		}

		// Remember the pages we just created for further use
		this._info = sharedFileSystem
			? {
				isSharedFileSystem: true,
				sections: {
					all: {
						currentPage: 0,
						objectLocations: new Map(),
						offsetInPage: NVM3_PAGE_HEADER_SIZE,
						pages: applicationPages,
					},
				},
			}
			: {
				isSharedFileSystem: false,
				sections: {
					application: {
						currentPage: 0,
						objectLocations: new Map(),
						offsetInPage: NVM3_PAGE_HEADER_SIZE,
						pages: applicationPages,
					},
					protocol: {
						currentPage: 0,
						objectLocations: new Map(),
						offsetInPage: NVM3_PAGE_HEADER_SIZE,
						pages: protocolPages,
					},
				},
			};
	}
}

async function readPageHeader(
	io: NVMIO,
	offset: number,
): Promise<NVM3PageHeader> {
	if (offset > io.size - NVM3_PAGE_HEADER_SIZE) {
		throw new ZWaveError(
			"Incomplete page in buffer!",
			ZWaveErrorCodes.NVM_InvalidFormat,
		);
	}

	const buffer = Bytes.view(
		(await io.read(offset, NVM3_PAGE_HEADER_SIZE)).buffer,
	);

	const { version, eraseCount } = tryGetVersionAndEraseCount(buffer);

	// Page status
	const status = buffer.readUInt32LE(12);

	const devInfo = buffer.readUInt16LE(16);
	const deviceFamily = devInfo & 0x7ff;
	const writeSize = (devInfo >> 11) & 0b1;
	const memoryMapped = !!((devInfo >> 12) & 0b1);
	let pageSize = pageSizeFromBits((devInfo >> 13) & 0b111);

	if (pageSize > 0xffff) {
		// Some controllers have no valid info in the page size bits, resulting
		// in an impossibly large page size. To try and figure out the actual page
		// size without knowing the hardware, we scan the buffer for the next valid
		// page start.
		for (let exponent = 0; exponent < 0b111; exponent++) {
			const testPageSize = pageSizeFromBits(exponent);
			const nextOffset = offset + testPageSize;
			if (
				// exactly end of NVM OR
				io.size === nextOffset
				// next page
				|| await isValidPageHeaderAtOffset(io, nextOffset)
			) {
				pageSize = testPageSize;
				break;
			}
		}
	}
	if (pageSize > 0xffff) {
		throw new ZWaveError(
			"Could not determine page size!",
			ZWaveErrorCodes.NVM_InvalidFormat,
		);
	}

	if (io.size < offset + pageSize) {
		throw new ZWaveError(
			`NVM contains incomplete page at offset ${num2hex(offset)}!`,
			ZWaveErrorCodes.NVM_InvalidFormat,
		);
	}

	const formatInfo = buffer.readUInt16LE(18);
	const encrypted = !(formatInfo & 0b1);

	return {
		offset,
		version,
		eraseCount,
		status,
		encrypted,
		pageSize,
		writeSize,
		memoryMapped,
		deviceFamily,
	};
}

function tryGetVersionAndEraseCount(
	header: Uint8Array,
): { version: number; eraseCount: number } {
	const buffer = Bytes.view(header);
	const version = buffer.readUInt16LE(0);
	const magic = buffer.readUInt16LE(2);
	if (magic !== NVM3_PAGE_MAGIC) {
		throw new ZWaveError(
			"Not a valid NVM3 page!",
			ZWaveErrorCodes.NVM_InvalidFormat,
		);
	}
	if (version !== 0x01) {
		throw new ZWaveError(
			`Unsupported NVM3 page version: ${version}`,
			ZWaveErrorCodes.NVM_NotSupported,
		);
	}

	// The erase counter is saved twice, once normally, once inverted
	let eraseCount = buffer.readUInt32LE(4);
	const eraseCountCode = eraseCount >>> NVM3_PAGE_COUNTER_SIZE;
	eraseCount &= NVM3_PAGE_COUNTER_MASK;
	validateBergerCode(eraseCount, eraseCountCode, NVM3_PAGE_COUNTER_SIZE);

	let eraseCountInv = buffer.readUInt32LE(8);
	const eraseCountInvCode = eraseCountInv >>> NVM3_PAGE_COUNTER_SIZE;
	eraseCountInv &= NVM3_PAGE_COUNTER_MASK;
	validateBergerCode(
		eraseCountInv,
		eraseCountInvCode,
		NVM3_PAGE_COUNTER_SIZE,
	);

	if (eraseCount !== (~eraseCountInv & NVM3_PAGE_COUNTER_MASK)) {
		throw new ZWaveError(
			"Invalid erase count!",
			ZWaveErrorCodes.NVM_InvalidFormat,
		);
	}

	return { version, eraseCount };
}

async function isValidPageHeaderAtOffset(
	io: NVMIO,
	offset: number,
): Promise<boolean> {
	if (offset > io.size - NVM3_PAGE_HEADER_SIZE) {
		return false;
	}

	const { buffer } = await io.read(offset, NVM3_PAGE_HEADER_SIZE);

	try {
		tryGetVersionAndEraseCount(buffer);
		return true;
	} catch {
		return false;
	}
}

async function readObjectHeader(
	io: NVMIO,
	offset: number,
): Promise<NVM3ObjectHeader | undefined> {
	let headerSize = 4;
	const hdr1 = await nvmReadUInt32LE(io, offset);

	// Skip over blank page areas
	if (hdr1 === 0xffffffff) return;

	const key = (hdr1 >> NVM3_OBJ_KEY_SHIFT) & NVM3_OBJ_KEY_MASK;
	let objType: ObjectType = hdr1 & NVM3_OBJ_TYPE_MASK;
	let fragmentSize = 0;
	let hdr2: number | undefined;
	const isLarge = objType === ObjectType.DataLarge
		|| objType === ObjectType.CounterLarge;
	if (isLarge) {
		hdr2 = await nvmReadUInt32LE(io, offset + 4);
		headerSize += 4;
		fragmentSize = hdr2 & NVM3_OBJ_LARGE_LEN_MASK;
	} else if (objType > ObjectType.DataSmall) {
		// In small objects with data, the length and object type are stored in the same value
		fragmentSize = objType - ObjectType.DataSmall;
		objType = ObjectType.DataSmall;
	} else if (objType === ObjectType.CounterSmall) {
		fragmentSize = NVM3_COUNTER_SIZE;
	}

	const fragmentType: FragmentType = isLarge
		? (hdr1 >>> NVM3_OBJ_FRAGTYPE_SHIFT) & NVM3_OBJ_FRAGTYPE_MASK
		: FragmentType.None;

	if (isLarge) {
		validateBergerCodeMulti([hdr1, hdr2!], 32 + NVM3_CODE_LARGE_SHIFT);
	} else {
		validateBergerCodeMulti([hdr1], NVM3_CODE_SMALL_SHIFT);
	}

	if (io.size < offset + headerSize + fragmentSize) {
		throw new ZWaveError(
			`NVM contains incomplete object at offset ${num2hex(offset)}!`,
			ZWaveErrorCodes.NVM_InvalidFormat,
		);
	}

	const alignedFragmentSize = getAlignedSize(fragmentSize);
	const alignedSize = headerSize + alignedFragmentSize;

	return {
		key,
		offset,
		type: objType,
		fragmentType,
		headerSize,
		fragmentSize,
		alignedSize,
	};
}
