import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { configDir, hexKeyRegex, throwInvalidConfig } from "./utils";

const configPath = path.join(configDir, "manufacturers.json");
let manufacturers: ReadonlyMap<number, string> | undefined;

export async function loadManufacturersInternal(): Promise<void> {
	if (!(await pathExists(configPath))) {
		throw new ZWaveError(
			"The manufacturer config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}
	try {
		const fileContents = await readFile(configPath, "utf8");
		const definition = JSON5.parse(fileContents);
		if (!isObject(definition)) {
			throwInvalidConfig(
				"manufacturers",
				`the database is not an object!`,
			);
		}

		const ret = new Map();
		for (const [id, name] of entries(definition)) {
			if (!hexKeyRegex.test(id)) {
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
	} catch (e) {
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
	} catch (e) {
		// If the config file is missing or invalid, don't try to find it again
		if (
			e instanceof ZWaveError &&
			e.code === ZWaveErrorCodes.Config_Invalid
		) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.driver.print(
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
	return manufacturers!.get(manufacturerId);
}
