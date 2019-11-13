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
import { num2hex } from "../src/lib/util/strings";

// Where the files are located
const importDir = path.join(__dirname, "..", "config/import");
const processedDir = path.join(__dirname, "..", "config/devices");
const importedManufacturersPath = path.join(importDir, "manufacturers.json");
const ownManufacturersPath = path.join(importDir, "../manufacturers.json");
const ownManufacturers = JSON5.parse(
	fs.readFileSync(ownManufacturersPath, "utf8"),
);
const ownManufacturersReversed = composeObject(
	entries(ownManufacturers).map(([id, name]) => [name, id]),
);

// Regular expressions to parse html pages
const manufacturerIdRegexes = [
	/\<manufacturer\>(?:0x)?([0-9a-fA-F]{1,4})\</, // OZW Export
	/Device identifiers: (?:0x)?([0-9a-fA-F]{1,4}):/, // OH Export
	/\\"manufacturer_id\\": \\"(?:0x)?([0-9a-fA-F]{1,4})\\"/, // JSON Export
];
const databaseIdRegex = /id=\[((?:\d+,?\s?)+)\]/;
const manufacturerTableStartRegex = /\<table[^\>]+id="manufacturerList"/;
const manufacturerTableRowsRegex = /\<tr[^\>]+\>(?:\s+\<td\>((?:.|\s)+?)\<\/td\>)(?:\s+\<td\>((?:.|\s)+?)\<\/td\>)/g;

// Where all the information can be found
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

/** Retrieves the list of database IDs */
async function fetchIDs(): Promise<string[]> {
	const sources: string = (await axios({ url: urlIDs })).data;
	const head = sources.substring(
		sources.indexOf("<head>") + 6,
		sources.indexOf("</head>"),
	);
	const idsString = head.match(databaseIdRegex)![1];
	const ids = idsString
		.split(",")
		.map(str => str.trim())
		.filter(str => str != "");
	return ids;
}

/** Retrieves the definition for a specific device */
async function fetchDevice(id: string): Promise<string> {
	const source = (await axios({ url: urlDevice(id) })).data;
	return JSON.stringify(source, null, "\t");
}

