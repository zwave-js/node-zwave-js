import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { JSONObject } from "../util/misc";
import { configDir } from "./utils";

const hexKeyRegex = /^0x[a-fA-F0-9]+$/;
const configPath = path.join(configDir, "sensorTypes.json");

function throwInvalidConfig(): never {
	throw new ZWaveError(
		"The config file is malformed!",
		ZWaveErrorCodes.Config_Invalid,
	);
}

async function loadSensorTypes(): Promise<ReadonlyMap<number, SensorType>> {
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
		for (const [key, sensorDefinition] of entries(definition)) {
			if (!hexKeyRegex.test(key)) throwInvalidConfig();
			const keyNum = parseInt(key.slice(2), 16);
			ret.set(keyNum, new SensorType(keyNum, sensorDefinition));
		}
		return ret;
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
}

let sensorTypes: ReadonlyMap<number, SensorType> | undefined;

/**
 * Looks up the configuration for a given sensor type
 */
export async function lookupSensorType(
	sensorType: number,
): Promise<SensorType | undefined> {
	if (!sensorTypes) {
		try {
			sensorTypes = await loadSensorTypes();
		} catch (e) {
			// If the config file is missing or invalid, don't try to find it again
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Config_Invalid
			) {
				log.driver.print(
					`Could not load sensor types config: ${e.message}`,
					"error",
				);
				sensorTypes = new Map();
			} else {
				// This is an unexpected error
				throw e;
			}
		}
	}
	return sensorTypes.get(sensorType);
}

export class SensorType {
	public constructor(key: number, definition: JSONObject) {
		this.key = key;
		if (typeof definition.label !== "string") throwInvalidConfig();
		this.label = definition.label;

		const scales = new Map<number, SensorScale>();
		if (!isObject(definition.scales)) throwInvalidConfig();
		for (const [scaleKey, scaleDefinition] of entries(definition.scales)) {
			if (!hexKeyRegex.test(scaleKey)) throwInvalidConfig();
			const scaleKeyNum = parseInt(scaleKey.slice(2), 16);
			scales.set(
				scaleKeyNum,
				new SensorScale(scaleKeyNum, scaleDefinition),
			);
		}
		this.scales = scales;
	}

	public readonly key: number;
	public readonly label: string;
	public readonly scales: ReadonlyMap<number, SensorScale>;
}

export class SensorScale {
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
