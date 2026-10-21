import { untar } from "@andrewbranch/untar.js";
import { ZWaveError, ZWaveErrorCodes, gunzipSync } from "@zwave-js/core";
import {
	type BytesView,
	getErrorMessage,
	writeTextFile,
} from "@zwave-js/shared";
import type {
	CopyFile,
	MakeTempDirectory,
	ManageDirectory,
	OpenFile,
	ReadFileSystemInfo,
	WriteFile,
} from "@zwave-js/shared/bindings";
import { isObject } from "alcalzone-shared/typeguards";
import path from "pathe";
import semverInc from "semver/functions/inc.js";
import semverValid from "semver/functions/valid.js";
import semverMaxSatisfying from "semver/ranges/max-satisfying.js";

/** The config package is a few MB in size when extracted, so this leaves a lot of headroom */
const MAX_CONFIG_PACKAGE_SIZE = 100 * 1024 * 1024;

/**
 * Checks whether there is a compatible update for the currently installed config package.
 * Returns the new version if there is an update, `undefined` otherwise.
 * Throws if the update check failed.
 */
export async function checkForConfigUpdates(
	currentVersion: string,
): Promise<string | undefined> {
	const { default: ky } = await import("ky");
	let registry: Record<string, unknown>;

	try {
		registry = await ky
			.get("https://registry.npmjs.org/@zwave-js/config")
			.json();
	} catch {
		throw new ZWaveError(
			`Could not check for config updates: Failed to download package information!`,
			ZWaveErrorCodes.Config_Update_RegistryError,
		);
	}

	if (!isObject(registry) || !isObject(registry.versions)) {
		throw new ZWaveError(
			`Could not check for config updates: Downloaded package information does not contain version information!`,
			ZWaveErrorCodes.Config_Update_RegistryError,
		);
	}

	// Find the highest possible prepatch update (e.g. 7.2.4 -> 7.2.5-20200424)
	const allVersions = Object.keys(registry.versions)
		.filter((v) => !!semverValid(v))
		.filter((v) => /-\d{8}$/.test(v));
	const updateRange = `>${currentVersion} <${semverInc(
		currentVersion,
		"patch",
	)}`;
	const updateVersion = semverMaxSatisfying(allVersions, updateRange, {
		includePrerelease: true,
	});
	if (updateVersion) return updateVersion;
}

/**
 * Downloads and installs the given configuration update.
 * This only works if an external configuation directory is used.
 */
export async function installConfigUpdate(
	fs: ManageDirectory
		& ReadFileSystemInfo
		& WriteFile
		& CopyFile
		& OpenFile
		& MakeTempDirectory,
	newVersion: string,
	external: {
		configDir: string;
	},
): Promise<void> {
	const { default: ky } = await import("ky");

	let registryInfo: any;
	try {
		registryInfo = await ky
			.get(`https://registry.npmjs.org/@zwave-js/config/${newVersion}`)
			.json();
	} catch {
		throw new ZWaveError(
			`Config update failed: Could not fetch package info from npm registry!`,
			ZWaveErrorCodes.Config_Update_InstallFailed,
		);
	}

	const url = registryInfo?.dist?.tarball;
	if (typeof url !== "string") {
		throw new ZWaveError(
			`Config update failed: Could not fetch package tarball URL from npm registry!`,
			ZWaveErrorCodes.Config_Update_InstallFailed,
		);
	}

	let tarballData: BytesView;
	try {
		tarballData = new Uint8Array(await ky.get(url).arrayBuffer());
	} catch (e) {
		throw new ZWaveError(
			`Config update failed: Could not download tarball. Reason: ${getErrorMessage(
				e,
			)}`,
			ZWaveErrorCodes.Config_Update_InstallFailed,
		);
	}

	try {
		// Extract json files from the tarball's config directory
		// and overwrite the external config directory with them
		const tarFiles = untar(
			gunzipSync(tarballData, MAX_CONFIG_PACKAGE_SIZE).buffer,
		);
		const prefix = "package/config/";
		const configFiles = tarFiles.filter(
			(file) =>
				file.filename.startsWith(prefix)
				&& file.filename.endsWith(".json"),
		);
		// Don't wipe the existing config with the contents of a broken package
		if (configFiles.length === 0) {
			throw new Error("The tarball contains no config files");
		}

		const externalVersionFilename = path.join(
			external.configDir,
			"version",
		);
		await fs.deleteDir(external.configDir);
		await fs.ensureDir(external.configDir);
		// Mark the directory as ours before extracting, so an interrupted update can be wiped
		// on the next start. The empty version is invalid, which forces that wipe.
		await writeTextFile(fs, externalVersionFilename, "");

		for (const file of configFiles) {
			const filename = file.filename.slice(prefix.length);
			const targetFileName = path.join(external.configDir, filename);
			// Don't let crafted file names escape the config directory
			const relativePath = path.relative(
				external.configDir,
				targetFileName,
			);
			if (
				relativePath === ".."
				|| relativePath.startsWith("../")
				|| path.isAbsolute(relativePath)
			) {
				continue;
			}
			const targetDirName = path.dirname(targetFileName);

			await fs.ensureDir(targetDirName);
			await fs.writeFile(targetFileName, new Uint8Array(file.fileData));
		}

		await writeTextFile(fs, externalVersionFilename, newVersion);
	} catch {
		throw new ZWaveError(
			`Config update failed: Could not extract tarball`,
			ZWaveErrorCodes.Config_Update_InstallFailed,
		);
	}
}
