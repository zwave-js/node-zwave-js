import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { stringify } from "@zwave-js/shared";
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile, writeFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import {
	configDir,
	formatId,
	hexKeyRegex4Digits,
	throwInvalidConfig,
} from "./utils";

const configPath = path.join(configDir, "manufacturers.json");
export type ManufacturersMap = Map<number, string>;

/** @internal */
export async function loadManufacturersInternal(): Promise<ManufacturersMap> {
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

		const manufacturers = new Map();
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
			manufacturers.set(idNum, name);
		}

		return manufacturers;
	} catch (e: unknown) {
		if (e instanceof ZWaveError) {
			throw e;
		} else {
			throwInvalidConfig("manufacturers");
		}
	}
}

/**
 * Write current manufacturers map to json
 */
export async function writeManufacturersToJson(
	manufacturers: ManufacturersMap,
): Promise<void> {
	const data: Record<string, string> = {};

	const orderedMap = new Map(
		[...manufacturers].sort((a, b) => (a[0] > b[0] ? 1 : -1)),
	);

	for (const [id, name] of orderedMap) {
		data[formatId(id)] = name;
	}

	await writeFile(configPath, stringify(data));
}
