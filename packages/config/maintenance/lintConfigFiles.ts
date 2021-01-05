import { getIntegerLimits, getMinimumShiftForBitMask } from "@zwave-js/core";
import { num2hex } from "@zwave-js/shared";
import { distinct } from "alcalzone-shared/arrays";
import { green, red, white } from "ansi-colors";
import { readFile } from "fs-extra";
import * as path from "path";
import { reportProblem } from "../../../maintenance/tools";
import { DeviceConfig, loadDeviceIndexInternal } from "../src/Devices";
import { loadIndicatorsInternal } from "../src/Indicators";
import { loadManufacturersInternal } from "../src/Manufacturers";
import { loadNotificationsInternal } from "../src/Notifications";
import { loadNamedScales, loadNamedScalesInternal } from "../src/Scales";
import { loadSensorTypesInternal } from "../src/SensorTypes";
import { configDir, getDeviceEntryPredicate } from "../src/utils";

/* wotan-disable no-useless-predicate */

async function lintNotifications(): Promise<void> {
	await loadNotificationsInternal();
	// TODO: Validate that all contents are semantically correct
}

async function lintManufacturers(): Promise<void> {
	await loadManufacturersInternal();
	// TODO: Validate that the file is semantically correct
}

async function lintIndicators(): Promise<void> {
	const { properties } = await loadIndicatorsInternal();

	if (!(properties.get(1)?.label === "Multilevel")) {
		throw new Error(
			`The indicator property Multilevel (0x01) is required!`,
		);
	}
	if (!(properties.get(2)?.label === "Binary")) {
		throw new Error(`The indicator property Binary (0x02) is required!`);
	}
}

