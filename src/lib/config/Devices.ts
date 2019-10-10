import { padStart } from "alcalzone-shared/strings";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import log from "../log";
import { JSONObject } from "../util/misc";
import { configDir } from "./utils";

/**
 * Looks up the definition of a given device in the configuration DB
 * @param manufacturerId The manufacturer id of the device
 * @param productId The product id of the device
 * @param productType The product type of the device
 * @param firmwareVersion If known, configuration for a specific firmware version can be loaded
 */
export async function lookupDevice(
	manufacturerId: number,
	productId: number,
	productType: number,
	firmwareVersion?: string,
): Promise<JSONObject | undefined> {
	const deviceConfigPath = path.join(
		configDir,
		"devices",
		"0x" + padStart(manufacturerId.toString(16), 4, "0"),
		"0x" + padStart(productId.toString(16), 4, "0"),
		"0x" + padStart(productType.toString(16), 4, "0"),
	);

	const possibilities = [`${deviceConfigPath}.json`];
	if (firmwareVersion) {
		// Try specific firmware versions first
		possibilities.unshift(`${deviceConfigPath}_${firmwareVersion}.json`);
	}
	// Try to load the possible config files in order
	for (const filePath of possibilities) {
		if (!(await pathExists(filePath))) continue;
		try {
			const fileContents = await readFile(filePath, "utf8");
			return JSON5.parse(fileContents);
		} catch (e) {
			log.driver.print(
				`Error loading device config ${filePath}`,
				"error",
			);
		}
	}
}
