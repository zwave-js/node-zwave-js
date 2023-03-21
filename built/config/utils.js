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
exports.syncExternalConfigDir = exports.getEmbeddedConfigVersion = exports.getDeviceEntryPredicate = exports.externalConfigDir = exports.configDir = void 0;
const shared_1 = require("@zwave-js/shared");
const fs = __importStar(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const semver = __importStar(require("semver"));
/** The absolute path of the embedded configuration directory */
exports.configDir = path_1.default.resolve(__dirname, "../config");
/** The (optional) absolute path of an external configuration directory */
function externalConfigDir() {
    return process.env.ZWAVEJS_EXTERNAL_CONFIG;
}
exports.externalConfigDir = externalConfigDir;
function getDeviceEntryPredicate(manufacturerId, productType, productId, firmwareVersion) {
    return (entry) => {
        if (entry.manufacturerId !== (0, shared_1.formatId)(manufacturerId))
            return false;
        if (entry.productType !== (0, shared_1.formatId)(productType))
            return false;
        if (entry.productId !== (0, shared_1.formatId)(productId))
            return false;
        if (firmwareVersion != undefined) {
            // A firmware version was given, only look at files with a matching firmware version
            return (semver.lte((0, shared_1.padVersion)(entry.firmwareVersion.min), (0, shared_1.padVersion)(firmwareVersion)) &&
                semver.gte((0, shared_1.padVersion)(entry.firmwareVersion.max), (0, shared_1.padVersion)(firmwareVersion)));
        }
        return true;
    };
}
exports.getDeviceEntryPredicate = getDeviceEntryPredicate;
async function getEmbeddedConfigVersion() {
    return (await fs.readJSON(path_1.default.join(__dirname, "../package.json"))).version;
}
exports.getEmbeddedConfigVersion = getEmbeddedConfigVersion;
/**
 * Synchronizes or updates the external config directory and returns whether the directory is in a state that can be used
 */
async function syncExternalConfigDir(logger) {
    const extConfigDir = externalConfigDir();
    if (!extConfigDir)
        return { success: false };
    // Make sure the config dir exists
    try {
        await fs.ensureDir(extConfigDir);
    }
    catch {
        logger.print(`Synchronizing external config dir failed - directory could not be created`, "error");
        return { success: false };
    }
    const externalVersionFilename = path_1.default.join(extConfigDir, "version");
    const currentVersion = await getEmbeddedConfigVersion();
    const supportedRange = `>=${currentVersion} <${semver.inc(currentVersion, "patch")}`;
    // We remember the config version that was copied there in a file called "version"
    // If that either...
    // ...isn't there,
    // ...can't be read,
    // ...doesn't contain a matching version (>= current && nightly)
    // wipe the external config dir and recreate it
    let wipe = false;
    let externalVersion;
    try {
        externalVersion = await fs.readFile(externalVersionFilename, "utf8");
        if (!semver.valid(externalVersion)) {
            wipe = true;
        }
        else if (!semver.satisfies(externalVersion, supportedRange, {
            includePrerelease: true,
        })) {
            wipe = true;
        }
    }
    catch {
        wipe = true;
    }
    // Nothing to wipe, the external dir is good to go
    if (!wipe)
        return { success: true, version: externalVersion };
    // Wipe and override the external dir
    try {
        logger.print(`Synchronizing external config dir ${extConfigDir}...`);
        await fs.emptyDir(extConfigDir);
        await fs.copy(exports.configDir, extConfigDir, {
            filter: async (src) => {
                if (!(await fs.stat(src)).isFile())
                    return true;
                return src.endsWith(".json");
            },
        });
        await fs.writeFile(externalVersionFilename, currentVersion, "utf8");
        externalVersion = currentVersion;
    }
    catch {
        // Something went wrong
        logger.print(`Synchronizing external config dir failed - using embedded config`, "error");
        return { success: false };
    }
    return { success: true, version: externalVersion };
}
exports.syncExternalConfigDir = syncExternalConfigDir;
//# sourceMappingURL=utils.js.map