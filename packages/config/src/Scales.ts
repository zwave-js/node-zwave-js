import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { JSONObject, num2hex } from "@zwave-js/shared";
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import log from "./Logger";
import { configDir, hexKeyRegexNDigits, throwInvalidConfig } from "./utils";

const configPath = path.join(configDir, "scales.json");
let namedScales: ReadonlyMap<string, ReadonlyMap<number, Scale>> | undefined;

/** @internal */
export async function loadNamedScalesInternal(): Promise<
	Exclude<typeof namedScales, undefined>
> {
	if (!(await pathExists(configPath))) {
		throw new ZWaveError(
			"The named scales config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}

	try {
		const fileContents = await readFile(configPath, "utf8");
		const definition = JSON5.parse(fileContents) as unknown;
		if (!isObject(definition)) {
			throwInvalidConfig(
				"named scales",
				`the dictionary is not an object`,
			);
		}

		const ret = new Map();
		for (const [name, scales] of entries(definition)) {
			if (!/[\w\d]+/.test(name)) {
				throwInvalidConfig(
					"named scales",
					`Name ${name} contains other characters than letters and numbers`,
				);
			}
			const named = new Map<number, Scale>();
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			for (const [key, scaleDefinition] of entries(scales as any)) {
				if (!hexKeyRegexNDigits.test(key)) {
					throwInvalidConfig(
						"named scales",
						`found non-hex key "${key}" in the definition for "${name}"`,
					);
				}
				const keyNum = parseInt(key.slice(2), 16);
				named.set(keyNum, new Scale(keyNum, scaleDefinition));
			}
			ret.set(name, named);
		}
		namedScales = ret;
		return ret;
	} catch (e: unknown) {
		if (e instanceof ZWaveError) {
			throw e;
		} else {
			throwInvalidConfig("named scales");
		}
	}
}

export async function loadNamedScales(): Promise<void> {
	try {
		await loadNamedScalesInternal();
	} catch (e: unknown) {
		// If the config file is missing or invalid, don't try to find it again
		if (
			e instanceof ZWaveError &&
			e.code === ZWaveErrorCodes.Config_Invalid
		) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.config.print(
					`Could not load scales config: ${e.message}`,
					"error",
				);
			}
			namedScales = new Map();
		} else {
			// This is an unexpected error
			throw e;
		}
	}
}

/**
 * Looks up all scales defined under a given name
 */
export function lookupNamedScaleGroup(
	name: string,
): ReadonlyMap<number, Scale> | undefined {
	if (!namedScales) {
		throw new ZWaveError(
			"The config has not been loaded yet!",
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	return namedScales.get(name);
}

export function getDefaultScale(scale: number): Scale {
	return new Scale(scale, {
		unit: undefined,
		label: "Unknown",
	});
}

/** Looks up a scale definition for a given sensor type */
export function lookupNamedScale(name: string, scale: number): Scale {
	const group = lookupNamedScaleGroup(name);
	return group?.get(scale) ?? getDefaultScale(scale);
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
