import {
	copyFilesRecursive,
	formatId,
	getenv,
	padVersion,
	readTextFile,
	writeTextFile,
} from "@zwave-js/shared";
import type {
	CopyFile,
	ManageDirectory,
	ReadFile,
	ReadFileSystemInfo,
	WriteFile,
} from "@zwave-js/shared/bindings";
import path from "pathe";
import semverGte from "semver/functions/gte.js";
import semverInc from "semver/functions/inc.js";
import semverLte from "semver/functions/lte.js";
import semverSatisfies from "semver/functions/satisfies.js";
import semverValid from "semver/functions/valid.js";

import { configDir } from "#config_dir";

import type { ConfigLogger } from "./Logger.js";
import { PACKAGE_VERSION } from "./_version.js";
import type { DeviceConfigIndexEntry } from "./devices/DeviceConfig.js";

/** The (optional) absolute path of an external configuration directory */
export function getExternalConfigDirEnvVariable(): string | undefined {
	return getenv("ZWAVEJS_EXTERNAL_CONFIG");
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
				semverLte(
					padVersion(entry.firmwareVersion.min),
					padVersion(firmwareVersion),
				)
				&& semverGte(
					padVersion(entry.firmwareVersion.max),
					padVersion(firmwareVersion),
				)
			);
		}
		return true;
	};
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
	fs: ManageDirectory & ReadFileSystemInfo & ReadFile & CopyFile & WriteFile,
	extConfigDir: string,
	logger: ConfigLogger,
): Promise<SyncExternalConfigDirResult> {
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
	const currentVersion = PACKAGE_VERSION;
	const supportedRange = `>=${currentVersion} <${semverInc(
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
		externalVersion = await readTextFile(
			fs,
			externalVersionFilename,
			"utf8",
		);
		if (!semverValid(externalVersion)) {
			wipe = true;
		} else if (
			!semverSatisfies(externalVersion, supportedRange, {
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

	// The directory is configured by the user and might point to the wrong location.
	// Only wipe it if it is empty or was created by us, which is indicated by the version file.
	try {
		const entries = await fs.readDir(extConfigDir);
		if (!entries.includes("version")) {
			// Ignore files that are commonly created by the OS or file system
			const unexpectedEntries = entries.filter(
				(e) => !e.startsWith(".") && e !== "lost+found",
			);
			if (unexpectedEntries.length > 0) {
				logger.print(
					`External config dir ${extConfigDir} is not empty and does not look like a Z-Wave JS config directory (unexpected entries: ${unexpectedEntries
						.slice(0, 5)
						.join(", ")}${
						unexpectedEntries.length > 5 ? ", ..." : ""
					}), refusing to overwrite it - using embedded config`,
					"error",
				);
				return { success: false };
			}
		} else if (!(await fs.stat(externalVersionFilename)).isFile()) {
			logger.print(
				`External config dir ${extConfigDir} does not look like a Z-Wave JS config directory (version is not a file), refusing to overwrite it - using embedded config`,
				"error",
			);
			return { success: false };
		}
	} catch {
		logger.print(
			`Synchronizing external config dir failed - using embedded config`,
			"error",
		);
		return { success: false };
	}

	// Wipe and override the external dir
	try {
		logger.print(`Synchronizing external config dir ${extConfigDir}...`);
		await fs.deleteDir(extConfigDir);
		await fs.ensureDir(extConfigDir);
		// Mark the directory as ours before copying, so an interrupted sync can be wiped
		// on the next start. The empty version is invalid, which forces that wipe.
		await writeTextFile(fs, externalVersionFilename, "", "utf8");
		await copyFilesRecursive(fs, configDir, extConfigDir, (src) =>
			src.endsWith(".json"),
		);
		await writeTextFile(
			fs,
			externalVersionFilename,
			currentVersion,
			"utf8",
		);
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

export function versionInRange(
	version: string,
	min: string,
	max: string,
): boolean {
	return (
		semverGte(padVersion(version), padVersion(min))
		&& semverLte(padVersion(version), padVersion(max))
	);
}
