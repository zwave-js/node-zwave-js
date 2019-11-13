/*!
 * This script is used to import the Z-Wave device database from
 * https://www.cd-jackson.com/zwave_device_database/zwave-database-json.gz.tar
 * and translate the information into a form this library expects
 */

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

process.on("unhandledRejection", r => {
	throw r;
});

import { composeObject, entries } from "alcalzone-shared/objects";
import { padStart } from "alcalzone-shared/strings";
import { AssertionError, ok } from "assert";
import axios from "axios";
import * as fs from "fs-extra";
import * as JSON5 from "json5";
import * as path from "path";
import * as qs from "querystring";

const importDir = path.join(__dirname, "..", "config/import");
const processedDir = path.join(__dirname, "..", "config/processed");
const importedManufacturersPath = path.join(importDir, "manufacturers.json");
const ownManufacturersPath = path.join(importDir, "../manufacturers.json");
const ownManufacturers = JSON5.parse(
	fs.readFileSync(ownManufacturersPath, "utf8"),
);
const ownManufacturersReversed = composeObject(
	entries(ownManufacturers).map(([id, name]) => [name, id]),
);

const urlManufacturers =
	"https://www.cd-jackson.com/index.php/zwave/zwave-device-database/zwave-manufacturer-list/manufacturers";
const urlIDs =
	"https://www.cd-jackson.com/index.php/zwave/zwave-device-database/database-summary";
const urlDevice = (id: string) =>
	`https://www.cd-jackson.com/index.php?option=com_zwave_database&view=devicesummary&format=json&id=${id}`;

function matchAll(regex: RegExp, string: string) {
	const ret = [];
	let match;
	do {
		match = regex.exec(string);
		if (match) ret.push(match.slice(1));
	} while (match);
	return ret;
}

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

const manufacturerTableRegex = /\<tr[^\>]+\>(?:\s+\<td\>((?:.|\s)+?)\<\/td\>)(?:\s+\<td\>((?:.|\s)+?)\<\/td\>)/g;

async function downloadManufacturers(): Promise<void> {
	process.stdout.write("Fetching manufacturers...");

	const data = {
		limit: "0",
		limitstart: "0",
		task: "",
		boxchecked: "0",
		filter_order: "ordering",
		filter_order_Dir: "asc",
		f1dfdfdfaf1b78e126ccef47a323a12a: "1",
	};
	const options = {
		method: "POST" as const,
		headers: { "content-type": "application/x-www-form-urlencoded" },
		data: qs.stringify(data),
		url: urlManufacturers,
	};
	const sources: string = (await axios(options)).data;
	const startRegex = /\<table[^\>]+id="manufacturerList"/;
	const start = startRegex.exec(sources)?.index ?? -1;
	const end = sources.indexOf(`</table>`, start);
	if (start === -1 || end === -1) {
		console.error("Could not find manufacturers table");
		process.exit(1);
	}
	const table = sources.substring(start, end);
	const body = table.substring(
		table.indexOf("<tbody>") + 7,
		table.indexOf("</tbody>"),
	);

	// Delete the last line
	process.stdout.write("\r\x1b[K");

	const matches = matchAll(manufacturerTableRegex, body);
	const manufacturers = composeObject(
		matches.map(([name, id]) => [
			name
				.replace("</a>", "")
				.replace(/&amp;/g, "&")
				.replace(/&quot;/g, `"`)
				.trim(),
			`0x${padStart(id.trim(), 4, "0").toLowerCase()}`,
		]),
	);

	await fs.ensureDir(importDir);
	await fs.writeFile(
		importedManufacturersPath,
		JSON.stringify(manufacturers, undefined, 4),
		"utf8",
	);

	console.log("done!");
}

const manufacturerIdRegexes = [
	/\<manufacturer\>(?:0x)?([0-9a-fA-F]{1,4})\</, // OZW Export
	/Device identifiers: (?:0x)?([0-9a-fA-F]{1,4}):/, // OH Export
	/\\"manufacturer_id\\": \\"(?:0x)?([0-9a-fA-F]{1,4})\\"/, // JSON Export
];

function findManufacturerId(
	input: string,
	inputAsJson: any,
): string | undefined {
	for (const re of manufacturerIdRegexes) {
		const match = input.match(re);
		if (match) return "0x" + padStart(match[1], 4, "0").toLowerCase();
	}
	const imported = require(importedManufacturersPath);
	const manufacturerName = inputAsJson.manufacturer;
	if (!manufacturerName) return;

	if (manufacturerName in imported) return imported[manufacturerName];
	if (manufacturerName in ownManufacturersReversed) {
		return (ownManufacturersReversed as any)[manufacturerName] as string;
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
		manufacturerId: findManufacturerId(content, json),
		label: json.label,
		description: json.description,
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
		file =>
			file.endsWith(".json") &&
			!file.startsWith("_") &&
			file !== "manufacturers.json",
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
	if (process.argv.includes("manufacturers")) {
		await downloadManufacturers();
	} else if (process.argv.includes("download")) {
		await downloadManufacturers();
		await downloadDB();
	} else if (process.argv.includes("import")) {
		await importConfigFiles();
	}
})();
