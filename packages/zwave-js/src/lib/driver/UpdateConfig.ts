import { detectPackageManager, PackageManager } from "@alcalzone/pak";
import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { getErrorMessage } from "@zwave-js/shared";
import { isObject } from "alcalzone-shared/typeguards";
import axios from "axios";
import execa from "execa";
import fs from "fs-extra";
import os from "os";
import * as path from "path";
import * as lockfile from "proper-lockfile";
import * as semver from "semver";
import type { Readable } from "stream";

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
			await axios.get<any>("https://registry.npmjs.org/@zwave-js/config")
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
			setCwdToPackageRoot: true,
		});
	} catch {
		throw new ZWaveError(
			`Config update failed: No package manager detected or package.json not found!`,
			ZWaveErrorCodes.Config_Update_PackageManagerNotFound,
		);
	}

	const packageJsonPath = path.join(pak.cwd, "package.json");
	try {
		await lockfile.lock(packageJsonPath, {
			onCompromised: () => {
				// do nothing
			},
		});
	} catch {
		throw new ZWaveError(
			`Config update failed: Another installation is already in progress!`,
			ZWaveErrorCodes.Config_Update_InstallFailed,
		);
	}

	// And install it
	const result = await pak.overrideDependencies({
		"@zwave-js/config": newVersion,
	});

	// Free the lock
	try {
		if (await lockfile.check(packageJsonPath))
			await lockfile.unlock(packageJsonPath);
	} catch {
		// whatever - just don't crash
	}

	if (result.success) return;

	throw new ZWaveError(
		`Config update failed: Package manager exited with code ${result.exitCode}
${result.stderr}`,
		ZWaveErrorCodes.Config_Update_InstallFailed,
	);
}

/**
 * Installs the update for @zwave-js/config with the given version.
 * Version for Docker images that does not mess up the container if there's no yarn cache
 */
export async function installConfigUpdateInDocker(
	newVersion: string,
	external?: {
		configDir: string;
		cacheDir: string;
	},
): Promise<void> {
	let registryInfo: any;
	try {
		registryInfo = (
			await axios.get(
				`https://registry.npmjs.org/@zwave-js/config/${newVersion}`,
			)
		).data;
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

	let lockfilePath: string;
	let lockfileOptions: lockfile.LockOptions;
	if (external) {
		lockfilePath = external.cacheDir;
		lockfileOptions = {
			lockfilePath: path.join(external.cacheDir, "config-update.lock"),
		};
	} else {
		// Acquire a lock so the installation doesn't run twice
		let pak: PackageManager;
		try {
			pak = await detectPackageManager({
				cwd: __dirname,
				requireLockfile: false,
				setCwdToPackageRoot: true,
			});
		} catch {
			throw new ZWaveError(
				`Config update failed: No package manager detected or package.json not found!`,
				ZWaveErrorCodes.Config_Update_PackageManagerNotFound,
			);
		}

		lockfilePath = path.join(pak.cwd, "package.json");
		lockfileOptions = {};
	}

	try {
		await lockfile.lock(lockfilePath, {
			...lockfileOptions,
			onCompromised: () => {
				// do nothing
			},
		});
	} catch (e) {
		throw new ZWaveError(
			`Config update failed: Another installation is already in progress!`,
			ZWaveErrorCodes.Config_Update_InstallFailed,
		);
	}

	const freeLock = async () => {
		try {
			if (await lockfile.check(lockfilePath, lockfileOptions))
				await lockfile.unlock(lockfilePath, lockfileOptions);
		} catch {
			// whatever - just don't crash
		}
	};

	// Download tarball to a temporary directory
	const tmpDir = path.join(os.tmpdir(), "zjs-config-update");
	const tarFilename = path.join(tmpDir, "zjs-config-update.tgz");

	const configModuleDir = path.dirname(
		require.resolve("@zwave-js/config/package.json"),
	);
	const extractedDir = path.join(tmpDir, "extracted");

	try {
		await fs.ensureDir(tmpDir);
		const fstream = fs.createWriteStream(tarFilename, { autoClose: true });
		const response = await axios({
			method: "GET",
			url,
			responseType: "stream",
		});
		const rstream = response.data as Readable;
		rstream.pipe(fstream);

		await new Promise((resolve, reject) => {
			rstream.on("error", reject);
			rstream.on("end", resolve);
		});
	} catch (e) {
		await freeLock();
		throw new ZWaveError(
			`Config update failed: Could not download tarball. Reason: ${getErrorMessage(
				e,
			)}`,
			ZWaveErrorCodes.Config_Update_InstallFailed,
		);
	}

	// This should not be necessary in Docker. Leaving it here anyways in case
	// we want to use this method on Windows at some point
	function normalizeToUnixStyle(path: string): string {
		path = path.replace(/:/g, "");
		path = path.replace(/\\/g, "/");
		if (!path.startsWith("/")) path = `/${path}`;
		return path;
	}

	// Extract it into a temporary folder, then overwrite the config node_modules with it
	try {
		await fs.emptyDir(extractedDir);
		await execa("tar", [
			"--strip-components=1",
			"-xzf",
			normalizeToUnixStyle(tarFilename),
			"-C",
			normalizeToUnixStyle(extractedDir),
		]);
		// How we install now depends on whether we're installing into the external config dir.
		// If we are, we just need to copy the `devices` subdirectory. If not, copy the entire extracted dir
		if (external) {
			await fs.emptyDir(external.configDir);
			await fs.copy(
				path.join(extractedDir, "config"),
				external.configDir,
				{
					filter: async (src: string) => {
						if (!(await fs.stat(src)).isFile()) return true;
						return src.endsWith(".json");
					},
				},
			);
			const externalVersionFilename = path.join(
				external.configDir,
				"version",
			);
			await fs.writeFile(externalVersionFilename, newVersion, "utf8");
		} else {
			await fs.remove(configModuleDir);
			await fs.rename(extractedDir, configModuleDir);
		}
	} catch (e) {
		await freeLock();
		throw new ZWaveError(
			`Config update failed: Could not extract tarball`,
			ZWaveErrorCodes.Config_Update_InstallFailed,
		);
	}

	// Try to update our own package.json if we're working with the internal structure
	if (!external) {
		try {
			const packageJsonPath = require.resolve("zwave-js/package.json");
			const json = await fs.readJSON(packageJsonPath, {
				encoding: "utf8",
			});
			json.dependencies["@zwave-js/config"] = newVersion;
			await fs.writeJSON(packageJsonPath, json, {
				encoding: "utf8",
				spaces: 2,
			});
		} catch {
			// ignore
		}
	}

	// Clean up the temp dir and ignore errors
	void fs.remove(tmpDir).catch(() => {
		// ignore
	});

	// Free the lock
	await freeLock();
}
