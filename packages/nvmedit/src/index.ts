import fs from "fs-extra";
import "reflect-metadata";
import { NVMFile } from "./files/NVMFile";
import { compressObjects, FragmentType, NVMObject, ObjectType } from "./object";
import { NVMPage, PageStatus, readPage } from "./page";

require("./files/ApplicationCCsFile");
require("./files/ApplicationDataFile");
require("./files/ApplicationRFConfigFile");
require("./files/ApplicationTypeFile");
require("./files/ControllerInfoFile");
require("./files/NodeInfoFiles");
require("./files/ProtocolNodeMaskFiles");
require("./files/RouteCacheFiles");
require("./files/SUCUpdateEntriesFile");
require("./files/VersionFiles");

void (async () => {
	const buffer = await fs.readFile("ctrlr_backup_700_7.15.bin");
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

	for (const page of applicationPages) {
		printPage(page);
	}
	for (const page of protocolPages) {
		printPage(page);
	}

	console.log("===================");
	console.log("===================");
	console.log("===================");

	const compressedObjectsApplication = compressObjects(
		applicationPages.reduce(
			(acc, page) => acc.concat(page.objects),
			[] as NVMObject[],
		),
	);

	const compressedObjectsProtocol = compressObjects(
		protocolPages.reduce(
			(acc, page) => acc.concat(page.objects),
			[] as NVMObject[],
		),
	);

	console.log("===================");
	console.log("Application objects");

	for (const obj of compressedObjectsApplication.values()) {
		printObject(obj, true);
	}

	console.log("===================");
	console.log("Protocol objects");

	for (const obj of compressedObjectsProtocol.values()) {
		printObject(obj, true);
	}
})();

function comparePages(p1: NVMPage, p2: NVMPage) {
	if (p1.header.eraseCount === p2.header.eraseCount) {
		return p1.header.offset - p2.header.offset;
	} else {
		return p1.header.eraseCount - p2.header.eraseCount;
	}
}

function printPage(page: NVMPage, json: boolean = false) {
	console.log(` `);
	console.log(`read page (offset 0x${page.header.offset.toString(16)}):`);
	console.log(`  version: ${page.header.version}`);
	console.log(`  eraseCount: ${page.header.eraseCount}`);
	console.log(`  status: ${PageStatus[page.header.status]}`);
	console.log(`  encrypted: ${page.header.encrypted}`);
	console.log(`  pageSize: ${page.header.pageSize}`);
	console.log(`  writeSize: ${page.header.writeSize}`);
	console.log(`  memoryMapped: ${page.header.memoryMapped}`);
	console.log(`  deviceFamily: ${page.header.deviceFamily}`);
	console.log("");
	console.log(`  objects:`);
	for (const obj of page.objects) {
		printObject(obj, json);
	}
}

function printObject(obj: NVMObject, json: boolean = false) {
	try {
		if (json) {
			const file = NVMFile.from(obj);
			console.log(`  · ${JSON.stringify(file.toJSON(), null, 2)}`);
		}
	} catch (e) {
		console.log(`  · key: 0x${obj.key.toString(16)}`);
		console.log(`    type: ${ObjectType[obj.type]}`);
		console.log(`    fragment type: ${FragmentType[obj.fragmentType]}`);
		if (obj.data)
			console.log(
				`    data: ${obj.data.slice(0, 16).toString("hex")}... (${
					obj.data.length
				} bytes)`,
			);
	}
}
