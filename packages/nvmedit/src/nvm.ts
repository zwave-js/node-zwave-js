import { compressObjects, NVMObject } from "./object";
import { NVMPage, readPage } from "./page";

function comparePages(p1: NVMPage, p2: NVMPage) {
	if (p1.header.eraseCount === p2.header.eraseCount) {
		return p1.header.offset - p2.header.offset;
	} else {
		return p1.header.eraseCount - p2.header.eraseCount;
	}
}

export function parseNVM(buffer: Buffer): {
	/** All application pages in the NVM */
	applicationPages: NVMPage[];
	/** All application pages in the NVM */
	protocolPages: NVMPage[];
	/** A compressed map of application-level NVM objects */
	applicationObjects: Map<number, NVMObject>;
	/** A compressed map of protocol-level NVM objects */
	protocolObjects: Map<number, NVMObject>;
} {
	let offset = 0;
	const pages: NVMPage[] = [];
	while (offset < buffer.length) {
		const { page, bytesRead } = readPage(buffer, offset);
		pages.push(page);
		offset += bytesRead;
	}

	const applicationPages = pages.filter((p) => p.header.offset < 0x3000);
	const protocolPages = pages.filter((p) => p.header.offset >= 0x3000);

	// The pages are written in a ring buffer, find the one with the lowest erase count and start reading from there in order
	applicationPages.sort(comparePages);
	protocolPages.sort(comparePages);

	// Build a compressed view of the NVM objects
	const applicationObjects = compressObjects(
		applicationPages.reduce(
			(acc, page) => acc.concat(page.objects),
			[] as NVMObject[],
		),
	);

	const protocolObjects = compressObjects(
		protocolPages.reduce(
			(acc, page) => acc.concat(page.objects),
			[] as NVMObject[],
		),
	);

	return {
		applicationPages,
		protocolPages,
		applicationObjects,
		protocolObjects,
	};
}
