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
exports.DeviceConfig = exports.ConditionalDeviceConfig = exports.loadFulltextDeviceIndexInternal = exports.loadDeviceIndexInternal = exports.generatePriorityDeviceIndex = exports.getDevicesPaths = exports.embeddedDevicesDir = void 0;
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const typeguards_1 = require("alcalzone-shared/typeguards");
const fs = __importStar(require("fs-extra"));
const fs_extra_1 = require("fs-extra");
const json5_1 = __importDefault(require("json5"));
const path_1 = __importDefault(require("path"));
const JsonTemplate_1 = require("../JsonTemplate");
const utils_1 = require("../utils");
const utils_safe_1 = require("../utils_safe");
const AssociationConfig_1 = require("./AssociationConfig");
const CompatConfig_1 = require("./CompatConfig");
const ConditionalItem_1 = require("./ConditionalItem");
const ConditionalPrimitive_1 = require("./ConditionalPrimitive");
const DeviceMetadata_1 = require("./DeviceMetadata");
const EndpointConfig_1 = require("./EndpointConfig");
const ParamInformation_1 = require("./ParamInformation");
exports.embeddedDevicesDir = path_1.default.join(utils_1.configDir, "devices");
const fulltextIndexPath = path_1.default.join(exports.embeddedDevicesDir, "fulltext_index.json");
function getDevicesPaths(configDir) {
    const devicesDir = path_1.default.join(configDir, "devices");
    const indexPath = path_1.default.join(devicesDir, "index.json");
    return { devicesDir, indexPath };
}
exports.getDevicesPaths = getDevicesPaths;
async function hasChangedDeviceFiles(devicesRoot, dir, lastChange) {
    // Check if there are any files BUT index.json that were changed
    // or directories that were modified
    const filesAndDirs = await fs.readdir(dir);
    for (const f of filesAndDirs) {
        const fullPath = path_1.default.join(dir, f);
        const stat = await fs.stat(fullPath);
        if ((dir !== devicesRoot || f !== "index.json") &&
            (stat.isFile() || stat.isDirectory()) &&
            stat.mtime > lastChange) {
            return true;
        }
        else if (stat.isDirectory()) {
            // we need to go deeper!
            if (await hasChangedDeviceFiles(devicesRoot, fullPath, lastChange))
                return true;
        }
    }
    return false;
}
/**
 * Read all device config files from a given directory and return them as index entries.
 * Does not update the index itself.
 */
async function generateIndex(devicesDir, isEmbedded, extractIndexEntries, logger) {
    const index = [];
    (0, JsonTemplate_1.clearTemplateCache)();
    const configFiles = await (0, shared_1.enumFilesRecursive)(devicesDir, (file) => file.endsWith(".json") &&
        !file.endsWith("index.json") &&
        !file.includes("/templates/") &&
        !file.includes("\\templates\\"));
    for (const file of configFiles) {
        const relativePath = path_1.default
            .relative(devicesDir, file)
            .replace(/\\/g, "/");
        // Try parsing the file
        try {
            const config = await DeviceConfig.from(file, isEmbedded, {
                rootDir: devicesDir,
                relative: true,
            });
            // Add the file to the index
            index.push(...extractIndexEntries(config).map((entry) => {
                const ret = {
                    ...entry,
                    filename: relativePath,
                };
                // Only add the root dir to the index if necessary
                if (devicesDir !== exports.embeddedDevicesDir) {
                    ret.rootDir = devicesDir;
                }
                return ret;
            }));
        }
        catch (e) {
            const message = `Error parsing config file ${relativePath}: ${e.message}`;
            // Crash hard during tests, just print an error when in production systems.
            // A user could have changed a config file
            if (process.env.NODE_ENV === "test" || !!process.env.CI) {
                throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.Config_Invalid);
            }
            else {
                logger?.print(message, "error");
            }
        }
    }
    return index;
}
async function loadDeviceIndexShared(devicesDir, indexPath, extractIndexEntries, logger) {
    // The index file needs to be regenerated if it does not exist
    let needsUpdate = !(await (0, fs_extra_1.pathExists)(indexPath));
    let index;
    let mtimeIndex;
    // ...or if cannot be parsed
    if (!needsUpdate) {
        try {
            const fileContents = await (0, fs_extra_1.readFile)(indexPath, "utf8");
            index = json5_1.default.parse(fileContents);
            mtimeIndex = (await fs.stat(indexPath)).mtime;
        }
        catch {
            logger?.print("Error while parsing index file - regenerating...", "warn");
            needsUpdate = true;
        }
        finally {
            if (!index) {
                logger?.print("Index file was malformed - regenerating...", "warn");
                needsUpdate = true;
            }
        }
    }
    // ...or if there were any changes in the file system
    if (!needsUpdate) {
        needsUpdate = await hasChangedDeviceFiles(devicesDir, devicesDir, mtimeIndex);
        if (needsUpdate) {
            logger?.print("Device configuration files on disk changed - regenerating index...", "verbose");
        }
    }
    if (needsUpdate) {
        // Read all files from disk and generate an index
        index = await generateIndex(devicesDir, true, extractIndexEntries, logger);
        // Save the index to disk
        try {
            await (0, fs_extra_1.writeFile)(path_1.default.join(indexPath), `// This file is auto-generated. DO NOT edit it by hand if you don't know what you're doing!"
${(0, shared_1.stringify)(index, "\t")}
`, "utf8");
            logger?.print("Device index regenerated", "verbose");
        }
        catch (e) {
            logger?.print(`Writing the device index to disk failed: ${e.message}`, "error");
        }
    }
    return index;
}
/**
 * @internal
 * Loads the index file to quickly access the device configs.
 * Transparently handles updating the index if necessary
 */
