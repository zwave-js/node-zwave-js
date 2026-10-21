import * as path from "node:path";

import {
	getBitMaskWidth,
	getIntegerLimits,
	getLegalRangeForBitMask,
	getMinimumShiftForBitMask,
} from "@zwave-js/core";
import { fs } from "@zwave-js/core/bindings/fs/node";
import { reportProblem } from "@zwave-js/maintenance";
import {
	enumFilesRecursive,
	formatId,
	getErrorMessage,
	num2hex,
} from "@zwave-js/shared";
import { distinct } from "alcalzone-shared/arrays";
import { wait } from "alcalzone-shared/async";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import c from "ansi-colors";
import esMain from "es-main";
import levenshtein from "js-levenshtein";
import type { RulesLogic } from "json-logic-js";

import { configDir } from "#config_dir";

import { ConfigManager } from "../src/ConfigManager.js";
import { readJsonWithTemplate } from "../src/JsonTemplate.js";
import { parseLogic } from "../src/Logic.js";
import {
	ConditionalDeviceConfig,
	type DeviceConfig,
} from "../src/devices/DeviceConfig.js";
import type {
	ConditionalParamInfoMap,
	ParamInfoMap,
	ParamInformation,
} from "../src/devices/ParamInformation.js";
import type { DeviceID } from "../src/devices/shared.js";
import { getDeviceEntryPredicate, versionInRange } from "../src/utils.js";
import {
	firmwareVersionFormatHint,
	isFirmwareVersion,
} from "../src/utils_safe.js";

const configManager = new ConfigManager();

async function lintManufacturers(): Promise<void> {
	await configManager.loadManufacturers();
	// TODO: Validate that the file is semantically correct
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
				"ver !==",
				">=",
				">",
				"<=",
				"<",
				"===",
				"!==",
			] as const) {
				if (operator in logic) {
					const [lhs, rhs] = (logic as any)[operator] as [
						RulesLogic,
						RulesLogic,
					];
					if (
						isObject(lhs)
						&& "var" in lhs
						&& typeof lhs.var === "string"
						&& typeof rhs === "string"
					) {
						addCondition(lhs.var, rhs);
					} else if (
						isObject(rhs)
						&& "var" in rhs
						&& typeof rhs.var === "string"
						&& typeof lhs === "string"
					) {
						addCondition(rhs.var, lhs);
					}
				}
			}
		}
	}

	function walkCondition(condition: string | undefined): void {
		if (condition) walkLogic(parseLogic(condition));
	}

	for (const prop of ["manufacturer", "label", "description"] as const) {
		const value = config[prop];
		if (isArray(value)) {
			for (const item of value) {
				walkCondition(item.condition);
			}
		}
	}

	function walkAssociations(
		associations: ConditionalDeviceConfig["associations"],
	): void {
		for (const assoc of associations?.values() ?? []) {
			walkCondition(assoc.condition);
		}
	}

	function walkParamInformation(
		paramInformation: ConditionalDeviceConfig["paramInformation"],
	): void {
		for (const params of paramInformation?.values() ?? []) {
			for (const param of params) {
				walkCondition(param.condition);
				for (const option of param.options) {
					walkCondition(option.condition);
				}
			}
		}
	}

	walkAssociations(config.associations);
	walkParamInformation(config.paramInformation);

	for (const endpoint of config.endpoints?.values() ?? []) {
		walkCondition(endpoint.condition);
		walkAssociations(endpoint.associations);
		walkParamInformation(endpoint.paramInformation);
	}

	for (const scene of config.scenes?.values() ?? []) {
		walkCondition(scene.condition);
	}

	for (const group of config.endpointGroups?.values() ?? []) {
		walkCondition(group.condition);
	}

	if (config.compat) {
		if (isArray(config.compat)) {
			for (const compat of config.compat) {
				walkCondition(compat.condition);
			}
		} else {
			walkCondition(config.compat.condition);
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
					walkCondition(entry.condition);
				}
			} else if (isObject(value)) {
				walkCondition(value.condition);
			}
		}
	}

	return ret;
}

/**
 * Returns the version after the given one, or `undefined` for 255.255.255.
 * `>` excludes its boundary, so the range after it starts one version later.
 * No previous version is needed for `<`, because it switches at the boundary itself, which is sampled already.
 */
