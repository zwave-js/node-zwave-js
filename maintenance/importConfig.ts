/*!
 * This script is used to import the Z-Wave device database from
 * https://www.cd-jackson.com/zwave_device_database/zwave-database-json.gz.tar
 * and translate the information into a form this library expects
 */

/* eslint-disable @typescript-eslint/no-var-requires */

process.on("unhandledRejection", (r) => {
	throw r;
});

import {
	addDeviceToIndex,
	DeviceConfig,
	DeviceConfigIndexEntry,
	loadDeviceIndex,
	loadManufacturers,
	lookupDevice,
	lookupManufacturer,
	setManufacturer,
	writeIndexToFile,
	writeManufacturersToJson,
} from "@zwave-js/config";
import { num2hex } from "@zwave-js/shared";
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
import xml2json from "xml2json";

// Where the files are located
const importDir = path.join(__dirname, "../packages/config", "config/import");
const processedDir = path.join(
	__dirname,
	"../packages/config",
	"config/devices",
);

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
function extractConfigFromTar(): Promise<void> {
	return new Promise((resolve, reject) => {
		console.log("extracting config folder from ozw archive...");
		child.exec(
			`tar -xzf ${ozwTarName} open-zwave-master/config  --strip-components=1`,
			{ cwd: tmpDir },
			function (error) {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			},
		);
	});
}

/** Delete all files in `tmpDir` */
function cleanTmpDirectory(): Promise<void> {
	return new Promise((resolve, reject) => {
		child.exec("rm -rf *", { cwd: tmpDir }, function (error) {
			if (error) {
				reject(error);
			} else {
				resolve();
				console.log("temporary directory cleaned");
			}
		});
	});
}

