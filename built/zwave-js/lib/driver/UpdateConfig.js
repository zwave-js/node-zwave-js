"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installConfigUpdateInDocker = exports.installConfigUpdate = exports.checkForConfigUpdates = void 0;
const pak_1 = require("@alcalzone/pak");
const got_1 = __importDefault(require("@esm2cjs/got"));
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const typeguards_1 = require("alcalzone-shared/typeguards");
const execa_1 = __importDefault(require("execa"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const os_1 = __importDefault(require("os"));
const path = __importStar(require("path"));
const lockfile = __importStar(require("proper-lockfile"));
const semver = __importStar(require("semver"));
/**
 * Checks whether there is a compatible update for the currently installed config package.
 * Returns the new version if there is an update, `undefined` otherwise.
 * Throws if the update check failed.
 */
async function checkForConfigUpdates(currentVersion) {
    let registry;
    try {
        registry = await got_1.default
            .get("https://registry.npmjs.org/@zwave-js/config")
            .json();
    }
    catch (e) {
        throw new core_1.ZWaveError(`Could not check for config updates: Failed to download package information!`, core_1.ZWaveErrorCodes.Config_Update_RegistryError);
    }
    if (!(0, typeguards_1.isObject)(registry) || !(0, typeguards_1.isObject)(registry.versions)) {
        throw new core_1.ZWaveError(`Could not check for config updates: Downloaded package information does not contain version information!`, core_1.ZWaveErrorCodes.Config_Update_RegistryError);
    }
    // Find the highest possible prepatch update (e.g. 7.2.4 -> 7.2.5-20200424)
    const allVersions = Object.keys(registry.versions)
        .filter((v) => !!semver.valid(v))
        .filter((v) => /\-\d{8}$/.test(v));
    const updateRange = `>${currentVersion} <${semver.inc(currentVersion, "patch")}`;
    const updateVersion = semver.maxSatisfying(allVersions, updateRange, {
        includePrerelease: true,
    });
    if (updateVersion)
        return updateVersion;
}
exports.checkForConfigUpdates = checkForConfigUpdates;
/**
 * Installs the update for @zwave-js/config with the given version.
 */
async function installConfigUpdate(newVersion) {
    // Check which package manager to use for the update
    let pak;
    try {
        pak = await (0, pak_1.detectPackageManager)({
            cwd: __dirname,
            requireLockfile: false,
            setCwdToPackageRoot: true,
        });
    }
    catch {
        throw new core_1.ZWaveError(`Config update failed: No package manager detected or package.json not found!`, core_1.ZWaveErrorCodes.Config_Update_PackageManagerNotFound);
    }
    const packageJsonPath = path.join(pak.cwd, "package.json");
    try {
        await lockfile.lock(packageJsonPath, {
            onCompromised: () => {
                // do nothing
            },
        });
    }
    catch {
        throw new core_1.ZWaveError(`Config update failed: Another installation is already in progress!`, core_1.ZWaveErrorCodes.Config_Update_InstallFailed);
    }
    // And install it
    const result = await pak.overrideDependencies({
        "@zwave-js/config": newVersion,
    });
    // Free the lock
    try {
        if (await lockfile.check(packageJsonPath))
            await lockfile.unlock(packageJsonPath);
    }
    catch {
        // whatever - just don't crash
    }
    if (result.success)
        return;
    throw new core_1.ZWaveError(`Config update failed: Package manager exited with code ${result.exitCode}
${result.stderr}`, core_1.ZWaveErrorCodes.Config_Update_InstallFailed);
}
exports.installConfigUpdate = installConfigUpdate;
/**
 * Installs the update for @zwave-js/config with the given version.
 * Version for Docker images that does not mess up the container if there's no yarn cache
 */
async function installConfigUpdateInDocker(newVersion, external) {
    let registryInfo;
    try {
        registryInfo = await got_1.default
            .get(`https://registry.npmjs.org/@zwave-js/config/${newVersion}`)
            .json();
    }
    catch {
        throw new core_1.ZWaveError(`Config update failed: Could not fetch package info from npm registry!`, core_1.ZWaveErrorCodes.Config_Update_InstallFailed);
    }
    const url = registryInfo?.dist?.tarball;
    if (typeof url !== "string") {
        throw new core_1.ZWaveError(`Config update failed: Could not fetch package tarball URL from npm registry!`, core_1.ZWaveErrorCodes.Config_Update_InstallFailed);
    }
    let lockfilePath;
    let lockfileOptions;
    if (external) {
        lockfilePath = external.cacheDir;
        lockfileOptions = {
            lockfilePath: path.join(external.cacheDir, "config-update.lock"),
        };
    }
    else {
        // Acquire a lock so the installation doesn't run twice
        let pak;
        try {
            pak = await (0, pak_1.detectPackageManager)({
                cwd: __dirname,
                requireLockfile: false,
                setCwdToPackageRoot: true,
            });
        }
        catch {
            throw new core_1.ZWaveError(`Config update failed: No package manager detected or package.json not found!`, core_1.ZWaveErrorCodes.Config_Update_PackageManagerNotFound);
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
    }
    catch (e) {
        throw new core_1.ZWaveError(`Config update failed: Another installation is already in progress!`, core_1.ZWaveErrorCodes.Config_Update_InstallFailed);
    }
    const freeLock = async () => {
        try {
            if (await lockfile.check(lockfilePath, lockfileOptions))
                await lockfile.unlock(lockfilePath, lockfileOptions);
        }
        catch {
            // whatever - just don't crash
        }
    };
    // Download tarball to a temporary directory
    const tmpDir = path.join(os_1.default.tmpdir(), "zjs-config-update");
    const tarFilename = path.join(tmpDir, "zjs-config-update.tgz");
    const configModuleDir = path.dirname(require.resolve("@zwave-js/config/package.json"));
    const extractedDir = path.join(tmpDir, "extracted");
    try {
        await fs_extra_1.default.ensureDir(tmpDir);
        const fstream = fs_extra_1.default.createWriteStream(tarFilename, { autoClose: true });
        const response = got_1.default.stream.get(url);
        response.pipe(fstream);
        await new Promise((resolve, reject) => {
            response.on("error", reject);
            response.on("end", resolve);
        });
    }
    catch (e) {
        await freeLock();
        throw new core_1.ZWaveError(`Config update failed: Could not download tarball. Reason: ${(0, shared_1.getErrorMessage)(e)}`, core_1.ZWaveErrorCodes.Config_Update_InstallFailed);
    }
    // This should not be necessary in Docker. Leaving it here anyways in case
    // we want to use this method on Windows at some point
    function normalizeToUnixStyle(path) {
        path = path.replace(/:/g, "");
        path = path.replace(/\\/g, "/");
        if (!path.startsWith("/"))
            path = `/${path}`;
        return path;
    }
    // Extract it into a temporary folder, then overwrite the config node_modules with it
    try {
        await fs_extra_1.default.emptyDir(extractedDir);
        await (0, execa_1.default)("tar", [
            "--strip-components=1",
            "-xzf",
            normalizeToUnixStyle(tarFilename),
            "-C",
            normalizeToUnixStyle(extractedDir),
        ]);
        // How we install now depends on whether we're installing into the external config dir.
        // If we are, we just need to copy the `devices` subdirectory. If not, copy the entire extracted dir
        if (external) {
            await fs_extra_1.default.emptyDir(external.configDir);
            await fs_extra_1.default.copy(path.join(extractedDir, "config"), external.configDir, {
                filter: async (src) => {
                    if (!(await fs_extra_1.default.stat(src)).isFile())
                        return true;
                    return src.endsWith(".json");
                },
            });
            const externalVersionFilename = path.join(external.configDir, "version");
            await fs_extra_1.default.writeFile(externalVersionFilename, newVersion, "utf8");
        }
        else {
            await fs_extra_1.default.remove(configModuleDir);
            await fs_extra_1.default.rename(extractedDir, configModuleDir);
        }
    }
    catch (e) {
        await freeLock();
        throw new core_1.ZWaveError(`Config update failed: Could not extract tarball`, core_1.ZWaveErrorCodes.Config_Update_InstallFailed);
    }
    // Try to update our own package.json if we're working with the internal structure
    if (!external) {
        try {
            const packageJsonPath = require.resolve("zwave-js/package.json");
            const json = await fs_extra_1.default.readJSON(packageJsonPath, {
                encoding: "utf8",
            });
            json.dependencies["@zwave-js/config"] = newVersion;
            await fs_extra_1.default.writeJSON(packageJsonPath, json, {
                encoding: "utf8",
                spaces: 2,
            });
        }
        catch {
            // ignore
        }
    }
    // Clean up the temp dir and ignore errors
    void fs_extra_1.default.remove(tmpDir).catch(() => {
        // ignore
    });
    // Free the lock
    await freeLock();
}
exports.installConfigUpdateInDocker = installConfigUpdateInDocker;
//# sourceMappingURL=UpdateConfig.js.map