function getNextVersion(version: string): string | undefined {
	const parts = version.split(".").map(Number);
	while (parts.length < 3) parts.push(0);
	for (let i = 2; i >= 0; i--) {
		if (parts[i] < 255) {
			parts[i]++;
			return parts.join(".");
		}
		parts[i] = 0;
	}
}

/**
 * Splits the versions into ranges in which every condition on that version has the same result,
 * and returns the first version of each range.
 */
function getVersionRangeStarts(
	boundaries: Iterable<string>,
	min: string,
): Set<string> {
	// If there is at least one condition, check the firmware limits too. Otherwise the minimum is enough
	const starts = new Set([min]);
	for (const boundary of boundaries) {
		// Each boundary is a range of its own, because `>=`, `<=` and `===` include it and `>` and `<` exclude it
		starts.add(boundary);
		const next = getNextVersion(boundary);
		if (next) starts.add(next);
	}
	return starts;
}

function paramNoToString(parameter: number, valueBitMask?: number): string {
	const bitmaskString =
		valueBitMask != undefined ? `[${num2hex(valueBitMask)}]` : "";
	return `Parameter #${parameter}${bitmaskString}`;
}

function unconditionalComesLast(
	definitions: { condition?: string }[],
): boolean {
	return definitions.every(
		(d, index) =>
			d.condition !== undefined || index === definitions.length - 1,
	);
}

interface LintDevicesContextConditional {
	file: string;
	addError(filename: string, error: string, variant?: DeviceID): void;
	addWarning(filename: string, warning: string, variant?: DeviceID): void;
}

interface LintDevicesContext extends LintDevicesContextConditional {
	variant: DeviceID | undefined;
}