async function lintDevices(): Promise<void> {
	const index = (await loadDeviceIndexInternal())!;
	// Device config files are lazy-loaded, so we need to parse them all
	const uniqueFiles = distinct(index.map((e) => e.filename)).sort();

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

		// These checks seem to be wrong
		// 		// Validate associations
		// 		if (config.associations?.size) {
		// 			// Real lifeline associations (as per the Z-Wave+ specs) only have a single node
		// 			// If there is a 2nd lifeline with more nodes, that is most likely wrong
		// 			const lifelines = [...config.associations.values()].filter(
		// 				(assoc) => assoc.isLifeline,
		// 			);
		// 			if (
		// 				lifelines.length > 1 &&
		// 				lifelines.find((l) => l.maxNodes === 1) &&
		// 				lifelines.find((l) => l.maxNodes > 1)
		// 			) {
		// 				addWarning(
		// 					file,
		// 					`A lifeline with 1 node plus another one with more nodes found!
		// This is likely an error!`,
		// 				);
		// 			}
		// 			if (
		// 				lifelines.some(
		// 					(l) =>
		// 						l.label === "Lifeline" &&
		// 						l.groupId === 1 &&
		// 						l.maxNodes > 1,
		// 				)
		// 			) {
		// 				addWarning(
		// 					file,
		// 					`Found an association that looks like a Z-Wave+ lifeline but has more than 1 max nodes!`,
		// 				);
		// 			}
		// 		}

		if (config.paramInformation?.size) {
			// Check if there are options when manual entry is forbidden
			for (const [
				{ parameter },
				value,
			] of config.paramInformation.entries()) {
				if (
					!value.allowManualEntry &&
					!value.readOnly &&
					!value.options?.length
				) {
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
				{ parameter },
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

						if (!value.unsigned && !fitsSignedLimits) {
							if (fitsUnsignedLimits) {
								addError(
									file,
									`Parameter #${parameter} is invalid: min/maxValue is incompatible with valueSize ${
										value.valueSize
									} (min = ${limits.min}, max = ${
										limits.max
									}).
Consider converting this parameter to unsigned using ${white(
										`"unsigned": true`,
									)}!`,
								);
							} else {
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
						} else if (value.unsigned && !fitsUnsignedLimits) {
							if (value.minValue < unsignedLimits.min) {
								addError(
									file,
									`Parameter #${parameter} is invalid: minValue ${value.minValue} is incompatible with valueSize ${value.valueSize} (min = ${unsignedLimits.min})!`,
								);
							}
							if (value.maxValue > unsignedLimits.max) {
								addError(
									file,
									`Parameter #${parameter} is invalid: maxValue ${value.maxValue} is incompatible with valueSize ${value.valueSize} (max = ${unsignedLimits.max})!`,
								);
							}
						}
					}
				}
			}

			// Check if there are parameters with identical labels
			const labelCounts = new Map<
				string,
				{ parameter: number; valueBitMask?: number }[]
			>();
			for (const [
				param,
				{ label },
			] of config.paramInformation.entries()) {
				if (!labelCounts.has(label)) labelCounts.set(label, []);
				labelCounts.get(label)!.push(param);
			}
			for (const [label, params] of labelCounts) {
				if (params.length === 1) continue;
				addWarning(
					file,
					`Label "${label}" is duplicated in the following parameters: ${params
						.map(
							(p) =>
								`${p.parameter}${
									p.valueBitMask
										? `[${num2hex(p.valueBitMask)}]`
										: ""
								}`,
						)
						.join(", ")}`,
				);
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

			// Check if there are partial parameters and non-partials with the same number
			const duplicatedPartials = distinct(
				partialParams.map(([key]) => key.parameter),
			).filter((parameter) =>
				config.paramInformation!.has({ parameter }),
			);
			if (duplicatedPartials.length) {
				addError(
					file,
					`The following non-partial parameters need to be removed because partial parameters with the same key exist: ${duplicatedPartials
						.map((p) => `#${p}`)
						.join(", ")}!`,
				);
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

			// Check if there are partial parameters referencing the same parameter with different value sizes
			const checkedValueSize: number[] = [];
			for (const [key, param] of partialParams) {
				if (checkedValueSize.includes(key.parameter)) continue;
				checkedValueSize.push(key.parameter);

				const others = partialParams.filter(
					([kk]) =>
						key.parameter === kk.parameter &&
						key.valueBitMask !== kk.valueBitMask,
				);
				if (
					others.some(
						([, other]) => other.valueSize !== param.valueSize,
					)
				) {
					addError(
						file,
						`Parameter #${key.parameter}: All partial parameters must have the same valueSize!`,
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

			// Check if there are partial parameters with a valueSize that is too small for the bitmask
			for (const [key, param] of partialParams) {
				if (key.valueBitMask! >= 256 ** param.valueSize) {
					addError(
						file,
						`Parameter #${key.parameter}[${num2hex(
							key.valueBitMask,
						)}]: valueSize ${
							param.valueSize
						} is incompatible with the bit mask ${num2hex(
							key.valueBitMask,
						)}!`,
					);
				}
			}
		}

		// Validate firmware versions
		if (typeof config.firmwareVersion === "boolean") {
			if (config.firmwareVersion !== false) {
				addError(
					file,
					`Invalid firmware version ${
						config.firmwareVersion as any
					}. The firmware version must be an object with "min" and "max" properties or false.`,
				);
			}
		} else {
			if (config.firmwareVersion.max === "255.0") {
				addWarning(
					file,
					`The maximum firmware version is 255.0. Did you mean 255.255?`,
				);
			} else {
				// Check for invalid version parts
				const [minMajor, minMinor] = config.firmwareVersion.min
					.split(".", 2)
					.map((v) => parseInt(v, 10));
				if (
					minMajor < 0 ||
					minMajor > 255 ||
					minMinor < 0 ||
					minMinor > 255
				) {
					addError(
						file,
						`The minimum firmware version ${config.firmwareVersion.min} is invalid. Each version part must be between 0 and 255.`,
					);
				}

				const [maxMajor, maxMinor] = config.firmwareVersion.max
					.split(".", 2)
					.map((v) => parseInt(v, 10));
				if (
					maxMajor < 0 ||
					maxMajor > 255 ||
					maxMinor < 0 ||
					maxMinor > 255
				) {
					addError(
						file,
						`The maximum firmware version ${config.firmwareVersion.max} is invalid. Each version part must be between 0 and 255.`,
					);
				}
			}
		}
	}

	// Check for duplicate definitions
	for (let i = 0; i < index.length; i++) {
		const entry = index[i];
		const firstIndex = index.findIndex(
			getDeviceEntryPredicate(
				parseInt(entry.manufacturerId, 16),
				parseInt(entry.productType, 16),
				parseInt(entry.productId, 16),
			),
		);
		if (firstIndex === i) continue;
		const other = index[firstIndex].firmwareVersion;
		const me = entry.firmwareVersion;
		if (typeof other === "boolean" || typeof me === "boolean") {
			if (other !== me) continue;
		} else {
			if (other.min !== me.min || other.max !== me.max) continue;
		}
		// This is a duplicate!
		addError(
			entry.filename,
			`Duplicate config file detected for device (manufacturer id = ${entry.manufacturerId}, product type = ${entry.productType}, product id = ${entry.productId})
The first occurence of this device is in file config/devices/${index[firstIndex].filename}`,
		);
	}

	if (warnings.size) {
		for (const [filename, fileWarnings] of warnings.entries()) {
			// console.warn(`config/devices/${filename}:`);
			for (const warning of fileWarnings) {
				const lines = warning
					.split("\n")
					.filter((line) => !line.endsWith(filename + ":"));
				reportProblem({
					severity: "warn",
					filename: `packages/config/config/devices/${filename}`,
					message: lines.join("\n"),
				});
			}
			console.warn();
		}
	}

	if (errors.size) {
		for (const [filename, fileErrors] of errors.entries()) {
			// console.error(`config/devices/${filename}:`);
			for (const error of fileErrors) {
				const lines = error
					.split("\n")
					.filter((line) => !line.endsWith(filename + ":"));
				reportProblem({
					severity: "error",
					filename: `packages/config/config/devices/${filename}`,
					message: lines.join("\n"),
				});
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

export async function lintConfigFiles(): Promise<void> {
	try {
		await lintManufacturers();
		await lintDevices();
		await lintNotifications();
		await lintNamedScales();
		await lintSensorTypes();
		await lintIndicators();

		console.log();
		console.log(green("The config files are valid!"));
	} catch (e) {
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
	}
}

if (require.main === module) void lintConfigFiles();
