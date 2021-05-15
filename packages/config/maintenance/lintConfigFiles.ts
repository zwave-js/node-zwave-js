import { getIntegerLimits, getMinimumShiftForBitMask } from "@zwave-js/core";
import { reportProblem } from "@zwave-js/maintenance";
import { formatId, num2hex } from "@zwave-js/shared";
import { distinct } from "alcalzone-shared/arrays";
import { wait } from "alcalzone-shared/async";
import { isObject } from "alcalzone-shared/typeguards";
import { green, red, white } from "ansi-colors";
import levenshtein from "js-levenshtein";
import type { RulesLogic } from "json-logic-js";
import * as path from "path";
import { ConfigManager } from "../src/ConfigManager";
import {
	ConditionalDeviceConfig,
	DeviceConfig,
	DeviceID,
} from "../src/Devices";
import { parseLogic } from "../src/Logic";
import { configDir, getDeviceEntryPredicate } from "../src/utils";

/* wotan-disable no-useless-predicate */
/* wotan-disable no-restricted-property-access */

const configManager = new ConfigManager();

async function lintNotifications(): Promise<void> {
	await configManager.loadNotifications();
	// TODO: Validate that all contents are semantically correct
}

async function lintManufacturers(): Promise<void> {
	await configManager.loadManufacturers();
	// TODO: Validate that the file is semantically correct
}

async function lintIndicators(): Promise<void> {
	await configManager.loadIndicators();
	const properties = configManager["indicatorProperties"]!;

	if (!(properties.get(1)?.label === "Multilevel")) {
		throw new Error(
			`The indicator property Multilevel (0x01) is required!`,
		);
	}
	if (!(properties.get(2)?.label === "Binary")) {
		throw new Error(`The indicator property Binary (0x02) is required!`);
	}
}

function getAllConditions(
	config: ConditionalDeviceConfig,
): Map<string, Set<string>> {
	const ret: Map<string, Set<string>> = new Map();
	function addCondition(variable: string, value: string): void {
		if (!ret.has(variable)) ret.set(variable, new Set());
		ret.get(variable)!.add(value);
	}

	// Recursively walks through a condition and extracts all variable comparisons
	function walkLogic(logic: RulesLogic) {
		if (!isObject(logic)) return;
		if ("or" in logic) {
			logic.or.forEach((rule) => walkLogic(rule));
		} else if ("and" in logic) {
			logic.and.forEach((rule) => walkLogic(rule));
		} else {
			for (const operator of [
				"ver >=",
				"ver >",
				"ver <=",
				"ver <",
				"ver ===",
				">=",
				">",
				"<=",
				"<",
				"===",
			] as const) {
				if (operator in logic) {
					const [lhs, rhs] = (logic as any)[operator] as [
						RulesLogic,
						RulesLogic,
					];
					if (
						isObject(lhs) &&
						"var" in lhs &&
						typeof lhs.var === "string" &&
						typeof rhs === "string"
					) {
						addCondition(lhs.var, rhs);
					} else if (
						isObject(rhs) &&
						"var" in rhs &&
						typeof rhs.var === "string" &&
						typeof lhs === "string"
					) {
						addCondition(rhs.var, lhs);
					}
				}
			}
		}
	}

	if (config.associations) {
		for (const assoc of config.associations.values()) {
			if (assoc.condition) {
				const logic = parseLogic(assoc.condition);
				walkLogic(logic);
			}
		}
	}

	if (config.paramInformation) {
		for (const params of config.paramInformation.values()) {
			for (const param of params) {
				if (param.condition) {
					const logic = parseLogic(param.condition);
					walkLogic(logic);
				}
				for (const option of param.options) {
					if (option.condition) {
						const logic = parseLogic(option.condition);
						walkLogic(logic);
					}
				}
			}
		}
	}

	return ret;
}