function lintTemplateParamDefinition(
	file: string,
	name: string,
	definition: Record<string, unknown>,
	addError: (filename: string, error: string) => void,
	addWarning: (filename: string, warning: string) => void,
): void {
	const prefix = `Template "${name}"`;

	// Since template entries are partial definitions, only check
	// fields that are actually present and have the expected type.
	// Conditionals cannot be evaluated without a device context, so
	// conditional fields are not checked either.
	const minValue =
		typeof definition.minValue === "number"
			? definition.minValue
			: undefined;
	const maxValue =
		typeof definition.maxValue === "number"
			? definition.maxValue
			: undefined;
	const defaultValue =
		typeof definition.defaultValue === "number"
			? definition.defaultValue
			: undefined;
	const valueSize =
		typeof definition.valueSize === "number"
			? definition.valueSize
			: undefined;
	const unsigned =
		typeof definition.unsigned === "boolean"
			? definition.unsigned
			: undefined;
	const readOnly =
		typeof definition.readOnly === "boolean"
			? definition.readOnly
			: undefined;
	const writeOnly =
		typeof definition.writeOnly === "boolean"
			? definition.writeOnly
			: undefined;
	const allowManualEntry =
		typeof definition.allowManualEntry === "boolean"
			? definition.allowManualEntry
			: undefined;
	const options = isArray(definition.options)
		? definition.options.filter(
				(o): o is { value: number; label?: unknown } =>
					isObject(o) && typeof o.value === "number",
			)
		: undefined;

	if (minValue != undefined && maxValue != undefined && minValue > maxValue) {
		addError(
			file,
			`${prefix} is invalid: minValue must not be greater than maxValue!`,
		);
	}

	if (defaultValue != undefined) {
		if (minValue != undefined && defaultValue < minValue) {
			addError(
				file,
				`${prefix} is invalid: The default value ${defaultValue} must be greater than or equal to minValue ${minValue}!`,
			);
		}
		if (maxValue != undefined && defaultValue > maxValue) {
			addError(
				file,
				`${prefix} is invalid: The default value ${defaultValue} must be less than or equal to maxValue ${maxValue}!`,
			);
		}
	}

	if (valueSize != undefined && (valueSize < 1 || valueSize > 4)) {
		addError(
			file,
			`${prefix} is invalid: valueSize must be in the range 1...4!`,
		);
	} else if (valueSize != undefined) {
		// All values are signed by the specs
		const signedLimits = getIntegerLimits(valueSize as any, true);
		const unsignedLimits = getIntegerLimits(valueSize as any, false);

		const values: [fieldName: string, value: number][] = [];
		if (minValue != undefined) values.push(["minValue", minValue]);
		if (maxValue != undefined) values.push(["maxValue", maxValue]);
		if (defaultValue != undefined) {
			values.push(["defaultValue", defaultValue]);
		}

		for (const [fieldName, value] of values) {
			const fitsSigned =
				value >= signedLimits.min && value <= signedLimits.max;
			const fitsUnsigned =
				value >= unsignedLimits.min && value <= unsignedLimits.max;

			if (unsigned) {
				if (!fitsUnsigned) {
					addError(
						file,
						`${prefix} is invalid: ${fieldName} ${value} is incompatible with valueSize ${valueSize} (min = ${unsignedLimits.min}, max = ${unsignedLimits.max})!`,
					);
				}
			} else if (!fitsSigned) {
				if (fitsUnsigned && unsigned == undefined) {
					addWarning(
						file,
						`${prefix}: ${fieldName} ${value} requires the parameter to be unsigned (valueSize ${valueSize}, min = ${signedLimits.min}, max = ${signedLimits.max}).
Consider adding ${c.white(`"unsigned": true`)} to the template!`,
					);
				} else {
					addError(
						file,
						`${prefix} is invalid: ${fieldName} ${value} is incompatible with valueSize ${valueSize} (min = ${signedLimits.min}, max = ${signedLimits.max})!`,
					);
				}
			}
		}
	}

	if (options?.length) {
		for (const option of options) {
			if (
				(minValue != undefined && option.value < minValue)
				|| (maxValue != undefined && option.value > maxValue)
			) {
				addError(
					file,
					`${prefix} is invalid: The option value ${option.value} must be in the range ${
						minValue ?? "..."
					}...${maxValue ?? "..."}!`,
				);
			}
		}

		const duplicates = distinct(
			options
				.map((o) => o.value)
				.filter((value, index, all) => all.indexOf(value) !== index),
		);
		if (duplicates.length) {
			addError(
				file,
				`${prefix} is invalid: duplicate option value${
					duplicates.length !== 1 ? "s" : ""
				} ${duplicates.join(", ")}!`,
			);
		}

		if (
			allowManualEntry === false
			&& !readOnly
			&& defaultValue != undefined
			&& !options.some((o) => o.value === defaultValue)
		) {
			addError(
				file,
				`${prefix} is invalid: The default value ${defaultValue} is not among the defined options!`,
			);
		}
	}

	if (definition.readOnly != undefined && definition.readOnly !== true) {
		addError(
			file,
			`${prefix} is invalid: readOnly must be true or omitted!`,
		);
	}
	if (definition.writeOnly != undefined && definition.writeOnly !== true) {
		addError(
			file,
			`${prefix} is invalid: writeOnly must be true or omitted!`,
		);
	}
	if (
		definition.allowManualEntry != undefined
		&& definition.allowManualEntry !== false
	) {
		addError(
			file,
			`${prefix} is invalid: allowManualEntry must be false or omitted!`,
		);
	}
	if (readOnly && writeOnly) {
		addError(
			file,
			`${prefix} is invalid: readOnly and writeOnly are mutually exclusive!`,
		);
	}

	if (definition.allowed != undefined) {
		if (minValue != undefined || maxValue != undefined) {
			addError(
				file,
				`${prefix} is invalid: "allowed" cannot be used together with "minValue" or "maxValue"!`,
			);
		}
		if (allowManualEntry === false) {
			addError(
				file,
				`${prefix} is invalid: "allowed" cannot be used with "allowManualEntry: false"!`,
			);
		}

		if (!isArray(definition.allowed) || definition.allowed.length === 0) {
			addError(
				file,
				`${prefix} is invalid: "allowed" must be a non-empty array!`,
			);
		} else {
			// Bring the raw definitions into the same shape the device config
			// parser produces, so the range validation can be shared
			const allowedDefs: (
				| { value: number }
				| {
						from: number;
						to: number;
						step?: number;
				  }
			)[] = [];
			for (let i = 0; i < definition.allowed.length; i++) {
				const def = definition.allowed[i];
				if (
					isObject(def)
					&& "value" in def
					&& typeof def.value === "number"
				) {
					allowedDefs.push({ value: def.value });
				} else if (
					isObject(def)
					&& "range" in def
					&& isArray(def.range)
					&& def.range.length === 2
					&& def.range.every((v) => typeof v === "number")
					&& (def.step == undefined || typeof def.step === "number")
				) {
					const [from, to] = def.range as [number, number];
					allowedDefs.push({
						from,
						to,
						...(def.step != undefined ? { step: def.step } : {}),
					});
				} else {
					addError(
						file,
						`${prefix} is invalid: allowed[${i}] must have either a numeric "value" or a numeric "range" [from, to] with an optional numeric "step"!`,
					);
				}
			}
			validateAllowedValuesDefinition(
				allowedDefs,
				prefix,
				file,
				addError,
			);
		}
	}

	if (typeof definition.description === "string") {
		if (/default:?\s+\d+/i.test(definition.description)) {
			addWarning(
				file,
				`${prefix}: The description mentions a default value which should be handled by the "defaultValue" property instead!`,
			);
		}

		if (typeof definition.label === "string") {
			const { label, description } = definition;
			const normalizedDistance =
				levenshtein(label, description)
				/ Math.max(label.length, description.length);
			if (normalizedDistance < 0.5) {
				addWarning(
					file,
					`${prefix} has a very similar label and description (normalized distance ${normalizedDistance.toFixed(
						2,
					)}). Consider removing the description if it does not add any information:
label:       ${label}
description: ${description}`,
				);
			}
		}
	}
}

