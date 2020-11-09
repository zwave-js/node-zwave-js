/*!
 * This script is used to import the Z-Wave device database from
 * https://www.cd-jackson.com/zwave_device_database/zwave-database-json.gz.tar
 * and translate the information into a form this library expects
 */

/* eslint-disable @typescript-eslint/no-var-requires */

process.on("unhandledRejection", (r) => {
	throw r;
});

import { composeObject, entries } from "alcalzone-shared/objects";
import { padStart } from "alcalzone-shared/strings";
import { isArray } from "alcalzone-shared/typeguards";
import { red } from "ansi-colors";
import { AssertionError, ok } from "assert";
import axios from "axios";
import * as child from "child_process";
import * as fs from "fs-extra";
import * as JSON5 from "json5";
import * as path from "path";
import * as qs from "querystring";
import { promisify } from "util";
import xml2json from "xml2json";
import yargs from "yargs";
import {
	addDeviceToIndex,
	DeviceConfig,
	DeviceConfigIndexEntry,
	loadDeviceIndex,
	loadManufacturers,
	lookupDevice,
	lookupManufacturer,
	setManufacturer,
	writeManufacturersToJson,
} from "../packages/config/src";
import { formatId } from "../packages/config/src/utils";
import { CommandClasses } from "../packages/core/src";
import { num2hex } from "../packages/shared/src";

const execPromise = promisify(child.exec);

const program = yargs
	.option("source", {
		description: "source of the import",
		alias: "s",
		type: "array",
		choices: ["oh", "ozw"], // oh: openhab, ozw: openzwave
		default: ["oh"],
	})
	.option("ids", {
		description: "devices ids to download",
		type: "array",
		array: true,
	})
	.option("download", {
		alias: "D",
		description: "Download devices DB from <source>",
		type: "boolean",
		default: false,
	})
	.option("clean", {
		alias: "C",
		description: "Clean temporary directory",
		type: "boolean",
		default: false,
	})
	.option("manufacturers", {
		alias: "m",
		description: "Parse and update manufacturers.json",
		type: "boolean",
		default: false,
	})
	.option("index", {
		alias: "i",
		description: "Update devices index.json by reading devices config",
		type: "boolean",
		default: false,
	})
	.option("devices", {
		alias: "d",
		description: "Parse and update devices configurations",
		type: "boolean",
		default: false,
	})
	.example(
		"import -s ozw -Dmid",
		"Download and parse OpenZwave db (manufacturers, devices) and update the index",
	)
	.example(
		"import -s oh -Dmid",
		"Download and parse openhab db (manufacturers, devices) and update the index",
	)
	.example(
		"import -s oh -D --ids 1234 5678",
		"Download openhab devices with ids `1234` and `5678`",
	)
	.example("import -i", "Update devices index")
	.help()
	.version(false)
	.alias("h", "help").argv;

// Where the files are located
const importDir = path.join(__dirname, "../packages/config", "config/import");
const processedDir = path.join(
	__dirname,
	"../packages/config",
	"config/devices",
);

const paramsRegex = /\[0x([0-9]+)\]/;

const tmpDir = path.join(__dirname, "../.tmp");
const ozwTarName = "openzwave.tar.gz";
const ozwTarUrl =
	"https://github.com/OpenZWave/open-zwave/archive/master.tar.gz";
const ozwConfigFolder = path.join(tmpDir, "./config");

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
		.map((str) => str.trim())
		.filter((str) => str != "");
	return ids;
}

/** Retrieves the definition for a specific device */
async function fetchDevice(id: string): Promise<string> {
	const source = (await axios({ url: urlDevice(id) })).data;
	return JSON.stringify(source, null, "\t");
}

