/* eslint-disable @typescript-eslint/no-unused-vars */
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { green, red } from "ansi-colors";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import { loadManufacturersInternal } from "../src/lib/config/Manufacturers";
import { loadNotificationsInternal } from "../src/lib/config/Notifications";
import { loadNamedScales, Scale } from "../src/lib/config/Scales";
import { loadSensorTypesInternal } from "../src/lib/config/SensorTypes";
import { configDir } from "../src/lib/config/utils";

const hexKeyRegex = /^0x[a-fA-F0-9]+$/;

async function lintNotifications(): Promise<void> {
	await loadNotificationsInternal();
	// TODO: Validate that all contents are semantically correct
}

async function lintManufacturers(): Promise<void> {
	await loadManufacturersInternal();
	// TODO: Validate that the file is semantically correct
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
			const _testParse = new Scale(idNum, snsrDefinition);
		}
	}
}

async function lintSensorTypes(): Promise<void> {
	// The named scales must be loaded here so the parsing can work
	await loadNamedScales();

	await loadSensorTypesInternal();
	// TODO: Validate that all contents are semantically correct
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
		if (typeof e.stack === "string") {
			const message = (e.stack as string)
				.split("\n")
				.slice(1)
				.join("\n");
			console.error(red(message));
		} else {
			console.error(red(e.message));
		}
		console.error();
		return process.exit(1);
	});
