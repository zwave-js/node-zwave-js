import { padStart } from "alcalzone-shared/strings";
import { pathExists, readFile } from "fs-extra";
import * as JSON5 from "json5";
import * as path from "path";
import { JSONObject } from "../util/misc";
import { configDir } from "./utils";

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
		if (!(await pathExists(filePath))) return;
		const fileContents = await readFile(filePath, "utf8");
		return JSON5.parse(fileContents);
	}
}