/** Downloads ozw master archive and store it on `tmpDir` */
async function downloadOzwConfig(): Promise<string> {
	console.log("downloading ozw archive...");

	// create tmp directory if missing
	await fs.ensureDir(tmpDir);

	// this will return a stream in `data` that we pipe into write stream
	// to store the file in `tmpDir`
	const data = (await axios({ url: ozwTarUrl, responseType: "stream" })).data;

	return new Promise((resolve, reject) => {
		const fileDest = path.join(tmpDir, ozwTarName);
		const stream = fs.createWriteStream(fileDest);
		data.pipe(stream);
		let hasError = false;
		stream.on("error", (err) => {
			hasError = true;
			stream.close();
			reject(err);
		});

		stream.on("close", () => {
			if (!hasError) {
				resolve(fileDest);
				console.log("ozw archive stored in temporary directory");
			}
		});
	});
}

/** Extract `config` folder from ozw archive in `tmpDir` */
async function extractConfigFromTar(): Promise<void> {
	console.log("extracting config folder from ozw archive...");
	await execPromise(
		`tar -xzf ${ozwTarName} open-zwave-master/config  --strip-components=1`,
		{ cwd: tmpDir },
	);
}

/** Delete all files in `tmpDir` */
async function cleanTmpDirectory(): Promise<void> {
	await fs.remove(tmpDir);
	console.log("temporary directory cleaned");
}

/** Reads OZW `manufacturer_specific.xml` */
async function parseOzwConfig(): Promise<void> {
	const manufacturerFile = path.join(
		ozwConfigFolder,
		"manufacturer_specific.xml",
	);
	const manufacturerJson: Record<string, any> = xml2json.toJson(
		await fs.readFile(manufacturerFile, "utf8"),
		{
			object: true,
		},
	);

	await loadManufacturers();

	if (program.devices) {
		await loadDeviceIndex();
	}

	for (const man of manufacturerJson.ManufacturerSpecificData.Manufacturer) {
		const intId = parseInt(man.id);

		let name = lookupManufacturer(intId);

		// manufacturers ids are lower case in both folders and devices ids
		const hexId = formatId(man.id);

		if (name === undefined && man.name !== undefined) {
			// add manufacturer to manufacturers.json
			console.log(`Adding missing manufacturer: ${man.name}`);
			// let this here, if program.manufacturers is false it will not
			// write the manufacturers to file
			setManufacturer(intId, man.name);
		}

		name = man.name;

		if (!program.devices) continue;

		const products = ensureArray(man.Product);

		for (const product of products) {
			if (product.config !== undefined) {
				await parseOzwProduct(product, name, hexId, intId);
			}
		}
	}

	if (program.manufacturers) {
		await writeManufacturersToJson();
	}
}

/**
 * When using xml2json some fields expected as array are parsed as objects
 * when there is only one element. This method ensures that them are arrays
 *
 */
function ensureArray(json: any): any[] {
	json = json ?? [];
	return isArray(json) ? json : [json];
}

function normalizeUnits(unit: string) {
	if (/minutes/i.test(unit)) {
		return "minutes";
	} else if (/seconds/i.test(unit)) {
		return "seconds";
	} else if (/fahrenheit|\bF\b/i.test(unit)) {
		return "°F";
	} else if (/degrees celsius|celsius|\bc\b/i.test(unit)) {
		return "°C";
	} else if (/\bwatt/i.test(unit)) {
		return "W";
	} else if (/\bvolt/i.test(unit)) {
		return "V";
	} else if (/percent|dimmer level|%/i.test(unit)) {
		return "%";
	} else if (/degrees/i.test(unit)) {
		return "°";
	}

	return undefined;
}

/**
 * Normalize a device JSON configuration to ensure all keys have the same order
 * and fix some parameters if needed
 *
 * @param config Device JSON configuration
 */