async function lintTemplates(
	addError: (filename: string, error: string) => void,
	addWarning: (filename: string, warning: string) => void,
): Promise<void> {
	const rootDir = path.join(configDir, "devices");

	const templateFiles = await enumFilesRecursive(fs, rootDir, (filename) =>
		/[\\/]templates[\\/][^\\/]+\.json$/i.test(filename),
	);

	for (const filePath of templateFiles.toSorted()) {
		const file = path.relative(rootDir, filePath).replaceAll("\\", "/");

		let templates: Record<string, unknown>;
		try {
			templates = await readJsonWithTemplate(fs, filePath, rootDir);
		} catch (e) {
			addError(file, getErrorMessage(e));
			continue;
		}

		for (const [name, definition] of Object.entries(templates)) {
			if (!isObject(definition)) {
				addError(file, `Template "${name}" must be an object!`);
				continue;
			}
			lintTemplateParamDefinition(
				file,
				name,
				definition,
				addError,
				addWarning,
			);
		}
	}
}

async function lintDevices(): Promise<void> {
	process.env.NODE_ENV = "test";

	// Only files with SDK version samples mention the SDK version in their variants
	let hasSdkVariants = false;
	function formatVariant(variant: DeviceID): string {
		const sdk = hasSdkVariants
			? `, SDK ${variant.sdkVersion ?? "unknown"}`
			: "";
		return ` (Variant ${formatId(variant.manufacturerId)}:${formatId(
			variant.productType,
		)}:${formatId(variant.productId)}:${variant.firmwareVersion}${sdk})`;
	}

	const errors = new Map<string, string[]>();
	function addError(
		filename: string,
		error: string,
		variant?: DeviceID,
		endpoint?: number,
	): void {
		if (variant) filename += formatVariant(variant);
		if (!errors.has(filename)) errors.set(filename, []);

		const errorPrefix = !!endpoint ? `Endpoint ${endpoint}: ` : "";
		errors.get(filename)!.push(errorPrefix + error);
	}

	const warnings = new Map<string, string[]>();
	function addWarning(
		filename: string,
		warning: string,
		variant?: DeviceID,
		endpoint?: number,
	): void {
		if (variant) filename += formatVariant(variant);
		if (!warnings.has(filename)) warnings.set(filename, []);

		const errorPrefix = !!endpoint ? `Endpoint ${endpoint}: ` : "";
		warnings.get(filename)!.push(errorPrefix + warning);
	}

	const rootDir = path.join(configDir, "devices");

	const forbiddenFiles = await enumFilesRecursive(
		fs,
		rootDir,
		(filename) => !filename.endsWith(".json"),
	);
	for (const file of forbiddenFiles) {
		addError(
			path.relative(rootDir, file),
			`Invalid extension for device config file. Expected ".json", got "${path.extname(
				file,
			)}"`,
		);
	}

	const filesWithWhitespace = await enumFilesRecursive(
		fs,
		rootDir,
		(filename) => {
			const basename = path.basename(filename);
			// Check for whitespace in filename
			return /\s/.test(basename);
		},
	);
	for (const file of filesWithWhitespace) {
		addError(
			path.relative(rootDir, file),
			`Invalid filename: Must not contain whitespace.`,
		);
	}

	await lintTemplates(addError, addWarning);

	await configManager.loadDeviceIndex();
	const index = configManager.getIndex()!;
	// Device config files are lazy-loaded, so we need to parse them all
	const uniqueFiles = distinct(index.map((e) => e.filename)).toSorted();

	for (const file of uniqueFiles) {
		const filePath = path.join(rootDir, file);
		hasSdkVariants = false;

		// Try parsing the file
		let conditionalConfig: ConditionalDeviceConfig;
		try {
			conditionalConfig = await ConditionalDeviceConfig.from(
				fs,
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
		let hasInvalidFirmwareVersion = false;
		for (const version of conditions.get("firmwareVersion") ?? []) {
			if (!isFirmwareVersion(version)) {
				addError(
					file,
					`Firmware version "${version}" in a condition is malformed or invalid. ${firmwareVersionFormatHint}`,
				);
				hasInvalidFirmwareVersion = true;
			}
		}
		if (hasInvalidFirmwareVersion) continue;

		if (conditions.size > 0 || conditionalConfig.endpointGroups?.size) {
			const { min, max } = conditionalConfig.firmwareVersion;
			const boundaries: Set<string> =
				conditions.get("firmwareVersion") ?? new Set();
			// Check every firmware range because several conditional items can be active at once between two boundaries
			const fwVersions = getVersionRangeStarts(boundaries, min);

			for (const version of fwVersions) {
				if (!versionInRange(version, min, max)) {
					fwVersions.delete(version);
				}
			}

			// The SDK version may be unknown at runtime
			const sdkVersions = new Set<string | undefined>([undefined]);
			const sdkBoundaries = conditions.get("sdkVersion");
			if (sdkBoundaries?.size) {
				// Check every SDK version range too
				for (const version of getVersionRangeStarts(
					sdkBoundaries,
					"0.0",
				)) {
					sdkVersions.add(version);
				}
				hasSdkVariants = true;
			}

			// Combine each firmware and SDK version with every device ID defined in the file
			for (const deviceId of conditionalConfig.devices) {
				for (const firmwareVersion of fwVersions) {
					for (const sdkVersion of sdkVersions) {
						variants.push({
							manufacturerId: conditionalConfig.manufacturerId,
							...deviceId,
							firmwareVersion,
							sdkVersion,
						});
					}
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

			if (config.endpointGroups) {
				const membership = new Map<number, number>();
				let mainDeviceGroup: number | undefined;
				for (const [id, group] of config.endpointGroups) {
					for (const endpoint of group.endpoints) {
						const otherGroup = membership.get(endpoint);
						if (otherGroup !== undefined) {
							addError(
								file,
								`Endpoint ${endpoint} belongs to multiple active endpoint groups: ${otherGroup} and ${id}`,
								variant,
							);
						}
						membership.set(endpoint, id);
					}
					if (group.isMainDevice) {
						if (mainDeviceGroup !== undefined) {
							addError(
								file,
								`Multiple active endpoint groups are marked as the main device: ${mainDeviceGroup} and ${id}`,
								variant,
							);
						}
						mainDeviceGroup = id;
					}
				}
			}

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

			// Lint config parameters for the root endpoint
			if (config.paramInformation?.size) {
				lintUnconditionalParamInformation(config.paramInformation, {
					file,
					variant,
					addError,
					addWarning,
				});
			}

			// Lint config parameters for additional endpoints
			if (config.endpoints?.size) {
				for (const [index, endpoint] of config.endpoints) {
					if (endpoint.paramInformation?.size) {
						lintUnconditionalParamInformation(
							endpoint.paramInformation,
							{
								file,
								variant,
								addError: (filename, message, variant) =>
									addError(filename, message, variant, index),
								addWarning: (filename, message, variant) =>
									addWarning(
										filename,
										message,
										variant,
										index,
									),
							},
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
					minMajor < 0
					|| minMajor > 255
					|| minMinor < 0
					|| minMinor > 255
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
					maxMajor < 0
					|| maxMajor > 255
					|| maxMinor < 0
					|| maxMinor > 255
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
					leadingZeroMajor.test(config.firmwareVersion.min)
					|| leadingZeroMinor.test(config.firmwareVersion.min)
				) {
					addError(
						file,
						`The minimum firmware version ${config.firmwareVersion.min} is invalid. Leading zeroes are not permitted.`,
					);
				}
				if (
					leadingZeroMajor.test(config.firmwareVersion.max)
					|| leadingZeroMinor.test(config.firmwareVersion.max)
				) {
					addError(
						file,
						`The maximum firmware version ${config.firmwareVersion.max} is invalid. Leading zeroes are not permitted.`,
					);
				}
			}
		}

		if (conditionalConfig.endpointGroups) {
			for (const [id, group] of conditionalConfig.endpointGroups) {
				// A main-device group may legitimately wrap a single whole-device
				// total endpoint, so it is exempt from the singleton warning.
				if (group.endpoints.length === 1 && !group.isMainDevice) {
					addWarning(
						file,
						`Endpoint group ${id} contains only one endpoint. Consider using an endpoint label.`,
					);
				}
			}
		}

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

		// Lint the conditional param information
		// On the root device
		if (conditionalConfig.paramInformation) {
			lintConditionalParamInformation(
				conditionalConfig.paramInformation,
				{
					file,
					addError,
					addWarning,
				},
			);
		}
		// And on endpoints
		if (conditionalConfig.endpoints?.size) {
			for (const [index, endpoint] of conditionalConfig.endpoints) {
				if (endpoint.paramInformation?.size) {
					lintConditionalParamInformation(endpoint.paramInformation, {
						file,
						addError: (filename, message) =>
							addError(filename, message, undefined, index),
						addWarning: (filename, message) =>
							addWarning(filename, message, undefined, index),
					});
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
			// Ensure that the firmware version ranges do not overlap,
			// except if one is preferred and the other isn't
			if (
				versionInRange(me.min, other.min, other.max)
				|| versionInRange(me.max, other.min, other.max)
				|| versionInRange(other.min, me.min, me.max)
				|| versionInRange(other.max, me.min, me.max)
			) {
				if (entry.preferred !== index[firstIndex].preferred) {
					continue;
				}
			} else {
				continue;
			}
		}
		// This is a duplicate!
		addError(
			entry.filename,
			`Duplicate config file detected for device (manufacturer id = ${entry.manufacturerId}, product type = ${entry.productType}, product id = ${entry.productId}, firmware range ${me.min} to ${me.max})
The first occurrence of this device is in file config/devices/${
				index[firstIndex].filename
			}, firmware range ${other.min} to ${other.max}.
If this is intended, consider marking one of the config files as preferred or split files by firmware version.`,
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

function validateAllowedValuesDefinition(
	allowedDefs: ParamInformation["allowed"],
	paramName: string,
	file: string,
	addError: (file: string, error: string, variant?: DeviceID) => void,
	variant?: DeviceID,
): void {
	for (const def of allowedDefs) {
		if ("value" in def) continue;

		// Range validation
		const { from, to, step = 1 } = def;

		if (step <= 0) {
			addError(
				file,
				`${paramName}: step must be positive (got ${step})`,
				variant,
			);
			continue;
		}

		if (from > to) {
			addError(
				file,
				`${paramName}: range 'from' (${from}) must be <= 'to' (${to})`,
				variant,
			);
			continue;
		}

		if ((to - from) % step !== 0) {
			addError(
				file,
				`${paramName}: (to - from) must be evenly divisible by step. Range: ${from}-${to}, step: ${step}`,
				variant,
			);
		}
	}
}

function lintUnconditionalParamInformation(
	paramInformation: ParamInfoMap,
	{ file, variant, addError, addWarning }: LintDevicesContext,
): void {
	for (const [
		{ parameter, valueBitMask },
		{ label, description },
	] of paramInformation.entries()) {
		// Check if the description is too similar to the label
		if (description != undefined) {
			const normalizedDistance =
				levenshtein(label, description)
				/ Math.max(label.length, description.length);
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
	] of paramInformation.entries()) {
		if (
			!value.allowManualEntry
			&& !value.readOnly
			&& !value.options?.length
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
	] of paramInformation.entries()) {
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
	] of paramInformation.entries()) {
		if (
			!value.allowManualEntry
			&& !value.readOnly
			&& !value.options?.length
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
			value.readOnly !== undefined
			&& value.writeOnly !== undefined
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
	] of paramInformation.entries()) {
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
					)} is invalid: option value ${option.value} duplicated between "${
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
	] of paramInformation.entries()) {
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
			const limits = getIntegerLimits(value.valueSize as any, true);
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
					)} is invalid: cannot determine limits for valueSize ${value.valueSize}!`,
					variant,
				);
			} else {
				const fitsSignedLimits =
					value.minValue >= limits.min
					&& value.minValue <= limits.max
					&& value.maxValue >= limits.min
					&& value.maxValue <= limits.max;
				const fitsUnsignedLimits =
					value.minValue >= unsignedLimits.min
					&& value.minValue <= unsignedLimits.max
					&& value.maxValue >= unsignedLimits.min
					&& value.maxValue <= unsignedLimits.max;

				if (!value.unsigned && !fitsSignedLimits) {
					if (fitsUnsignedLimits) {
						addError(
							file,
							`${paramNoToString(
								parameter,
								valueBitMask,
							)} is invalid: Value range ${value.minValue}...${value.maxValue} is incompatible with valueSize ${value.valueSize} (min = ${limits.min}, max = ${limits.max}).
Consider converting this parameter to unsigned using ${c.white(
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
								)} is invalid: minValue ${value.minValue} is incompatible with valueSize ${value.valueSize} (min = ${limits.min})!`,
								variant,
							);
						}
						if (value.maxValue > limits.max) {
							addError(
								file,
								`${paramNoToString(
									parameter,
									valueBitMask,
								)} is invalid: maxValue ${value.maxValue} is incompatible with valueSize ${value.valueSize} (max = ${limits.max})!`,
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
							)} is invalid: minValue ${value.minValue} is incompatible with valueSize ${value.valueSize} (min = ${unsignedLimits.min})!`,
							variant,
						);
					}
					if (value.maxValue > unsignedLimits.max) {
						addError(
							file,
							`${paramNoToString(
								parameter,
								valueBitMask,
							)} is invalid: maxValue ${value.maxValue} is incompatible with valueSize ${value.valueSize} (max = ${unsignedLimits.max})!`,
							variant,
						);
					}
				}
			}
		}
	}

	// Validate the allowed field definitions if present
	for (const [
		{ parameter, valueBitMask },
		value,
	] of paramInformation.entries()) {
		if (value.allowed) {
			validateAllowedValuesDefinition(
				value.allowed,
				paramNoToString(parameter, valueBitMask),
				file,
				addError,
				variant,
			);
		}
	}

	// Check if there are parameters with predefined options that are not compatible with min/maxValue
	for (const [
		{ parameter, valueBitMask },
		value,
	] of paramInformation.entries()) {
		if (!value.options.length) continue;
		for (const option of value.options) {
			if (
				option.value < value.minValue
				|| option.value > value.maxValue
			) {
				addError(
					file,
					`${paramNoToString(
						parameter,
						valueBitMask,
					)} is invalid: The option value ${option.value} must be in the range ${value.minValue}...${value.maxValue}!`,
					variant,
				);
			}
		}

		// Check if writable params without manual entry have unnecessarily wide min/max value ranges
		if (!value.readOnly && value.allowManualEntry === false) {
			const actualMin = Math.min(...value.options.map((o) => o.value));
			const actualMax = Math.max(...value.options.map((o) => o.value));
			if (value.minValue < actualMin) {
				addError(
					file,
					`${paramNoToString(
						parameter,
						valueBitMask,
					)} is invalid: minValue ${value.minValue} is less than the minimum option value ${actualMin}! If allowManualEntry is false, minValue must be omitted or match the option values.`,
					variant,
				);
			}
			if (value.maxValue > actualMax) {
				addError(
					file,
					`${paramNoToString(
						parameter,
						valueBitMask,
					)} is invalid: maxValue ${value.maxValue} is greater than the maximum option value ${actualMax}! If allowManualEntry is false, maxValue must be omitted or match the option values.`,
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
	for (const [param, { label }] of paramInformation.entries()) {
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
							p.valueBitMask ? `[${num2hex(p.valueBitMask)}]` : ""
						}`,
				)
				.join(", ")}`,
			variant,
		);
	}

	const partialParams = [...paramInformation.entries()].filter(
		([k]) => !!k.valueBitMask,
	);

	// Checking if there are parameters with a single bit mask happens for the condional config,
	// not the evaluated one

	// Check if there are partial parameters and non-partials with the same number
	const duplicatedPartials = distinct(
		partialParams.map(([key]) => key.parameter),
	).filter((parameter) => paramInformation.has({ parameter }));
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
				)}]: minimum value ${param.minValue} is incompatible with the bit mask (${bitMask}, aligned ${shiftedBitMask}). Minimum value expected to be >= ${minValue}.`,
				variant,
			);
		}
		if (param.maxValue > maxValue) {
			addError(
				file,
				`Parameter #${key.parameter}[${num2hex(
					bitMask,
				)}]: maximum value ${param.maxValue} is incompatible with the bit mask (${bitMask}, aligned ${shiftedBitMask}). Maximum value expected to be <= ${maxValue}.`,
				variant,
			);
		}
		if (param.defaultValue < minValue || param.defaultValue > maxValue) {
			addError(
				file,
				`Parameter #${key.parameter}[${num2hex(
					bitMask,
				)}]: default value ${param.defaultValue} is incompatible with the bit mask (${bitMask}, aligned ${shiftedBitMask}). Default value expected to be between ${minValue} and ${maxValue}.`,
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
				key.parameter === kk.parameter
				&& key.valueBitMask !== kk.valueBitMask,
		);
		if (others.some(([, other]) => other.valueSize !== param.valueSize)) {
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
					)}]: Option ${opt.value} is incompatible with the bit mask (${bitMask}, aligned ${shiftedBitMask}). Value expected to be between ${minValue} and ${maxValue}`,
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
				)}]: valueSize ${param.valueSize} is incompatible with the bit mask ${num2hex(
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
	] of paramInformation.entries()) {
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

function lintConditionalParamInformation(
	paramInformation: ConditionalParamInfoMap,
	{ file, addError }: LintDevicesContextConditional,
): void {
	// Ensure the unconditional variant comes last
	for (const [key, definitions] of paramInformation) {
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

	// Check if there is an unnecessary conditional config with a single full-width bitmask
	const partialParams = [...paramInformation.entries()].filter(
		([k]) => !!k.valueBitMask,
	);

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

				if (shiftAmount === 0 && param.valueSize === bitMaskWidth / 8) {
					addError(
						file,
						`Parameter #${key.parameter} has a single bit mask defined which covers the entire value. Either add more, or delete the bit mask.`,
					);
				}
			}
		}
	}
}

export async function lintConfigFiles(): Promise<void> {
	// Set NODE_ENV to test in order to trigger stricter checks
	process.env.NODE_ENV = "test";
	try {
		await lintManufacturers();
		await lintDevices();

		console.log();
		console.log(c.green("The config files are valid!"));
		console.log();
		console.log(" ");
	} catch (e: any) {
		if (typeof e.stack === "string") {
			const lines = (e.stack as string).split("\n");
			if (lines[0].trim().toLowerCase() === "error:") {
				lines.shift();
			}
			const message = lines.join("\n");
			console.log(c.red(message));
		} else {
			console.log(c.red(e.message));
		}
		console.log();

		// Github actions truncates our logs if we don't wait before exiting the process
		await wait(5000);
		return process.exit(1);
	}
}

if (esMain(import.meta)) void lintConfigFiles();
