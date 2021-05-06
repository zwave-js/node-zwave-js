import { isZWaveError, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { JSONObject, num2hex } from "@zwave-js/shared";
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import {
	configDir,
	externalConfigDir,
	hexKeyRegexNDigits,
	throwInvalidConfig,
} from "./utils";

export type MeterMap = ReadonlyMap<number, Meter>;

/** @internal */
export async function loadMetersInternal(
	externalConfig?: boolean,
): Promise<MeterMap> {
	const configPath = path.join(
		(externalConfig && externalConfigDir) || configDir,
		"meters.json",
	);

	if (!(await pathExists(configPath))) {
		throw new ZWaveError(
			"The config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}

	try {
		const fileContents = await readFile(configPath, "utf8");
		const definition = JSON5.parse(fileContents);
		if (!isObject(definition)) {
			throwInvalidConfig("meters", "the database is not an object");
		}

		const meters = new Map();
		for (const [id, meterDefinition] of entries(definition)) {
			if (!hexKeyRegexNDigits.test(id)) {
				throwInvalidConfig(
					"meters",
					`found non-hex key "${id}" at the root`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			meters.set(idNum, new Meter(idNum, meterDefinition as JSONObject));
		}
		return meters;
	} catch (e: unknown) {
		if (isZWaveError(e)) {
			throw e;
		} else {
			throwInvalidConfig("meters");
		}
	}
}

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
						`found non-hex key "${scaleId}" in meter ${num2hex(
							id,
						)}`,
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