/** Downloads all device information */
async function downloadDevices(): Promise<void> {
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

/** Downloads all manufacturer information */
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
	const start = manufacturerTableStartRegex.exec(sources)?.index ?? -1;
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

	const matches = matchAll(manufacturerTableRowsRegex, body);
	const manufacturers = composeObject(
		matches.map(([name, id]) => [
			name
				.replace("</a>", "")
				.replace(/&quot;/g, `"`)
				.replace(/&amp;/g, "&")
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

/** Looks up a manufacturer ID by name */
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

/** Ensures an input file is valid */
function assertValid(json: any) {
	ok(typeof json.state === "string" || typeof json.state === "number");
	ok(typeof json.manufacturer === "string");
	ok(typeof json.description === "string");
	ok(typeof json.label === "string");
	ok(typeof json.type_id === "string");
	ok(typeof json.versionminDisplay === "string");
	ok(typeof json.versionmaxDisplay === "string");
}

/** Removes unnecessary whitespace from imported text */
function sanitizeText(text: string): string {
	return text.trim().replace(/[\t\r\n]+/g, " ");
}

/** Converts a device label to a valid filename */
function labelToFilename(label: string): string {
	return label
		.trim()
		.replace(/[^a-zA-Z0-9\-_]+/g, "_")
		.replace(/^_/, "")
		.replace(/_$/, "")
		.toLowerCase();
}

/** Parses a downloaded config file into something we understand */
async function parseConfigFile(filename: string): Promise<Record<string, any>> {
	const content = await fs.readFile(filename, "utf8");
	const json = JSON.parse(content);
	assertValid(json);

	const ret: Record<string, any> = {
		_approved: json.state === "1" || json.state === 1,
		...(json.errors?.length ? { _errors: json.errors } : undefined),
		...(json.warnings?.length ? { _warnings: json.warnings } : undefined),
		manufacturer: json.manufacturer,
		manufacturerId: findManufacturerId(content, json),
		label: sanitizeText(json.label),
		description: sanitizeText(json.description),
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
	if (json.associations?.length) {
		ret.associations = {};
		for (const assoc of json.associations) {
			const sanitizedDescription = sanitizeText(assoc.description);
			ret.associations[assoc.group_id] = {
				label: sanitizeText(assoc.label),
				...(sanitizedDescription
					? { description: sanitizedDescription }
					: undefined),
				maxNodes: parseInt(assoc.max),
				isLifeline: assoc.controller === "1",
			};
		}
	}
	if (json.parameters?.length) {
		ret.paramInformation = {};
		for (const param of json.parameters) {
			let key: string = param.param_id;
			if (param.bitmask !== "0") {
				const bitmask = parseInt(param.bitmask);
				key += `[${num2hex(bitmask)}]`;
			}
			const sanitizedDescription = sanitizeText(param.description);
			const sanitizedUnits = sanitizeText(param.units);
			ret.paramInformation[key] = {
				label: sanitizeText(param.label),
				...(sanitizedDescription
					? { description: sanitizedDescription }
					: undefined),
				...(sanitizedUnits ? { unit: sanitizedUnits } : undefined),
				valueSize: parseInt(param.size, 10),
				minValue: parseInt(param.value_min, 10),
				maxValue: parseInt(param.value_max, 10),
				defaultValue: parseInt(param.value_default, 10),
				readOnly: param.read_only === "1",
				writeOnly: param.write_only === "1",
				allowManualEntry: param.limit_options === "1",
			};
			if (param.options?.length) {
				ret.paramInformation[key].options = param.options.map(
					(opt: any) => ({
						label: sanitizeText(opt.label),
						value: parseInt(opt.value, 10),
					}),
				);
			}
		}
	}
	return ret;
}

interface DeviceConfigIndexEntry {
	manufacturerId: string;
	productType: string;
	productId: string;
	firmwareVersion: {
		min: string;
		max: string;
	};
	filename: string;
}

/** Translates all downloaded config files */
async function importConfigFiles(): Promise<void> {
	const configFiles = (await fs.readdir(importDir)).filter(
		file =>
			file.endsWith(".json") &&
			!file.startsWith("_") &&
			file !== "manufacturers.json",
	);
	const index: DeviceConfigIndexEntry[] = [];
	for (const file of configFiles) {
		const inPath = path.join(importDir, file);
		let parsed: Record<string, any>;
		try {
			parsed = await parseConfigFile(inPath);
			if (!parsed.manufacturerId) {
				console.error(`${file} has no manufacturer ID!`);
			}
			if (!parsed.label) {
				console.error(`${file} has no label, ignoring it!`);
				continue;
			}
		} catch (e) {
			if (e instanceof AssertionError) {
				console.error(`${file} is not valid, ignoring!`);
				continue;
			}
			throw e;
		}
		// Config files are named like
		// config/devices/<manufacturerId>/label[_fwmin[-fwmax]].json
		let outFilename = path.join(
			processedDir,
			parsed.manufacturerId,
			labelToFilename(parsed.label),
		);
		if (
			parsed.firmwareVersion.min !== "0.0" ||
			parsed.firmwareVersion.max !== "255.255"
		) {
			outFilename += `_${parsed.firmwareVersion.min}`;
			if (parsed.firmwareVersion.max !== "255.255") {
				outFilename += `-${parsed.firmwareVersion.max}`;
			}
		}
		outFilename += ".json";
		await fs.ensureDir(path.dirname(outFilename));

		// Add a comment explaining which device this is
		// prettier-ignore
		const output = `// ${parsed.manufacturer} ${parsed.label}${parsed.description ? (`
// ${parsed.description}`) : ""}
${JSON.stringify(parsed, undefined, 4)}`;
		await fs.writeFile(outFilename, output, "utf8");

		// Add the file to the index
		index.push(
			...parsed.devices.map((dev: any) => ({
				manufacturerId: parsed.manufacturerId,
				...dev,
				firmwareVersion: parsed.firmwareVersion,
				filename: path
					.relative(processedDir, outFilename)
					.replace(/\\/g, "/"),
			})),
		);
	}

	// Write the index
	await fs.writeFile(
		path.join(processedDir, "index.json"),
		`// This file is auto-generated using "npm run config import"
${JSON.stringify(index, undefined, 4)}`,
		"utf8",
	);
}

(async () => {
	if (process.argv.includes("manufacturers")) {
		await downloadManufacturers();
	} else if (process.argv.includes("download")) {
		await downloadManufacturers();
		await downloadDevices();
	} else if (process.argv.includes("import")) {
		await importConfigFiles();
	}
})();
