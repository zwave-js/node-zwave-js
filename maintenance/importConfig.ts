/*!
 * This script is used to import the Z-Wave device database from
 * https://www.cd-jackson.com/zwave_device_database/zwave-database-json.gz.tar
 * and translate the information into a form this library expects
 */

process.on("unhandledRejection", (r) => {
	throw r;
});

import { composeObject } from "alcalzone-shared/objects";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { red } from "ansi-colors";
import { AssertionError, ok } from "assert";
import axios from "axios";
import * as child from "child_process";
import * as fs from "fs-extra";
import * as JSON5 from "json5";
import * as path from "path";
import { compare } from "semver";
import { promisify } from "util";
import xml2json from "xml2json";
import yargs from "yargs";
import {
	DeviceConfig,
	DeviceConfigIndexEntry,
	getIndex,
	loadDeviceIndex,
	loadManufacturers,
	lookupManufacturer,
	setManufacturer,
	writeManufacturersToJson,
} from "../packages/config/src";
import { formatId, padVersion } from "../packages/config/src/utils";
import { CommandClasses, getIntegerLimits } from "../packages/core/src";
import { num2hex } from "../packages/shared/src";
import { stringify } from "../packages/shared/src/strings";
import { enumFilesRecursive } from "./tools";

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
		description:
			"devices ids to download. In ozw the format is '<manufacturer>-<productId>-<productType>'. Ex: '0x0086-0x0075-0x0004'",
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
const processedDir = path.join(
	__dirname,
	"../packages/config",
	"config/devices",
);

const ozwTempDir = path.join(__dirname, "../.tmpozw");
const ozwTarName = "openzwave.tar.gz";
const ozwTarUrl =
	"https://github.com/OpenZWave/open-zwave/archive/master.tar.gz";
const ozwConfigFolder = path.join(ozwTempDir, "./config");

const ohTempDir = path.join(__dirname, "../.tmpoh");
const importedManufacturersPath = path.join(ohTempDir, "manufacturers.json");

// Regular expressions to parse html pages

// Where all the information can be found
const ohUrlManufacturers =
	"https://opensmarthouse.org/dmxConnect/api/zwavedatabase/manufacturers/list.php?sort=label&limit=99999";
const ohUrlIDs =
	"https://opensmarthouse.org/dmxConnect/api/zwavedatabase/device/list.php?filter=&manufacturer=-1&limit=100000";
const ohUrlDevice = (id: number) =>
	`https://opensmarthouse.org/dmxConnect/api/zwavedatabase/device/read.php?device_id=${id}`;

function isNullishOrEmptyString(
	value: number | string | null | undefined,
): value is "" | null | undefined {
	return value == undefined || value === "";
}

/** Updates a numeric value with a new value, sanitizing the input. Falls back to the previous value (if it exists) or a default one */
function updateNumberOrDefault(
	newN: number | string,
	oldN: number | string,
	defaultN: number,
): number | undefined {
	// Try new value first
	let ret = sanitizeNumber(newN);
	if (typeof ret === "number") return ret;

	// Fallback to old value
	ret = sanitizeNumber(oldN);
	if (typeof ret === "number") return ret;

	return defaultN;
}

/** Retrieves the list of database IDs */
async function fetchIDs(): Promise<number[]> {
	const data = (await axios({ url: ohUrlIDs })).data;
	return data.devices.map((d: any) => d.id);
}

/** Retrieves the definition for a specific device */
async function fetchDevice(id: number): Promise<string> {
	const source = (await axios({ url: ohUrlDevice(id) })).data;
	return stringify(source, "\t");
}

