import { formatId, padVersion } from "@zwave-js/shared";
import * as fs from "fs-extra";
import path from "path";
import * as semver from "semver";
import type { DeviceConfigIndexEntry } from "./devices/DeviceConfig";
import type { ConfigLogger } from "./Logger";

/** The absolute path of the embedded configuration directory */
export const configDir = path.resolve(__dirname, "../config");
/** The (optional) absolute path of an external configuration directory */
export function externalConfigDir(): string | undefined {
	return process.env.ZWAVEJS_EXTERNAL_CONFIG;
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

export async function getEmbeddedConfigVersion(): Promise<string> {
	return (await fs.readJSON(path.join(__dirname, "../package.json"))).version;
}

export type SyncExternalConfigDirResult =
	| {
			success: false;
	  }
	| {
			success: true;
			version: string;
	  };

/**
 * Synchronizes or updates the external config directory and returns whether the directory is in a state that can be used
 */
export async function syncExternalConfigDir(
	logger: ConfigLogger,
): Promise<SyncExternalConfigDirResult> {
	const extConfigDir = externalConfigDir();
	if (!extConfigDir) return { success: false };

	// Make sure the config dir exists
	try {
		await fs.ensureDir(extConfigDir);
	} catch {
		logger.print(
			`Synchronizing external config dir failed - directory could not be created`,
			"error",
		);
		return { success: false };
	}

	const externalVersionFilename = path.join(extConfigDir, "version");
	const currentVersion = await getEmbeddedConfigVersion();
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
	let externalVersion: string | undefined;
	try {
		externalVersion = await fs.readFile(externalVersionFilename, "utf8");
		if (!semver.valid(externalVersion)) {
			wipe = true;
		} else if (
			!semver.satisfies(externalVersion, supportedRange, {
				includePrerelease: true,
			})
		) {
			wipe = true;
		}
	} catch {
		wipe = true;
	}

	// Nothing to wipe, the external dir is good to go
	if (!wipe) return { success: true, version: externalVersion! };

	// Wipe and override the external dir
	try {
		logger.print(`Synchronizing external config dir ${extConfigDir}...`);
		await fs.emptyDir(extConfigDir);
		await fs.copy(configDir, extConfigDir, {
			filter: async (src: string) => {
				if (!(await fs.stat(src)).isFile()) return true;
				return src.endsWith(".json");
			},
		});
		await fs.writeFile(externalVersionFilename, currentVersion, "utf8");
		externalVersion = currentVersion;
	} catch {
		// Something went wrong
		logger.print(
			`Synchronizing external config dir failed - using embedded config`,
			"error",
		);
		return { success: false };
	}

	return { success: true, version: externalVersion };
}
