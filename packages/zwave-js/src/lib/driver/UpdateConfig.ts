import { type PackageManager, detectPackageManager } from "@alcalzone/pak";
import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import {
	copyFilesRecursive,
	getErrorMessage,
	readJSON,
} from "@zwave-js/shared";
import { isObject } from "alcalzone-shared/typeguards/index.js";
import execa from "execa";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import * as path from "node:path";
import * as lockfile from "proper-lockfile";
import * as semver from "semver";

const require = createRequire(import.meta.url);

/**
 * Checks whether there is a compatible update for the currently installed config package.
 * Returns the new version if there is an update, `undefined` otherwise.
 * Throws if the update check failed.
 */
export async function checkForConfigUpdates(
	currentVersion: string,
): Promise<string | undefined> {
	const { got } = await import("got");
	let registry: Record<string, unknown>;

	try {
		registry = await got
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
		.filter((v) => !!semver.valid(v))
		.filter((v) => /\-\d{8}$/.test(v));
	const updateRange = `>${currentVersion} <${
		semver.inc(
			currentVersion,
			"patch",
		)
	}`;
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
		if (await lockfile.check(packageJsonPath)) {
			await lockfile.unlock(packageJsonPath);
		}
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
	const { got } = await import("got");

	let registryInfo: any;
	try {
		registryInfo = await got
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
	} catch {
		throw new ZWaveError(
			`Config update failed: Another installation is already in progress!`,
			ZWaveErrorCodes.Config_Update_InstallFailed,
		);
	}

	const freeLock = async () => {
		try {
			if (await lockfile.check(lockfilePath, lockfileOptions)) {
				await lockfile.unlock(lockfilePath, lockfileOptions);
			}
		} catch {
			// whatever - just don't crash
		}
	};

	// Download tarball to a temporary directory
	let tmpDir: string;
	try {
		tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "zjs-config-update-"),
		);
	} catch (e) {
		await freeLock();
		throw new ZWaveError(
			`Config update failed: Could not create temporary directory. Reason: ${
				getErrorMessage(
					e,
				)
			}`,
			ZWaveErrorCodes.Config_Update_InstallFailed,
		);
	}

	const tarFilename = path.join(tmpDir, "zjs-config-update.tgz");
	const configModuleDir = path.dirname(
		require.resolve("@zwave-js/config/package.json"),
	);
	const extractedDir = path.join(tmpDir, "extracted");

	try {
		const handle = await fs.open(tarFilename, "w");
		const fstream = handle.createWriteStream({ autoClose: true });
		const response = got.stream.get(url);
		response.pipe(fstream);

		await new Promise((resolve, reject) => {
			response.on("error", reject);
			response.on("end", resolve);
		});
	} catch (e) {
		await freeLock();
		throw new ZWaveError(
			`Config update failed: Could not download tarball. Reason: ${
				getErrorMessage(
					e,
				)
			}`,
			ZWaveErrorCodes.Config_Update_InstallFailed,
		);
	}

	// This should not be necessary in Docker. Leaving it here anyways in case
	// we want to use this method on Windows at some point
	function normalizeToUnixStyle(path: string): string {
		path = path.replaceAll(":", "");
		path = path.replaceAll("\\", "/");
		if (!path.startsWith("/")) path = `/${path}`;
		return path;
	}

	// Extract it into a temporary folder, then overwrite the config node_modules with it
	try {
		await fs.rm(extractedDir, { recursive: true, force: true });
		await fs.mkdir(extractedDir, { recursive: true });
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
			await fs.rm(external.configDir, { recursive: true, force: true });
			await fs.mkdir(external.configDir, { recursive: true });
			await copyFilesRecursive(
				path.join(extractedDir, "config"),
				external.configDir,
				(src) => src.endsWith(".json"),
			);
			const externalVersionFilename = path.join(
				external.configDir,
				"version",
			);
			await fs.writeFile(externalVersionFilename, newVersion, "utf8");
		} else {
			await fs.rm(configModuleDir, { recursive: true, force: true });
			await fs.rename(extractedDir, configModuleDir);
		}
	} catch {
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
			const json = await readJSON(packageJsonPath);
			json.dependencies["@zwave-js/config"] = newVersion;
			await fs.writeFile(packageJsonPath, JSON.stringify(json, null, 2));
		} catch {
			// ignore
		}
	}

	// Clean up the temp dir and ignore errors
	void fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {
		// ignore
	});

	// Free the lock
	await freeLock();
}
