import { detectPackageManager, PackageManager } from "@alcalzone/pak";
import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { isObject } from "alcalzone-shared/typeguards";
import axios from "axios";
import * as semver from "semver";

/**
 * Checks whether there is a compatible update for the currently installed config package.
 * Returns the new version if there is an update, `undefined` otherwise.
 * Throws if the update check failed.
 */
export async function checkForConfigUpdates(
	currentVersion: string,
): Promise<string | undefined> {
	let registry: Record<string, unknown>;

	try {
		registry = (
			await axios.get("https://registry.npmjs.org/@zwave-js/config")
		).data;
	} catch (e) {
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
		.filter((v) => !!semver.valid(v))
		.filter((v) => /\-\d{8}$/.test(v));
	const updateRange = `>${currentVersion} <${semver.inc(
		currentVersion,
		"patch",
	)}`;
	const updateVersion = semver.maxSatisfying(allVersions, updateRange, {
		includePrerelease: true,
	});
	if (updateVersion) return updateVersion;
}

/**
 * Installs the update for @zwave-js/config with the given version.
 */
export async function installConfigUpdate(newVersion: string): Promise<void> {
	// Check which package manager to use for the update
	let pak: PackageManager;
	try {
		pak = await detectPackageManager({
			cwd: __dirname,
			requireLockfile: false,
		});
	} catch {
		throw new ZWaveError(
			`Config update failed: No package manager detected or package.json not found!`,
			ZWaveErrorCodes.Config_Update_PackageManagerNotFound,
		);
	}

	// And install it
	const result = await pak.overrideDependencies({
		"@zwave-js/config": newVersion,
	});
	if (result.success) return;
	throw new ZWaveError(
		`Config update failed: Package manager exited with code ${result.exitCode}
${result.stderr}`,
		ZWaveErrorCodes.Config_Update_InstallFailed,
	);
}