/** Downloads ozw master archive and store it on `tmpDir` */
async function downloadOZWConfig(): Promise<string> {
	console.log("downloading ozw archive...");

	// create tmp directory if missing
	await fs.ensureDir(ozwTempDir);

	// this will return a stream in `data` that we pipe into write stream
	// to store the file in `tmpDir`
	const data = (await axios({ url: ozwTarUrl, responseType: "stream" })).data;

	return new Promise((resolve, reject) => {
		const fileDest = path.join(ozwTempDir, ozwTarName);
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
		{ cwd: ozwTempDir },
	);
}

/** Delete all files in `tmpDir` */
async function cleanTmpDirectory(): Promise<void> {
	await fs.remove(ozwTempDir);
	await fs.remove(ohTempDir);
	console.log("temporary directories cleaned");
}

function matchId(
	manufacturer: string,
	prodType: string,
	prodId: string,
): boolean {
	return !!program.ids?.includes(
		`${formatId(manufacturer)}-${formatId(prodType)}-${formatId(prodId)}`,
	);
}

/** Reads OZW `manufacturer_specific.xml` */
async function parseOZWConfig(): Promise<void> {
	// The manufacturer_specific.xml is OZW's index file and contains all devices, their type, ID and name (label)
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

	// Load our existing config files to cross-reference
	await loadManufacturers();
	if (program.devices) {
		await loadDeviceIndex();
	}

	for (const man of manufacturerJson.ManufacturerSpecificData.Manufacturer) {
		// <Manufacturer id="012A" name="ManufacturerName">... products ...</Manufacturer>
		const manufacturerId = parseInt(man.id, 16);
		let manufacturerName = lookupManufacturer(manufacturerId);

		// Add the manufacturer to our manufacturers.json if it is missing
		if (manufacturerName === undefined && man.name !== undefined) {
			console.log(`Adding missing manufacturer: ${man.name}`);
			// let this here, if program.manufacturers is false it will not
			// write the manufacturers to file
			setManufacturer(manufacturerId, man.name);
		}
		manufacturerName = man.name;

		if (program.devices) {
			// Import all device config files of this manufacturer if requested
			const products = ensureArray(man.Product);
			for (const product of products) {
				if (product.config !== undefined) {
					if (
						!program.ids ||
						matchId(man.id, product.id, product.type)
					) {
						await parseOZWProduct(
							product,
							manufacturerId,
							manufacturerName,
						);
					}
				}
			}
		}
	}

	if (program.manufacturers) {
		await writeManufacturersToJson();
	}
}

/**
 * When using xml2json some fields expected as array are parsed as objects
 * when there is only one element. This method ensures that they are arrays
 *
 */
function ensureArray(json: any): any[] {
	json = json ?? [];
	return isArray(json) ? json : [json];
}

function normalizeUnits(unit: string) {
	if (!unit) return undefined;

	if (/minutes/i.test(unit)) {
		return "minutes";
	} else if (/seconds/i.test(unit)) {
		return "seconds";
	} else if (/fahrenheit|\bf\b/i.test(unit)) {
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
		label: sanitizeText(config.label) ?? "",
		description: sanitizeText(config.description) ?? "",
		devices: config.devices.sort(
			(a: any, b: any) =>
				a.productType.localeCompare(b.productType) ||
				a.productId.localeCompare(b.productId),
		),
		firmwareVersion: config.firmwareVersion,
		associations: config.associations,
		paramInformation: {},
		compat: config.compat,
	};

	// Delete optional properties if they have no relevant entry
	if (
		!normalized.associations ||
		Object.keys(normalized.associations).length === 0
	) {
		delete normalized.associations;
	}
	if (!normalized.compat || Object.keys(normalized.compat).length === 0) {
		delete normalized.compat;
	}

	if (
		config.paramInformation &&
		Object.keys(config.paramInformation).length > 0
	) {
		// TODO: Sorting object keys is useless while we have a mix of integer and string keys,
		// since the ES2015 specs define the order

		// const paramKeys = Object.keys(config.paramInformation);

		// // ensure paramKeys respect the order: 100, 101[0x01], 101[0x02], 102 etc...
		// paramKeys.sort((a, b) => {
		// 	const aMask = paramsRegex.exec(a) ?? [];
		// 	const bMask = paramsRegex.exec(b) ?? [];

		// 	if (aMask.length > 1) {
		// 		a = a.replace(aMask[0], "");
		// 	}

		// 	if (bMask.length > 1) {
		// 		b = b.replace(bMask[0], "");
		// 	}

		// 	if (a === b) {
		// 		return (
		// 			parseInt(aMask[1] ?? 0, 16) - parseInt(bMask[1] ?? 0, 16)
		// 		);
		// 	} else {
		// 		return parseInt(a) - parseInt(b);
		// 	}
		// });

		const normalizedParamInfo: Record<string, any> = {};
		// Filter out duplicates between partial and non-partial params
		const entries = Object.entries<any>(config.paramInformation).filter(
			([key], _, arr) =>
				// Allow partial params
				!/^\d+$/.test(key) ||
				// and non-partial params without a corresponding partial param
				!arr.some(([otherKey]) => otherKey.startsWith(`${key}[`)),
		);

		for (const [key, original] of entries) {
			const param: Record<string, any> = {
				label: original.label,
				description: original.description,
				valueSize: original.valueSize,
				unit: normalizeUnits(original.unit),
				minValue: original.minValue,
				maxValue: original.maxValue,
				defaultValue: original.defaultValue,
				unsigned: original.unsigned,
				readOnly: original.readOnly,
				writeOnly: original.writeOnly,
				allowManualEntry: original.allowManualEntry,
				options: original.options,
			};

			if (!param.unsigned) delete param.unsigned;
			if (!param.unit) delete param.unit;
			if (!param.description) delete param.description;

			if (!param.options || param.options.length === 0) {
				delete param.options;
			} else {
				const values = param.options.map((o: any) => o.value);
				param.minValue = Math.min(...values);
				param.maxValue = Math.max(...values);
			}

			normalizedParamInfo[key] = param;
		}

		normalized.paramInformation = normalizedParamInfo;
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
 */
async function parseOZWProduct(
	product: any,
	manufacturerId: number,
	manufacturer: string | undefined,
): Promise<void> {
	const productFile = await fs.readFile(
		path.join(ozwConfigFolder, product.config),
		"utf8",
	);

	// TODO: Parse the label from XML metadata, e.g.
	// <MetaDataItem id="0100" name="Identifier" type="2002">CT32 </MetaDataItem>
	const productLabel = path
		.basename(product.config, ".xml")
		.toLocaleUpperCase();

	// any products descriptions have productName in it, remove it
	const productName = product.name.replace(productLabel, "");

	// for some reasons some products already have the prefix `0x`, remove it
	product.id = product.id.replace(/^0x/, "");
	product.type = product.type.replace(/^0x/, "");

	// Format the device IDs like we expect them
	const productId = formatId(product.id);
	const productType = formatId(product.type);
	const manufacturerIdHex = formatId(manufacturerId);

	const deviceConfigs =
		getIndex()?.filter(
			(f: DeviceConfigIndexEntry) =>
				f.manufacturerId === manufacturerIdHex &&
				f.productType === productType &&
				f.productId === productId,
		) ?? [];
	const latestConfig = getLatestConfigVersion(deviceConfigs);

	// Determine where the config file should be
	const fileNameRelative =
		latestConfig?.filename ??
		`${manufacturerIdHex}/${labelToFilename(productLabel)}.json`;
	const fileNameAbsolute = path.join(processedDir, fileNameRelative);

	// Load the existing config so we can merge it with the updated information
	let existingDevice: Record<string, any> | undefined;

	if (await fs.pathExists(fileNameAbsolute)) {
		existingDevice = JSON5.parse(
			await fs.readFile(fileNameAbsolute, "utf8"),
		);
	}

	// Parse the OZW xml file
	const json = xml2json.toJson(productFile, {
		object: true,
		coerce: true, // coerce types
	}).Product as Record<string, any>;

	// const metadata = ensureArray(json.MetaData?.MetaDataItem);
	// const name = metadata.find((m: any) => m.name === "Name")?.$t;
	// const description = metadata.find((m: any) => m.name === "Description")?.$t;

	const devices = existingDevice?.devices ?? [];

	if (
		!devices.some(
			(d: { productType: string; productId: string }) =>
				d.productType === productType && d.productId === productId,
		)
	) {
		devices.push({ productType, productId });
	}

	const newConfig: Record<string, any> = {
		manufacturer,
		manufacturerId: manufacturerIdHex,
		label: productLabel,
		description: existingDevice?.description ?? productName, // don't override the descrition
		devices: devices,
		firmwareVersion: {
			min: existingDevice?.firmwareVersion.min ?? "0.0",
			max: existingDevice?.firmwareVersion.max ?? "255.255",
		},
		associations: existingDevice?.associations ?? {},
		paramInformation: existingDevice?.paramInformation ?? {},
		compat: existingDevice?.compat,
	};

	// Merge the devices array with a potentially existing one
	if (existingDevice) {
		for (const device of existingDevice.devices) {
			if (
				!newConfig.devices.some(
					(d: any) =>
						d.productType === device.productType &&
						d.productId === device.productId,
				)
			) {
				newConfig.devices.push(device);
			}
		}
	}

	const commandClasses = ensureArray(json.CommandClass);

	// parse config params: <CommandClass id="112"> ...values... </CommandClass>
	const parameters = ensureArray(
		commandClasses.find((c: any) => c.id === CommandClasses.Configuration)
			?.Value,
	);
	for (const param of parameters) {
		if (isNaN(param.index)) continue;

		const isBitSet = param.type === "bitset";

		if (isBitSet) {
			// BitSets are split into multiple partial parameters
			const bitSetIds = ensureArray(param.BitSet);
			const defaultValue =
				typeof param.value === "number" ? param.value : 0;
			const valueSize = param.size || 1;

			// Partial params share the first part of the label
			param.label = ensureArray(param.label)[0];
			const paramLabel = param.label ? `${param.label}. ` : "";

			for (const bitSet of bitSetIds) {
				// OZW has 1-based bit indizes, we are 0-based
				const bit = (bitSet.id || 1) - 1;
				const mask = 2 ** bit;
				const id = `${param.index}[${num2hex(mask)}]`;

				// Parse the label for this bit
				const label = ensureArray(bitSet.Label)[0] ?? "";
				const desc = ensureArray(bitSet.Help)[0] ?? "";

				const parsedParam = newConfig.paramInformation[id] ?? {};

				parsedParam.label = `${paramLabel}${label}`;
				parsedParam.description = desc;
				parsedParam.valueSize = valueSize; // The partial param must have the same value size as the original param
				// OZW only supports single-bit "partial" params, so we only have 0 and 1 as possible values
				parsedParam.minValue = 0;
				parsedParam.maxValue = 1;
				parsedParam.defaultValue = !!(defaultValue & mask) ? 1 : 0;
				parsedParam.readOnly = false;
				parsedParam.writeOnly = false;
				parsedParam.allowManualEntry = true;

				newConfig.paramInformation[id] = parsedParam;
			}
		} else {
			const parsedParam = newConfig.paramInformation[param.index] ?? {};

			// By default, update existing properties with new descriptions
			// OZW's config fields could be empty strings, so we need to use || instead of ??
			parsedParam.label =
				ensureArray(param.label)[0] || parsedParam.label;
			parsedParam.description =
				ensureArray(param.Help)[0] || parsedParam.description;
			parsedParam.valueSize = updateNumberOrDefault(
				param.size,
				parsedParam.valueSize,
				1,
			);
			parsedParam.minValue = updateNumberOrDefault(
				param.min,
				parsedParam.min,
				0,
			);
			try {
				parsedParam.maxValue = updateNumberOrDefault(
					param.max,
					parsedParam.max,
					getIntegerLimits(parsedParam.valueSize, false).max, // choose the biggest possible number if no max is given
				);
			} catch {
				// some config params have absurd value sizes, ignore them
				parsedParam.maxValue = parsedParam.minValue;
			}
			parsedParam.readOnly =
				param.read_only === true || param.read_only === "true";
			parsedParam.writeOnly =
				param.write_only === true || param.write_only === "true";
			parsedParam.allowManualEntry = param.type !== "list";
			parsedParam.defaultValue = updateNumberOrDefault(
				param.value,
				parsedParam.value,
				parsedParam.minValue, // choose the smallest possible number if no default is given
			);
			parsedParam.unsigned = true; // ozw values are all unsigned

			if (param.units) {
				parsedParam.unit = param.units;
			}

			// could have multiple translations, if so it's an array, the first is the english one
			if (isArray(parsedParam.description)) {
				parsedParam.description = parsedParam.description[0];
			}

			if (typeof parsedParam.description !== "string") {
				parsedParam.description = "";
			}

			const items = ensureArray(param.Item);

			// Parse options list
			// <Item label="Option 1" value="1"/>
			// <Item label="Option 2" value="2"/>
			if (param.type === "list" && items.length > 0) {
				parsedParam.options = [];
				for (const item of items) {
					if (
						!parsedParam.options.find(
							(v: any) => v.value === item.value,
						)
					) {
						const opt = {
							label: item.label.toString(),
							value: parseInt(item.value),
						};
						parsedParam.options.push(opt);
					}
				}
			}

			newConfig.paramInformation[param.index] = parsedParam;
		}
	}

	// parse associations contained in command class 133 and 142
	const associations = [
		...ensureArray(
			commandClasses.find((c: any) => c.id === CommandClasses.Association)
				?.Associations?.Group,
		),
		...ensureArray(
			commandClasses.find(
				(c: any) =>
					c.id === CommandClasses["Multi Channel Association"],
			)?.Associations?.Group,
		),
	];

	if (associations.length > 0) {
		newConfig.associations ??= {};
		for (const ass of associations) {
			const parsedAssociation = newConfig.associations[ass.index] ?? {};

			parsedAssociation.label = ass.label;
			parsedAssociation.maxNodes = ass.max_associations;
			// Only set the isLifeline key if its true
			const isLifeline =
				/lifeline/i.test(ass.label) ||
				ass.auto === "true" ||
				ass.auto === true;
			if (isLifeline) parsedAssociation.isLifeline = true;

			newConfig.associations[ass.index] = parsedAssociation;
		}
	}

	// Some devices report other CCs than they support, add this information to the compat field
	const toAdd = commandClasses
		.filter((c) => c.action === "add")
		.map((c) => c.id);
	const toRemove = commandClasses
		.filter((c) => c.action === "remove")
		.map((c) => c.id);

	if (toAdd.length > 0 || toRemove.length > 0) {
		newConfig.compat ??= {};
		newConfig.compat.cc ??= {};

		if (toAdd.length > 0) {
			newConfig.compat.cc.add = toAdd;
		}
		if (toRemove.length > 0) {
			newConfig.compat.cc.remove = toRemove;
		}
	}
	// create the target dir for this config file if doesn't exists
	const manufacturerDir = path.join(processedDir, manufacturerIdHex);
	await fs.ensureDir(manufacturerDir);

	// write the updated configuration file
	await fs.writeFile(
		fileNameAbsolute,
		stringify(normalizeConfig(newConfig), "\t"),
	);
}

/**
 * Downloads all device information
 * @param IDs If given, only these IDs are downloaded
 */
async function downloadDevices(IDs?: number[]): Promise<void> {
	if (!isArray(IDs) || !IDs.length) {
		process.stdout.write("Fetching database IDs...");
		IDs = await fetchIDs();
		// Delete the last line
		process.stdout.write("\r\x1b[K");
	}

	await fs.ensureDir(ohTempDir);
	for (let i = 0; i < IDs.length; i++) {
		process.stdout.write(
			`Fetching device config ${i + 1} of ${IDs.length}...`,
		);
		const content = await fetchDevice(IDs[i]);
		await fs.writeFile(
			path.join(ohTempDir, `${IDs[i]}.json`),
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

	const data = (await axios({ url: ohUrlManufacturers })).data;

	// Delete the last line
	process.stdout.write("\r\x1b[K");

	const manufacturers = composeObject(
		// @ts-expect-error
		data.manufacturers.data.map(({ id, label }) => [
			label
				.replace("</a>", "")
				.replace(/&quot;/g, `"`)
				.replace(/&amp;/g, "&")
				.trim(),
			formatId(id),
		]),
	);

	await fs.ensureDir(ohTempDir);
	await fs.writeFile(
		importedManufacturersPath,
		stringify(manufacturers, "\t"),
		"utf8",
	);

	console.log("done!");
}

/** Ensures an input file is valid */
function assertValid(json: any) {
	ok(
		isObject(json.manufacturer) &&
			typeof json.manufacturer.reference === "number" &&
			typeof json.manufacturer.label === "string",
	);
	ok(typeof json.description === "string");
	ok(typeof json.label === "string");
	ok(typeof json.device_ref === "string");
	ok(typeof json.version_min === "string");
	ok(typeof json.version_max === "string");
}

/** Removes unnecessary whitespace from imported text */
function sanitizeText(text: string): string | undefined {
	return text ? text.trim().replace(/[\t\r\n]+/g, " ") : undefined;
}

/** Tries to coerce the input value into an integer */
function sanitizeNumber(
	value: number | string | null | undefined,
): number | undefined {
	if (typeof value === "number") return value;
	if (isNullishOrEmptyString(value)) return undefined;

	let ret = Number(value);
	if (Number.isNaN(ret)) {
		value = value.replace(/[^0-9-\.\,]/g, "");
		ret = Number(value);
	}
	return ret;
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
async function parseOHConfigFile(
	filename: string,
): Promise<Record<string, any>> {
	const content = await fs.readFile(filename, "utf8");
	const json = JSON.parse(content);
	assertValid(json);

	const ret: Record<string, any> = {
		revision: json.db_version,
		manufacturer: json.manufacturer.label,
		manufacturerId: formatId(json.manufacturer.reference),
		label: sanitizeText(json.label),
		description: sanitizeText(json.description),
		devices: json.device_ref
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
			min: json.version_min.replace(/000/g, "0"),
			max: json.version_max,
		},
	};

	// If Z-Wave+ is supported, we don't need the association information to determine the lifeline
	try {
		const supportsZWavePlus = !!json.endpoints
			?.find((ep: any) => ep.number === "0")
			?.commandClasses?.find(
				(cc: any) => cc.commandclass.cmdclass_id === 94,
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
						maxNodes: parseInt(assoc.max_nodes),
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
			let key: string = param.param_id.toString();
			if (param.bitmask !== "0" && param.bitmask !== 0) {
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
				minValue: parseInt(param.minimum, 10),
				maxValue: parseInt(param.maximum, 10),
				defaultValue: parseInt(param.default, 10),
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
	const configFiles = (await fs.readdir(ohTempDir)).filter(
		(file) =>
			file.endsWith(".json") &&
			!file.startsWith("_") &&
			file !== "manufacturers.json",
	);

	for (const file of configFiles) {
		const inPath = path.join(ohTempDir, file);
		let parsed: Record<string, any>;
		try {
			parsed = await parseOHConfigFile(inPath);
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
${stringify(parsed, "\t")}`;
		await fs.writeFile(outFilename, output, "utf8");
	}
}

/**
 * Get latest device configuration file version
 * @param configs list of device config index entries
 */
function getLatestConfigVersion(
	configs: DeviceConfigIndexEntry[],
): DeviceConfigIndexEntry | undefined {
	configs.sort((a, b) => {
		const vA =
			typeof a.firmwareVersion === "boolean"
				? "255.255.255"
				: padVersion(a.firmwareVersion.max);
		const vB =
			typeof b.firmwareVersion === "boolean"
				? "255.255.255"
				: padVersion(b.firmwareVersion.max);

		return compare(vA, vB);
	});

	return configs[configs.length - 1];
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
		`// This file is auto-generated using "yarn run config import -i"
${stringify(index, "\t")}`,
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
				await downloadOZWConfig();
				await extractConfigFromTar();
			}

			if (program.manufacturers || program.devices)
				await parseOZWConfig();
		}

		if (program.source.includes("oh")) {
			if (program.download) {
				await downloadManufacturers();
				await downloadDevices(
					program.ids
						?.map((id) => parseInt(id as any))
						.filter((num) => !Number.isNaN(num)),
				);
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
