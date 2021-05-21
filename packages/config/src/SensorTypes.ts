import { isZWaveError, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { JSONObject, num2hex } from "@zwave-js/shared";
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import type { ConfigManager } from "./ConfigManager";
import { Scale } from "./Scales";
import {
	configDir,
	externalConfigDir,
	hexKeyRegexNDigits,
	throwInvalidConfig,
} from "./utils";

export type SensorTypeMap = ReadonlyMap<number, SensorType>;

/** @internal */
export async function loadSensorTypesInternal(
	manager: ConfigManager,
	externalConfig?: boolean,
): Promise<SensorTypeMap> {
	const configPath = path.join(
		(externalConfig && externalConfigDir) || configDir,
		"sensorTypes.json",
	);

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

		const sensorTypes = new Map();
		for (const [key, sensorDefinition] of entries(definition)) {
			if (!hexKeyRegexNDigits.test(key)) {
				throwInvalidConfig(
					"sensor types",
					`found non-hex key "${key}" at the root`,
				);
			}
			const keyNum = parseInt(key.slice(2), 16);
			sensorTypes.set(
				keyNum,
				new SensorType(manager, keyNum, sensorDefinition as JSONObject),
			);
		}
		return sensorTypes;
	} catch (e: unknown) {
		if (isZWaveError(e)) {
			throw e;
		} else {
			throwInvalidConfig("sensor types");
		}
	}
}

const namedScalesMarker = "$SCALES:";

export class SensorType {
	public constructor(
		manager: ConfigManager,
		key: number,
		definition: JSONObject,
	) {
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
			const scales = manager.lookupNamedScaleGroup(scaleName);
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
