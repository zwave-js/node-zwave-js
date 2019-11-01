/* eslint-disable @typescript-eslint/no-unused-vars */
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { green, red } from "ansi-colors";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import { Notification } from "../src/lib/config/Notifications";
import { loadNamedScales } from "../src/lib/config/Scales";
import { SensorType } from "../src/lib/config/SensorTypes";
import { configDir } from "../src/lib/config/utils";

const hexKeyRegex = /^0x[a-fA-F0-9]+$/;

// TODO: Can we deduplicate this code?
async function lintNotifications(): Promise<void> {
	const configPath = path.join(configDir, "notifications.json");
	if (!(await pathExists(configPath))) {
		throw new Error("The notification config file does not exist!");
	}

	const fileContents = await readFile(configPath, "utf8");
	let definition: any;
	try {
		definition = JSON5.parse(fileContents);
	} catch (e) {
		throw new Error(`The notification config file is invalid: ${e}`);
	}

	if (!isObject(definition)) {
		throw new Error("The notification config file must contain an object");
	}

	for (const [id, ntfcnDefinition] of entries(definition)) {
		if (!hexKeyRegex.test(id)) {
			throw new Error(
				`The notification config file is invalid: found non-hex object key ${id}`,
			);
		}
		const idNum = parseInt(id.slice(2), 16);
		// TODO: Validate that all contents are semantically correct
		const _testParse = new Notification(idNum, ntfcnDefinition);
	}
}

async function lintManufacturers(): Promise<void> {
	const configPath = path.join(configDir, "manufacturers.json");
	if (!(await pathExists(configPath))) {
		throw new Error("The manufacturer config file does not exist!");
	}

	const fileContents = await readFile(configPath, "utf8");
	let definition: any;
	try {
		definition = JSON5.parse(fileContents);
	} catch (e) {
		throw new Error(`The manufacturer config file is invalid: ${e}`);
	}
	if (!isObject(definition)) {
		throw new Error("The manufacturer config file must contain an object");
	}

	for (const [id] of entries(definition)) {
		if (!hexKeyRegex.test(id)) {
			throw new Error(
				`The manufacturer config file is invalid: found non-hex object key ${id}`,
			);
		}
		// TODO: Validate that the file is semantically correct
	}
}

async function lintNamedScales(): Promise<void> {
	const configPath = path.join(configDir, "scales.json");
	if (!(await pathExists(configPath))) {
		throw new Error("The named scales config file does not exist!");
	}

	const fileContents = await readFile(configPath, "utf8");
	let definition: any;
	try {
		definition = JSON5.parse(fileContents);
	} catch (e) {
		throw new Error(`The named scales config file is invalid: ${e}`);
	}

	if (!isObject(definition)) {
		throw new Error("The named scales config file must contain an object");
	}

	if (!("temperature" in definition)) {
		throw new Error(`Named scale "temperature" is missing!`);
	}

	for (const [name, group] of entries(definition)) {
		if (!/[\w\d]+/.test(name)) {
			throw new Error(
				`The named scales config file is invalid: Name ${name} contains other characters than letters and numbers`,
			);
		}
		// TODO: Validate that all contents are semantically correct
		for (const [id, snsrDefinition] of entries(group)) {
			if (!hexKeyRegex.test(id)) {
				throw new Error(
					`The notification config file is invalid: found non-hex object key ${id}`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			const _testParse = new SensorType(idNum, snsrDefinition);
		}
	}
}

async function lintSensorTypes(): Promise<void> {
	const configPath = path.join(configDir, "sensorTypes.json");
	if (!(await pathExists(configPath))) {
		throw new Error("The sensor types config file does not exist!");
	}

	const fileContents = await readFile(configPath, "utf8");
	let definition: any;
	try {
		definition = JSON5.parse(fileContents);
	} catch (e) {
		throw new Error(`The sensor types config file is invalid: ${e}`);
	}

	if (!isObject(definition)) {
		throw new Error("The sensor types config file must contain an object");
	}

	// The named scales must be loaded here so the parsing can work
	await loadNamedScales();

	for (const [id, snsrDefinition] of entries(definition)) {
		if (!hexKeyRegex.test(id)) {
			throw new Error(
				`The sensor types config file is invalid: found non-hex object key ${id}`,
			);
		}
		const idNum = parseInt(id.slice(2), 16);
		// TODO: Validate that all contents are semantically correct
		const _testParse = new SensorType(idNum, snsrDefinition);
	}
}

Promise.resolve()
	.then(lintManufacturers)
	// TODO: lint device files
	.then(lintNotifications)
	.then(lintNamedScales)
	.then(lintSensorTypes)
	.then(() => {
		console.error(green("The config files are valid!"));
		return process.exit(0);
	})
	.catch(e => {
		console.error(red(e.message));
		console.error();
		return process.exit(1);
	});