function normalizeConfig(config: Record<string, any>): Record<string, any> {
	const normalized: Record<string, any> = {
		manufacturer: config.manufacturer,
		manufacturerId: config.manufacturerId,
		label: config.label,
		description: config.description,
		devices: config.devices,
		firmwareVersion: config.firmwareVersion,
		associations: config.associations,
		paramInformation: {},
	};

	if (!normalized.associations) {
		delete normalized.associations;
	}

	if (config.paramInformation) {
		const paramKeys = Object.keys(config.paramInformation);

		// ensure paramKeys respect the order: 100, 101[0x01], 101[0x02], 102 etc...
		paramKeys.sort((a, b) => {
			const aMask = paramsRegex.exec(a) ?? [];
			const bMask = paramsRegex.exec(b) ?? [];

			if (aMask.length > 1) {
				a = a.replace(aMask[0], "");
			}

			if (bMask.length > 1) {
				b = b.replace(aMask[0], "");
			}

			if (a === b) {
				return (
					parseInt(aMask[1] ?? 0, 16) - parseInt(bMask[1] ?? 0, 16)
				);
			} else {
				return parseInt(a) - parseInt(b);
			}
		});

		const paramInformation: Record<string, any> = {};

		for (const key of paramKeys) {
			const toEdit = config.paramInformation[key];

			const param: Record<string, any> = {
				label: toEdit.label,
				description: toEdit.description,
				valueSize: toEdit.valueSize,
				unit: normalizeUnits(toEdit.unit),
				minValue: toEdit.minValue,
				maxValue: toEdit.maxValue,
				defaultValue: toEdit.defaultValue,
				unsigned: toEdit.unsigned,
				readOnly: toEdit.readOnly,
				writeOnly: toEdit.writeOnly,
				allowManualEntry: toEdit.allowManualEntry,
				options: toEdit.options,
			};

			if (!param.unsigned) {
				delete param.unsigned;
			}

			if (!param.units) {
				delete param.unit;
			}

			if (!param.description) {
				delete param.description;
			}

			if (!param.options) {
				delete param.options;
			} else if (param.options.length > 0) {
				const values = param.options.map((o: any) => o.value);
				const max = Math.max(...values);
				const min = Math.min(...values);
				param.minValue = min;
				param.maxValue = max;
			}

			paramInformation[key] = param;
		}

		normalized.paramInformation = paramInformation;
	} else {
		delete normalized.paramInformation;
	}

	return normalized;
}

/**
 * Read and parse the product xml, add it to index if missing,
 * create/update device json config and validate the newly added
 * device
 *
 * @param product the parsed product json entry from manufacturer.xml
 * @param manufacturer manufacturer name string
 * @param manufacturerId manufacturer hex id `0xXXXX`
 * @param manufacturerIdInt manufacturer integer id
 * @returns promise fulfilled once the parsing ends
 */
