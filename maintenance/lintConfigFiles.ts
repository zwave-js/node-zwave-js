/* eslint-disable @typescript-eslint/no-unused-vars */
import { green, red } from "ansi-colors";
import { readFile } from "fs-extra";
import * as path from "path";
import {
	DeviceConfig,
	loadDeviceIndexInternal,
} from "../src/lib/config/Devices";
import { loadManufacturersInternal } from "../src/lib/config/Manufacturers";
import { loadNotificationsInternal } from "../src/lib/config/Notifications";
import {
	loadNamedScales,
	loadNamedScalesInternal,
} from "../src/lib/config/Scales";
import { loadSensorTypesInternal } from "../src/lib/config/SensorTypes";
import { configDir } from "../src/lib/config/utils";

async function lintNotifications(): Promise<void> {
	await loadNotificationsInternal();
	// TODO: Validate that all contents are semantically correct
}

async function lintManufacturers(): Promise<void> {
	await loadManufacturersInternal();
	// TODO: Validate that the file is semantically correct
}

async function lintDevices(): Promise<void> {
	const index = await loadDeviceIndexInternal();
	// Device config files are lazy-loaded, so we need to parse them all
	const uniqueFiles = index
		.map(e => e.filename)
		.filter((filename, index, self) => self.indexOf(filename) === index);
	for (const file of uniqueFiles) {
		const filePath = path.join(configDir, "devices", file);
		const fileContents = await readFile(filePath, "utf8");
		// Try parsing the file
		const config = new DeviceConfig(file, fileContents);

		// Validate that the file is semantically correct

		// TODO: Think about this - multiple lifeline associations?
		// // There must only be one association which acts as the lifeline
		// if (config.associations?.size) {
		// 	const numLifelines = [...config.associations.values()].filter(
		// 		assoc => assoc.isLifeline,
		// 	).length;
		// 	if (numLifelines > 1) {
		// 		throw new Error(
		// 			`${file}: there must be only one lifeline association!`,
		// 		);
		// 	}
		// }
	}
}

async function lintNamedScales(): Promise<void> {
	const definitions = await loadNamedScalesInternal();

	if (!definitions.has("temperature")) {
		throw new Error(`Named scale "temperature" is missing!`);
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
	.then(lintDevices)
	.then(lintNotifications)
	.then(lintNamedScales)
	.then(lintSensorTypes)
	.then(() => {
		console.error(green("The config files are valid!"));
		return process.exit(0);
	})
	.catch(e => {
		if (typeof e.stack === "string") {
			const lines = (e.stack as string).split("\n");
			if (lines[0].trim().toLowerCase() === "error:") {
				lines.shift();
			}
			const message = lines.join("\n");
			console.error(red(message));
		} else {
			console.error(red(e.message));
		}
		console.error();
		return process.exit(1);
	});
