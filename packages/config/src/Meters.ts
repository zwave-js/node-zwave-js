import { JSONObject, num2hex } from "@zwave-js/shared/safe";
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { hexKeyRegexNDigits, throwInvalidConfig } from "./utils_safe";

export type MeterMap = ReadonlyMap<number, Meter>;

export class Meter {
	public constructor(id: number, definition: JSONObject) {
		this.id = id;
		this.name = definition.name;

		const scales = new Map<number, MeterScale>();
		if (isObject(definition.scales)) {
			for (const [scaleId, scaleDefinition] of entries(
				definition.scales,
			)) {
				if (!hexKeyRegexNDigits.test(scaleId)) {
					throwInvalidConfig(
						"meters",
						`found invalid key "${scaleId}" in meter ${num2hex(
							id,
						)}. Meter scales must have lowercase hexadecimal IDs.`,
					);
				}
				if (typeof scaleDefinition !== "string") {
					throwInvalidConfig(
						"meters",
						`The scale definition for "${scaleId}" in meter ${num2hex(
							id,
						)} is not a string!`,
					);
				}
				const scaleIdNum = parseInt(scaleId.slice(2), 16);
				scales.set(
					scaleIdNum,
					new MeterScale(scaleIdNum, scaleDefinition),
				);
			}
		}
		this.scales = scales;
	}

	public readonly id: number;
	public readonly name: string;
	public readonly scales: ReadonlyMap<number, MeterScale>;
}

export class MeterScale {
	public constructor(key: number, definition: string) {
		this.key = key;
		this.label = definition;
	}

	public readonly key: number;
	public readonly label: string;
}

export function getDefaultMeterScale(scale: number): MeterScale {
	return new MeterScale(scale, `Unknown (${num2hex(scale)})`);
}