async function parseOzwProduct(
	product: any,
	manufacturer: string | undefined,
	manufacturerId: string,
	manufacturerIdInt: number,
): Promise<void> {
	const productFile = await fs.readFile(
		path.join(ozwConfigFolder, product.config),
		"utf8",
	);

	const productLabel = path
		.basename(product.config, ".xml")
		.toLocaleUpperCase();

	// any products descriptions have productName in it, remove it
	const productName = product.name.replace(productLabel, "");

	// for some reasons some products already have the prefix `0x`, remove it
	product.id = product.id.replace(/^0x/, "");
	product.type = product.type.replace(/^0x/, "");

	const productId = formatId(product.id);
	const productType = formatId(product.type);

	const fileName = `${manufacturerId}/${labelToFilename(productLabel)}.json`;
	const filePath = path.join(processedDir, fileName);

	let json: Record<string, any> = xml2json.toJson(productFile, {
		object: true,
		coerce: true, // coerce types
	});

	json = json.Product;

	// const metadata = ensureArray(json.MetaData?.MetaDataItem);
	// const name = metadata.find((m: any) => m.name === "Name")?.$t;
	// const description = metadata.find((m: any) => m.name === "Description")?.$t;

	if (
		!(await lookupDevice(
			manufacturerIdInt,
			parseInt(product.type, 16),
			parseInt(product.id, 16),
		))
	) {
		addDeviceToIndex(
			manufacturerIdInt,
			parseInt(product.type, 16),
			parseInt(product.id, 16),
			fileName,
		);
	}

	let existingDevice;

	try {
		existingDevice = JSON5.parse(await fs.readFile(filePath, "utf8"));
	} catch (error) {
		// device doesn't exists
	}

	const ret: Record<string, any> = {
		manufacturer: manufacturer,
		manufacturerId: manufacturerId,
		label: productLabel,
		description: existingDevice?.description ?? productName, // don't override the descrition
		devices: [
			{
				productType: productType,
				productId: productId,
			},
		],
		firmwareVersion: {
			min: existingDevice?.firmwareVersion.min ?? "0.0",
			max: existingDevice?.firmwareVersion.max ?? "255.255",
		},
	};

	if (existingDevice) {
		for (const device of existingDevice.devices) {
			if (
				!ret.devices.find(
					(d: any) =>
						d.productType === device.productType &&
						d.productId === device.productId,
				)
			) {
				ret.devices.push(device);
			}
		}

		if (existingDevice.associations) {
			ret.associations = existingDevice.associations;
		}

		if (existingDevice.paramInformation) {
			ret.paramInformation = existingDevice.paramInformation;
		}
	}

	const commandClasses = ensureArray(json.CommandClass);

	const parameters = ensureArray(
		commandClasses.find((c: any) => c.id === CommandClasses.Configuration)
			?.Value,
	);

	if (parameters.length > 0 && ret.paramInformation === undefined) {
		ret.paramInformation = {};
	}

	// parse paramInformations contained in command class 112
	for (const param of parameters) {
		if (isNaN(param.index)) continue;

		if (param.type === "bitset") {
			const bitSetIds = ensureArray(param.BitSet);
			let value = param.value || 0;

			if (typeof value !== "number") value = 0;

			const size = param.size || 1;

			const bitArray = padStart(value.toString(2), size * 8, "0")
				.split("")
				.reverse()
				.map((b) => parseInt(b));

			for (const bitSet of bitSetIds) {
				const bit = (bitSet.id || 0) - 1;
				const mask = (2 ** bit).toString(16);
				const id = `${param.index}[0x${padStart(mask, 2, "0")}]`;

				const parsedParam = ret.paramInformation[id] ?? {};

				const label = ensureArray(bitSet.Label)[0];
				const desc = ensureArray(bitSet.Help)[0];

				// this values are all parsed as switches but could be transformed to
				// list with two options: `Enable` and `Disable`
				parsedParam.label = label;
				parsedParam.description = desc;
				parsedParam.valueSize = 1;
				parsedParam.minValue = 0;
				parsedParam.maxValue = 1;
				parsedParam.defaultValue = bitArray[bit];
				parsedParam.readOnly = false;
				parsedParam.writeOnly = false;
				parsedParam.allowManualEntry = true;

				ret.paramInformation[id] = parsedParam;
			}
		} else {
			const parsedParam = ret.paramInformation[param.index] ?? {};

			// don't use ?? here, some fields could be empty strings and ?? operator
			// will not work
			parsedParam.label = param.label || parsedParam.label;
			parsedParam.description = param.Help || parsedParam.description;
			parsedParam.valueSize = param.size || parsedParam.valueSize || 1;
			parsedParam.minValue = param.min || parsedParam.min || 0;
			parsedParam.maxValue = param.max || parsedParam.max || 100;
			parsedParam.readOnly = Boolean(param.read_only);
			parsedParam.writeOnly = Boolean(param.write_only);
			parsedParam.allowManualEntry = param.type !== "list";
			parsedParam.defaultValue = param.value || parsedParam.value || 0;

			if (param.units) {
				parsedParam.unit = param.units;
			}

			// could have multiple translations, if so it's an array, the first
			// is the english one
			if (isArray(parsedParam.description)) {
				parsedParam.description = parsedParam.description[0];
			}

			if (typeof parsedParam.description !== "string") {
				parsedParam.description = "";
			}

			if (typeof parsedParam.defaultValue !== "number") {
				parsedParam.defaultValue = 0;
			}

			// some values have typos, this fixes them
			if (typeof parsedParam.maxValue === "string") {
				parsedParam.maxValue = parseInt(
					parsedParam.maxValue.replace(/[^0-9]/g, ""),
				);
			}

			const items = ensureArray(param.Item);

			if (param.type === "list" && items.length > 0) {
				parsedParam.options = [];
				for (const item of items) {
					const opt = {
						label: item.label.toString(),
						value: parseInt(item.value),
					};
					parsedParam.options.push(opt);
				}
			}

			ret.paramInformation[param.index] = parsedParam;
		}
	}

	const associations = ensureArray(
		commandClasses.find((c: any) => c.id === CommandClasses.Association)
			?.Associations?.Group,
	);

	const multiInstanceAssociations = ensureArray(
		commandClasses.find(
			(c: any) => c.id === CommandClasses["Multi Channel Association"],
		)?.Associations?.Group,
	);

	associations.push(...multiInstanceAssociations);

	if (associations.length > 0 && ret.associations === undefined) {
		ret.associations = {};
	}

	// parse associations contained in command class 133 and 142
	for (const ass of associations) {
		const parsedAssociation = ret.associations[ass.index] ?? {};

		parsedAssociation.label = ass.label;
		parsedAssociation.maxNodes = ass.max_associations;

		if (/lifeline/i.test(ass.label)) {
			parsedAssociation.isLifeline = true;
		}
		ret.associations[ass.index] = parsedAssociation;
	}

	const manufacturerDir = path.join(processedDir, manufacturerId);

	// create manufacturer dir if doesn't exists
	await fs.ensureDir(manufacturerDir);

	// write the updated configuration file
	await fs.writeFile(
		filePath,
		JSON.stringify(normalizeConfig(ret), undefined, 4),
	);

	// validate the newly added device
	await lookupDevice(
		manufacturerIdInt,
		parseInt(product.type, 16),
		parseInt(product.id, 16),
	);
}

