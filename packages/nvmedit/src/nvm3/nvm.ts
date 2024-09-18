import { pick } from "@zwave-js/shared/safe";
import { ApplicationVersionFile800ID } from "../files";
import { type PageWriteSize, ZWAVE_APPLICATION_NVM_SIZE } from "./consts";
import { type NVM3Object, compressObjects } from "./object";
import { type NVM3Page, readPage } from "./page";
import { dumpObject, dumpPage } from "./utils";

function comparePages(p1: NVM3Page, p2: NVM3Page) {
	if (p1.header.eraseCount === p2.header.eraseCount) {
		return p1.header.offset - p2.header.offset;
	} else {
		return p1.header.eraseCount - p2.header.eraseCount;
	}
}

export interface NVMMeta {
	sharedFileSystem: boolean;
	pageSize: number;
	deviceFamily: number;
	writeSize: PageWriteSize;
	memoryMapped: boolean;
}

export interface NVM3Pages {
	/** All application pages in the NVM */
	applicationPages: NVM3Page[];
	/** All application pages in the NVM */
	protocolPages: NVM3Page[];
}

export interface NVM3Objects {
	/** A compressed map of application-level NVM objects */
	applicationObjects: Map<number, NVM3Object>;
	/** A compressed map of protocol-level NVM objects */
	protocolObjects: Map<number, NVM3Object>;
}

export function parseNVM(
	buffer: Buffer,
	verbose: boolean = false,
): NVM3Pages & NVM3Objects {
	let offset = 0;
	const pages: NVM3Page[] = [];
	while (offset < buffer.length) {
		const { page, bytesRead } = readPage(buffer, offset);
		if (verbose) dumpPage(page);
		pages.push(page);
		offset += bytesRead;
	}

	// 800 series has a shared NVM for protocol and application data.
	// We can distinguish between the two, because the application version is stored in a different file ID

	const isSharedFileSystem = pages.some(
		(p) => p.objects.some((o) => o.key === ApplicationVersionFile800ID),
	);
	// By convention, we only use the applicationPages in that case
	let applicationPages: NVM3Page[];
	let protocolPages: NVM3Page[];

	if (isSharedFileSystem) {
		applicationPages = pages;
		protocolPages = [];
	} else {
		applicationPages = pages.filter(
			(p) => p.header.offset < ZWAVE_APPLICATION_NVM_SIZE,
		);
		protocolPages = pages.filter(
			(p) => p.header.offset >= ZWAVE_APPLICATION_NVM_SIZE,
		);
	}

	// The pages are written in a ring buffer, find the one with the lowest erase count and start reading from there in order
	applicationPages.sort(comparePages);
	protocolPages.sort(comparePages);

	// Build a compressed view of the NVM objects
	const applicationObjects = compressObjects(
		applicationPages.reduce<NVM3Object[]>(
			(acc, page) => acc.concat(page.objects),
			[],
		),
	);

	const protocolObjects = compressObjects(
		protocolPages.reduce<NVM3Object[]>(
			(acc, page) => acc.concat(page.objects),
			[],
		),
	);

	if (verbose) {
		console.log();
		console.log();
		console.log("Application objects:");
		applicationObjects.forEach((obj) => dumpObject(obj, true));
		console.log();
		console.log("Protocol objects:");
		protocolObjects.forEach((obj) => dumpObject(obj, true));
	}

	return {
		applicationPages,
		protocolPages,
		applicationObjects,
		protocolObjects,
	};
}

export function getNVMMeta(page: NVM3Page, sharedFileSystem: boolean): NVMMeta {
	return {
		sharedFileSystem,
		...pick(page.header, [
			"pageSize",
			"writeSize",
			"memoryMapped",
			"deviceFamily",
		]),
	};
}
