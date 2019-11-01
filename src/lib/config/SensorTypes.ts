import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { JSONObject } from "../util/misc";
import { num2hex } from "../util/strings";
import { lookupNamedScales, Scale } from "./Scales";
import { configDir, hexKeyRegex, throwInvalidConfig } from "./utils";

const configPath = path.join(configDir, "sensorTypes.json");

let sensorTypes: ReadonlyMap<number, SensorType> | undefined;

export async function loadSensorTypes(): Promise<void> {
	try {
		if (!(await pathExists(configPath))) {
			throw new ZWaveError(
				"The sensor types config file does not exist!",
				ZWaveErrorCodes.Config_Invalid,
			);
		}

		try {
			const fileContents = await readFile(configPath, "utf8");
			const definition = JSON5.parse(fileContents);
			if (!isObject(definition)) {
				throwInvalidConfig(
					"sensor types",
					`the dictionary is not an object`,
				);
			}

			const ret = new Map();
			for (const [key, sensorDefinition] of entries(definition)) {
				if (!hexKeyRegex.test(key)) {
					throwInvalidConfig(
						"sensor types",
						`found non-hex key "${key}" at the root`,
					);
				}
				const keyNum = parseInt(key.slice(2), 16);
				ret.set(keyNum, new SensorType(keyNum, sensorDefinition));
			}
			sensorTypes = ret;
		} catch (e) {
			if (e instanceof ZWaveError) {
				throw e;
			} else {
				throwInvalidConfig("sensor types");
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
					`Could not load sensor types config: ${e.message}`,
					"error",
				);
			}
			sensorTypes = new Map();
		} else {
			// This is an unexpected error
			throw e;
		}
	}
}

/**
 * Looks up the configuration for a given sensor type
 */
export function lookupSensorType(sensorType: number): SensorType | undefined {
	return sensorTypes!.get(sensorType);
}

/** Looks up a scale definition for a given sensor type */
export function lookupSensorScale(sensorType: number, scale: number): Scale {
	const sensor = lookupSensorType(sensorType);
	const ret = sensor && sensor.scales.get(scale);
	if (ret) return ret;
	return new Scale(scale, {
		unit: undefined,
		label: "Unknown",
	});
}

export function getSensorTypeName(sensorType: number): string {
	const sensor = lookupSensorType(sensorType);
	if (sensor) return sensor.label;
	return `UNKNOWN (${num2hex(sensorType)})`;
}

const namedScalesMarker = "$SCALES:";

export class SensorType {
	public constructor(key: number, definition: JSONObject) {
		this.key = key;
		if (typeof definition.label !== "string")
			throwInvalidConfig(
				"sensor types",
				`label for ${num2hex(key)} is not a string`,
			);
		this.label = definition.label;

		if (
			typeof definition.scales === "string" &&
			definition.scales.startsWith(namedScalesMarker)
		) {
			// This is referencing a named scale
			const scaleName = definition.scales.substr(
				namedScalesMarker.length,
			);
			const scales = lookupNamedScales(scaleName);
			if (!scales) {
				throw new ZWaveError(
					`Sensor type ${num2hex(
						key,
					)} is referencing non-existing named scale "${scaleName}"!`,
					ZWaveErrorCodes.Config_Invalid,
				);
			}
			this.scales = scales;
		} else {
			// This is an inline scale definition
			const scales = new Map<number, Scale>();
			if (!isObject(definition.scales))
				throwInvalidConfig(
					"sensor types",
					`scale definition for ${num2hex(key)} is not an object`,
				);
			for (const [scaleKey, scaleDefinition] of entries(
				definition.scales,
			)) {
				if (!hexKeyRegex.test(scaleKey))
					throwInvalidConfig(
						"sensor types",
						`found non-hex key "${scaleKey}" in sensor type ${num2hex(
							key,
						)}`,
					);
				const scaleKeyNum = parseInt(scaleKey.slice(2), 16);
				scales.set(
					scaleKeyNum,
					new Scale(scaleKeyNum, scaleDefinition),
				);
			}
			this.scales = scales;
		}
	}

	public readonly key: number;
	public readonly label: string;
	public readonly scales: ReadonlyMap<number, Scale>;
}
