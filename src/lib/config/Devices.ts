import { padStart } from "alcalzone-shared/strings";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import * as semver from "semver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { JSONObject } from "../util/misc";
import { configDir, throwInvalidConfig } from "./utils";

export interface DeviceConfigIndexEntry {
	manufacturerId: string;
	productType: string;
	productId: string;
	firmwareVersion: {
		min: string;
		max: string;
	};
	filename: string;
}

const indexPath = path.join(configDir, "devices/index.json");
let index: readonly DeviceConfigIndexEntry[];

export async function loadDeviceIndexInternal(): Promise<void> {
	if (!(await pathExists(indexPath))) {
		throw new ZWaveError(
			"The device config index does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}
	try {
		const fileContents = await readFile(indexPath, "utf8");
		index = JSON5.parse(fileContents);
	} catch (e) {
		if (e instanceof ZWaveError) {
			throw e;
		} else {
			throwInvalidConfig("devices");
		}
	}
}

export async function loadDeviceIndex(): Promise<void> {
	try {
		await loadDeviceIndexInternal();
	} catch (e) {
		// If the index file is missing or invalid, don't try to find it again
		if (
			e instanceof ZWaveError &&
			e.code === ZWaveErrorCodes.Config_Invalid
		) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.driver.print(
					`Could not load device config index: ${e.message}`,
					"error",
				);
			}
			index = [];
		} else {
			// This is an unexpected error
			throw e;
		}
	}
}

function formatId(id: number): string {
	return "0x" + padStart(id.toString(16), 4, "0");
}

function padVersion(version: string): string {
	return version + ".0";
}

/**
 * Looks up the definition of a given device in the configuration DB
 * @param manufacturerId The manufacturer id of the device
 * @param productId The product id of the device
 * @param productType The product type of the device
 * @param firmwareVersion If known, configuration for a specific firmware version can be loaded
 */
export async function lookupDevice(
	manufacturerId: number,
	productType: number,
	productId: number,
	firmwareVersion?: string,
): Promise<JSONObject | undefined> {
	// Look up the device in the index
	const indexEntry = index.find(
		entry =>
			entry.manufacturerId === formatId(manufacturerId) &&
			entry.productType === formatId(productType) &&
			entry.productId === formatId(productId) &&
			(firmwareVersion == undefined ||
				(semver.lte(
					padVersion(entry.firmwareVersion.min),
					padVersion(firmwareVersion),
				) &&
					semver.gte(
						padVersion(entry.firmwareVersion.max),
						padVersion(firmwareVersion),
					))),
	);

	if (indexEntry) {
		const filePath = path.join(configDir, "devices", indexEntry.filename);
		if (!(await pathExists(filePath))) return;

		try {
			const fileContents = await readFile(filePath, "utf8");
			return JSON5.parse(fileContents);
		} catch (e) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.driver.print(
					`Error loading device config ${filePath}`,
					"error",
				);
			}
		}
	}
}
