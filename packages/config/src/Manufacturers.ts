import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile, writeFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import log from "./Logger";
import {
	configDir,
	formatId,
	hexKeyRegex4Digits,
	stringify,
	throwInvalidConfig,
} from "./utils";

const configPath = path.join(configDir, "manufacturers.json");
let manufacturers: Map<number, string> | undefined;

/** @internal */
export async function loadManufacturersInternal(): Promise<void> {
	if (!(await pathExists(configPath))) {
		throw new ZWaveError(
			"The manufacturer config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}
	try {
		const fileContents = await readFile(configPath, "utf8");
		const definition = JSON5.parse(fileContents) as unknown;
		if (!isObject(definition)) {
			throwInvalidConfig(
				"manufacturers",
				`the database is not an object!`,
			);
		}

		const ret = new Map();
		for (const [id, name] of entries(definition)) {
			if (!hexKeyRegex4Digits.test(id)) {
				throwInvalidConfig(
					"manufacturers",
					`found non-hex key ${id} at the root level`,
				);
			}
			if (typeof name !== "string") {
				throwInvalidConfig(
					"manufacturers",
					`Key ${id} has a non-string manufacturer name`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			ret.set(idNum, name);
		}
		manufacturers = ret;
	} catch (e: unknown) {
		if (e instanceof ZWaveError) {
			throw e;
		} else {
			throwInvalidConfig("manufacturers");
		}
	}
}

export async function loadManufacturers(): Promise<void> {
	try {
		await loadManufacturersInternal();
	} catch (e: unknown) {
		// If the config file is missing or invalid, don't try to find it again
		if (
			e instanceof ZWaveError &&
			e.code === ZWaveErrorCodes.Config_Invalid
		) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.config.print(
					`Could not load manufacturers config: ${e.message}`,
					"error",
				);
			}
			manufacturers = new Map();
		} else {
			// This is an unexpected error
			throw e;
		}
	}
}

/**
 * Looks up the name of the manufacturer with the given ID in the configuration DB
 * @param manufacturerId The manufacturer id to look up
 */
export function lookupManufacturer(manufacturerId: number): string | undefined {
	if (!manufacturers) {
		throw new ZWaveError(
			"The config has not been loaded yet!",
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	return manufacturers.get(manufacturerId);
}

/**
 * Add new manufacturers to configuration DB
 * @param manufacturerId The manufacturer id to look up
 * @param manufacturerName The manufacturer name
 */
export function setManufacturer(
	manufacturerId: number,
	manufacturerName: string,
): void {
	if (!manufacturers) {
		throw new ZWaveError(
			"The config has not been loaded yet!",
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	manufacturers.set(manufacturerId, manufacturerName);
}

/**
 * Write current manufacturers map to json
 */
export async function writeManufacturersToJson(): Promise<void> {
	if (!manufacturers) {
		throw new ZWaveError(
			"The config has not been loaded yet!",
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	const data: Record<string, string> = {};

	const orderedMap = new Map(
		[...manufacturers].sort((a, b) => (a[0] > b[0] ? 1 : -1)),
	);

	for (const [id, name] of orderedMap) {
		data[formatId(id)] = name;
	}

	await writeFile(configPath, stringify(data));
}
