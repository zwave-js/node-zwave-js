import type { ValueType } from "@zwave-js/core";
import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { JSONObject, num2hex } from "@zwave-js/shared";
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import log from "./Logger";
import { configDir, hexKeyRegexNDigits, throwInvalidConfig } from "./utils";

const configPath = path.join(configDir, "indicators.json");
let indicators: ReadonlyMap<number, string> | undefined;
let properties: ReadonlyMap<number, IndicatorProperty> | undefined;

/** @internal */
export async function loadIndicatorsInternal(): Promise<{
	indicators: Exclude<typeof indicators, undefined>;
	properties: Exclude<typeof properties, undefined>;
}> {
	if (!(await pathExists(configPath))) {
		throw new ZWaveError(
			"The config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}

	try {
		const fileContents = await readFile(configPath, "utf8");
		const definition = JSON5.parse(fileContents) as unknown;
		if (!isObject(definition)) {
			throwInvalidConfig("indicators", "the database is not an object");
		}
		if (!("indicators" in definition)) {
			throwInvalidConfig(
				"indicators",
				`the required key "indicators" is missing`,
			);
		}
		if (!("properties" in definition)) {
			throwInvalidConfig(
				"indicators",
				`the required key "properties" is missing`,
			);
		}

		const _indicators = new Map<number, string>();
		for (const [id, label] of entries((definition as any).indicators)) {
			if (!hexKeyRegexNDigits.test(id)) {
				throwInvalidConfig(
					"indicators",
					`found non-hex key "${id}" in "indicators"`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			_indicators.set(idNum, label);
		}
		indicators = _indicators;

		const _properties = new Map<number, IndicatorProperty>();
		for (const [id, propDefinition] of entries(
			(definition as any).properties,
		)) {
			if (!hexKeyRegexNDigits.test(id)) {
				throwInvalidConfig(
					"indicators",
					`found non-hex key "${id}" in "properties"`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			_properties.set(
				idNum,
				new IndicatorProperty(idNum, propDefinition),
			);
		}
		properties = _properties;

		return { indicators, properties };
	} catch (e: unknown) {
		if (e instanceof ZWaveError) {
			throw e;
		} else {
			throwInvalidConfig("indicators");
		}
	}
}

export async function loadIndicators(): Promise<void> {
	try {
		await loadIndicatorsInternal();
	} catch (e: unknown) {
		// If the config file is missing or invalid, don't try to find it again
		if (
			e instanceof ZWaveError &&
			e.code === ZWaveErrorCodes.Config_Invalid
		) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.config.print(
					`Could not indicators config: ${e.message}`,
					"error",
				);
			}
			if (!indicators) indicators = new Map();
			if (!properties) properties = new Map();
		} else {
			// This is an unexpected error
			throw e;
		}
	}
}

/**
 * Looks up the label for a given indicator id
 */
export function lookupIndicator(indicatorId: number): string | undefined {
	if (!indicators) {
		throw new ZWaveError(
			"The config has not been loaded yet!",
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	return indicators.get(indicatorId);
}

/**
 * Looks up the property definition for a given indicator property id
 */
export function lookupProperty(
	propertyId: number,
): IndicatorProperty | undefined {
	if (!properties) {
		throw new ZWaveError(
			"The config has not been loaded yet!",
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	return properties.get(propertyId);
}

export class IndicatorProperty {
	public constructor(id: number, definition: JSONObject) {
		this.id = id;

		if (typeof definition.label !== "string") {
			throwInvalidConfig(
				"indicators",
				`The label for property ${num2hex(id)} is not a string!`,
			);
		}
		this.label = definition.label;

		if (
			definition.description != undefined &&
			typeof definition.description !== "string"
		) {
			throwInvalidConfig(
				"indicators",
				`The description for property ${num2hex(id)} is not a string!`,
			);
		}
		this.description = definition.description;

		if (definition.min != undefined && typeof definition.min !== "number") {
			throwInvalidConfig(
				"indicators",
				`The minimum value for property ${num2hex(
					id,
				)} is not a number!`,
			);
		}
		this.min = definition.min;

		if (definition.max != undefined && typeof definition.max !== "number") {
			throwInvalidConfig(
				"indicators",
				`The maximum value for property ${num2hex(
					id,
				)} is not a number!`,
			);
		}
		this.max = definition.max;

		if (
			definition.readonly != undefined &&
			typeof definition.readonly !== "boolean"
		) {
			throwInvalidConfig(
				"indicators",
				`readonly for property ${num2hex(id)} is not a boolean!`,
			);
		}
		this.readonly = definition.readonly;

		if (
			definition.type != undefined &&
			typeof definition.type !== "string"
		) {
			throwInvalidConfig(
				"indicators",
				`type for property ${num2hex(id)} is not a string!`,
			);
		}
		// TODO: Validate that the value is ok
		this.type = definition.type;
	}

	public readonly id: number;
	public readonly label: string;
	public readonly description: string | undefined;
	public readonly min: number | undefined;
	public readonly max: number | undefined;
	public readonly readonly: boolean | undefined;
	public readonly type: ValueType | undefined;
}
