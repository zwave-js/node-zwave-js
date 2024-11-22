import { ZWaveError, ZWaveErrorCodes, isZWaveError } from "@zwave-js/core";
import {
	formatId,
	pathExists,
	readTextFile,
	stringify,
	writeTextFile,
} from "@zwave-js/shared";
import {
	type ReadFile,
	type ReadFileSystemInfo,
	type WriteFile,
} from "@zwave-js/shared/bindings";
import { isObject } from "alcalzone-shared/typeguards";
import JSON5 from "json5";
import path from "pathe";
import { configDir } from "./utils.js";
import { hexKeyRegex4Digits, throwInvalidConfig } from "./utils_safe.js";

export type ManufacturersMap = Map<number, string>;

/** @internal */
export async function loadManufacturersInternal(
	fs: ReadFileSystemInfo & ReadFile,
	externalConfigDir?: string,
): Promise<ManufacturersMap> {
	const configPath = path.join(
		externalConfigDir || configDir,
		"manufacturers.json",
	);

	if (!(await pathExists(fs, configPath))) {
		throw new ZWaveError(
			"The manufacturer config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}
	try {
		const fileContents = await readTextFile(fs, configPath, "utf8");
		const definition = JSON5.parse(fileContents);
		if (!isObject(definition)) {
			throwInvalidConfig(
				"manufacturers",
				`the database is not an object!`,
			);
		}

		const manufacturers = new Map();
		for (const [id, name] of Object.entries(definition)) {
			if (!hexKeyRegex4Digits.test(id)) {
				throwInvalidConfig(
					"manufacturers",
					`found invalid key ${id} at the root level. Manufacturer IDs must be hexadecimal lowercase.`,
				);
			}
			if (typeof name !== "string") {
				throwInvalidConfig(
					"manufacturers",
					`Key ${id} has a non-string manufacturer name`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			manufacturers.set(idNum, name);
		}

		return manufacturers;
	} catch (e) {
		if (isZWaveError(e) || ((e as any).code === "ENOENT")) {
			throw e;
		} else {
			throwInvalidConfig("manufacturers");
		}
	}
}

/**
 * Write current manufacturers map to json
 */
export async function saveManufacturersInternal(
	fs: WriteFile,
	manufacturers: ManufacturersMap,
): Promise<void> {
	const data: Record<string, string> = {};

	const orderedMap = new Map(
		[...manufacturers].sort((a, b) => (a[0] > b[0] ? 1 : -1)),
	);

	for (const [id, name] of orderedMap) {
		data[formatId(id)] = name;
	}

	const configPath = path.join(configDir, "manufacturers.json");
	await writeTextFile(fs, configPath, stringify(data, "\t") + "\n");
}
