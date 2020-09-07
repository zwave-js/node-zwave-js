import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { JSONObject, num2hex } from "@zwave-js/shared";
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import log from "./Logger";
import { configDir, hexKeyRegexNDigits, throwInvalidConfig } from "./utils";

const configPath = path.join(configDir, "meters.json");
let meters: ReadonlyMap<number, Meter> | undefined;

/** @internal */
export async function loadMetersInternal(): Promise<void> {
	if (!(await pathExists(configPath))) {
		throw new ZWaveError(
			"The config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}

	try {
		const fileContents = await readFile(configPath, "utf8");
		const definition = JSON5.parse(fileContents) as unknown;
		if (!isObject(definition)) {
			throwInvalidConfig("meters", "the database is not an object");
		}

		const ret = new Map();
		for (const [id, meterDefinition] of entries(definition)) {
			if (!hexKeyRegexNDigits.test(id)) {
				throwInvalidConfig(
					"meters",
					`found non-hex key "${id}" at the root`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			ret.set(idNum, new Meter(idNum, meterDefinition));
		}
		meters = ret;
	} catch (e: unknown) {
		if (e instanceof ZWaveError) {
			throw e;
		} else {
			throwInvalidConfig("meters");
		}
	}
}

export async function loadMeters(): Promise<void> {
	try {
		await loadMetersInternal();
	} catch (e: unknown) {
		// If the config file is missing or invalid, don't try to find it again
		if (
			e instanceof ZWaveError &&
			e.code === ZWaveErrorCodes.Config_Invalid
		) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.config.print(
					`Could not meters config: ${e.message}`,
					"error",
				);
			}
			meters = new Map();
		} else {
			// This is an unexpected error
			throw e;
		}
	}
}

/**
 * Looks up the notification configuration for a given notification type
 */
export function lookupMeter(meterType: number): Meter | undefined {
	if (!meters) {
		throw new ZWaveError(
			"The config has not been loaded yet!",
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	return meters.get(meterType);
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

/** Looks up a scale definition for a given meter type */
export function lookupMeterScale(type: number, scale: number): MeterScale {
	const meter = lookupMeter(type);
	return meter?.scales.get(scale) ?? getDefaultMeterScale(scale);
}

export function getDefaultMeterScale(scale: number): MeterScale {
	return new MeterScale(scale, `Unknown (${num2hex(scale)})`);
}
