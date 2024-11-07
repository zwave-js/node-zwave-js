import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { copyFilesRecursive, getErrorMessage } from "@zwave-js/shared";
import { isObject } from "alcalzone-shared/typeguards";
import execa from "execa";
import fs from "node:fs/promises";
import os from "node:os";
import * as path from "node:path";
import * as lockfile from "proper-lockfile";
import semverInc from "semver/functions/inc.js";
import semverValid from "semver/functions/valid.js";
import semverMaxSatisfying from "semver/ranges/max-satisfying.js";

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
		.filter((v) => !!semverValid(v))
		.filter((v) => /\-\d{8}$/.test(v));
	const updateRange = `>${currentVersion} <${
		semverInc(
			currentVersion,
			"patch",
		)
	}`;
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
	newVersion: string,
	external: {
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

	const lockfilePath = external.cacheDir;
	const lockfileOptions: lockfile.LockOptions = {
		lockfilePath: path.join(external.cacheDir, "config-update.lock"),
	};

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

	// Download the package tarball into the temporary directory
	const tarFilename = path.join(tmpDir, "zjs-config-update.tgz");
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

	const extractedDir = path.join(tmpDir, "extracted");
	try {
		// Extract the tarball in the temporary folder
		await fs.rm(extractedDir, { recursive: true, force: true });
		await fs.mkdir(extractedDir, { recursive: true });
		await execa("tar", [
			"--strip-components=1",
			"-xzf",
			normalizeToUnixStyle(tarFilename),
			"-C",
			normalizeToUnixStyle(extractedDir),
		]);

		// then overwrite the files in the external config directory
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
	} catch {
		await freeLock();
		throw new ZWaveError(
			`Config update failed: Could not extract tarball`,
			ZWaveErrorCodes.Config_Update_InstallFailed,
		);
	}

	// Clean up the temp dir and ignore errors
	void fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {
		// ignore
	});

	// Free the lock
	await freeLock();
}
