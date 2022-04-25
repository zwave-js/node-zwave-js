import {
	getBitMaskWidth,
	getIntegerLimits,
	getLegalRangeForBitMask,
	getMinimumShiftForBitMask,
} from "@zwave-js/core";
import { reportProblem } from "@zwave-js/maintenance";
import { formatId, getErrorMessage, num2hex } from "@zwave-js/shared";
import { distinct } from "alcalzone-shared/arrays";
import { wait } from "alcalzone-shared/async";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { green, red, white } from "ansi-colors";
import levenshtein from "js-levenshtein";
import type { RulesLogic } from "json-logic-js";
import * as path from "path";
import { ConfigManager } from "../src/ConfigManager";
import {
	ConditionalDeviceConfig,
	DeviceConfig,
} from "../src/devices/DeviceConfig";
import type { DeviceID } from "../src/devices/shared";
import { parseLogic } from "../src/Logic";
import { configDir, getDeviceEntryPredicate } from "../src/utils";

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
	const properties = configManager.indicatorProperties;

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

	for (const prop of ["manufacturer", "label", "description"] as const) {
		const value = config[prop];
		if (isArray(value)) {
			for (const item of value) {
				if (item.condition) {
					const logic = parseLogic(item.condition);
					walkLogic(logic);
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

	if (config.compat) {
		if (isArray(config.compat)) {
			for (const compat of config.compat) {
				if (compat.condition) {
					const logic = parseLogic(compat.condition);
					walkLogic(logic);
				}
			}
		} else if (config.compat.condition) {
			const logic = parseLogic(config.compat.condition);
			walkLogic(logic);
		}
	}

	if (config.metadata) {
		for (const prop of [
			"wakeup",
			"inclusion",
			"exclusion",
			"reset",
			"manual",
			"comments",
		] as const) {
			const value = config.metadata[prop];
			if (!value || typeof value === "string") continue;

			if (isArray(value)) {
				for (const entry of value) {
					if (entry.condition) {
						const logic = parseLogic(entry.condition);
						walkLogic(logic);
					}
				}
			} else if (isObject(value) && value.condition) {
				const logic = parseLogic(value.condition);
				walkLogic(logic);
			}
		}
	}

	return ret;
}

function paramNoToString(parameter: number, valueBitMask?: number): string {
	const bitmaskString =
		valueBitMask != undefined ? `[${num2hex(valueBitMask)}]` : "";
	return `Parameter #${parameter}${bitmaskString}`;
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
		const rootDir = path.join(configDir, "devices");
		const filePath = path.join(rootDir, file);

		// Try parsing the file
		let conditionalConfig: ConditionalDeviceConfig;
		try {
			conditionalConfig = await ConditionalDeviceConfig.from(
				filePath,
				true,
				{
					rootDir,
				},
			);
		} catch (e) {
			addError(file, getErrorMessage(e));
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
				addError(file, getErrorMessage(e), variant);
				continue;
			}

			// Validate that the file is semantically correct

			// By evaluating conditionals, we may end up with a file without manufacturer, label or description
			if (config.manufacturer == undefined) {
				addError(
					file,
					"The manufacturer property is undefined",
					variant,
				);
			}
			if (config.label == undefined) {
				addError(file, "The device label is undefined", variant);
			}
			if (config.description == undefined) {
				addError(file, "The device description is undefined", variant);
			}

			if (config.paramInformation?.size) {
				for (const [
					{ parameter, valueBitMask },
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
								`${paramNoToString(
									parameter,
									valueBitMask,
								)} has a very similar label and description (normalized distance ${normalizedDistance.toFixed(
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
					{ parameter, valueBitMask },
					value,
				] of config.paramInformation.entries()) {
					if (
						!value.allowManualEntry &&
						!value.readOnly &&
						!value.options?.length
					) {
						addError(
							file,
							`${paramNoToString(
								parameter,
								valueBitMask,
							)} must allow manual entry if there are no options defined!`,
							variant,
						);
					}

					if (value.readOnly && value.writeOnly) {
						addError(
							file,
							`${paramNoToString(
								parameter,
								valueBitMask,
							)} is invalid: readOnly and writeOnly are mutually exclusive!`,
							variant,
						);
					}
				}

				// Check if there are readOnly parameters with allowManualEntry = true
				for (const [
					{ parameter, valueBitMask },
					value,
				] of config.paramInformation.entries()) {
					// We can't actually distinguish between `false` and missing, but this is good enough
					if (value.readOnly && value.allowManualEntry) {
						addError(
							file,
							`${paramNoToString(
								parameter,
								valueBitMask,
							)} is invalid: allowManualEntry must be omitted for readOnly parameters!`,
							variant,
						);
					}
				}

				// Check if there are options where readOnly and writeOnly are unnecessarily specified
				for (const [
					{ parameter, valueBitMask },
					value,
				] of config.paramInformation.entries()) {
					if (
						!value.allowManualEntry &&
						!value.readOnly &&
						!value.options?.length
					) {
						addError(
							file,
							`${paramNoToString(
								parameter,
								valueBitMask,
							)} must allow manual entry if there are no options defined!`,
							variant,
						);
					}

					if (value.readOnly && value.writeOnly) {
						addError(
							file,
							`${paramNoToString(
								parameter,
								valueBitMask,
							)} is invalid: readOnly and writeOnly are mutually exclusive!`,
							variant,
						);
					} else if (
						value.readOnly !== undefined &&
						value.writeOnly !== undefined
					) {
						addError(
							file,
							`${paramNoToString(
								parameter,
								valueBitMask,
							)} is invalid: readOnly and writeOnly must not both be specified!`,
							variant,
						);
					}
				}

				// Check if there are options with duplicate values
				for (const [
					{ parameter, valueBitMask },
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
								`${paramNoToString(
									parameter,
									valueBitMask,
								)} is invalid: option value ${
									option.value
								} duplicated between "${
									value.options[firstIndex].label
								}" and "${option.label}"!`,
								variant,
							);
						}
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
							`${paramNoToString(
								parameter,
								valueBitMask,
							)} is invalid: valueSize must be in the range 1...4!`,
							variant,
						);
					} else {
						if (value.minValue > value.maxValue) {
							addError(
								file,
								`${paramNoToString(
									parameter,
									valueBitMask,
								)} is invalid: minValue must not be greater than maxValue!`,
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
								`${paramNoToString(
									parameter,
									valueBitMask,
								)} is invalid: cannot determine limits for valueSize ${
									value.valueSize
								}!`,
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
										`${paramNoToString(
											parameter,
											valueBitMask,
										)} is invalid: min/maxValue is incompatible with valueSize ${
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
											`${paramNoToString(
												parameter,
												valueBitMask,
											)} is invalid: minValue ${
												value.minValue
											} is incompatible with valueSize ${
												value.valueSize
											} (min = ${limits.min})!`,
											variant,
										);
									}
									if (value.maxValue > limits.max) {
										addError(
											file,
											`${paramNoToString(
												parameter,
												valueBitMask,
											)} is invalid: maxValue ${
												value.maxValue
											} is incompatible with valueSize ${
												value.valueSize
											} (max = ${limits.max})!`,
											variant,
										);
									}
								}
							} else if (value.unsigned && !fitsUnsignedLimits) {
								if (value.minValue < unsignedLimits.min) {
									addError(
										file,
										`${paramNoToString(
											parameter,
											valueBitMask,
										)} is invalid: minValue ${
											value.minValue
										} is incompatible with valueSize ${
											value.valueSize
										} (min = ${unsignedLimits.min})!`,
										variant,
									);
								}
								if (value.maxValue > unsignedLimits.max) {
									addError(
										file,
										`${paramNoToString(
											parameter,
											valueBitMask,
										)} is invalid: maxValue ${
											value.maxValue
										} is incompatible with valueSize ${
											value.valueSize
										} (max = ${unsignedLimits.max})!`,
										variant,
									);
								}
							}
						}
					}
				}

				// Check if there are parameters with predefined options that are not compatible with min/maxValue
				for (const [
					{ parameter, valueBitMask },
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
								`${paramNoToString(
									parameter,
									valueBitMask,
								)} is invalid: The option value ${
									option.value
								} must be in the range ${value.minValue}...${
									value.maxValue
								}!`,
								variant,
							);
						}
					}

					// Check if writable params without manual entry have unnecessarily wide min/max value ranges
					if (!value.readOnly && value.allowManualEntry === false) {
						const actualMin = Math.min(
							...value.options.map((o) => o.value),
						);
						const actualMax = Math.max(
							...value.options.map((o) => o.value),
						);
						if (value.minValue < actualMin) {
							addError(
								file,
								`${paramNoToString(
									parameter,
									valueBitMask,
								)} is invalid: minValue ${
									value.minValue
								} is less than the minimum option value ${actualMin}! If allowManualEntry is false, minValue must be omitted or match the option values.`,
								variant,
							);
						}
						if (value.maxValue > actualMax) {
							addError(
								file,
								`${paramNoToString(
									parameter,
									valueBitMask,
								)} is invalid: maxValue ${
									value.maxValue
								} is greater than the maximum option value ${actualMax}! If allowManualEntry is false, maxValue must be omitted or match the option values.`,
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
					const [minValue, maxValue] = getLegalRangeForBitMask(
						bitMask,
						!!param.unsigned,
					);
					if (param.minValue < minValue) {
						addError(
							file,
							`Parameter #${key.parameter}[${num2hex(
								bitMask,
							)}]: minimum value ${
								param.minValue
							} is incompatible with the bit mask (${bitMask}, aligned ${shiftedBitMask}). Minimum value expected to be >= ${minValue}.`,
							variant,
						);
					}
					if (param.maxValue > maxValue) {
						addError(
							file,
							`Parameter #${key.parameter}[${num2hex(
								bitMask,
							)}]: maximum value ${
								param.maxValue
							} is incompatible with the bit mask (${bitMask}, aligned ${shiftedBitMask}). Maximum value expected to be <= ${maxValue}.`,
							variant,
						);
					}
					if (
						param.defaultValue < minValue ||
						param.defaultValue > maxValue
					) {
						addError(
							file,
							`Parameter #${key.parameter}[${num2hex(
								bitMask,
							)}]: default value ${
								param.defaultValue
							} is incompatible with the bit mask (${bitMask}, aligned ${shiftedBitMask}). Default value expected to be between ${minValue} and ${maxValue}.`,
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
						const [minValue, maxValue] = getLegalRangeForBitMask(
							bitMask,
							!!param.unsigned,
						);
						if (opt.value < minValue || opt.value > maxValue) {
							addError(
								file,
								`Parameter #${key.parameter}[${num2hex(
									bitMask,
								)}]: Option ${
									opt.value
								} is incompatible with the bit mask (${bitMask}, aligned ${shiftedBitMask}). Value expected to be between ${minValue} and ${maxValue}`,
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
					{ parameter, valueBitMask },
					value,
				] of config.paramInformation.entries()) {
					if (!value.description) continue;

					if (/default:?\s+\d+/i.test(value.description)) {
						addWarning(
							file,
							`${paramNoToString(
								parameter,
								valueBitMask,
							)}: The description mentions a default value which should be handled by the "defaultValue" property instead!`,
							variant,
						);
					}

					// // Complain about parameters where the description mention the unit. We treat the mention of exactly one unit as a warning,
					// // because some parameters have changing units and need to explain them in the description
					// if (
					// 	[
					// 		"second",
					// 		"minute",
					// 		"hour",
					// 		"day",
					// 		"week",
					// 		"kwh",
					// 		"watt",
					// 	].filter((unit) =>
					// 		value.description!.toLowerCase().includes(unit),
					// 	).length === 1
					// ) {
					// 	// Exclude some false positives
					// 	if (!/rounded/i.test(value.description)) {
					// 		addWarning(
					// 			file,
					// 			`${paramNoToString(
					// 				parameter,
					// 				valueBitMask,
					// 			)}: The description mentions a unit which should be moved by the "unit" property instead!`,
					// 			variant,
					// 		);
					// 	}
					// }
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

		const unconditionalComesLast = (
			definitions: { condition?: string }[],
		): boolean => {
			return definitions.every(
				(d, index) =>
					d.condition !== undefined ||
					index === definitions.length - 1,
			);
		};

		// In all situations where one conditional gets selected from an array,
		// ensure that the one without a condition comes last

		// Device manufacturer/label/description
		if (isArray(conditionalConfig.manufacturer)) {
			if (!unconditionalComesLast(conditionalConfig.manufacturer)) {
				addError(
					file,
					`The device manufacturer is invalid: When there are multiple conditional definitions, every definition except the last one MUST have an "$if" condition!`,
				);
			}
		}
		if (isArray(conditionalConfig.label)) {
			if (!unconditionalComesLast(conditionalConfig.label)) {
				addError(
					file,
					`The device label is invalid: When there are multiple conditional definitions, every definition except the last one MUST have an "$if" condition!`,
				);
			}
		}
		if (isArray(conditionalConfig.description)) {
			if (!unconditionalComesLast(conditionalConfig.description)) {
				addError(
					file,
					`The device description is invalid: When there are multiple conditional definitions, every definition except the last one MUST have an "$if" condition!`,
				);
			}
		}

		// Param information
		if (conditionalConfig.paramInformation) {
			for (const [
				key,
				definitions,
			] of conditionalConfig.paramInformation) {
				if (!unconditionalComesLast(definitions)) {
					addError(
						file,
						`${paramNoToString(
							key.parameter,
							key.valueBitMask,
						)} is either invalid or duplicated: When there are multiple definitions, every definition except the last one MUST have an "$if" condition!`,
					);
				}
			}
		}

		// Compat flags
		if (isArray(conditionalConfig.compat)) {
			if (!unconditionalComesLast(conditionalConfig.compat)) {
				addError(
					file,
					`The compat description is invalid: When there are multiple conditional definitions, every definition except the last one MUST have an "$if" condition!`,
				);
			}
		}

		// Metadata
		if (conditionalConfig.metadata) {
			for (const prop of [
				"wakeup",
				"inclusion",
				"exclusion",
				"reset",
				"manual",
			] as const) {
				const value = conditionalConfig.metadata[prop];
				if (isArray(value) && !unconditionalComesLast(value)) {
					addError(
						file,
						`The ${prop} metadata is invalid: When there are multiple conditional definitions, every definition except the last one MUST have an "$if" condition!`,
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

			const partialParamCounts = partialParams
				.map(([k]) => k)
				.reduce((map, key) => {
					if (!map.has(key.parameter)) map.set(key.parameter, 0);
					map.set(key.parameter, map.get(key.parameter)! + 1);
					return map;
				}, new Map<number, number>());

			for (const [key, paramInfos] of partialParams) {
				if (partialParamCounts.get(key.parameter) == 1) {
					for (const param of paramInfos) {
						const bitMask = key.valueBitMask!;
						const shiftAmount = getMinimumShiftForBitMask(bitMask);
						const bitMaskWidth = getBitMaskWidth(bitMask);

						if (
							shiftAmount === 0 &&
							param.valueSize === bitMaskWidth / 8
						) {
							addError(
								file,
								`Parameter #${key.parameter} has a single bit mask defined which covers the entire value. Either add more, or delete the bit mask.`,
							);
						}
					}
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
	const definitions = configManager.namedScales;

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
	// Set NODE_ENV to test in order to trigger stricter checks
	process.env.NODE_ENV = "test";
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
	} catch (e: any) {
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