/**
 * Downloads all device information
 * @param IDs If given, only these IDs are downloaded
 */
async function downloadDevices(IDs?: string[]): Promise<void> {
	if (!isArray(IDs) || !IDs.length) {
		process.stdout.write("Fetching database IDs...");
		IDs = await fetchIDs();
		// Delete the last line
		process.stdout.write("\r\x1b[K");
	}

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
			formatId(id.trim()),
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
		if (match) return formatId(match[1]);
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
					.map((str) => formatId(str));
				return { productType, productId };
			}),
		firmwareVersion: {
			min: json.versionminDisplay,
			max: json.versionmaxDisplay,
		},
	};

	// If Z-Wave+ is supported, we don't need the association information to determine the lifeline
	try {
		const supportsZWavePlus = !!json.endpoints
			?.find((ep: any) => ep.number === "0")
			?.commandClasses?.find(
				(cc: any) => cc.commandclass.class_ref === "94",
			);
		if (!supportsZWavePlus) {
			if (json.associations?.length) {
				ret.associations = {};
				for (const assoc of json.associations) {
					const sanitizedDescription = sanitizeText(
						assoc.description,
					);
					ret.associations[assoc.group_id] = {
						label: sanitizeText(assoc.label),
						...(sanitizedDescription
							? { description: sanitizedDescription }
							: undefined),
						maxNodes: parseInt(assoc.max),
						// isLifeline must be either true or left out
						isLifeline: assoc.controller === "1" ? true : undefined,
					};
				}
			}
		} else {
			ret.supportsZWavePlus = true;
		}
	} catch (e) {
		console.error(filename);
		process.exit(1);
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

/** Translates all downloaded config files */
async function importConfigFiles(): Promise<void> {
	const configFiles = (await fs.readdir(importDir)).filter(
		(file) =>
			file.endsWith(".json") &&
			!file.startsWith("_") &&
			file !== "manufacturers.json",
	);

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
		} catch (e: unknown) {
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
	}
}