async function lintDevices(): Promise<void> {
	process.env.NODE_ENV = "test";
	await configManager.loadDeviceIndex();
	const index = configManager.getIndex()!;
	// Device config files are lazy-loaded, so we need to parse them all
	const uniqueFiles = distinct(index.map((e) => e.filename)).sort();

	const errors = new Map<string, string[]>();
	function addError(
		filename: string,
		error: string,
		variant?: DeviceID,
	): void {
		if (variant) {
			filename += ` (Variant ${formatId(
				variant.manufacturerId,
			)}:${formatId(variant.productType)}:${formatId(
				variant.productId,
			)}:${variant.firmwareVersion})`;
		}
		if (!errors.has(filename)) errors.set(filename, []);
		errors.get(filename)!.push(error);
	}

	const warnings = new Map<string, string[]>();
	function addWarning(
		filename: string,
		warning: string,
		variant?: DeviceID,
	): void {
		if (variant) {
			filename += ` (Variant ${formatId(
				variant.manufacturerId,
			)}:${formatId(variant.productType)}:${formatId(
				variant.productId,
			)}:${variant.firmwareVersion})`;
		}
		if (!warnings.has(filename)) warnings.set(filename, []);
		warnings.get(filename)!.push(warning);
	}

	for (const file of uniqueFiles) {
		const filePath = path.join(configDir, "devices", file);

		// Try parsing the file
		let conditionalConfig: ConditionalDeviceConfig;
		try {
			conditionalConfig = await ConditionalDeviceConfig.from(filePath);
		} catch (e) {
			addError(file, e.message);
			continue;
		}

		// Check which variants of the device config we need to lint
		const variants: (DeviceID | undefined)[] = [];
		const conditions = getAllConditions(conditionalConfig);
		if (conditions.size > 0) {
			// If there is at least one condition, check the firmware limits too. Otherwise the minimum is enough
			const fwVersions: Set<string> =
				conditions.get("firmwareVersion") ?? new Set();
			if (fwVersions.size > 0) {
				fwVersions.add(conditionalConfig.firmwareVersion.min);
				fwVersions.add(conditionalConfig.firmwareVersion.max);
			} else {
				fwVersions.add(conditionalConfig.firmwareVersion.min);
			}

			// Combine each firmware version with every device ID defined in the file
			for (const deviceId of conditionalConfig.devices) {
				for (const firmwareVersion of fwVersions) {
					variants.push({
						manufacturerId: conditionalConfig.manufacturerId,
						...deviceId,
						firmwareVersion,
					});
				}
			}
		} else {
			// There are no conditions, so we can just evaluate the file for the default case
			variants.push(undefined);
		}

		for (const variant of variants) {
			// Try evaluating the conditional config
			let config: DeviceConfig;
			try {
				config = conditionalConfig.evaluate(variant);
			} catch (e) {
				addError(file, e.message, variant);
				continue;
			}

			// Validate that the file is semantically correct

			if (config.paramInformation?.size) {
				for (const [
					{ parameter },
					{ label, description },
				] of config.paramInformation.entries()) {
					// Check if the description is too similar to the label
					if (description != undefined) {
						const normalizedDistance =
							levenshtein(label, description) /
							Math.max(label.length, description.length);
						if (normalizedDistance < 0.5) {
							addWarning(
								file,
								`Parameter #${parameter} has a very similar label and description (normalized distance ${normalizedDistance.toFixed(
									2,
								)}). Consider removing the description if it does not add any information:
label:       ${label}
description: ${description}`,
								variant,
							);
						}
					}
				}

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
							variant,
						);
					}

					if (value.readOnly && value.writeOnly) {
						addError(
							file,
							`Parameter #${parameter} is invalid: readOnly and writeOnly are mutually exclusive!`,
							variant,
						);
					}
				}

				// Check if there are readOnly parameters with allowManualEntry = true
				for (const [
					{ parameter },
					value,
				] of config.paramInformation.entries()) {
					// We can't actually distinguish between `false` and missing, but this is good enough
					if (value.readOnly && value.allowManualEntry) {
						addError(
							file,
							`Parameter #${parameter} is invalid: allowManualEntry must be omitted for readOnly parameters!`,
							variant,
						);
					}
				}

				// Check if there are options where readOnly and writeOnly are unnecessarily specified
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
							variant,
						);
					}

					if (value.readOnly && value.writeOnly) {
						addError(
							file,
							`Parameter #${parameter} is invalid: readOnly and writeOnly are mutually exclusive!`,
							variant,
						);
					} else if (
						value.readOnly !== undefined &&
						value.writeOnly !== undefined
					) {
						addError(
							file,
							`Parameter #${parameter} is invalid: readOnly and writeOnly must not both be specified!`,
							variant,
						);
					}
				}

				// Check if there are options with duplicate values
				for (const [
					{ parameter },
					value,
				] of config.paramInformation.entries()) {
					for (let i = 0; i < value.options.length; i++) {
						const option = value.options[i];
						const firstIndex = value.options.findIndex(
							(o) => o.value === option.value,
						);
						if (firstIndex !== i) {
							addError(
								file,
								`Parameter #${parameter} is invalid: option value ${option.value} duplicated between "${value.options[firstIndex].label}" and "${option.label}"!`,
								variant,
							);
						}
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
							variant,
						);
					} else {
						if (value.minValue > value.maxValue) {
							addError(
								file,
								`Parameter #${parameter} is invalid: minValue must not be greater than maxValue!`,
								variant,
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
								variant,
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
										variant,
									);
								} else {
									if (value.minValue < limits.min) {
										addError(
											file,
											`Parameter #${parameter} is invalid: minValue ${value.minValue} is incompatible with valueSize ${value.valueSize} (min = ${limits.min})!`,
											variant,
										);
									}
									if (value.maxValue > limits.max) {
										addError(
											file,
											`Parameter #${parameter} is invalid: maxValue ${value.maxValue} is incompatible with valueSize ${value.valueSize} (max = ${limits.max})!`,
											variant,
										);
									}
								}
							} else if (value.unsigned && !fitsUnsignedLimits) {
								if (value.minValue < unsignedLimits.min) {
									addError(
										file,
										`Parameter #${parameter} is invalid: minValue ${value.minValue} is incompatible with valueSize ${value.valueSize} (min = ${unsignedLimits.min})!`,
										variant,
									);
								}
								if (value.maxValue > unsignedLimits.max) {
									addError(
										file,
										`Parameter #${parameter} is invalid: maxValue ${value.maxValue} is incompatible with valueSize ${value.valueSize} (max = ${unsignedLimits.max})!`,
										variant,
									);
								}
							}
						}
					}
				}

				// Check if there are parameters with predefined options that are not compatible with min/maxValue
				for (const [
					{ parameter },
					value,
				] of config.paramInformation.entries()) {
					if (!value.options.length) continue;
					for (const option of value.options) {
						if (
							option.value < value.minValue ||
							option.value > value.maxValue
						) {
							addError(
								file,
								`Parameter #${parameter} is invalid: The option value ${option.value} must be in the range ${value.minValue}...${value.maxValue}!`,
								variant,
							);
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
						variant,
					);
				}

				const partialParams = [
					...config.paramInformation.entries(),
				].filter(([k]) => !!k.valueBitMask);

				// Checking if there are parameters with a single bit mask happens for the condional config,
				// not the evaluated one

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
						variant,
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
							variant,
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
							variant,
						);
					}
					if (
						param.defaultValue >= 0 &&
						(param.defaultValue & shiftedBitMask) !==
							param.defaultValue
					) {
						addError(
							file,
							`Parameter #${key.parameter}[${num2hex(
								bitMask,
							)}]: default value ${
								param.defaultValue
							} is incompatible with the bit mask (${bitMask}, aligned ${shiftedBitMask}). All values are relative to the rightmost bit of the mask!
Did you mean to use ${param.defaultValue >>> shiftAmount}?`,
							variant,
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
							variant,
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
								variant,
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
							variant,
						);
					}
				}

				// Check if there are descriptions with common errors
				for (const [
					{ parameter },
					value,
				] of config.paramInformation.entries()) {
					if (!value.description) continue;

					if (/default:?\s+\d+/i.test(value.description)) {
						addWarning(
							file,
							`Parameter #${parameter}: The description mentions a default value which should be handled by the "defaultValue" property instead!`,
							variant,
						);
					}
					if (
						/seconds|minutes|hours|percent(age)?|kwh|watts/i.test(
							value.description,
						)
					) {
						addWarning(
							file,
							`Parameter #${parameter}: The description mentions a unit which should be moved by the "unit" property instead!`,
							variant,
						);
					}
				}
			}

			// Validate firmware versions

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

				// Check if one of the firmware versions has a leading zero
				const leadingZeroMajor = /^0\d+\./;
				const leadingZeroMinor = /\.0\d+$/;
				if (
					leadingZeroMajor.test(config.firmwareVersion.min) ||
					leadingZeroMinor.test(config.firmwareVersion.min)
				) {
					addError(
						file,
						`The minimum firmware version ${config.firmwareVersion.min} is invalid. Leading zeroes are not permitted.`,
					);
				}
				if (
					leadingZeroMajor.test(config.firmwareVersion.max) ||
					leadingZeroMinor.test(config.firmwareVersion.max)
				) {
					addError(
						file,
						`The maximum firmware version ${config.firmwareVersion.max} is invalid. Leading zeroes are not permitted.`,
					);
				}
			}
		}

		// Check only the conditional configs for single bit masks, because they might be added for
		// separate variants
		if (conditionalConfig.paramInformation) {
			const partialParams = [
				...conditionalConfig.paramInformation.entries(),
			].filter(([k]) => !!k.valueBitMask);

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
		}

		// Check that either `endpoints` or `associations` are specified, not both
		if (conditionalConfig.endpoints && conditionalConfig.associations) {
			addError(
				file,
				`The properties "endpoints" and "associations" cannot be used together. To define associations for the root endpoint, specify them under endpoint "0"!`,
			);
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
					// We're likely to have LOTs of warnings - but GitHub only accepts a few annotations
					annotation: false,
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
			console.log();
		}
	}

	const numErrors = [...errors.values()]
		.map((e) => e.length)
		.reduce((cur, acc) => cur + acc, 0);
	const numWarnings = [...warnings.values()]
		.map((e) => e.length)
		.reduce((cur, acc) => cur + acc, 0);

	if (numErrors || numWarnings) {
		console.log(
			`Found ${numErrors} error${
				numErrors !== 1 ? "s" : ""
			} and ${numWarnings} warning${numWarnings !== 1 ? "s" : ""}!`,
		);
		console.log();
	}

	if (errors.size) {
		throw new Error("At least one config file has errors!");
	}
}

async function lintNamedScales(): Promise<void> {
	await configManager.loadNamedScales();
	const definitions = configManager["namedScales"]!;

	if (!definitions.has("temperature")) {
		throw new Error(`Named scale "temperature" is missing!`);
	}
}

async function lintSensorTypes(): Promise<void> {
	// The named scales must be loaded here so the parsing can work
	await configManager.loadNamedScales();

	await configManager.loadSensorTypes();
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
		console.log();
		console.log(" ");
	} catch (e) {
		if (typeof e.stack === "string") {
			const lines = (e.stack as string).split("\n");
			if (lines[0].trim().toLowerCase() === "error:") {
				lines.shift();
			}
			const message = lines.join("\n");
			console.log(red(message));
		} else {
			console.log(red(e.message));
		}
		console.log();

		// Github actions truncates our logs if we don't wait before exiting the process
		await wait(5000);
		return process.exit(1);
	}
}

if (require.main === module) void lintConfigFiles();