/** Reads OZW `manufacturer_specific.xml` */
async function parseOzwConfig(): Promise<void> {
	const manufacturerFile = path.join(
		ozwConfigFolder,
		"manufacturer_specific.xml",
	);
	const manufacturerJson = xml2json.toJson(
		await fs.readFile(manufacturerFile, "utf8"),
		{ object: true },
	);

	await loadManufacturers();
	await loadDeviceIndex();

	// @ts-ignore
	for (const man of manufacturerJson.ManufacturerSpecificData.Manufacturer) {
		const intId = parseInt(man.id);

		let name = lookupManufacturer(intId);

		// TODO: Manufacturers ids are lower case in both folders and devices ids
		const hexId = "0x" + padStart(man.id, 4, "0").toLowerCase();

		if (name === undefined && man.name !== undefined) {
			// add manufacturer to manufacturers.json
			console.log(`Adding missing manufacturer: ${man.name}`);

			setManufacturer(intId, man.name);
		}

		name = man.name;

		if (man.Product !== undefined && Array.isArray(man.Product)) {
			for (const product of man.Product) {
				if (product.config !== undefined) {
					await parseOzwProduct(product, name, hexId, intId);
				}
			}
		}
	}

	await writeManufacturersToJson();
	await writeIndexToFile();
}

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

	const productName = product.name;

	// for some reasons some products already have the prefix `0x`, remove it
	product.id = product.id.replace("0x", "");
	product.type = product.type.replace("0x", "");

	const productId = "0x" + padStart(product.id, 4);
	const productType = "0x" + padStart(product.type, 4);

	const existingDevice = await lookupDevice(
		manufacturerIdInt,
		parseInt(product.type, 16),
		parseInt(product.id, 16),
	);

	// @ts-ignore
	const json: Record<string, any> = xml2json.toJson(productFile, {
		object: true,
		coerce: true,
	}).Product;

	// let metadata = json.MetaData?.MetaDataItem || [];
	// metadata = Array.isArray(metadata) ? metadata : [metadata];
	// const name = metadata.find((m: any) => m.name === "Name")?.$t;
	// const description = metadata.find((m: any) => m.name === "Description")?.$t;

	const fileName = `${manufacturerId}/${labelToFilename(productLabel)}.json`;

	if (existingDevice === undefined) {
		addDeviceToIndex(
			manufacturerIdInt,
			parseInt(product.type, 16),
			parseInt(product.id, 16),
			fileName,
		);
	}

	let commandClasses = json.CommandClass || [];
	commandClasses = Array.isArray(commandClasses)
		? commandClasses
		: [commandClasses];

	const ret: Record<string, any> = {
		_approved: true,
		manufacturer: manufacturer,
		manufacturerId: manufacturerId,
		label: productLabel,
		description: productName,
		devices: [
			{
				productType: productType,
				productId: productId,
			},
		],
		firmwareVersion: {
			min: existingDevice?.firmwareVersion.min || "0.0",
			max: existingDevice?.firmwareVersion.max || "255.255",
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
			ret.associations = {};
			for (const [key, ass] of existingDevice.associations) {
				ret.associations[key] = ass;
				if (ret.associations[key].noEndpoint === false) {
					delete ret.associations[key].noEndpoint;
				}
				if (ret.associations[key].isLifeline === false) {
					delete ret.associations[key].isLifeline;
				}

				delete ret.associations[key].groupId;
			}
		}

		if (existingDevice.paramInformation) {
			ret.paramInformation = {};
			for (const [
				key,
				param,
			] of existingDevice.paramInformation.entries()) {
				ret.paramInformation[key.parameter] = param;
				delete ret.paramInformation[key.parameter].parameterNumber;
				if (ret.paramInformation[key.parameter].options.length === 0)
					delete ret.paramInformation[key.parameter].options;
			}
		}
	}

	if (ret.associations === undefined) {
		ret.associations = {};
	}

	if (ret.paramInformation === undefined) {
		ret.paramInformation = {};
	}

	let parameters = commandClasses.find((c: any) => c.id === 112)?.Value || [];

	if (!Array.isArray(parameters)) {
		parameters = [parameters];
	}

	for (const param of parameters) {
		if (isNaN(param.index)) continue;

		const parsedParam: Record<string, any> = {
			label: param.label,
			description: param.Help,
			valueSize: param.size || 1,
			minValue: param.min || 0,
			maxValue: param.max || 100,
			readOnly: Boolean(param.read_only),
			writeOnly: Boolean(param.write_only),
			allowManualEntry: param.type !== "list",
			defaultValue: param.value || 0,
		};

		if (Array.isArray(parsedParam.description)) {
			parsedParam.description = parsedParam.description[0];
		}

		if (typeof parsedParam.description !== "string") {
			parsedParam.description = "";
		}

		if (typeof parsedParam.defaultValue !== "number") {
			parsedParam.defaultValue = 0;
		}

		if (typeof parsedParam.maxValue === "string") {
			parsedParam.maxValue = parseInt(
				parsedParam.maxValue.replace(/[^0-9]/g, ""),
			);
		}

		if (param.type === "list" && Array.isArray(param.Item)) {
			parsedParam.options = [];
			for (const item of param.Item) {
				const opt = {
					label: item.label.toString(),
					value: parseInt(item.value),
				};
				parsedParam.options.push(opt);
			}
		}

		ret.paramInformation[param.index] = parsedParam;
	}

	let associations =
		commandClasses.find((c: any) => c.id === 133)?.Associations?.Group ||
		[];

	if (!Array.isArray(associations)) {
		associations = [associations];
	}

	for (const ass of associations) {
		const parsedAssociation = ret.associations[ass.index] || {};

		parsedAssociation.label = ass.label;
		parsedAssociation.maxNodes = ass.max_associations;

		if (/lifeline/i.test(ass.label)) {
			parsedAssociation.isLifeline = true;
		}
		ret.associations[ass.index] = parsedAssociation;
	}

	const manufacturerDir = path.join(processedDir, manufacturerId);

	await fs.ensureDir(manufacturerDir);
	await fs.writeFile(
		path.join(processedDir, fileName),
		JSON.stringify(ret, undefined, 4),
	);

	// check for device errors
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
					.map((str) => "0x" + padStart(str, 4, "0").toLowerCase());
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
					manufacturerId: `0x${padStart(
						config.manufacturerId.toString(16),
						4,
						"0",
					).toLowerCase()}`,
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
	if (process.argv.includes("clean")) {
		await cleanTmpDirectory();
	} else if (process.argv.includes("ozw")) {
		if (process.argv.includes("download")) {
			await downloadOzwConfig();
			await extractConfigFromTar();
		}

		if (process.argv.includes("manufacturers")) {
			await parseOzwConfig();
		}
	} else if (process.argv.includes("manufacturers")) {
		await downloadManufacturers();
	} else if (process.argv.includes("manufacturerNames")) {
		await updateManufacturerNames();
	} else if (process.argv.includes("download")) {
		const id = process.argv[process.argv.indexOf("download") + 1];
		if (!id || id === "all") {
			await downloadManufacturers();
			await downloadDevices();
		} else {
			await downloadDevices(id.split(","));
		}
	} else if (process.argv.includes("import")) {
		await importConfigFiles();
		await generateDeviceIndex();
	} else if (process.argv.includes("index")) {
		await generateDeviceIndex();
	}
})();