async function enumFilesRecursive(
	rootDir: string,
	predicate?: (filename: string) => boolean,
) {
	const ret: string[] = [];
	try {
		const filesAndDirs = await fs.readdir(rootDir);
		for (const f of filesAndDirs) {
			const fullPath = path.join(rootDir, f);

			if (fs.statSync(fullPath).isDirectory()) {
				ret.push(...(await enumFilesRecursive(fullPath, predicate)));
			} else if (predicate?.(fullPath)) {
				ret.push(fullPath);
			}
		}
	} catch (err) {
		console.error(`Cannot read directory: "${rootDir}": ${err}`);
	}

	return ret;
}

/** Generates an index for all device config files */
async function generateDeviceIndex(): Promise<void> {
	const configFiles = await enumFilesRecursive(
		processedDir,
		(file) => file.endsWith(".json") && !file.endsWith("index.json"),
	);

	const index: DeviceConfigIndexEntry[] = [];

	for (const file of configFiles) {
		const relativePath = path
			.relative(processedDir, file)
			.replace(/\\/g, "/");
		const fileContents = await fs.readFile(file, "utf8");
		// Try parsing the file
		try {
			const config = new DeviceConfig(relativePath, fileContents);
			// Add the file to the index
			index.push(
				...config.devices.map((dev: any) => ({
					manufacturerId: formatId(
						config.manufacturerId.toString(16),
					),
					...dev,
					firmwareVersion: config.firmwareVersion,
					filename: relativePath,
				})),
			);
		} catch (e) {
			console.error(`packages/config/config/devices/${relativePath}:`);
			console.error(
				red(`[ERROR] invalid device config file: ${e.message}`),
			);
		}
	}

	// Write the index
	await fs.writeFile(
		path.join(processedDir, "index.json"),
		`// This file is auto-generated using "npm run config index"
${JSON.stringify(index, undefined, 4)}`,
		"utf8",
	);
}

/** Changes the manufacturer names in all device config files to match manufacturers.json */
async function updateManufacturerNames(): Promise<void> {
	const configFiles = await enumFilesRecursive(
		processedDir,
		(file) => file.endsWith(".json") && !file.endsWith("index.json"),
	);
	await loadManufacturers();

	for (const file of configFiles) {
		let fileContents = await fs.readFile(file, "utf8");
		const id = parseInt(
			fileContents.match(/"manufacturerId"\: "0x([0-9a-fA-F]+)"/)![1],
			16,
		);
		const name = lookupManufacturer(id);
		const oldName = fileContents.match(/"manufacturer"\: "([^\"]+)"/)![1];
		if (oldName && name && name !== oldName) {
			fileContents = fileContents.replace(
				`// ${oldName} `,
				`// ${name} `,
			);
			fileContents = fileContents.replace(
				`"manufacturer": "${oldName}"`,
				`"manufacturer": "${name}"`,
			);
			await fs.writeFile(file, fileContents, "utf8");
		}
	}
}

void (async () => {
	if (program.clean) {
		await cleanTmpDirectory();
	} else {
		if (program.source.includes("ozw")) {
			if (program.download) {
				await downloadOzwConfig();
				await extractConfigFromTar();
			}

			if (program.manufacturers || program.devices)
				await parseOzwConfig();
		}

		if (program.source.includes("oh")) {
			if (program.download) {
				await downloadManufacturers();
				await downloadDevices(program.ids?.map(String));
			}

			if (program.manufacturers) {
				await updateManufacturerNames();
			}

			if (program.devices) {
				await importConfigFiles();
			}
		}

		if (program.index) {
			await generateDeviceIndex();
		}
	}
})();
