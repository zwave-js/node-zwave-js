"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateLegacyNetworkCache = exports.serializeNetworkCacheValue = exports.deserializeNetworkCacheValue = exports.cacheKeyUtils = exports.cacheKeys = void 0;
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const typeguards_1 = require("alcalzone-shared/typeguards");
const path_1 = __importDefault(require("path"));
const Inclusion_1 = require("../controller/Inclusion");
const DeviceClass_1 = require("../node/DeviceClass");
const _Types_1 = require("../node/_Types");
/**
 * Defines the keys that are used to store certain properties in the network cache.
 */
exports.cacheKeys = {
    controller: {
        provisioningList: "controller.provisioningList",
        supportsSoftReset: "controller.supportsSoftReset",
    },
    // TODO: somehow these functions should be combined with the pattern matching below
    node: (nodeId) => {
        const nodeBaseKey = `node.${nodeId}.`;
        return {
            _baseKey: nodeBaseKey,
            _securityClassBaseKey: `${nodeBaseKey}securityClasses`,
            interviewStage: `${nodeBaseKey}interviewStage`,
            deviceClass: `${nodeBaseKey}deviceClass`,
            isListening: `${nodeBaseKey}isListening`,
            isFrequentListening: `${nodeBaseKey}isFrequentListening`,
            isRouting: `${nodeBaseKey}isRouting`,
            supportedDataRates: `${nodeBaseKey}supportedDataRates`,
            protocolVersion: `${nodeBaseKey}protocolVersion`,
            nodeType: `${nodeBaseKey}nodeType`,
            supportsSecurity: `${nodeBaseKey}supportsSecurity`,
            supportsBeaming: `${nodeBaseKey}supportsBeaming`,
            securityClass: (secClass) => `${nodeBaseKey}securityClasses.${(0, shared_1.getEnumMemberName)(core_1.SecurityClass, secClass)}`,
            dsk: `${nodeBaseKey}dsk`,
            endpoint: (index) => {
                const endpointBaseKey = `${nodeBaseKey}endpoint.${index}.`;
                const ccBaseKey = `${endpointBaseKey}commandClass.`;
                return {
                    _baseKey: endpointBaseKey,
                    _ccBaseKey: ccBaseKey,
                    commandClass: (ccId) => {
                        const ccAsHex = (0, shared_1.num2hex)(ccId);
                        return `${ccBaseKey}${ccAsHex}`;
                    },
                };
            },
            hasSUCReturnRoute: `${nodeBaseKey}hasSUCReturnRoute`,
        };
    },
};
exports.cacheKeyUtils = {
    nodeIdFromKey: (key) => {
        const match = /^node\.(?<nodeId>\d+)\./.exec(key);
        if (match) {
            return parseInt(match.groups.nodeId, 10);
        }
    },
    nodePropertyFromKey: (key) => {
        const match = /^node\.\d+\.(?<property>[^\.]+)$/.exec(key);
        return match?.groups?.property;
    },
    isEndpointKey: (key) => {
        return /endpoints\.(?<index>\d+)$/.test(key);
    },
    endpointIndexFromKey: (key) => {
        const match = /endpoints\.(?<index>\d+)$/.exec(key);
        if (match) {
            return parseInt(match.groups.index, 10);
        }
    },
};
function tryParseInterviewStage(value) {
    if ((typeof value === "string" || typeof value === "number") &&
        value in _Types_1.InterviewStage) {
        return typeof value === "number"
            ? value
            : _Types_1.InterviewStage[value];
    }
}
function tryParseDeviceClass(driver, value) {
    if ((0, typeguards_1.isObject)(value)) {
        const { basic, generic, specific } = value;
        if (typeof basic === "number" &&
            typeof generic === "number" &&
            typeof specific === "number") {
            return new DeviceClass_1.DeviceClass(driver.configManager, basic, generic, specific);
        }
    }
}
function tryParseSecurityClasses(value) {
    if ((0, typeguards_1.isObject)(value)) {
        const ret = new Map();
        for (const [key, val] of Object.entries(value)) {
            if (key in core_1.SecurityClass &&
                typeof core_1.SecurityClass[key] === "number" &&
                typeof val === "boolean") {
                ret.set(core_1.SecurityClass[key], val);
            }
        }
        return ret;
    }
}
function tryParseNodeType(value) {
    if (typeof value === "string" && value in core_1.NodeType) {
        return core_1.NodeType[value];
    }
}
function tryParseProvisioningList(value) {
    const ret = [];
    if (!(0, typeguards_1.isArray)(value))
        return;
    for (const entry of value) {
        if ((0, typeguards_1.isObject)(entry) &&
            typeof entry.dsk === "string" &&
            (0, typeguards_1.isArray)(entry.securityClasses) &&
            // securityClasses are stored as strings, not the enum values
            entry.securityClasses.every((s) => isSerializedSecurityClass(s)) &&
            (entry.requestedSecurityClasses == undefined ||
                ((0, typeguards_1.isArray)(entry.requestedSecurityClasses) &&
                    entry.requestedSecurityClasses.every((s) => isSerializedSecurityClass(s)))) &&
            (entry.status == undefined ||
                isSerializedProvisioningEntryStatus(entry.status))) {
            // This is at least a PlannedProvisioningEntry, maybe it is an IncludedProvisioningEntry
            if ("nodeId" in entry && typeof entry.nodeId !== "number") {
                return;
            }
            const parsed = {
                ...entry,
            };
            parsed.securityClasses = entry.securityClasses
                .map((s) => tryParseSerializedSecurityClass(s))
                .filter((s) => s !== undefined);
            if (entry.requestedSecurityClasses) {
                parsed.requestedSecurityClasses = entry.requestedSecurityClasses
                    .map((s) => tryParseSerializedSecurityClass(s))
                    .filter((s) => s !== undefined);
            }
            if (entry.status != undefined) {
                parsed.status = Inclusion_1.ProvisioningEntryStatus[entry.status];
            }
            ret.push(parsed);
        }
        else {
            return;
        }
    }
    return ret;
}
function isSerializedSecurityClass(value) {
    // There was an error in previous iterations of the migration code, so we
    // now have to deal with the following variants:
    // 1. plain numbers representing a valid Security Class: 1
    // 2. strings representing a valid Security Class: "S2_Unauthenticated"
    // 3. strings represending a mis-formatted Security Class: "unknown (0xS2_Unauthenticated)"
    if (typeof value === "number" && value in core_1.SecurityClass)
        return true;
    if (typeof value === "string") {
        if (value.startsWith("unknown (0x") && value.endsWith(")")) {
            value = value.slice(11, -1);
        }
        if (value in core_1.SecurityClass &&
            typeof core_1.SecurityClass[value] === "number") {
            return true;
        }
    }
    return false;
}
function tryParseSerializedSecurityClass(value) {
    // There was an error in previous iterations of the migration code, so we
    // now have to deal with the following variants:
    // 1. plain numbers representing a valid Security Class: 1
    // 2. strings representing a valid Security Class: "S2_Unauthenticated"
    // 3. strings represending a mis-formatted Security Class: "unknown (0xS2_Unauthenticated)"
    if (typeof value === "number" && value in core_1.SecurityClass)
        return value;
    if (typeof value === "string") {
        if (value.startsWith("unknown (0x") && value.endsWith(")")) {
            value = value.slice(11, -1);
        }
        if (value in core_1.SecurityClass &&
            typeof core_1.SecurityClass[value] === "number") {
            return core_1.SecurityClass[value];
        }
    }
}
function isSerializedProvisioningEntryStatus(s) {
    return (typeof s === "string" &&
        s in Inclusion_1.ProvisioningEntryStatus &&
        typeof Inclusion_1.ProvisioningEntryStatus[s] === "number");
}
function deserializeNetworkCacheValue(driver, key, value) {
    function ensureType(value, type) {
        if (typeof value === type)
            return value;
        throw new core_1.ZWaveError(`Incorrect type ${typeof value} for property "${key}"`, core_1.ZWaveErrorCodes.Driver_InvalidCache);
    }
    function fail() {
        throw new core_1.ZWaveError(`Failed to deserialize property "${key}"`, core_1.ZWaveErrorCodes.Driver_InvalidCache);
    }
    switch (exports.cacheKeyUtils.nodePropertyFromKey(key)) {
        case "interviewStage": {
            value = tryParseInterviewStage(value);
            if (value)
                return value;
            throw fail();
        }
        case "deviceClass": {
            value = tryParseDeviceClass(driver, value);
            if (value)
                return value;
            throw fail();
        }
        case "isListening":
        case "isRouting":
        case "hasSUCReturnRoute":
            return ensureType(value, "boolean");
        case "isFrequentListening": {
            switch (value) {
                case "1000ms":
                case true:
                    return "1000ms";
                case "250ms":
                    return "250ms";
                case false:
                    return false;
            }
            throw fail();
        }
        case "dsk": {
            if (typeof value === "string") {
                return (0, core_1.dskFromString)(value);
            }
            throw fail();
        }
        case "supportsSecurity":
            return ensureType(value, "boolean");
        case "supportsBeaming":
            try {
                return ensureType(value, "boolean");
            }
            catch {
                return ensureType(value, "string");
            }
        case "protocolVersion":
            return ensureType(value, "number");
        case "nodeType": {
            value = tryParseNodeType(value);
            if (value)
                return value;
            throw fail();
        }
        case "supportedDataRates": {
            if ((0, typeguards_1.isArray)(value) &&
                value.every((r) => typeof r === "number")) {
                return value;
            }
            throw fail();
        }
    }
    // Other properties
    switch (key) {
        case exports.cacheKeys.controller.provisioningList: {
            value = tryParseProvisioningList(value);
            if (value)
                return value;
            throw fail();
        }
    }
    return value;
}
exports.deserializeNetworkCacheValue = deserializeNetworkCacheValue;
function serializeNetworkCacheValue(driver, key, value) {
    // Node-specific properties
    switch (exports.cacheKeyUtils.nodePropertyFromKey(key)) {
        case "interviewStage": {
            return _Types_1.InterviewStage[value];
        }
        case "deviceClass": {
            const deviceClass = value;
            return {
                basic: deviceClass.basic.key,
                generic: deviceClass.generic.key,
                specific: deviceClass.specific.key,
            };
        }
        case "nodeType": {
            return core_1.NodeType[value];
        }
        case "securityClasses": {
            const ret = {};
            // Save security classes where they are known
            for (const secClass of core_1.securityClassOrder) {
                if (secClass in value) {
                    ret[core_1.SecurityClass[secClass]] = value[secClass];
                }
            }
            return ret;
        }
        case "dsk": {
            return (0, core_1.dskToString)(value);
        }
    }
    // Other properties
    switch (key) {
        case exports.cacheKeys.controller.provisioningList: {
            const ret = [];
            for (const entry of value) {
                const serialized = { ...entry };
                serialized.securityClasses = entry.securityClasses.map((c) => (0, shared_1.getEnumMemberName)(core_1.SecurityClass, c));
                if (entry.requestedSecurityClasses) {
                    serialized.requestedSecurityClasses =
                        entry.requestedSecurityClasses.map((c) => (0, shared_1.getEnumMemberName)(core_1.SecurityClass, c));
                }
                if (entry.status != undefined) {
                    serialized.status = (0, shared_1.getEnumMemberName)(Inclusion_1.ProvisioningEntryStatus, entry.status);
                }
                ret.push(serialized);
            }
            return ret;
        }
    }
    return value;
}
exports.serializeNetworkCacheValue = serializeNetworkCacheValue;
/** Defines the JSON paths that were used to store certain properties in the legacy network cache */
const legacyPaths = {
    // These seem to duplicate the ones in cacheKeys, but this allows us to change
    // something in the future without breaking migration
    controller: {
        provisioningList: "controller.provisioningList",
        supportsSoftReset: "controller.supportsSoftReset",
    },
    node: {
        // These are relative to the node object
        interviewStage: `interviewStage`,
        deviceClass: `deviceClass`,
        isListening: `isListening`,
        isFrequentListening: `isFrequentListening`,
        isRouting: `isRouting`,
        supportedDataRates: `supportedDataRates`,
        protocolVersion: `protocolVersion`,
        nodeType: `nodeType`,
        supportsSecurity: `supportsSecurity`,
        supportsBeaming: `supportsBeaming`,
        securityClasses: `securityClasses`,
        dsk: `dsk`,
    },
    commandClass: {
        // These are relative to the commandClasses object
        name: `name`,
        endpoint: (index) => `endpoints.${index}`,
    },
};
async function migrateLegacyNetworkCache(driver, homeId, networkCache, valueDB, storageDriver, cacheDir) {
    const cacheFile = path_1.default.join(cacheDir, `${homeId.toString(16)}.json`);
    if (!(await storageDriver.pathExists(cacheFile)))
        return;
    const legacy = JSON.parse(await storageDriver.readFile(cacheFile, "utf8"));
    const jsonl = networkCache;
    function tryMigrate(targetKey, source, sourcePath, converter) {
        let val = (0, shared_1.pickDeep)(source, sourcePath);
        if (val != undefined && converter)
            val = converter(val);
        if (val != undefined)
            jsonl.set(targetKey, val);
    }
    // Translate all possible entries
    // Controller provisioning list and supportsSoftReset info
    tryMigrate(exports.cacheKeys.controller.provisioningList, legacy, legacyPaths.controller.provisioningList, tryParseProvisioningList);
    tryMigrate(exports.cacheKeys.controller.supportsSoftReset, legacy, legacyPaths.controller.supportsSoftReset);
    // All nodes, ...
    if ((0, typeguards_1.isObject)(legacy.nodes)) {
        for (const node of Object.values(legacy.nodes)) {
            if (!(0, typeguards_1.isObject)(node) || typeof node.id !== "number")
                continue;
            const nodeCacheKeys = exports.cacheKeys.node(node.id);
            // ... their properties
            tryMigrate(nodeCacheKeys.interviewStage, node, legacyPaths.node.interviewStage, tryParseInterviewStage);
            tryMigrate(nodeCacheKeys.deviceClass, node, legacyPaths.node.deviceClass, (v) => tryParseDeviceClass(driver, v));
            tryMigrate(nodeCacheKeys.isListening, node, legacyPaths.node.isListening);
            tryMigrate(nodeCacheKeys.isFrequentListening, node, legacyPaths.node.isFrequentListening);
            tryMigrate(nodeCacheKeys.isRouting, node, legacyPaths.node.isRouting);
            tryMigrate(nodeCacheKeys.supportedDataRates, node, legacyPaths.node.supportedDataRates);
            tryMigrate(nodeCacheKeys.protocolVersion, node, legacyPaths.node.protocolVersion);
            tryMigrate(nodeCacheKeys.nodeType, node, legacyPaths.node.nodeType, tryParseNodeType);
            tryMigrate(nodeCacheKeys.supportsSecurity, node, legacyPaths.node.supportsSecurity);
            tryMigrate(nodeCacheKeys.supportsBeaming, node, legacyPaths.node.supportsBeaming);
            // Convert security classes to single entries
            const securityClasses = tryParseSecurityClasses((0, shared_1.pickDeep)(node, legacyPaths.node.securityClasses));
            if (securityClasses) {
                for (const [secClass, val] of securityClasses) {
                    jsonl.set(nodeCacheKeys.securityClass(secClass), val);
                }
            }
            tryMigrate(nodeCacheKeys.dsk, node, legacyPaths.node.dsk, core_1.dskFromString);
            // ... and command classes
            // The nesting was inverted from the legacy cache: node -> EP -> CCs
            // as opposed to node -> CC -> EPs
            if ((0, typeguards_1.isObject)(node.commandClasses)) {
                for (const [ccIdHex, cc] of Object.entries(node.commandClasses)) {
                    const ccId = parseInt(ccIdHex, 16);
                    if ((0, typeguards_1.isObject)(cc.endpoints)) {
                        for (const endpointId of Object.keys(cc.endpoints)) {
                            const endpointIndex = parseInt(endpointId, 10);
                            const cacheKey = nodeCacheKeys
                                .endpoint(endpointIndex)
                                .commandClass(ccId);
                            tryMigrate(cacheKey, cc, legacyPaths.commandClass.endpoint(endpointIndex));
                        }
                    }
                }
            }
            // In addition, try to move the hacky value ID for hasSUCReturnRoute from the value DB to the network cache
            const dbKey = JSON.stringify({
                nodeId: node.id,
                commandClass: -1,
                endpoint: 0,
                property: "hasSUCReturnRoute",
            });
            if (valueDB.has(dbKey)) {
                const hasSUCReturnRoute = valueDB.get(dbKey);
                valueDB.delete(dbKey);
                jsonl.set(nodeCacheKeys.hasSUCReturnRoute, hasSUCReturnRoute);
            }
        }
    }
}
exports.migrateLegacyNetworkCache = migrateLegacyNetworkCache;
//# sourceMappingURL=NetworkCache.js.map