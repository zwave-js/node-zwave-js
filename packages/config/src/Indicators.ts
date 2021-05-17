import {
	isZWaveError,
	ValueType,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { JSONObject, num2hex } from "@zwave-js/shared";
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import {
	configDir,
	externalConfigDir,
	hexKeyRegexNDigits,
	throwInvalidConfig,
} from "./utils";

export type IndicatorMap = ReadonlyMap<number, string>;
export type IndicatorPropertiesMap = ReadonlyMap<number, IndicatorProperty>;

/** @internal */
export async function loadIndicatorsInternal(
	externalConfig?: boolean,
): Promise<{
	indicators: IndicatorMap;
	properties: IndicatorPropertiesMap;
}> {
	const indicatorsConfigPath = path.join(
		(externalConfig && externalConfigDir) || configDir,
		"indicators.json",
	);

	if (!(await pathExists(indicatorsConfigPath))) {
		throw new ZWaveError(
			"The config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}

	try {
		const fileContents = await readFile(indicatorsConfigPath, "utf8");
		const definition = JSON5.parse(fileContents);
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

		const indicators = new Map<number, string>();
		for (const [id, label] of entries(definition.indicators)) {
			if (!hexKeyRegexNDigits.test(id)) {
				throwInvalidConfig(
					"indicators",
					`found non-hex key "${id}" in "indicators"`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			indicators.set(idNum, label);
		}

		const properties = new Map<number, IndicatorProperty>();
		for (const [id, propDefinition] of entries(definition.properties)) {
			if (!hexKeyRegexNDigits.test(id)) {
				throwInvalidConfig(
					"indicators",
					`found non-hex key "${id}" in "properties"`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			properties.set(idNum, new IndicatorProperty(idNum, propDefinition));
		}

		return { indicators, properties };
	} catch (e: unknown) {
		if (isZWaveError(e)) {
			throw e;
		} else {
			throwInvalidConfig("indicators");
		}
	}
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
