import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { formatId } from "@zwave-js/shared";
import path from "path";
import * as semver from "semver";
import type { DeviceConfigIndexEntry } from "./Devices";

export const configDir = path.resolve(__dirname, "../config");
export const hexKeyRegexNDigits = /^0x[a-fA-F0-9]+$/;
export const hexKeyRegex4Digits = /^0x[a-fA-F0-9]{4}$/;
export const hexKeyRegex2Digits = /^0x[a-fA-F0-9]{2}$/;

export function throwInvalidConfig(which: string, reason?: string): never {
	throw new ZWaveError(
		`The ${which ? which + " " : ""}config file is malformed!` +
			(reason ? `\n${reason}` : ""),
		ZWaveErrorCodes.Config_Invalid,
	);
}

export function getDeviceEntryPredicate(
	manufacturerId: number,
	productType: number,
	productId: number,
	firmwareVersion?: string,
): (entry: DeviceConfigIndexEntry) => boolean {
	return (entry) => {
		if (entry.manufacturerId !== formatId(manufacturerId)) return false;
		if (entry.productType !== formatId(productType)) return false;
		if (entry.productId !== formatId(productId)) return false;
		if (firmwareVersion != undefined) {
			// A firmware version was given, only look at files with a matching firmware version
			return (
				semver.lte(
					padVersion(entry.firmwareVersion.min),
					padVersion(firmwareVersion),
				) &&
				semver.gte(
					padVersion(entry.firmwareVersion.max),
					padVersion(firmwareVersion),
				)
			);
		}
		return true;
	};
}

/** Pads a firmware version string, so it can be compared with semver */
export function padVersion(version: string): string {
	return version + ".0";
}