async function generatePriorityDeviceIndex(deviceConfigPriorityDir, logger) {
    return (await generateIndex(deviceConfigPriorityDir, false, (config) => config.devices.map((dev) => ({
        manufacturerId: (0, shared_1.formatId)(config.manufacturerId.toString(16)),
        manufacturer: config.manufacturer,
        label: config.label,
        productType: (0, shared_1.formatId)(dev.productType),
        productId: (0, shared_1.formatId)(dev.productId),
        firmwareVersion: config.firmwareVersion,
        rootDir: deviceConfigPriorityDir,
    })), logger)).map(({ filename, ...entry }) => ({
        ...entry,
        // The generated index makes the filenames relative to the given directory
        // but we need them to be absolute
        filename: path_1.default.join(deviceConfigPriorityDir, filename),
    }));
}
exports.generatePriorityDeviceIndex = generatePriorityDeviceIndex;
/**
 * @internal
 * Loads the index file to quickly access the device configs.
 * Transparently handles updating the index if necessary
 */
async function loadDeviceIndexInternal(logger, externalConfig) {
    const { devicesDir, indexPath } = getDevicesPaths((externalConfig && (0, utils_1.externalConfigDir)()) || utils_1.configDir);
    return loadDeviceIndexShared(devicesDir, indexPath, (config) => config.devices.map((dev) => ({
        manufacturerId: (0, shared_1.formatId)(config.manufacturerId.toString(16)),
        manufacturer: config.manufacturer,
        label: config.label,
        productType: (0, shared_1.formatId)(dev.productType),
        productId: (0, shared_1.formatId)(dev.productId),
        firmwareVersion: config.firmwareVersion,
    })), logger);
}
exports.loadDeviceIndexInternal = loadDeviceIndexInternal;
/**
 * @internal
 * Loads the full text index file to quickly search the device configs.
 * Transparently handles updating the index if necessary
 */
