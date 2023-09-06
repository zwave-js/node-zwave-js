import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core/safe";
import { type JSONObject, num2hex } from "@zwave-js/shared/safe";
import { isObject } from "alcalzone-shared/typeguards";
import type { ConfigManager } from "./ConfigManager";
import { Scale, type ScaleGroup } from "./Scales";
import { hexKeyRegexNDigits, throwInvalidConfig } from "./utils_safe";

export type SensorTypeMap = ReadonlyMap<number, SensorType>;

const namedScalesMarker = "$SCALES:";

export class SensorType {
	public constructor(
		manager: ConfigManager,
		key: number,
		definition: JSONObject,
	) {
		this.key = key;
		if (typeof definition.label !== "string") {
			throwInvalidConfig(
				"sensor types",
				`label for ${num2hex(key)} is not a string`,
			);
		}
		this.label = definition.label;

		if (
			typeof definition.scales === "string"
			&& definition.scales.startsWith(namedScalesMarker)
		) {
			// This is referencing a named scale
			const scaleName = definition.scales.slice(namedScalesMarker.length);
			const scales = manager.lookupNamedScaleGroup(scaleName);
			if (!scales) {
				throw new ZWaveError(
					`Sensor type ${
						num2hex(
							key,
						)
					} is referencing non-existing named scale "${scaleName}"!`,
					ZWaveErrorCodes.Config_Invalid,
				);
			}
			this.scales = scales;
		} else {
			// This is an inline scale definition
			const scales = new Map<number, Scale>();
			if (!isObject(definition.scales)) {
				throwInvalidConfig(
					"sensor types",
					`scale definition for ${num2hex(key)} is not an object`,
				);
			}
			for (
				const [scaleKey, scaleDefinition] of Object.entries(
					definition.scales,
				)
			) {
				if (!hexKeyRegexNDigits.test(scaleKey)) {
					throwInvalidConfig(
						"sensor types",
						`found invalid key "${scaleKey}" in sensor type ${
							num2hex(
								key,
							)
						}. Sensor  scales must have lowercase hexadecimal IDs.`,
					);
				}
				const scaleKeyNum = parseInt(scaleKey.slice(2), 16);
				scales.set(
					scaleKeyNum,
					new Scale(scaleKeyNum, scaleDefinition as any),
				);
			}
			this.scales = scales;
		}
	}

	public readonly key: number;
	public readonly label: string;
	public readonly scales: ScaleGroup;
}
