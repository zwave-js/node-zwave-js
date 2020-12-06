import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { JSONObject, num2hex } from "@zwave-js/shared";
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import log from "./Logger";
import { getDefaultScale, lookupNamedScaleGroup, Scale } from "./Scales";
import { configDir, hexKeyRegexNDigits, throwInvalidConfig } from "./utils";

const configPath = path.join(configDir, "sensorTypes.json");
let sensorTypes: ReadonlyMap<number, SensorType> | undefined;

/** @internal */
export async function loadSensorTypesInternal(): Promise<void> {
	if (!(await pathExists(configPath))) {
		throw new ZWaveError(
			"The sensor types config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}

	try {
		const fileContents = await readFile(configPath, "utf8");
		const definition = JSON5.parse(fileContents) as unknown;
		if (!isObject(definition)) {
			throwInvalidConfig(
				"sensor types",
				`the dictionary is not an object`,
			);
		}

		const ret = new Map();
		for (const [key, sensorDefinition] of entries(definition)) {
			if (!hexKeyRegexNDigits.test(key)) {
				throwInvalidConfig(
					"sensor types",
					`found non-hex key "${key}" at the root`,
				);
			}
			const keyNum = parseInt(key.slice(2), 16);
			ret.set(
				keyNum,
				new SensorType(keyNum, sensorDefinition as JSONObject),
			);
		}
		sensorTypes = ret;
	} catch (e) {
		if (e instanceof ZWaveError) {
			throw e;
		} else {
			throwInvalidConfig("sensor types");
		}
	}
}

export async function loadSensorTypes(): Promise<void> {
	try {
		await loadSensorTypesInternal();
	} catch (e) {
		// If the config file is missing or invalid, don't try to find it again
		if (
			e instanceof ZWaveError &&
			e.code === ZWaveErrorCodes.Config_Invalid
		) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.config.print(
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
	if (!sensorTypes) {
		throw new ZWaveError(
			"The config has not been loaded yet!",
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	return sensorTypes.get(sensorType);
}

/** Looks up a scale definition for a given sensor type */
export function lookupSensorScale(sensorType: number, scale: number): Scale {
	const sensor = lookupSensorType(sensorType);
	return sensor?.scales.get(scale) ?? getDefaultScale(scale);
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
			const scales = lookupNamedScaleGroup(scaleName);
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
				if (!hexKeyRegexNDigits.test(scaleKey))
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
