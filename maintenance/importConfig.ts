/* eslint-disable @typescript-eslint/camelcase */
/*!
 * This script is used to import the Z-Wave device database from
 * https://www.cd-jackson.com/zwave_device_database/zwave-database-json.gz.tar
 * and translate the information into a form this library expects
 */

/* eslint-disable @typescript-eslint/explicit-function-return-type */
process.on("unhandledRejection", r => {
	throw r;
});

import { padStart } from "alcalzone-shared/strings";
import { AssertionError, ok } from "assert";
import axios from "axios";
import * as fs from "fs-extra";
import * as path from "path";

const importDir = path.join(__dirname, "..", "config/import");
const processedDir = path.join(__dirname, "..", "config/processed");

const urlIDs =
	"https://www.cd-jackson.com/index.php/zwave/zwave-device-database/database-summary";
const urlDevice = (id: string) =>
	`https://www.cd-jackson.com/index.php?option=com_zwave_database&view=devicesummary&format=json&id=${id}`;

async function fetchIDs(): Promise<string[]> {
	const sources: string = (await axios({ url: urlIDs })).data;
	const head = sources.substring(
		sources.indexOf("<head>") + 6,
		sources.indexOf("</head>"),
	);
	const idsString = head.match(/id=\[((?:\d+,?\s?)+)\]/)![1];
	const ids = idsString
		.split(",")
		.map(str => str.trim())
		.filter(str => str != "");
	return ids;
}

async function fetchDevice(id: string): Promise<string> {
	const source = (await axios({ url: urlDevice(id) })).data;
	return JSON.stringify(source, null, "\t");
}

async function downloadDB(): Promise<void> {
	process.stdout.write("Fetching database IDs...");
	const IDs = await fetchIDs();
	// Delete the last line
	process.stdout.write("\r\x1b[K");

	await fs.ensureDir(importDir);
	for (let i = 0; i < IDs.length; i++) {
		process.stdout.write(
			`Fetching device config ${i + 1} of ${IDs.length}...`,
		);
		const content = await fetchDevice(IDs[i]);
		await fs.writeFile(
			path.join(importDir, `${IDs[i]}.json`),
			content,
			"utf8",
		);
		// Delete the last line
		process.stdout.write("\r\x1b[K");
	}
	console.log("done!");
}

const manufacturerIdRegexes = [
	/\<manufacturer\>(?:0x)?([0-9a-fA-F]{1,4})\</, // OZW Export
	/Device identifiers: (?:0x)?([0-9a-fA-F]{1,4}):/, // OH Export
	/\\"manufacturer_id\\": \\"(?:0x)?([0-9a-fA-F]{1,4})\\"/, // JSON Export
];

function findManufacturerId(input: string): string | undefined {
	for (const re of manufacturerIdRegexes) {
		const match = input.match(re);
		if (match) return "0x" + padStart(match[1], 4, "0").toLowerCase();
	}
}

function assertValid(json: any) {
	const {
		state,
		description,
		label,
		type_id,
		versionminDisplay,
		versionmaxDisplay,
	} = json;
	ok(typeof state === "string" || typeof state === "number");
	ok(typeof description === "string");
	ok(typeof label === "string");
	ok(typeof type_id === "string");
	ok(typeof versionminDisplay === "string");
	ok(typeof versionmaxDisplay === "string");
}

async function parseConfigFile(filename: string): Promise<string> {
	const content = await fs.readFile(filename, "utf8");
	const json = JSON.parse(content);
	assertValid(json);

	const ret = {
		_approved: json.state === "1" || json.state === 1,
		...(json.errors?.length ? { _errors: json.errors } : undefined),
		...(json.warnings?.length ? { _warnings: json.warnings } : undefined),
		manufacturerId: findManufacturerId(content),
		name: json.description,
		label: json.label,
		devices: json.type_id
			.split(",")
			.filter(Boolean)
			.map((ref: string) => {
				const [productType, productId] = ref
					.trim()
					.split(":")
					.map(str => "0x" + padStart(str, 4, "0").toLowerCase());
				return { productType, productId };
			}),
		firmwareVersion: {
			min: json.versionminDisplay,
			max: json.versionmaxDisplay,
		},
	};
	// Add comment explaining which devices this file contains
	return `// ${json.manufacturer} ${json.description} (${json.label})
${JSON.stringify(ret, undefined, 4)}`;
}

async function importConfigFiles(): Promise<void> {
	const configFiles = (await fs.readdir(importDir)).filter(
		file => file.endsWith(".json") && !file.startsWith("_"),
	);
	for (const file of configFiles) {
		const inPath = path.join(importDir, file);
		let parsed: string;
		try {
			parsed = await parseConfigFile(inPath);
			if (!parsed.includes("manufacturerId")) {
				console.error(`${file} has no manufacturer ID!`);
			}
		} catch (e) {
			if (e instanceof AssertionError) {
				console.error(`${file} is not valid, ignoring!`);
				continue;
			}
			throw e;
		}
		const outPath = path.join(processedDir, file);
		await fs.writeFile(outPath, parsed, "utf8");
	}
}

(async () => {
	if (process.argv.includes("download")) {
		await downloadDB();
	} else if (process.argv.includes("import")) {
		await importConfigFiles();
	}
})();
