import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { formatId } from "@zwave-js/shared";
import * as fs from "fs-extra";
import path from "path";
import * as semver from "semver";
import type { DeviceConfigIndexEntry } from "./Devices";
import type { ConfigLogger } from "./Logger";

/** The absolute path of the embedded configuration directory */
export const configDir = path.resolve(__dirname, "../config");
/** The (optional) absolute path of an external configuration directory */
export const externalConfigDir = (() => {
	const extPath = process.env.ZWAVEJS_EXTERNAL_CONFIG;
	if (!extPath || !fs.existsSync(extPath)) return;
	return extPath;
})();

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

/**
 * Synchronizes or updates the external config directory and returns whether the directory is in a state that can be used
 */
export async function syncExternalConfigDir(
	logger: ConfigLogger,
): Promise<boolean> {
	if (!externalConfigDir) return false;

	// Make sure the config dir exists
	try {
		await fs.ensureDir(externalConfigDir);
	} catch {
		logger.print(
			`Synchronizing external config dir failed - directory could not be created`,
			"error",
		);
		return false;
	}

	const externalVersionFilename = path.join(externalConfigDir, "version");
	const currentVersion = (
		await fs.readJSON(path.join(__dirname, "../package.json"))
	).version;
	const supportedRange = `>=${currentVersion} <${semver.inc(
		currentVersion,
		"patch",
	)}`;

	// We remember the config version that was copied there in a file called "version"
	// If that either...
	// ...isn't there,
	// ...can't be read,
	// ...doesn't contain a matching version (>= current && nightly)
	// wipe the external config dir and recreate it
	let wipe = false;
	try {
		const version = await fs.readFile(externalVersionFilename, "utf8");
		if (!semver.valid(version)) {
			wipe = true;
		} else if (
			!semver.satisfies(version, supportedRange, {
				includePrerelease: true,
			})
		) {
			wipe = true;
		}
	} catch {
		wipe = true;
	}

	// Nothing to wipe, the external dir is good to go
	if (!wipe) return true;

	// Wipe and override the external dir
	try {
		logger.print(
			`Synchronizing external config dir ${externalConfigDir}...`,
		);
		await fs.emptyDir(externalConfigDir);
		await fs.copy(configDir, externalConfigDir, {
			filter: async (src: string) => {
				if (!(await fs.stat(src)).isFile()) return true;
				return src.endsWith(".json");
			},
		});
		await fs.writeFile(externalVersionFilename, currentVersion, "utf8");
	} catch {
		// Something went wrong
		logger.print(
			`Synchronizing external config dir failed - using embedded config`,
			"error",
		);
		return false;
	}

	return true;
}