async function loadFulltextDeviceIndexInternal(logger) {
    // This method is not meant to operate with the external device index!
    return loadDeviceIndexShared(exports.embeddedDevicesDir, fulltextIndexPath, (config) => config.devices.map((dev) => ({
        manufacturerId: (0, shared_1.formatId)(config.manufacturerId.toString(16)),
        manufacturer: config.manufacturer,
        label: config.label,
        description: config.description,
        productType: (0, shared_1.formatId)(dev.productType),
        productId: (0, shared_1.formatId)(dev.productId),
        firmwareVersion: config.firmwareVersion,
        rootDir: exports.embeddedDevicesDir,
    })), logger);
}
exports.loadFulltextDeviceIndexInternal = loadFulltextDeviceIndexInternal;
function isHexKeyWith4Digits(val) {
    return typeof val === "string" && utils_safe_1.hexKeyRegex4Digits.test(val);
}
const firmwareVersionRegex = /^\d{1,3}\.\d{1,3}(\.\d{1,3})?$/;
function isFirmwareVersion(val) {
    return (typeof val === "string" &&
        firmwareVersionRegex.test(val) &&
        val
            .split(".")
            .map((str) => parseInt(str, 10))
            .every((num) => num >= 0 && num <= 255));
}
/** This class represents a device config entry whose conditional settings have not been evaluated yet */
class ConditionalDeviceConfig {
    static async from(filename, isEmbedded, options) {
        const { relative, rootDir } = options;
        const relativePath = relative
            ? path_1.default.relative(rootDir, filename).replace(/\\/g, "/")
            : filename;
        const json = await (0, JsonTemplate_1.readJsonWithTemplate)(filename, options.rootDir);
        return new ConditionalDeviceConfig(relativePath, isEmbedded, json);
    }
    constructor(filename, isEmbedded, definition) {
        this.filename = filename;
        this.isEmbedded = isEmbedded;
        if (!isHexKeyWith4Digits(definition.manufacturerId)) {
            (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
manufacturer id must be a lowercase hexadecimal number with 4 digits`);
        }
        this.manufacturerId = parseInt(definition.manufacturerId, 16);
        for (const prop of ["manufacturer", "label", "description"]) {
            this[prop] = (0, ConditionalPrimitive_1.parseConditionalPrimitive)(filename, "string", prop, definition[prop]);
        }
        if (!(0, typeguards_1.isArray)(definition.devices) ||
            !definition.devices.every((dev) => (0, typeguards_1.isObject)(dev) &&
                isHexKeyWith4Digits(dev.productType) &&
                isHexKeyWith4Digits(dev.productId))) {
            (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
devices is malformed (not an object or type/id that is not a lowercase 4-digit hex key)`);
        }
        this.devices = definition.devices.map(({ productType, productId }) => ({
            productType: parseInt(productType, 16),
            productId: parseInt(productId, 16),
        }));
        if (!(0, typeguards_1.isObject)(definition.firmwareVersion) ||
            !isFirmwareVersion(definition.firmwareVersion.min) ||
            !isFirmwareVersion(definition.firmwareVersion.max)) {
            (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
firmwareVersion is malformed or invalid. Must be x.y or x.y.z where x, y, and z are integers between 0 and 255`);
        }
        else {
            const { min, max } = definition.firmwareVersion;
            this.firmwareVersion = { min, max };
        }
        if (definition.endpoints != undefined) {
            const endpoints = new Map();
            if (!(0, typeguards_1.isObject)(definition.endpoints)) {
                (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
endpoints is not an object`);
            }
            for (const [key, ep] of Object.entries(definition.endpoints)) {
                if (!/^\d+$/.test(key)) {
                    (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
found non-numeric endpoint index "${key}" in endpoints`);
                }
                const epIndex = parseInt(key, 10);
                endpoints.set(epIndex, new EndpointConfig_1.ConditionalEndpointConfig(filename, epIndex, ep));
            }
            this.endpoints = endpoints;
        }
        if (definition.associations != undefined) {
            const associations = new Map();
            if (!(0, typeguards_1.isObject)(definition.associations)) {
                (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
associations is not an object`);
            }
            for (const [key, assocDefinition] of Object.entries(definition.associations)) {
                if (!/^[1-9][0-9]*$/.test(key)) {
                    (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
found non-numeric group id "${key}" in associations`);
                }
                const keyNum = parseInt(key, 10);
                associations.set(keyNum, new AssociationConfig_1.ConditionalAssociationConfig(filename, keyNum, assocDefinition));
            }
            this.associations = associations;
        }
        if (definition.paramInformation != undefined) {
            const paramInformation = new shared_1.ObjectKeyMap();
            if ((0, typeguards_1.isArray)(definition.paramInformation)) {
                // Defining paramInformation as an array is the preferred variant now.
                // Check that every param has a param number
                if (!definition.paramInformation.every((entry) => "#" in entry)) {
                    (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}: 
required property "#" missing in at least one entry of paramInformation`);
                }
                // And a valid $if condition
                for (const entry of definition.paramInformation) {
                    (0, ConditionalItem_1.validateCondition)(filename, entry, `At least one entry of paramInformation contains an`);
                }
                for (const paramDefinition of definition.paramInformation) {
                    const { ["#"]: paramNo, ...defn } = paramDefinition;
                    const match = /^(\d+)(?:\[0x([0-9a-fA-F]+)\])?$/.exec(paramNo);
                    if (!match) {
                        (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}: 
found invalid param number "${paramNo}" in paramInformation`);
                    }
                    const keyNum = parseInt(match[1], 10);
                    const bitMask = match[2] != undefined
                        ? parseInt(match[2], 16)
                        : undefined;
                    const key = { parameter: keyNum, valueBitMask: bitMask };
                    if (!paramInformation.has(key))
                        paramInformation.set(key, []);
                    paramInformation
                        .get(key)
                        .push(new ParamInformation_1.ConditionalParamInformation(this, keyNum, bitMask, defn));
                }
            }
            else if ((process.env.NODE_ENV !== "test" || !!process.env.CI) &&
                (0, typeguards_1.isObject)(definition.paramInformation)) {
                // Prior to v8.1.0, paramDefinition was an object
                // We need to support parsing legacy files because users might have custom configs
                // However, we don't allow this on CI or during tests/lint
                for (const [key, paramDefinition] of Object.entries(definition.paramInformation)) {
                    const match = /^(\d+)(?:\[0x([0-9a-fA-F]+)\])?$/.exec(key);
                    if (!match) {
                        (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
found invalid param number "${key}" in paramInformation`);
                    }
                    if (!(0, typeguards_1.isObject)(paramDefinition) &&
                        !((0, typeguards_1.isArray)(paramDefinition) &&
                            paramDefinition.every((p) => (0, typeguards_1.isObject)(p)))) {
                        (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
paramInformation "${key}" is invalid: Every entry must either be an object or an array of objects!`);
                    }
                    // Normalize to an array
                    const defns = (0, typeguards_1.isArray)(paramDefinition)
                        ? paramDefinition
                        : [paramDefinition];
                    const keyNum = parseInt(match[1], 10);
                    const bitMask = match[2] != undefined
                        ? parseInt(match[2], 16)
                        : undefined;
                    paramInformation.set({ parameter: keyNum, valueBitMask: bitMask }, defns.map((def) => new ParamInformation_1.ConditionalParamInformation(this, keyNum, bitMask, def)));
                }
            }
            else {
                (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
paramInformation must be an array!`);
            }
            this.paramInformation = paramInformation;
        }
        if (definition.proprietary != undefined) {
            if (!(0, typeguards_1.isObject)(definition.proprietary)) {
                (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
proprietary is not an object`);
            }
            this.proprietary = definition.proprietary;
        }
        if (definition.compat != undefined) {
            if ((0, typeguards_1.isArray)(definition.compat) &&
                definition.compat.every((item) => (0, typeguards_1.isObject)(item))) {
                // Make sure all conditions are valid
                for (const entry of definition.compat) {
                    (0, ConditionalItem_1.validateCondition)(filename, entry, `At least one entry of compat contains an`);
                }
                this.compat = definition.compat.map((item) => new CompatConfig_1.ConditionalCompatConfig(filename, item));
            }
            else if ((0, typeguards_1.isObject)(definition.compat)) {
                this.compat = new CompatConfig_1.ConditionalCompatConfig(filename, definition.compat);
            }
            else {
                (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
compat must be an object or any array of conditional objects`);
            }
        }
        if (definition.metadata != undefined) {
            if (!(0, typeguards_1.isObject)(definition.metadata)) {
                (0, utils_safe_1.throwInvalidConfig)(`device`, `packages/config/config/devices/${filename}:
metadata is not an object`);
            }
            this.metadata = new DeviceMetadata_1.ConditionalDeviceMetadata(filename, definition.metadata);
        }
    }
    evaluate(deviceId) {
        return new DeviceConfig(this.filename, this.isEmbedded, (0, ConditionalItem_1.evaluateDeep)(this.manufacturer, deviceId), this.manufacturerId, (0, ConditionalItem_1.evaluateDeep)(this.label, deviceId), (0, ConditionalItem_1.evaluateDeep)(this.description, deviceId), this.devices, this.firmwareVersion, (0, ConditionalItem_1.evaluateDeep)(this.endpoints, deviceId), (0, ConditionalItem_1.evaluateDeep)(this.associations, deviceId), (0, ConditionalItem_1.evaluateDeep)(this.paramInformation, deviceId), this.proprietary, (0, ConditionalItem_1.evaluateDeep)(this.compat, deviceId), (0, ConditionalItem_1.evaluateDeep)(this.metadata, deviceId));
    }
}
exports.ConditionalDeviceConfig = ConditionalDeviceConfig;
class DeviceConfig {
    static async from(filename, isEmbedded, options) {
        const ret = await ConditionalDeviceConfig.from(filename, isEmbedded, options);
        return ret.evaluate(options.deviceId);
    }
    constructor(filename, 
    /** Whether this is an embedded configuration or not */
    isEmbedded, manufacturer, manufacturerId, label, description, devices, firmwareVersion, endpoints, associations, paramInformation, 
    /**
     * Contains manufacturer-specific support information for the
     * ManufacturerProprietary CC
     */
    proprietary, 
    /** Contains compatibility options */
    compat, 
    /** Contains instructions and other metadata for the device */
    metadata) {
        this.filename = filename;
        this.isEmbedded = isEmbedded;
        this.manufacturer = manufacturer;
        this.manufacturerId = manufacturerId;
        this.label = label;
        this.description = description;
        this.devices = devices;
        this.firmwareVersion = firmwareVersion;
        this.endpoints = endpoints;
        this.associations = associations;
        this.paramInformation = paramInformation;
        this.proprietary = proprietary;
        this.compat = compat;
        this.metadata = metadata;
    }
    /** Returns the association config for a given endpoint */
    getAssociationConfigForEndpoint(endpointIndex, group) {
        if (endpointIndex === 0) {
            // The root endpoint's associations may be configured separately or as part of "endpoints"
            return (this.associations?.get(group) ??
                this.endpoints?.get(0)?.associations?.get(group));
        }
        else {
            // The other endpoints can only have a configuration as part of "endpoints"
            return this.endpoints?.get(endpointIndex)?.associations?.get(group);
        }
    }
}
exports.DeviceConfig = DeviceConfig;
//# sourceMappingURL=DeviceConfig.js.map