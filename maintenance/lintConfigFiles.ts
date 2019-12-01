/* eslint-disable @typescript-eslint/no-unused-vars */
import { green, red, white, yellow } from "ansi-colors";
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
import { getMinimumShiftForBitMask } from "../src/lib/util/misc";
import { num2hex } from "../src/lib/util/strings";
import { getIntegerLimits } from "../src/lib/values/Primitive";

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

	const errors = new Map<string, string[]>();
	function addError(filename: string, error: string): void {
		if (!errors.has(filename)) errors.set(filename, []);
		errors.get(filename)!.push(error);
	}

	const warnings = new Map<string, string[]>();
	function addWarning(filename: string, warning: string): void {
		if (!warnings.has(filename)) warnings.set(filename, []);
		warnings.get(filename)!.push(warning);
	}

	for (const file of uniqueFiles) {
		const filePath = path.join(configDir, "devices", file);
		const fileContents = await readFile(filePath, "utf8");
		// Try parsing the file
		let config: DeviceConfig;
		try {
			config = new DeviceConfig(file, fileContents);
		} catch (e) {
			addError(file, e.message);
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
				addWarning(
					file,
					`A lifeline with 1 node plus another one with more nodes found!
This is likely an error!`,
				);
			}
			if (
				lifelines.some(
					l =>
						l.label === "Lifeline" &&
						l.groupId === 1 &&
						l.maxNodes > 1,
				)
			) {
				addWarning(
					file,
					`Found an association that looks like a Z-Wave+ lifeline but has more than 1 max nodes!`,
				);
			}
		}

		if (config.paramInformation?.size) {
			// Check if there are options when manual entry is forbidden
			for (const [
				{ parameter, valueBitMask },
				value,
			] of config.paramInformation.entries()) {
				if (!value.allowManualEntry && !value.options?.length) {
					addError(
						file,
						`Parameter #${parameter} must allow manual entry if there are no options defined!`,
					);
				}

				if (value.readOnly && value.writeOnly) {
					addError(
						file,
						`Parameter #${parameter} is invalid: readOnly and writeOnly are mutually exclusive!`,
					);
				}
			}

			// Check if there are options where min/max values is not compatible with the valueSize
			for (const [
				{ parameter, valueBitMask },
				value,
			] of config.paramInformation.entries()) {
				if (value.valueSize < 1 || value.valueSize > 4) {
					addError(
						file,
						`Parameter #${parameter} is invalid: valueSize must be in the range 1...4!`,
					);
				} else {
					if (value.minValue > value.maxValue) {
						addError(
							file,
							`Parameter #${parameter} is invalid: minValue must not be greater than maxValue!`,
						);
					}

					// All values are signed by the specs
					const limits = getIntegerLimits(
						value.valueSize as any,
						true,
					);
					const unsignedLimits = getIntegerLimits(
						value.valueSize as any,
						false,
					);
					if (!limits) {
						addError(
							file,
							`Parameter #${parameter} is invalid: cannot determine limits for valueSize ${value.valueSize}!`,
						);
					} else {
						const fitsSignedLimits =
							value.minValue >= limits.min &&
							value.minValue <= limits.max &&
							value.maxValue >= limits.min &&
							value.maxValue <= limits.max;
						const fitsUnsignedLimits =
							value.minValue >= unsignedLimits.min &&
							value.minValue <= unsignedLimits.max &&
							value.maxValue >= unsignedLimits.min &&
							value.maxValue <= unsignedLimits.max;

						if (!fitsSignedLimits && fitsUnsignedLimits) {
							addError(
								file,
								`Parameter #${parameter} is invalid: min/maxValue is incompatible with valueSize ${
									value.valueSize
								} (min = ${limits.min}, max = ${limits.max}).
Consider converting this parameter to unsigned using ${white(
									`"unsigned": true`,
								)}!`,
							);
						} else if (!fitsSignedLimits) {
							if (value.minValue < limits.min) {
								addError(
									file,
									`Parameter #${parameter} is invalid: minValue ${value.minValue} is incompatible with valueSize ${value.valueSize} (min = ${limits.min})!`,
								);
							}
							if (value.maxValue > limits.max) {
								addError(
									file,
									`Parameter #${parameter} is invalid: maxValue ${value.maxValue} is incompatible with valueSize ${value.valueSize} (max = ${limits.max})!`,
								);
							}
						}
					}
				}
			}

			const partialParams = [...config.paramInformation.entries()].filter(
				([k]) => !!k.valueBitMask,
			);

			// Check if there are parameters with a single bit mask
			const partialParamCounts = partialParams
				.map(([k]) => k)
				.reduce((map, key) => {
					if (!map.has(key.parameter)) map.set(key.parameter, 0);
					map.set(key.parameter, map.get(key.parameter)! + 1);
					return map;
				}, new Map<number, number>());
			for (const [param, count] of partialParamCounts.entries()) {
				if (count === 1) {
					addError(
						file,
						`Parameter #${param} has a single bit mask defined. Either add more, or delete the bit mask.`,
					);
				}
			}

			// Check if there are partial parameters with incompatible min/max/default values
			for (const [key, param] of partialParams) {
				const bitMask = key.valueBitMask!;
				const shiftAmount = getMinimumShiftForBitMask(bitMask);
				const shiftedBitMask = bitMask >>> shiftAmount;
				// TODO: Find out how to test this with negative values
				if (
					param.minValue >= 0 &&
					(param.minValue & shiftedBitMask) !== param.minValue
				) {
					addError(
						file,
						`Parameter #${key.parameter}[${num2hex(
							bitMask,
						)}]: minimum value ${
							param.minValue
						} is incompatible with the bit mask (${bitMask}, aligned ${shiftedBitMask}). All values are relative to the rightmost bit of the mask!
Did you mean to use ${param.minValue >>> shiftAmount}?`,
					);
				}
				if (
					param.maxValue >= 0 &&
					(param.maxValue & shiftedBitMask) !== param.maxValue
				) {
					addError(
						file,
						`Parameter #${key.parameter}[${num2hex(
							bitMask,
						)}]: maximum value ${
							param.maxValue
						} is incompatible with the bit mask (${bitMask}, aligned ${shiftedBitMask}). All values are relative to the rightmost bit of the mask!
Did you mean to use ${param.maxValue >>> shiftAmount}?`,
					);
				}
				if (
					param.defaultValue >= 0 &&
					(param.defaultValue & shiftedBitMask) !== param.defaultValue
				) {
					addError(
						file,
						`Parameter #${key.parameter}[${num2hex(
							bitMask,
						)}]: default value ${
							param.defaultValue
						} is incompatible with the bit mask (${bitMask}, aligned ${shiftedBitMask}). All values are relative to the rightmost bit of the mask!
Did you mean to use ${param.defaultValue >>> shiftAmount}?`,
					);
				}
			}

			// Check if there are partial parameters with incompatible options
			const partialParamsWithOptions = partialParams.filter(
				([, p]) => p.options.length > 0,
			);
			for (const [key, param] of partialParamsWithOptions) {
				const bitMask = key.valueBitMask!;
				const shiftAmount = getMinimumShiftForBitMask(bitMask);
				const shiftedBitMask = bitMask >>> shiftAmount;
				for (const opt of param.options) {
					if ((opt.value & shiftedBitMask) !== opt.value) {
						addError(
							file,
							`Parameter #${key.parameter}[${num2hex(
								bitMask,
							)}]: Option ${
								opt.value
							} is incompatible with the bit mask (${bitMask}, aligned ${shiftedBitMask}). Option values are always relative to the rightmost bit of the mask!
Did you mean to use ${opt.value >>> shiftAmount}?`,
						);
					}
				}
			}
		}
	}

	if (warnings.size) {
		for (const [filename, fileWarnings] of warnings.entries()) {
			console.warn(`config/devices/${filename}:`);
			for (const warning of fileWarnings) {
				const lines = warning
					.split("\n")
					.filter(line => !line.endsWith(filename + ":"));
				console.warn(yellow("[WARN] " + lines.join("\n")));
			}
			console.warn();
		}
	}

	if (errors.size) {
		for (const [filename, fileErrors] of errors.entries()) {
			console.error(`config/devices/${filename}:`);
			for (const error of fileErrors) {
				const lines = error
					.split("\n")
					.filter(line => !line.endsWith(filename + ":"));
				console.error("[ERR] " + red(lines.join("\n")));
			}
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
