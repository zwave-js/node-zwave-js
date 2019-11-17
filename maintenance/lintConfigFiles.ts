/* eslint-disable @typescript-eslint/no-unused-vars */
import { green, red, underline, yellow } from "ansi-colors";
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
	const index = (await loadDeviceIndexInternal())!;
	// Device config files are lazy-loaded, so we need to parse them all
	const uniqueFiles = index
		.map(e => e.filename)
		.filter((filename, index, self) => self.indexOf(filename) === index)
		.sort();

	const errors: { filename: string; error: any }[] = [];

	for (const file of uniqueFiles) {
		const filePath = path.join(configDir, "devices", file);
		const fileContents = await readFile(filePath, "utf8");
		// Try parsing the file
		let config: DeviceConfig;
		try {
			config = new DeviceConfig(file, fileContents);
		} catch (e) {
			errors.push({ filename: file, error: e });
			continue;
		}

		// Validate that the file is semantically correct

		// Validate associations
		if (config.associations?.size) {
			// Real lifeline associations (as per the Z-Wave+ specs) only have a single node
			// If there is a 2nd lifeline with more nodes, that is most likely wrong
			const lifelines = [...config.associations.values()].filter(
				assoc => assoc.isLifeline,
			);
			if (
				lifelines.length > 1 &&
				lifelines.find(l => l.maxNodes === 1) &&
				lifelines.find(l => l.maxNodes > 1)
			) {
				console.warn(underline(`config/devices/${file}:`));
				console.warn(
					yellow(
						`[WARN] A lifeline with 1 node plus another one with more nodes found!`,
					),
				);
				console.warn(yellow(`This is likely an error!`));
				console.warn();
			}
		}

		if (config.paramInformation?.size) {
			for (const [key, value] of config.paramInformation.entries()) {
				if (!value.allowManualEntry && !value.options?.length) {
					errors.push({
						filename: file,
						error: new Error(
							`Parameter #${key} must allow manual entry if there are no options defined!`,
						),
					});
				}
			}
		}
	}

	if (errors.length) {
		for (const { filename, error } of errors) {
			const lines = (error.message as string)
				.split("\n")
				.filter(line => !line.endsWith(filename + ":"));
			console.error(`config/devices/${filename}:`);
			console.error(red(lines.join("\n")));
			console.error();
		}
		process.exit(1);
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
		console.log();
		console.log(green("The config files are valid!"));
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
