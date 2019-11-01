import { padStart } from "alcalzone-shared/strings";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { configDir, throwInvalidConfig } from "./utils";

const configPath = path.join(configDir, "manufacturers.json");

let manufacturers: Record<string, string> | undefined;
async function loadManufacturers(): Promise<Record<string, string>> {
	if (!(await pathExists(configPath))) {
		throw new ZWaveError(
			"The config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}
	try {
		const fileContents = await readFile(configPath, "utf8");
		return JSON5.parse(fileContents);
	} catch (e) {
		throwInvalidConfig("manufacturers");
	}
}

/**
 * Looks up the name of the manufacturer with the given ID in the configuration DB
 * @param manufacturerId The manufacturer id to look up
 */
export async function lookupManufacturer(
	manufacturerId: number,
): Promise<string | undefined> {
	if (!manufacturers) {
		try {
			manufacturers = await loadManufacturers();
		} catch (e) {
			// If the config file is missing or invalid, don't try to find it again
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Config_Invalid
			) {
				if (process.env.NODE_ENV !== "test") {
					// FIXME: This call breaks when using jest.isolateModule()
					log.driver.print(
						`Could not load manufacturer config: ${e.message}`,
						"error",
					);
				}
				manufacturers = {};
			} else {
				// This is an unexpected error
				throw e;
			}
		}
	}
	const key = "0x" + padStart(manufacturerId.toString(16), 4, "0");
	return manufacturers[key];
}
