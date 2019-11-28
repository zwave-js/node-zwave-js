import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { JSONObject } from "../util/misc";
import { num2hex } from "../util/strings";
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
		const definition = JSON5.parse(fileContents);
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
	} catch (e) {
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
	} catch (e) {
		// If the config file is missing or invalid, don't try to find it again
		if (
			e instanceof ZWaveError &&
			e.code === ZWaveErrorCodes.Config_Invalid
		) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.driver.print(
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

		const scales = new Map<number, string>();
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
				const scaleIdNum = parseInt(scaleId.slice(2), 16);
				scales.set(scaleIdNum, scaleDefinition);
			}
		}
		this.scales = scales;
	}

	public readonly id: number;
	public readonly name: string;
	public readonly scales: ReadonlyMap<number, string>;
}
