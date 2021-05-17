/*!
 * This script is used to import the Z-Wave device database from
 * https://www.cd-jackson.com/zwave_device_database/zwave-database-json.gz.tar
 * and translate the information into a form this library expects
 */

process.on("unhandledRejection", (r) => {
	throw r;
});

import { CommandClasses, getIntegerLimits } from "@zwave-js/core";
import {
	enumFilesRecursive,
	formatId,
	num2hex,
	stringify,
} from "@zwave-js/shared";
import { composeObject } from "alcalzone-shared/objects";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { AssertionError, ok } from "assert";
import axios from "axios";
import * as child from "child_process";
import * as JSONC from "comment-json";
import * as fs from "fs-extra";
import * as JSON5 from "json5";
import * as path from "path";
import { compare } from "semver";
import { promisify } from "util";
import xml2json from "xml2json";
import yargs from "yargs";
import { ConfigManager, DeviceConfigIndexEntry } from "../src";
import { padVersion } from "../src/utils";

const execPromise = promisify(child.exec);

const program = yargs
	.option("source", {
		description: "source of the import",
		alias: "s",
		type: "array",
		choices: ["oh", "ozw", "zwa"], // oh: openhab, ozw: openzwave; zwa: zWave Alliance
		default: ["zwa"],
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
	.option("manufacturer_folder", {
		alias: "M",
		description:
			"Download all Z-Wave alliance files for the specified manufacturer (using the zwa website manufacturer ID)",
		type: "array",
		array: true,
	})
	.option("devices", {
		alias: "d",
		description: "Parse and update devices configurations",
		type: "boolean",
		default: false,
	})
	.option("parse", {
		alias: "p",
		description: "Run custom parse routines -- maintenance",
		type: "boolean",
		default: false,
	})
	.example(
		"import -s ozw -Dmd",
		"Download and parse OpenZwave db (manufacturers, devices) and update the index",
	)
	.example(
		"import -s oh -Dmd",
		"Download and parse openhab db (manufacturers, devices) and update the index",
	)
	.example(
		"import -s oh -D --ids 1234 5678",
		"Download openhab devices with ids `1234` and `5678`",
	)
	.help()
	.version(false)
	.alias("h", "help").argv;

// Where the files are located
const processedDir = path.join(
	__dirname,
	"../../../packages/config",
	"config/devices",
);

const configManager = new ConfigManager();

const ozwTempDir = path.join(__dirname, "../../../.tmpozw");
const ozwTarName = "openzwave.tar.gz";
const ozwTarUrl =
	"https://github.com/OpenZWave/open-zwave/archive/master.tar.gz";
const ozwConfigFolder = path.join(ozwTempDir, "./config");

const zwaTempDir = path.join(__dirname, "../../../.tmpzwa");

const ohTempDir = path.join(__dirname, "../../../.tmpoh");
const importedManufacturersPath = path.join(ohTempDir, "manufacturers.json");

// Where all the information can be found
const ohUrlManufacturers =
	"https://opensmarthouse.org/dmxConnect/api/zwavedatabase/manufacturers/list.php?sort=label&limit=99999";
const ohUrlIDs =
	"https://opensmarthouse.org/dmxConnect/api/zwavedatabase/device/list.php?filter=&manufacturer=-1&limit=100000";
const ohUrlDevice = (id: number) =>
	`https://opensmarthouse.org/dmxConnect/api/zwavedatabase/device/read.php?device_id=${id}`;
const zwaUrlDevice = (id: number) =>
	`https://products.z-wavealliance.org/Products/${id}/json`;

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

/** Retrieves the list of database IDs from the OpenSmartHouse DB */
async function fetchIDsOH(): Promise<number[]> {
	const data = (await axios({ url: ohUrlIDs })).data;
	return data.devices.map((d: any) => d.id);
}

/** Retrieves the definition for a specific device from the OpenSmartHouse DB */
async function fetchDeviceOH(id: number): Promise<string> {
	const source = (await axios({ url: ohUrlDevice(id) })).data;
	return stringify(source, "\t");
}

/** Retrieves the definition for a specific device from the Z-Wave Alliance DB */
async function fetchDeviceZWA(id: number): Promise<string> {
	const source = (await axios({ url: zwaUrlDevice(id) })).data;
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
	await fs.remove(zwaTempDir);
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
	await configManager.loadManufacturers();
	if (program.devices) {
		await configManager.loadDeviceIndex();
	}

	for (const man of manufacturerJson.ManufacturerSpecificData.Manufacturer) {
		// <Manufacturer id="012A" name="ManufacturerName">... products ...</Manufacturer>
		const manufacturerId = parseInt(man.id, 16);
		let manufacturerName = configManager.lookupManufacturer(manufacturerId);

		// Add the manufacturer to our manufacturers.json if it is missing
		if (manufacturerName === undefined && man.name !== undefined) {
			console.log(`Adding missing manufacturer: ${man.name}`);
			// let this here, if program.manufacturers is false it will not
			// write the manufacturers to file
			configManager.setManufacturer(manufacturerId, man.name);
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
		await configManager.saveManufacturers();
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
	return unit;
}

/**
 * Normalize a device JSON configuration to ensure all keys have the same order
 * and fix some parameters if needed
 *
 * @param config Device JSON configuration
 */
function normalizeConfig(config: Record<string, any>): Record<string, any> {
	// Top-level key order (comments are not preserved between top-level keys)
	const topOrder = [
		"manufacturer",
		"manufacturerId",
		"label",
		"description",
		"devices",
		"firmwareVersion",
		"associations",
		"paramInformation",
		"compat",
		"metadata",
	];

	// Parameter key order (comments preserved)
	const paramOrder = [
		"$if",
		"$import",
		"label",
		"description",
		"valueSize",
		"unit",
		"minValue",
		"maxValue",
		"defaultValue",
		"unsigned",
		"readOnly",
		"writeOnly",
		"allowManualEntry",
		"options",
	];

	// Potentially empty arrays to remove
	const arraysToClean = ["associations", "compat", "metadata"];

	/*******************
	 * Standardize things
	 ********************/

	// Enforce top-level order
	for (const l of topOrder) {
		if (typeof config[l] === "undefined") {
			continue;
		} else if (config[l] === "") {
			delete config[l];
		}

		const temp = config[l];
		delete config[l];
		config[l] = temp;
	}

	// Remove empty arrays
	for (const array of Object.keys(arraysToClean)) {
		if (!config[array] || config[array].length === 0) {
			delete config[array];
		}
	}

	// Sanitize labels
	config.label = sanitizeText(config.label) ?? "";
	config.description = sanitizeText(config.description) ?? "";

	// Sort devices by productType, then productId
	config.devices.sort((a: any, b: any) => {
		if (a.productType < b.productType) return -1;
		if (a.productType > b.productType) return +1;
		if (a.productId < b.productId) return -1;
		if (a.productId > b.productId) return +1;
		return 0;
	});

	// Standardize parameters
	if (
		config.paramInformation &&
		Object.keys(config.paramInformation).length > 0
	) {
		// Filter out duplicates between partial and non-partial params
		const allowedKeys = Object.entries<Record<string, any>>(
			config.paramInformation,
		)
			.filter(
				([key, param], _, arr) =>
					// Allow partial params
					!/^\d+$/.test(key) ||
					// and non-partial params...
					// either with a condition
					"$if" in param ||
					// or without a corresponding partial param
					!arr.some(([otherKey]) => otherKey.startsWith(`${key}[`)),
			)
			.map(([key]) => key);

		for (const [key, original] of Object.entries<any>(
			config.paramInformation,
		)) {
			if (!allowedKeys.includes(key)) {
				delete config.paramInformation[key];
				continue;
			}

			original.unit = normalizeUnits(original.unit);

			if (original.readOnly) {
				original.allowManualEntry = undefined;
				original.writeOnly = undefined;
			} else if (original.writeOnly) {
				original.readOnly = undefined;
			} else {
				original.readOnly = undefined;
				original.writeOnly = undefined;
			}

			if (original.allowManualEntry === true) {
				original.allowManualEntry = undefined;
			}

			// Remove undefined keys while preserving comments
			for (const l of paramOrder) {
				if (original[l] == undefined || original[l] === "") {
					delete original[l];
					continue;
				}

				const temp = original[l];
				delete original[l];
				original[l] = temp;
			}

			// Delete empty options arrays
			if (original.options?.length === 0) {
				delete original.options;
			} else if (program.source.includes("ozw")) {
				const values = original.options.map((o: any) => o.value);
				original.minValue = Math.min(...values);
				original.maxValue = Math.max(...values);
			}
		}
	} else {
		delete config.paramInformation;
	}

	return config;
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
		configManager
			.getIndex()
			?.filter(
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
				parsedParam.readOnly = undefined;
				parsedParam.writeOnly = undefined;
				parsedParam.allowManualEntry = undefined;

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
			if (param.read_only === true || param.read_only === "true") {
				parsedParam.readOnly = true;
			} else if (
				param.write_only === true ||
				param.write_only === "true"
			) {
				parsedParam.writeOnly = true;
			}
			parsedParam.allowManualEntry =
				!parsedParam.readOnly && param.type !== "list";

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

/*********************************************************
 *														 *
 *          zWave Alliance Processing Section            *
 * 														 *
 * *******************************************************/

/**
 * Parse a directory of zWave Alliance device xmls
 * */
async function parseZWAFiles(): Promise<void> {
	// Parse json files in the zwaTempDir
	let jsonData = [];

	const configFiles = await enumFilesRecursive(zwaTempDir, (file) =>
		file.endsWith(".json"),
	);

	for (const file of configFiles) {
		const j = await fs.readFile(file, "utf8");

		/**
		 * zWave Alliance numbering isn't always continuous and an html page is 
		returned when a device number doesn't. Test for and delete such files.
		 */
		if (j.charAt(0) === "{") {
			jsonData.push(JSON.parse(j));
		} else {
			void fs.unlink(file);
		}
	}

	// Combine provided files within models
	jsonData = combineDeviceFiles(jsonData);

	// Sanitize text fields for all files we'll use
	jsonData = sanitizeFields(jsonData);

	// Load our existing config files to cross-reference
	await configManager.loadManufacturers();
	if (program.devices) {
		await configManager.loadDeviceIndex();
	}

	for (const file of jsonData) {
		// Lookup the manufacturer
		const manufacturerId = parseInt(file.ManufacturerId, 16);
		const manufacturerName = configManager.lookupManufacturer(
			manufacturerId,
		);

		// Add the manufacturer to our manufacturers.json if it is missing
		if (Number.isNaN(manufacturerId)) {
		} else if (manufacturerName === undefined && file.Brand !== undefined) {
			console.log(`Adding missing manufacturer: ${file.Brand}`);
			configManager.setManufacturer(manufacturerId, file.Brand);
		}

		/**
		 *  Process and write the device files, if called with program.devices
		 */

		if (program.devices && file.ProductId) {
			await parseZWAProduct(file, manufacturerId, manufacturerName);
		}
	}

	/**
	 *  Write the manufacturer.json file, if called with program.manufacturers
	 */
	if (program.manufacturers) {
		await configManager.saveManufacturers();
	}
}

/***
 * Combine zWave Alliance Device Files
 */
function combineDeviceFiles(json: Record<string, any>[]) {
	for (const file of json) {
		const identifier = file.Identifier ? file.Identifier : "Unknown";
		const normalizedIdentifier = normalizeIdentifier(identifier);
		file.Identifier = normalizedIdentifier[0];
		file.OriginalIdentifier = normalizedIdentifier[1];
	}

	for (const file of json) {
		const testManufactuer: number = file.ManufacturerId;
		const testCertification: string = file.CertificationNumber;
		const testParameters = file.ConfigurationParameters;
		const testIdentifier = file.Identifier;

		// Don't process if we've already seen this file
		if (!file.ProductId) {
			continue;
		}

		// Only deal with formatted IDs
		file.ProductId = file.ProductId.replace(/^0x/, "");
		file.ProductId = formatId(file.ProductId);
		file.ProductTypeId = file.ProductTypeId.replace(/^0x/, "");
		file.ProductTypeId = formatId(file.ProductTypeId);

		for (const test_file of json) {
			// Don't reprocess test files we've already seen
			if (!test_file.ProductId) {
				continue;
			}

			// Only deal with formatted IDs, but have to test as these will be undefined on subsequent visits
			test_file.ProductId = test_file.ProductId.replace(/^0x/, "");
			test_file.ProductId = formatId(test_file.ProductId);
			test_file.ProductTypeId = test_file.ProductTypeId.replace(
				/^0x/,
				"",
			);
			test_file.ProductTypeId = formatId(test_file.ProductTypeId);

			if (
				test_file.ManufacturerId === testManufactuer &&
				test_file.ProductId
			) {
				// Add the current file being tested
				if (
					test_file.Identifier === testIdentifier &&
					test_file.CertificationNumber === testCertification
				) {
					file.combinedDevices = createOrUpdateArray(
						file.combinedDevices,
						{
							ProductId: test_file.ProductId,
							ProductTypeId: test_file.ProductTypeId,
							Id: test_file.Id,
							Brand: test_file.Brand,
							Identifier: test_file.Identifier,
						},
					);
				}
				// Duplicate of file tested, so add the ID and remove the duplicate
				else if (
					test_file.ProductId === file.ProductId &&
					test_file.ProductTypeId === file.ProductTypeId &&
					isEquivalentParameters(
						testParameters,
						test_file?.ConfigurationParameters,
						"ParameterNumber",
					)
				) {
					// Add the device
					file.combinedDevices = createOrUpdateArray(
						file.combinedDevices,
						{
							ProductId: test_file.ProductId,
							ProductTypeId: test_file.ProductTypeId,
							Id: test_file.Id,
							Brand: test_file.Brand,
							Identifier: test_file.Identifier,
						},
					);
					delete test_file.Identifier;
					delete test_file.ProductId;

					// Merge the files themselves
					file.SupportedCommandClasses = keepLongest(
						file.SupportedCommandClasses,
						test_file.SupportedCommandClasses,
					);
					file.AssociationGroups = keepLongest(
						file.AssociationGroups,
						test_file.AssociationGroups,
					);
					file.Documents = keepLongest(
						file.Documents,
						test_file.Documents,
					);
					file.Texts = keepLongest(file.Texts, test_file.Texts);
					file.Features = keepLongest(
						file.Features,
						test_file.Features,
					);
				}
				// Combine devices with similar identifiers AND equivalent parameters
				else if (
					test_file.Identifier === testIdentifier &&
					testIdentifier !== "Unknown" &&
					testIdentifier.length > 3 &&
					isEquivalentParameters(
						testParameters,
						test_file?.ConfigurationParameters,
						"ParameterNumber",
					)
				) {
					file.combinedDevices = createOrUpdateArray(
						file.combinedDevices,
						{
							ProductId: test_file.ProductId,
							ProductTypeId: test_file.ProductTypeId,
							Id: test_file.Id,
							Brand: test_file.Brand,
							Identifier: test_file.Identifier,
						},
					);
					delete test_file.Identifier;
					delete test_file.ProductId;

					// Merge the files themselves
					// If they aren't both zwave plus, we need to strike the command classes
					if (
						bothZwavePlus(
							file.SupportedCommandClasses,
							test_file.SupportedCommandClasses,
						)
					) {
						file.SupportedCommandClasses = keepLongest(
							file.SupportedCommandClasses,
							test_file.SupportedCommandClasses,
						);
					} else {
						file.SupportedCommandClasses = [];
					}
					file.AssociationGroups = keepLongest(
						file.AssociationGroups,
						test_file.AssociationGroups,
					);
					file.Documents = keepLongest(
						file.Documents,
						test_file.Documents,
					);
					file.Texts = keepLongest(file.Texts, test_file.Texts);
					file.Features = keepLongest(
						file.Features,
						test_file.Features,
					);
				}
				// Show an error if the device parameters should match, but they don't
				// TODO add erorr handling if a FW changes parameters
				else if (
					test_file.ProductId === file.ProductId &&
					test_file.ProductTypeId === file.ProductTypeId &&
					isEquivalentParameters(
						testParameters,
						test_file?.ConfigurationParameters,
						"ParameterNumber",
					) == false
				) {
					console.log(
						`WARNING - Detected possible firmware parameter change ${file.Identifer} -- ${file.Id} and ${test_file.Id}`,
					);
				}
				// We were wrong to change the identifier because the params don't match, restore the tested file as it is different
				else if (
					test_file.Identifier === testIdentifier &&
					isEquivalentParameters(
						testParameters,
						test_file?.ConfigurationParameters,
						"ParameterNumber",
					) === false
				) {
					test_file.Identifier = test_file.OriginalIdentifier;
				}
			}
		}
	}
	function keepLongest(current_group: any, test_group: any) {
		if (current_group.length >= test_group.length) {
			return current_group;
		} else {
			return test_group;
		}
	}

	function bothZwavePlus(current_group: any, test_group: any) {
		for (const z of current_group) {
			for (const class2 of test_group) {
				if (
					(z.Identifier.includes("ZWAVEPLUS") ||
						z.Identifier.includes("ASSOCIATION_GRP_INFO")) &&
					(class2.Identifier.includes("ZWAVEPLUS") ||
						class2.Identifier.includes("ASSOCIATION_GRP_INFO"))
				) {
					return true;
				}
			}
		}
		return false;
	}
	return json;
}

/***
 * Combine zWave Alliance Device Files
 */
function sanitizeFields(json: Record<string, any>[]) {
	for (const file of json) {
		if (file.ProductId) {
			file.Identifier = file.Identifier
				? sanitizeString(file.Identifier)
				: "";
			file.Brand = file.Brand ? sanitizeString(file.Brand) : "";
		}
		if (file.AssociationGroups) {
			for (const assoc of file.AssociationGroups) {
				assoc.Description = assoc.Description
					? sanitizeString(assoc.Description)
					: "";
				assoc.group_name = assoc.group_name
					? sanitizeString(assoc.group_name)
					: "";
			}
		}
		if (file.ConfigurationParameters) {
			for (const param of file.ConfigurationParameters) {
				param.Name = param.Name ? sanitizeString(param.Name) : "";
				param.Name = param.Name ? param.Name.replace(/\.\"/g, '"') : "";
				param.Name = param.Name
					? param.Name.replace(/[\,\.\:]$/, '"')
					: "";
				param.Name = param.Name ? param.Name.replace(/\:\"/g, '"') : "";
				param.Description = param.Description
					? sanitizeString(param.Description)
					: "";
				if (param.ConfigurationParameterValues) {
					for (const value of param.ConfigurationParameterValues) {
						value.Description = value.Description
							? sanitizeString(value.Description)
							: "";
						value.Description = value.Description
							? value.Description.replace(/[\,\.\:]$/, '"')
							: "";
					}
				}
			}
		}
		if (file.Texts) {
			for (const text of file.Texts) {
				text.description = text.description
					? sanitizeString(text.description)
					: "";
				text.value = text.value ? sanitizeString(text.value) : "";
			}
		}
	}
	return json;
}

/**
 * Read and parse the product xml, add it to index if missing,
 * create/update device json config and validate the newly added
 * device
 *
 * @param product the parsed product json entry from manufacturer.xml
 */
async function parseZWAProduct(
	product: any,
	manufacturerId: number,
	manufacturer: string | undefined,
): Promise<void> {
	const productLabel = product.Identifier;

	// any products descriptions have productName in it, remove it
	const productName = product.Name.replace(productLabel, "");

	// Format the device IDs like we expect them

	let manufacturerIdHex = product.ManufacturerId.replace(/^0x/, "");
	manufacturerIdHex = formatId(manufacturerIdHex);

	/*************************************
	 *	Load the device configurations   *
	 *************************************/
	let deviceConfigs: any;
	for (const device of product.combinedDevices) {
		deviceConfigs =
			configManager
				.getIndex()
				?.filter(
					(f: DeviceConfigIndexEntry) =>
						f.manufacturerId === manufacturerIdHex &&
						f.productType === device.ProductTypeId &&
						f.productId === device.ProductId,
				) ?? [];
		if (deviceConfigs) {
			break;
		}
	}

	// Determine where the config file should be
	const latestConfig = getLatestConfigVersion(deviceConfigs);
	let fileNameRelative: string;
	if (latestConfig?.filename) {
		fileNameRelative = latestConfig?.filename;
	} else {
		fileNameRelative =
			latestConfig?.filename ??
			`${manufacturerIdHex}/${labelToFilename(productLabel)}.json`;
	}
	const fileNameAbsolute = path.join(processedDir, fileNameRelative);

	// Load the existing config so we can merge it with the updated information
	let existingDevice: Record<string, any> | undefined;

	try {
		if (await fs.pathExists(fileNameAbsolute)) {
			existingDevice = JSONC.parse(
				await fs.readFile(fileNameAbsolute, "utf8"),
			);
		}
	} catch (e) {
		console.log(`Error processing: ${fileNameAbsolute} - ${e}`);
	}

	/********************************
	 *    Build the device lists    *
	 ********************************/
	const devices = existingDevice?.devices ?? [];

	for (const dev of product.combinedDevices) {
		// Append the zwa device ID to existing devices
		for (const eDevice of devices) {
			if (
				eDevice.productType == dev.ProductTypeId &&
				eDevice.productId == dev.ProductId
			) {
				eDevice.zwaveAllianceId = dev.Id;
			}
		}

		// Add new devices
		if (
			!devices.some(
				(d: { productType: string; productId: string }) =>
					d.productType === dev.ProductTypeId &&
					d.productId === dev.ProductId,
			)
		) {
			devices.push({
				productType: dev.ProductTypeId,
				productId: dev.ProductId,
				zwaveAllianceId: dev.Id,
			});
		}
	}

	/***************************************
	 *   Setup the initial configuration   *
	 ***************************************/

	const inclusion = product?.Texts?.find(
		(document: any) => document.Type === 1,
	)?.value;
	const exclusion = product?.Texts?.find(
		(document: any) => document.Type === 2,
	)?.value;
	const reset = product?.Texts?.find((document: any) => document.Type === 5)
		?.value;
	let manual = product?.Documents?.find(
		(document: any) => document.Type === 1,
	)?.value;
	const website_root =
		"https://products.z-wavealliance.org/ProductManual/File?folder=&filename=";
	if (manual) {
		manual = manual.replace(/ /g, "%20");
		manual = website_root.concat(manual);
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
	if (inclusion || exclusion || reset || manual) {
		newConfig.metadata = {
			inclusion: inclusion,
			exclusion: exclusion,
			reset: reset,
			manual: manual,
		};
	}

	/***************************
	 *     Clean up values     *
	 ***************************/

	newConfig.description = sanitizeString(newConfig.description);

	/**********************
	 *     Parameters     *
	 **********************/
	const parameters = product.ConfigurationParameters;

	for (const param of parameters) {
		const parsedParam =
			newConfig.paramInformation[param.ParameterNumber] ?? {};

		if (parsedParam.$import) {
			continue;
		}

		// By default, update existing properties with new descriptions
		parsedParam.label = param.Name || parsedParam.label;
		parsedParam.label = normalizeLabel(parsedParam.label);
		parsedParam.description =
			param.ConfigurationParameterValues.length > 1 // Sometimes values options are described and not presented as options
				? param.Description
				: param.ConfigurationParameterValues[0].Description;
		parsedParam.description = normalizeDescription(parsedParam.description);
		parsedParam.valueSize = updateNumberOrDefault(
			param.Size,
			parsedParam.valueSize,
			1,
		);
		parsedParam.minValue = param.minValue;
		parsedParam.maxValue = param.maxValue;
		if (param.flagReadOnly === true) {
			parsedParam.readOnly = true;
		} else if (param.Description.toLowerCase().includes("write")) {
			// zWave Alliance typically puts (write only) in the description
			parsedParam.writeOnly = true;
		}
		parsedParam.allowManualEntry =
			!parsedParam.readOnly &&
			param.ConfigurationParameterValues.length <= 1;
		parsedParam.defaultValue = updateNumberOrDefault(
			param.DefaultValue,
			parsedParam.value,
			parsedParam.minValue, // choose the smallest possible number if no default is given
		);

		// Setup the unit
		if (/hours?/i.test(parsedParam.description)) {
			parsedParam.unit = "hours";
		} else if (/minutes?/i.test(parsedParam.description)) {
			parsedParam.unit = "minutes";
		} else if (/seconds?/i.test(parsedParam.description)) {
			parsedParam.unit = "seconds";
		} else if (/percent(age)?/i.test(parsedParam.description)) {
			parsedParam.unit = "%";
		} else if (/centigrade|celsius/i.test(parsedParam.description)) {
			parsedParam.unit = "°C";
		} else if (/fahrenheit/i.test(parsedParam.description)) {
			parsedParam.unit = "°F";
		}

		// Sanity check some values
		parsedParam.minValue =
			parsedParam.minValue <= parsedParam.defaultValue
				? parsedParam.minValue
				: parsedParam.defaultValue;
		parsedParam.maxValue =
			parsedParam.maxValue >= parsedParam.defaultValue
				? parsedParam.maxValue
				: parsedParam.defaultValue;

		// Setup unsigned
		if (parsedParam.minValue >= 0) {
			parsedParam.unsigned = true;
		} else {
			delete parsedParam.unsigned;
		}

		if (typeof parsedParam.description !== "string") {
			parsedParam.description = "";
		}

		// Parse options list if manual entry is disallowed (i.e. options picker)
		if (
			parsedParam.allowManualEntry !== true ||
			(parsedParam.minValue === 0 && parsedParam.maxValue === 0)
		) {
			parsedParam.options = [];
			for (const item of param.ConfigurationParameterValues) {
				// Values are given as options
				if (item.From === item.To) {
					const opt = {
						label: normalizeDescription(item.Description),
						value: item.To,
					};
					parsedParam.options.push(opt);
					parsedParam.minValue = Math.min(
						parsedParam.minValue,
						item.From,
					);
					parsedParam.maxValue = Math.max(
						parsedParam.maxValue,
						item.To,
					);
				} else {
					parsedParam.allowManualEntry = true;
					parsedParam.minValue = Math.min(
						parsedParam.minValue,
						item.From,
					);
					parsedParam.maxValue = Math.max(
						parsedParam.maxValue,
						item.To,
					);
				}
			}
		}
		newConfig.paramInformation[param.ParameterNumber] = parsedParam;
	}

	/********************************
	 *        Associations		    *
	 ********************************/

	// If Z-Wave+ is supported, we don't usually need the association information to determine the lifeline, but we still set it up in case we do

	let zwavePlus = false;
	zwavePlus = product?.SupportedCommandClasses?.find((document: any) =>
		document.Identifier.includes("ZWAVEPLUS"),
	)
		? true
		: zwavePlus;
	zwavePlus = product?.SupportedCommandClasses?.find((document: any) =>
		document.Identifier.includes("ASSOCIATION_GRP_INFO"),
	)
		? true
		: zwavePlus;
	zwavePlus = product?.AssociationGroups?.find((document: any) =>
		document.Description.includes("Z-Wave Plus"),
	)
		? true
		: zwavePlus;
	zwavePlus = existingDevice?.supportsZWavePlus ? true : zwavePlus;

	const newAssociations: Record<string, any> = newConfig.associations || {};
	let addCompat = false;
	for (const ass of product.AssociationGroups) {
		let label: string =
			ass.group_name.length > 0
				? ass.group_name
				: `Group ${ass.GroupNumber}`;
		const maxNodes = ass.MaximumNodes;
		const groupName = ass.group_name.toLowerCase();
		const description = ass.Description.toLowerCase();
		let lifeline = false;
		if (
			groupName.includes("lifeline") ||
			description.includes("lifeline")
		) {
			lifeline = true;

			// Lifeline reporting on other than #1, so we need associations even if zWave Plus
			if (ass.GroupNumber !== 1) {
				zwavePlus = false;
			}
		}

		// Add double tap support if supported by the device
		if (groupName.includes("double") || description.includes("double")) {
			label = "Double Tap";
			lifeline = true; // Required to receive Basic Set notifications
			zwavePlus = false; // Required
			addCompat = true;

			newConfig.compat ??= {};
			newConfig.compat.treatBasicSetAsEvent = true;
		}

		newAssociations[ass.GroupNumber] = {
			label: label,
			maxNodes: maxNodes,
		};
		if (lifeline) {
			newAssociations[ass.GroupNumber].isLifeline = true;
		}
	}

	// Overwrite the existing associations if we need to add the compat flag
	if (Object.keys(newConfig.associations).length !== 0 && addCompat) {
		newConfig.associations = newAssociations;
	}
	// Add the associations if the originals are blank AND the device is not zWavePlus.
	else if (
		Object.keys(newConfig.associations).length === 0 &&
		zwavePlus === false
	) {
		newConfig.associations = newAssociations;
	}

	/*************************************
	 *   Write the configuration file    *
	 *************************************/

	// Create the dir if necessary
	const manufacturerDir = path.join(processedDir, manufacturerIdHex);
	await fs.ensureDir(manufacturerDir);

	// Write the file
	const output = JSONC.stringify(normalizeConfig(newConfig), null, "\t");
	await fs.writeFile(fileNameAbsolute, output, "utf8");
}

async function maintenanceParse(): Promise<void> {
	// Parse json files in the zwaTempDir
	const zwaData = [];

	// Load the zwa files
	await fs.ensureDir(zwaTempDir);
	const zwaFiles = await enumFilesRecursive(zwaTempDir, (file) =>
		file.endsWith(".json"),
	);
	for (const file of zwaFiles) {
		// zWave Alliance numbering isn't always continuous and an html page is
		// returned when a device number doesn't. Test for and delete such files.
		try {
			zwaData.push(await fs.readJSON(file, { encoding: "utf8" }));
		} catch {
			await fs.unlink(file);
		}
	}

	// Build the list of device files
	const configFiles = await enumFilesRecursive(processedDir, (file) =>
		file.endsWith(".json"),
	);
	for (const file of configFiles) {
		const j = await fs.readFile(file, "utf8");

		let jsonData;
		try {
			jsonData = JSONC.parse(j);
		} catch (e) {
			console.log(`Error processing: ${file} - ${e}`);
		}

		const includedZwaFiles: number[] = [];

		try {
			for (const device of jsonData.devices) {
				if (isArray(device.zwaveAllianceId)) {
					includedZwaFiles.push(...device.zwaveAllianceId);
				} else if (device.zwaveAllianceId) {
					includedZwaFiles.push(device.zwaveAllianceId);
				}
			}
		} catch (e) {
			console.log(`Error iterating: ${file} - ${e}`);
		}

		includedZwaFiles.sort(function (a, b) {
			return a - b;
		});

		for (const referenceDevice of includedZwaFiles) {
			for (const zwafile of zwaData) {
				if (zwafile.Id === referenceDevice) {
					let manual = zwafile?.Documents?.find(
						(document: any) => document.Type === 1,
					)?.value;

					const website_root =
						"https://products.z-wavealliance.org/ProductManual/File?folder=&filename=";

					if (manual) {
						manual = manual.replace(/ /g, "%20");
						manual = website_root.concat(manual);

						if (jsonData.metadata) {
							jsonData.metadata.manual = manual;
							break;
						} else {
							jsonData.metadata = {};
							jsonData.metadata.manual = manual;
							break;
						}
					}
				}
			}
		}

		if (jsonData.metadata) {
			/*************************************
			 *   Write the configuration file    *
			 *************************************/
			const output = JSONC.stringify(
				normalizeConfig(jsonData),
				null,
				"\t",
			);
			await fs.writeFile(file, output, "utf8");
		}
	}
}

/**
 * Retrieve ZWA device IDs, either the highest (most recent) device ID or all device IDs for the specified manufacturer
 * Note: ZWA's search uses different manufacturer IDs than devices
 */

async function retrieveZWADeviceIds(
	highestDeviceOnly: boolean = true,
	manufacturer: number[] = [-1],
): Promise<number[]> {
	const deviceIdsSet = new Set<number>();

	for (const manu of manufacturer) {
		let page = 1;
		// Page 1
		let currentUrl = `https://products.z-wavealliance.org/search/DoAdvancedSearch?productName=&productIdentifier=&productDescription=&category=-1&brand=${manu}&regionId=-1&order=&page=${page}`;
		const firstPage = (await axios({ url: currentUrl })).data;
		for (const i of firstPage.match(/(?<=productId=).*?(?=[\&\"])/g)) {
			deviceIdsSet.add(i);
		}
		const pageNumbers = firstPage.match(/(?<=page=\d+">).*?(?=\<)/g)
			? firstPage.match(/(?<=page=\d+">).*?(?=\<)/g)
			: [1];
		const lastPage = Math.max(...pageNumbers);

		process.stdout.write(`Processing Page 1 of ${lastPage}...`);
		// Delete the last line
		process.stdout.write("\r\x1b[K");

		if (!highestDeviceOnly) {
			page++;
			while (page <= lastPage) {
				process.stdout.write(
					`Processing Page ${page} of ${lastPage}...`,
				);
				currentUrl = `https://products.z-wavealliance.org/search/DoAdvancedSearch?productName=&productIdentifier=&productDescription=&category=-1&brand=${manu}&regionId=-1&order=&page=${page}`;
				const nextPage = (await axios({ url: currentUrl })).data;
				const nextPageIds = nextPage.match(
					/(?<=productId=).*?(?=[\&\"])/g,
				);

				for (const i of nextPageIds) {
					deviceIdsSet.add(i);
				}
				page++;
				// Delete the last line
				process.stdout.write("\r\x1b[K");
			}
		}
	}

	if (highestDeviceOnly) {
		const deviceIds: number[] = [...deviceIdsSet];
		deviceIds.sort(function (a, b) {
			return b - a;
		});
		console.log(`Highest Device Found: ${deviceIds[0]}`);
		return [deviceIds[0]];
	} else {
		const deviceIds: number[] = [...deviceIdsSet];
		console.log(`Identified ${deviceIds.length} device files`);
		return deviceIds;
	}
}

/**
 * Downloads the given device configurations from ZWA
 * @param IDs If given, only these IDs are downloaded
 */
async function downloadDevicesZWA(IDs: number[]): Promise<void> {
	await fs.ensureDir(zwaTempDir);
	for (let i = 0; i < IDs.length; i++) {
		process.stdout.write(
			`Fetching device config ${i + 1} of ${IDs.length}...`,
		);
		const content = await fetchDeviceZWA(IDs[i]);
		await fs.writeFile(
			path.join(zwaTempDir, `${IDs[i]}.json`),
			content,
			"utf8",
		);
		// Delete the last line
		process.stdout.write("\r\x1b[K");
	}
	console.log("done!");
}

/**
 * Downloads all device information from the OpenSmartHouse DB
 * @param IDs If given, only these IDs are downloaded
 */
async function downloadDevicesOH(IDs?: number[]): Promise<void> {
	if (!isArray(IDs) || !IDs.length) {
		process.stdout.write("Fetching database IDs...");
		IDs = await fetchIDsOH();
		// Delete the last line
		process.stdout.write("\r\x1b[K");
	}

	await fs.ensureDir(ohTempDir);
	for (let i = 0; i < IDs.length; i++) {
		process.stdout.write(
			`Fetching device config ${i + 1} of ${IDs.length}...`,
		);
		const content = await fetchDeviceOH(IDs[i]);
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

/** Downloads all manufacturer information from the OpenSmartHouse DB */
async function downloadManufacturersOH(): Promise<void> {
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
				readOnly: param.read_only === "1" ? true : undefined,
				writeOnly: param.write_only === "1" ? true : undefined,
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
async function importConfigFilesOH(): Promise<void> {
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

		const output = stringify(parsed, "\t");
		await fs.writeFile(outFilename, output, "utf8");
	}
}

/****************************************************************************
 *                   Normalize Identifier function                          *
 * Strips out common model number variations representing different         *
 * jurisdicitons, which typically share firmware and parameter settings     *
 * 																			*
 * Note: Returns an array of the new identifier, and the original           *
 ****************************************************************************/
function normalizeIdentifier(originalIdentifier: string) {
	// Cleanup current Identifier and store in case of later duplicate files
	let newIdentifier = originalIdentifier;

	const country_codes = [
		"(US)",
		"us",
		"US",
		"(EU)",
		"eu",
		"EU",
		"(RU)",
		"ru",
		"RU",
		"(AU)",
		"au",
		"AU",
		"(CM)",
		"cm",
		"CM",
	];

	for (const code of country_codes) {
		const regex = new RegExp(code, "g");
		newIdentifier = newIdentifier.replace(regex, "");
	}

	const suffixToRemove = [
		"-1",
		"-2",
		"-3",
		"-4",
		"a",
		"A",
		"b",
		"B",
		"c",
		"C",
		"d",
		"D",
		"e",
		"i",
		"I",
		"j",
		"J",
	];
	for (const suffix of suffixToRemove) {
		if (newIdentifier.slice(-suffix.length) == suffix) {
			newIdentifier = newIdentifier.slice(0, -suffix.length);
			break;
		}
	}

	const prohibitedEndChars = ["-", ".", "_", ",", " "];
	for (const endChar of prohibitedEndChars) {
		if (newIdentifier.slice(-1) === endChar) {
			newIdentifier = newIdentifier.slice(0, -1);
			break;
		}
	}
	newIdentifier = newIdentifier.trim();
	newIdentifier = newIdentifier.toLocaleUpperCase();
	return [newIdentifier, originalIdentifier];
}
/****************************************************************************
 *                   Normalize label function                               *
 * Capitilze each word in a label        							        *
 * 																			*
 ****************************************************************************/
function normalizeLabel(originalString: string) {
	originalString = sanitizeString(originalString);
	originalString = originalString.replace(/\n/g, " ");
	originalString = originalString.replace(/\\"/g, "");
	let splitStr = originalString.toLowerCase().split(" ");
	for (let i = 0; i < splitStr.length; i++) {
		splitStr[i] =
			splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
	}
	originalString = splitStr.join(" ");

	splitStr = originalString.split("/");
	for (let i = 0; i < splitStr.length; i++) {
		splitStr[i] =
			splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
	}
	originalString = splitStr.join("/");

	originalString = originalString.replace(/ Led /g, " LED ");
	originalString = originalString.replace(/ Rgb /g, " RGB ");
	originalString = originalString.replace(/ Pir /g, " PIR ");
	originalString = originalString.replace(/Z-wave/g, "Z-Wave");
	originalString = originalString.replace(/basic set/g, "Basic Set");
	originalString = originalString.replace(
		/multi-level switch/g,
		"Multi-Level Switch",
	);
	originalString = originalString.replace(/Multi-level/g, "Multi-Level");
	originalString = originalString.replace(/ Of /g, " of ");
	originalString = originalString.replace(/ To /g, " to ");
	originalString = originalString.replace(/ A /g, " a ");
	originalString = originalString.replace(/ An /g, " an ");
	originalString = originalString.replace(/ Is /g, " is ");
	originalString = originalString.replace(/ In /g, " in ");

	const prohibitedEndChars = ["-", ".", "_", ",", " "];
	// Clean-up the end of labels
	for (const endChar of prohibitedEndChars) {
		if (originalString.slice(-1) === endChar) {
			originalString = originalString.slice(0, -1);
			break;
		}
	}

	// Clean-up the beginning of labels
	for (const endChar of prohibitedEndChars) {
		if (originalString.slice(0) === endChar) {
			originalString = originalString.slice(1, 0);
			break;
		}
	}

	originalString = originalString.trim();

	return originalString;
}

/****************************************************************************
 *                   Normalize description                                  *
 * Capitilze each word in a description          					        *
 * 																			*
 ****************************************************************************/
function normalizeDescription(originalString: string) {
	originalString = sanitizeString(originalString)
		.toLocaleLowerCase()
		.replace(/\n/g, " ")
		.replace(/\\"/g, "")
		.replace(/ led /g, " LED ")
		.replace(/ rgb /g, " RGB ")
		.replace(/ pir /g, " PIR ")
		.replace(/basic set/g, "Basic Set")
		.replace(/multi-level/g, "Multi-Level")
		.replace(/z-?wave/g, "Z-Wave");
	originalString =
		originalString.charAt(0).toUpperCase() + originalString.slice(1);
	originalString = originalString.replace(
		/multi-level switch/g,
		"Multi-Level Switch",
	);
	originalString = originalString.replace(/multi-level/g, "Multi-Level");

	// Clean-up the end of labels
	originalString = originalString.replace(/[._, -]+$/, "");

	// Clean-up the beginning of labels
	originalString = originalString.replace(/^[._, -]+/, "");
	return originalString;
}
/****************************************************************************
 *                   Sanitize String function                             *
 * Strips out common mistakes in strings							        *
 * 																			*
 ****************************************************************************/
function sanitizeString(originalString: string) {
	return originalString
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.replace(/\n\n\n\n/g, "\n\n")
		.replace(/\t/g, " ")
		.replace(/\"\"/g, '"')
		.replace(/ {2,}/g, " ")
		.replace(/\,s*$/g, "")
		.replace(/\„s*$/g, "")
		.replace(/\.s*$/g, "")
		.replace(/\:s*$/g, "")
		.trim();
}
/****************************************************************************
 *                   Parameter Comparison function                          *
 * Compare two sets of parameters and return true if the numbers match      *
 * 																			*
 * Note: Accepts as a string the name of the parameter key in the object    *
 ****************************************************************************/

function isEquivalentParameters(
	tested_device: any = [],
	compared_device: any = [],
	parameterKey: string,
) {
	const testParameters = new Set();
	//tested_device = tested_device ?? [];
	//compared_device = compared_device ?? [];
	for (const tp of tested_device) {
		const temp = tp[parameterKey];
		testParameters.add(temp);
	}

	const compareParameters = new Set();
	for (const cp of compared_device) {
		const temp = cp[parameterKey];
		compareParameters.add(temp);
	}

	const setDifference = new Set(
		[...compareParameters].filter((x) => !testParameters.has(x)),
	);
	return setDifference.size === 0;
}

/****************************************************************************
 *                 Create array, or update array if it exists,              *
 * 				   append ZWA Ids										    *
 ****************************************************************************/

function createOrUpdateArray(potentialArray: any, update: any) {
	potentialArray = potentialArray ?? [];
	const newArray = potentialArray;
	for (const arr of newArray) {
		if (
			(arr.ProductId === update.ProductId &&
				arr.ProductTypeId === update.ProductTypeId) ||
			(arr.ProductId === formatId(update.ProductId) &&
				arr.ProductTypeId === formatId(update.ProductTypeId))
		) {
			if (Array.isArray(arr.Id)) {
				arr.Id.push(update.Id);
			} else {
				const temp = arr.Id;
				arr.Id = [];
				arr.Id.push(temp);
				arr.Id.push(update.Id);
			}
			return newArray;
		}
	}
	newArray.push(update);
	return newArray;
}

/**
 * Get latest device configuration file version
 * @param configs list of device config index entries
 */
function getLatestConfigVersion(
	configs: DeviceConfigIndexEntry[],
): DeviceConfigIndexEntry | undefined {
	configs.sort((a, b) => {
		const vA = padVersion(a.firmwareVersion.max);
		const vB = padVersion(b.firmwareVersion.max);

		return compare(vA, vB);
	});

	return configs[configs.length - 1];
}

/** Changes the manufacturer names in all device config files to match manufacturers.json */
async function updateManufacturerNames(): Promise<void> {
	const configFiles = await enumFilesRecursive(
		processedDir,
		(file) => file.endsWith(".json") && !file.endsWith("index.json"),
	);
	await configManager.loadManufacturers();

	for (const file of configFiles) {
		let fileContents = await fs.readFile(file, "utf8");
		const id = parseInt(
			/"manufacturerId"\: "0x([0-9a-fA-F]+)"/.exec(fileContents)![1],
			16,
		);
		const name = configManager.lookupManufacturer(id);
		const oldName = /"manufacturer"\: "([^\"]+)"/.exec(fileContents)![1];
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

		if (program.source.includes("zwa")) {
			if (program.manufacturer_folder) {
				const deviceIds = await retrieveZWADeviceIds(
					false,
					program.manufacturer_folder
						?.map((manu) => parseInt(manu as any))
						.filter((num) => !Number.isNaN(num)),
				);
				await downloadDevicesZWA(deviceIds);
			} else if (program.download && program.ids) {
				await downloadDevicesZWA(
					program.ids
						?.map((id) => parseInt(id as any))
						.filter((num) => !Number.isNaN(num)),
				);
			}

			if (program.manufacturers || program.devices) await parseZWAFiles();
		}

		if (program.source.includes("oh")) {
			if (program.download) {
				await downloadManufacturersOH();
				await downloadDevicesOH(
					program.ids
						?.map((id) => parseInt(id as any))
						.filter((num) => !Number.isNaN(num)),
				);
			}

			if (program.manufacturers) {
				await updateManufacturerNames();
			}

			if (program.devices) {
				await importConfigFilesOH();
			}
		}

		if (program.parse) {
			await maintenanceParse();
		}
	}
})();
