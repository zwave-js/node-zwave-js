import { isZWaveError, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
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

export type ScaleGroup = ReadonlyMap<number, Scale> & {
	/** The name of the scale group if it is named */
	readonly name?: string;
};
export type NamedScalesGroupMap = ReadonlyMap<string, ScaleGroup>;

/** @internal */
export async function loadNamedScalesInternal(
	externalConfig?: boolean,
): Promise<NamedScalesGroupMap> {
	const configPath = path.join(
		(externalConfig && externalConfigDir()) || configDir,
		"scales.json",
	);

	if (!(await pathExists(configPath))) {
		throw new ZWaveError(
			"The named scales config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}

	try {
		const fileContents = await readFile(configPath, "utf8");
		const definition = JSON5.parse(fileContents);
		if (!isObject(definition)) {
			throwInvalidConfig(
				"named scales",
				`the dictionary is not an object`,
			);
		}

		const namedScales = new Map<string, ScaleGroup>();
		for (const [name, scales] of entries(definition)) {
			if (!/[\w\d]+/.test(name)) {
				throwInvalidConfig(
					"named scales",
					`Name ${name} contains other characters than letters and numbers`,
				);
			}
			const named: Map<number, Scale> & { name?: string } = new Map<
				number,
				Scale
			>();
			named.name = name;
			for (const [key, scaleDefinition] of entries(
				scales as JSONObject,
			)) {
				if (!hexKeyRegexNDigits.test(key)) {
					throwInvalidConfig(
						"named scales",
						`found invalid key "${key}" in the definition for "${name}". Scales must have lowercase hexadecimal IDs.`,
					);
				}
				const keyNum = parseInt(key.slice(2), 16);
				named.set(keyNum, new Scale(keyNum, scaleDefinition));
			}
			namedScales.set(name, named);
		}
		return namedScales;
	} catch (e) {
		if (isZWaveError(e)) {
			throw e;
		} else {
			throwInvalidConfig("named scales");
		}
	}
}

export function getDefaultScale(scale: number): Scale {
	return new Scale(scale, {
		unit: undefined,
		label: "Unknown",
	});
}

export class Scale {
	public constructor(key: number, definition: JSONObject) {
		this.key = key;

		if (typeof definition.label !== "string") {
			throwInvalidConfig(
				"named scales",
				`The label for scale ${num2hex(key)} is not a string!`,
			);
		}
		this.label = definition.label;
		if (
			definition.unit != undefined &&
			typeof definition.unit !== "string"
		) {
			throwInvalidConfig(
				"named scales",
				`The unit for scale ${num2hex(key)} is not a string!`,
			);
		}
		this.unit = definition.unit;
		if (
			definition.description != undefined &&
			typeof definition.description !== "string"
		) {
			throwInvalidConfig(
				"named scales",
				`The description for scale ${num2hex(key)} is not a string!`,
			);
		}
		this.description = definition.description;
	}

	public readonly key: number;
	public readonly unit: string | undefined;
	public readonly label: string;
	public readonly description: string | undefined;
}
