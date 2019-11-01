import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { JSONObject } from "../util/misc";
import { configDir, hexKeyRegex, throwInvalidConfig } from "./utils";

const configPath = path.join(configDir, "scales.json");
let namedScales: ReadonlyMap<string, ReadonlyMap<number, Scale>> | undefined;

export async function loadNamedScales(): Promise<void> {
	try {
		if (!(await pathExists(configPath))) {
			throw new ZWaveError(
				"The config file does not exist!",
				ZWaveErrorCodes.Config_Invalid,
			);
		}

		try {
			const fileContents = await readFile(configPath, "utf8");
			const definition = JSON5.parse(fileContents);
			if (!isObject(definition)) throwInvalidConfig();

			const ret = new Map();
			for (const [name, scales] of entries(definition)) {
				const named = new Map<number, Scale>();
				for (const [key, scaleDefinition] of entries(scales)) {
					if (!hexKeyRegex.test(key)) throwInvalidConfig();
					const keyNum = parseInt(key.slice(2), 16);
					named.set(keyNum, new Scale(keyNum, scaleDefinition));
				}
				ret.set(name, named);
			}
			namedScales = ret;
		} catch (e) {
			if (e instanceof ZWaveError) {
				throw e;
			} else {
				throw new ZWaveError(
					"The config file is malformed!",
					ZWaveErrorCodes.Config_Invalid,
				);
			}
		}
	} catch (e) {
		// If the config file is missing or invalid, don't try to find it again
		if (
			e instanceof ZWaveError &&
			e.code === ZWaveErrorCodes.Config_Invalid
		) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.driver.print(
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
 * Looks up the configuration for a given sensor type
 */
export function lookupNamedScales(
	name: string,
): ReadonlyMap<number, Scale> | undefined {
	return namedScales!.get(name);
}

export class Scale {
	public constructor(key: number, definition: JSONObject) {
		this.key = key;

		if (typeof definition.label !== "string") throwInvalidConfig();
		this.label = definition.label;
		if (
			definition.unit != undefined &&
			typeof definition.unit !== "string"
		) {
			throwInvalidConfig();
		}
		this.unit = definition.unit;
		if (
			definition.description != undefined &&
			typeof definition.description !== "string"
		) {
			throwInvalidConfig();
		}
		this.description = definition.description;
	}

	public readonly key: number;
	public readonly unit: string | undefined;
	public readonly label: string;
	public readonly description: string | undefined;
}
