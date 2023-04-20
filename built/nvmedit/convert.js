"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateNVM = exports.json700To500 = exports.json500To700 = exports.jsonToNVM500 = exports.jsonToNVM = exports.nvm500ToJSON = exports.nvmToJSON = exports.jsonToNVMObjects_v7_11_0 = exports.jsonToNVMObjects_v7_0_0 = exports.nvmObjectsToJSON = exports.nodeHasInfo = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const typeguards_1 = require("alcalzone-shared/typeguards");
const semver_1 = __importDefault(require("semver"));
const consts_1 = require("./consts");
const files_1 = require("./files");
const nvm_1 = require("./nvm3/nvm");
const utils_1 = require("./nvm3/utils");
const NVMParser_1 = require("./nvm500/NVMParser");
function nodeHasInfo(node) {
    return !node.isVirtual || Object.keys(node).length > 1;
}
exports.nodeHasInfo = nodeHasInfo;
function createEmptyPhysicalNode() {
    return {
        isVirtual: false,
        isListening: false,
        isFrequentListening: false,
        isRouting: false,
        supportedDataRates: [],
        protocolVersion: 0,
        optionalFunctionality: false,
        nodeType: safe_1.NodeType["End Node"],
        supportsSecurity: false,
        supportsBeaming: false,
        genericDeviceClass: 0,
        specificDeviceClass: null,
        neighbors: [],
        sucUpdateIndex: 0,
        appRouteLock: false,
        routeSlaveSUC: false,
        sucPendingUpdate: false,
        pendingDiscovery: false,
        lwr: null,
        nlwr: null,
    };
}
/** Converts a compressed set of NVM objects to a JSON representation */
function nvmObjectsToJSON(applicationObjects, protocolObjects) {
    const nodes = new Map();
    const getNode = (id) => {
        if (!nodes.has(id))
            nodes.set(id, createEmptyPhysicalNode());
        return nodes.get(id);
    };
    const getObject = (id) => {
        if (typeof id === "number") {
            return protocolObjects.get(id) ?? applicationObjects.get(id);
        }
        else {
            for (const [key, obj] of protocolObjects) {
                if (id(key))
                    return obj;
            }
            for (const [key, obj] of applicationObjects) {
                if (id(key))
                    return obj;
            }
        }
    };
    const getObjectOrThrow = (id) => {
        const ret = getObject(id);
        if (ret)
            return ret;
        throw new safe_1.ZWaveError(`Object${typeof id === "number" ? ` ${id}` : ""} not found!`, safe_1.ZWaveErrorCodes.NVM_ObjectNotFound);
    };
    const getFileOrThrow = (id, fileVersion) => {
        const obj = getObjectOrThrow(id);
        return files_1.NVMFile.from(obj, fileVersion);
    };
    const getFile = (id, fileVersion) => {
        const obj = getObject(id);
        if (!obj)
            return undefined;
        return files_1.NVMFile.from(obj, fileVersion);
    };
    // === Protocol NVM files ===
    // Figure out how to parse the individual files
    const protocolVersionFile = getFileOrThrow(files_1.ProtocolVersionFileID, "7.0.0");
    const protocolFileFormat = protocolVersionFile.format;
    const protocolVersion = `${protocolVersionFile.major}.${protocolVersionFile.minor}.${protocolVersionFile.patch}`;
    // Bail early if the NVM uses a protocol file format that's newer than we support
    if (protocolFileFormat > consts_1.MAX_PROTOCOL_FILE_FORMAT) {
        throw new safe_1.ZWaveError(`Unsupported protocol file format: ${protocolFileFormat}`, safe_1.ZWaveErrorCodes.NVM_NotSupported, { protocolFileFormat });
    }
    // Figure out which nodes exist
    const nodeIds = getFileOrThrow(files_1.ProtocolNodeListFileID, protocolVersion).nodeIds;
    // Read all flags for all nodes
    const appRouteLock = new Set(getFileOrThrow(files_1.ProtocolAppRouteLockNodeMaskFileID, protocolVersion).nodeIds);
    const routeSlaveSUC = new Set(getFileOrThrow(files_1.ProtocolRouteSlaveSUCNodeMaskFileID, protocolVersion).nodeIds);
    const sucPendingUpdate = new Set(getFileOrThrow(files_1.ProtocolSUCPendingUpdateNodeMaskFileID, protocolVersion).nodeIds);
    const isVirtual = new Set(getFileOrThrow(files_1.ProtocolVirtualNodeMaskFileID, protocolVersion).nodeIds);
    const pendingDiscovery = new Set(getFileOrThrow(files_1.ProtocolPendingDiscoveryNodeMaskFileID, protocolVersion).nodeIds);
    const routeCacheExists = new Set(getFileOrThrow(files_1.ProtocolRouteCacheExistsNodeMaskFileID, protocolVersion).nodeIds);
    // And create each node entry, including virtual ones
    for (const id of nodeIds) {
        const node = getNode(id);
        const rememberOnlyVirtual = () => {
            nodes.set(id, {
                isVirtual: true,
            });
        };
        // Find node info
        let nodeInfo;
        try {
            if (protocolFileFormat === 0) {
                const fileId = (0, files_1.nodeIdToNodeInfoFileIDV0)(id);
                const file = getFileOrThrow(fileId, protocolVersion);
                nodeInfo = file.nodeInfo;
            }
            else {
                const fileId = (0, files_1.nodeIdToNodeInfoFileIDV1)(id);
                const file = getFileOrThrow(fileId, protocolVersion);
                nodeInfo = file.nodeInfos.find((i) => i.nodeId === id);
            }
        }
        catch (e) {
            if (e.message.includes("Object not found")) {
                rememberOnlyVirtual();
                continue;
            }
            throw e;
        }
        Object.assign(node, nodeInfo);
        // Evaluate flags
        node.isVirtual = isVirtual.has(id);
        node.appRouteLock = appRouteLock.has(id);
        node.routeSlaveSUC = routeSlaveSUC.has(id);
        node.sucPendingUpdate = sucPendingUpdate.has(id);
        node.pendingDiscovery = pendingDiscovery.has(id);
        if (routeCacheExists.has(id)) {
            let routeCache;
            if (protocolFileFormat === 0) {
                const fileId = (0, files_1.nodeIdToRouteCacheFileIDV0)(id);
                const file = getFile(fileId, protocolVersion);
                routeCache = file?.routeCache;
            }
            else {
                const fileId = (0, files_1.nodeIdToRouteCacheFileIDV1)(id);
                const file = getFile(fileId, protocolVersion);
                routeCache = file?.routeCaches.find((i) => i.nodeId === id);
            }
            if (routeCache) {
                node.lwr = routeCache.lwr;
                node.nlwr = routeCache.nlwr;
            }
        }
        // @ts-expect-error Some fields include a nodeId, but we don't need it
        delete node.nodeId;
    }
    // Now read info about the controller
    const controllerInfoFile = getFileOrThrow(files_1.ControllerInfoFileID, protocolVersion);
    let sucUpdateEntries;
    if (protocolFileFormat < 5) {
        sucUpdateEntries = getFileOrThrow(files_1.SUCUpdateEntriesFileIDV0, protocolVersion).updateEntries;
    }
    else {
        // V5 has split the entries into multiple files
        sucUpdateEntries = [];
        for (let index = 0; index < consts_1.SUC_MAX_UPDATES; index += files_1.SUC_UPDATES_PER_FILE_V5) {
            const file = getFile((0, files_1.sucUpdateIndexToSUCUpdateEntriesFileIDV5)(index), protocolVersion);
            if (!file)
                break;
            sucUpdateEntries.push(...file.updateEntries);
        }
    }
    // === Application NVM files ===
    const applicationVersionFile = getFileOrThrow(files_1.ApplicationVersionFileID, "7.0.0");
    const applicationVersion = `${applicationVersionFile.major}.${applicationVersionFile.minor}.${applicationVersionFile.patch}`;
    const rfConfigFile = getFile(files_1.ApplicationRFConfigFileID, applicationVersion);
    const applicationCCsFile = getFileOrThrow(files_1.ApplicationCCsFileID, applicationVersion);
    const applicationDataFile = getFile(files_1.ApplicationDataFileID, applicationVersion);
    const applicationTypeFile = getFileOrThrow(files_1.ApplicationTypeFileID, applicationVersion);
    const preferredRepeaters = getFile(files_1.ProtocolPreferredRepeatersFileID, applicationVersion)?.nodeIds;
    const controllerProps = [
        "nodeId",
        "lastNodeId",
        "staticControllerNodeId",
        "sucLastIndex",
        "controllerConfiguration",
        "sucAwarenessPushNeeded",
        "maxNodeId",
        "reservedId",
        "systemState",
        "lastNodeIdLR",
        "maxNodeIdLR",
        "reservedIdLR",
        "primaryLongRangeChannelId",
        "dcdcConfig",
    ];
    const controller = {
        protocolVersion: `${protocolVersionFile.major}.${protocolVersionFile.minor}.${protocolVersionFile.patch}`,
        applicationVersion: `${applicationVersionFile.major}.${applicationVersionFile.minor}.${applicationVersionFile.patch}`,
        homeId: `0x${controllerInfoFile.homeId.toString("hex")}`,
        ...(0, safe_2.pick)(controllerInfoFile, controllerProps),
        ...(0, safe_2.pick)(applicationTypeFile, [
            "isListening",
            "optionalFunctionality",
            "genericDeviceClass",
            "specificDeviceClass",
        ]),
        commandClasses: (0, safe_2.pick)(applicationCCsFile, [
            "includedInsecurely",
            "includedSecurelyInsecureCCs",
            "includedSecurelySecureCCs",
        ]),
        preferredRepeaters,
        ...(rfConfigFile
            ? {
                rfConfig: {
                    rfRegion: rfConfigFile.rfRegion,
                    txPower: rfConfigFile.txPower,
                    measured0dBm: rfConfigFile.measured0dBm,
                    enablePTI: rfConfigFile.enablePTI ?? null,
                    maxTXPower: rfConfigFile.maxTXPower ?? null,
                },
            }
            : {}),
        sucUpdateEntries,
        applicationData: applicationDataFile?.data.toString("hex") ?? null,
    };
    // Make sure all props are defined
    const optionalControllerProps = [
        "sucAwarenessPushNeeded",
        "lastNodeIdLR",
        "maxNodeIdLR",
        "reservedIdLR",
        "primaryLongRangeChannelId",
        "dcdcConfig",
        "rfConfig",
        "preferredRepeaters",
        "applicationData",
    ];
    for (const prop of optionalControllerProps) {
        if (controller[prop] === undefined)
            controller[prop] = null;
    }
    const ret = {
        format: protocolFileFormat,
        controller,
        nodes: (0, utils_1.mapToObject)(nodes),
    };
    return ret;
}
exports.nvmObjectsToJSON = nvmObjectsToJSON;
function nvmJSONNodeToNodeInfo(nodeId, node) {
    return {
        nodeId,
        ...(0, safe_2.pick)(node, [
            "isListening",
            "isFrequentListening",
            "isRouting",
            "supportedDataRates",
            "protocolVersion",
            "optionalFunctionality",
            "nodeType",
            "supportsSecurity",
            "supportsBeaming",
            "genericDeviceClass",
            "specificDeviceClass",
            "neighbors",
            "sucUpdateIndex",
        ]),
    };
}
function nvmJSONControllerToFileOptions(ctrlr) {
    const ret = {
        homeId: Buffer.from(ctrlr.homeId.replace(/^0x/, ""), "hex"),
        nodeId: ctrlr.nodeId,
        lastNodeId: ctrlr.lastNodeId,
        staticControllerNodeId: ctrlr.staticControllerNodeId,
        sucLastIndex: ctrlr.sucLastIndex,
        controllerConfiguration: ctrlr.controllerConfiguration,
        maxNodeId: ctrlr.maxNodeId,
        reservedId: ctrlr.reservedId,
        systemState: ctrlr.systemState,
    };
    if (ctrlr.sucAwarenessPushNeeded != undefined) {
        // @ts-expect-error We're dealing with a conditional object here
        // TS doesn't like that.
        ret.sucAwarenessPushNeeded = ctrlr.sucAwarenessPushNeeded;
    }
    else {
        Object.assign(ret, (0, safe_1.stripUndefined)((0, safe_2.pick)(ctrlr, [
            "sucAwarenessPushNeeded",
            "lastNodeIdLR",
            "maxNodeIdLR",
            "reservedIdLR",
            "primaryLongRangeChannelId",
            "dcdcConfig",
        ])));
    }
    return ret;
}
function serializeCommonApplicationObjects(nvm) {
    const ret = [];
    const applTypeFile = new files_1.ApplicationTypeFile({
        ...(0, safe_2.pick)(nvm.controller, [
            "isListening",
            "optionalFunctionality",
            "genericDeviceClass",
            "specificDeviceClass",
        ]),
        fileVersion: nvm.controller.applicationVersion,
    });
    ret.push(applTypeFile.serialize());
    const applCCsFile = new files_1.ApplicationCCsFile({
        ...(0, safe_2.pick)(nvm.controller.commandClasses, [
            "includedInsecurely",
            "includedSecurelyInsecureCCs",
            "includedSecurelySecureCCs",
        ]),
        fileVersion: nvm.controller.applicationVersion,
    });
    ret.push(applCCsFile.serialize());
    if (nvm.controller.rfConfig) {
        const applRFConfigFile = new files_1.ApplicationRFConfigFile({
            ...(0, safe_2.pick)(nvm.controller.rfConfig, [
                "rfRegion",
                "txPower",
                "measured0dBm",
            ]),
            enablePTI: nvm.controller.rfConfig.enablePTI ?? undefined,
            maxTXPower: nvm.controller.rfConfig.maxTXPower ?? undefined,
            fileVersion: nvm.controller.applicationVersion,
        });
        ret.push(applRFConfigFile.serialize());
    }
    if (nvm.controller.applicationData) {
        // TODO: ensure this is 512 bytes long
        const applDataFile = new files_1.ApplicationDataFile({
            data: Buffer.from(nvm.controller.applicationData, "hex"),
            fileVersion: nvm.controller.applicationVersion,
        });
        ret.push(applDataFile.serialize());
    }
    return ret;
}
function serializeCommonProtocolObjects(nvm) {
    const ret = [];
    const appRouteLock = new Set();
    const routeSlaveSUC = new Set();
    const sucPendingUpdate = new Set();
    const isVirtual = new Set();
    const pendingDiscovery = new Set();
    for (const [id, node] of Object.entries(nvm.nodes)) {
        const nodeId = parseInt(id);
        if (!nodeHasInfo(node)) {
            isVirtual.add(nodeId);
            continue;
        }
        else {
            if (node.isVirtual)
                isVirtual.add(nodeId);
            if (node.appRouteLock)
                appRouteLock.add(nodeId);
            if (node.routeSlaveSUC)
                routeSlaveSUC.add(nodeId);
            if (node.sucPendingUpdate)
                sucPendingUpdate.add(nodeId);
            if (node.pendingDiscovery)
                pendingDiscovery.add(nodeId);
        }
    }
    ret.push(new files_1.ControllerInfoFile(nvmJSONControllerToFileOptions(nvm.controller)).serialize());
    ret.push(new files_1.ProtocolAppRouteLockNodeMaskFile({
        nodeIds: [...appRouteLock],
        fileVersion: nvm.controller.protocolVersion,
    }).serialize());
    ret.push(new files_1.ProtocolRouteSlaveSUCNodeMaskFile({
        nodeIds: [...routeSlaveSUC],
        fileVersion: nvm.controller.protocolVersion,
    }).serialize());
    ret.push(new files_1.ProtocolSUCPendingUpdateNodeMaskFile({
        nodeIds: [...sucPendingUpdate],
        fileVersion: nvm.controller.protocolVersion,
    }).serialize());
    ret.push(new files_1.ProtocolVirtualNodeMaskFile({
        nodeIds: [...isVirtual],
        fileVersion: nvm.controller.protocolVersion,
    }).serialize());
    ret.push(new files_1.ProtocolPendingDiscoveryNodeMaskFile({
        nodeIds: [...pendingDiscovery],
        fileVersion: nvm.controller.protocolVersion,
    }).serialize());
    // TODO: format >= 2: { .key = FILE_ID_LRANGE_NODE_EXIST, .size = FILE_SIZE_LRANGE_NODE_EXIST, .name = "LRANGE_NODE_EXIST"},
    if (nvm.controller.preferredRepeaters?.length) {
        ret.push(new files_1.ProtocolPreferredRepeatersFile({
            nodeIds: nvm.controller.preferredRepeaters,
            fileVersion: nvm.controller.protocolVersion,
        }).serialize());
    }
    if (nvm.format < 5) {
        ret.push(new files_1.SUCUpdateEntriesFileV0({
            updateEntries: nvm.controller.sucUpdateEntries,
            fileVersion: nvm.controller.protocolVersion,
        }).serialize());
    }
    else {
        // V5 has split the SUC update entries into multiple files
        for (let index = 0; index < consts_1.SUC_MAX_UPDATES; index += files_1.SUC_UPDATES_PER_FILE_V5) {
            const slice = nvm.controller.sucUpdateEntries.slice(index, index + files_1.SUC_UPDATES_PER_FILE_V5);
            if (slice.length === 0)
                break;
            const file = new files_1.SUCUpdateEntriesFileV5({
                updateEntries: slice,
                fileVersion: nvm.controller.protocolVersion,
            });
            file.fileId = (0, files_1.sucUpdateIndexToSUCUpdateEntriesFileIDV5)(index);
            ret.push(file.serialize());
        }
    }
    return ret;
}
function jsonToNVMObjects_v7_0_0(json, targetSDKVersion) {
    const target = (0, safe_2.cloneDeep)(json);
    target.controller.protocolVersion = "7.0.0";
    target.format = 0;
    target.controller.applicationVersion = targetSDKVersion.format();
    const applicationObjects = new Map();
    const protocolObjects = new Map();
    const addApplicationObjects = (...objects) => {
        for (const o of objects) {
            applicationObjects.set(o.key, o);
        }
    };
    const addProtocolObjects = (...objects) => {
        for (const o of objects) {
            protocolObjects.set(o.key, o);
        }
    };
    // Application files
    const applVersionFile = new files_1.ApplicationVersionFile({
        // The SDK compares 4-byte values where the format is set to 0 to determine whether a migration is needed
        format: 0,
        major: targetSDKVersion.major,
        minor: targetSDKVersion.minor,
        patch: targetSDKVersion.patch,
        fileVersion: target.controller.applicationVersion, // does not matter for this file
    });
    addApplicationObjects(applVersionFile.serialize());
    addApplicationObjects(...serializeCommonApplicationObjects(target));
    // Protocol files
    const protocolVersionFile = new files_1.ProtocolVersionFile({
        format: target.format,
        major: 7,
        minor: 0,
        patch: 0,
        fileVersion: target.controller.protocolVersion, // does not matter for this file
    });
    addProtocolObjects(protocolVersionFile.serialize());
    const nodeInfoFiles = new Map();
    const routeCacheFiles = new Map();
    const nodeInfoExists = new Set();
    const routeCacheExists = new Set();
    for (const [id, node] of Object.entries(target.nodes)) {
        const nodeId = parseInt(id);
        if (!nodeHasInfo(node))
            continue;
        nodeInfoExists.add(nodeId);
        // Create/update node info file
        const nodeInfoFileIndex = (0, files_1.nodeIdToNodeInfoFileIDV0)(nodeId);
        nodeInfoFiles.set(nodeInfoFileIndex, new files_1.NodeInfoFileV0({
            nodeInfo: nvmJSONNodeToNodeInfo(nodeId, node),
            fileVersion: target.controller.protocolVersion,
        }));
        // Create/update route cache file (if there is a route)
        if (node.lwr || node.nlwr) {
            routeCacheExists.add(nodeId);
            const routeCacheFileIndex = (0, files_1.nodeIdToRouteCacheFileIDV0)(nodeId);
            routeCacheFiles.set(routeCacheFileIndex, new files_1.RouteCacheFileV0({
                routeCache: {
                    nodeId,
                    lwr: node.lwr ?? (0, files_1.getEmptyRoute)(),
                    nlwr: node.nlwr ?? (0, files_1.getEmptyRoute)(),
                },
                fileVersion: target.controller.protocolVersion,
            }));
        }
    }
    addProtocolObjects(...serializeCommonProtocolObjects(target));
    addProtocolObjects(new files_1.ProtocolNodeListFile({
        nodeIds: [...nodeInfoExists],
        fileVersion: target.controller.protocolVersion,
    }).serialize());
    addProtocolObjects(new files_1.ProtocolRouteCacheExistsNodeMaskFile({
        nodeIds: [...routeCacheExists],
        fileVersion: target.controller.protocolVersion,
    }).serialize());
    if (nodeInfoFiles.size > 0) {
        addProtocolObjects(...[...nodeInfoFiles.values()].map((f) => f.serialize()));
    }
    if (routeCacheFiles.size > 0) {
        addProtocolObjects(...[...routeCacheFiles.values()].map((f) => f.serialize()));
    }
    return {
        applicationObjects,
        protocolObjects,
    };
}
exports.jsonToNVMObjects_v7_0_0 = jsonToNVMObjects_v7_0_0;
function jsonToNVMObjects_v7_11_0(json, targetSDKVersion) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const target = (0, safe_2.cloneDeep)(json);
    let targetApplicationVersion;
    let targetProtocolVersion;
    let targetProtocolFormat;
    // We currently support application version migrations up to 7.19.1
    // For all higher ones, set the highest version we support and let the controller handle the migration itself
    if (semver_1.default.lte(targetSDKVersion, "7.19.1")) {
        targetApplicationVersion = semver_1.default.parse(targetSDKVersion);
    }
    else {
        targetApplicationVersion = semver_1.default.parse("7.19.1");
    }
    // The protocol version file only seems to be updated when the format of the protocol file system changes
    // Once again, we simply set the highest version we support here and let the controller handle any potential migration
    if (semver_1.default.gte(targetSDKVersion, "7.19.0")) {
        targetProtocolVersion = semver_1.default.parse("7.19.0");
        targetProtocolFormat = 5;
    }
    else if (semver_1.default.gte(targetSDKVersion, "7.17.0")) {
        targetProtocolVersion = semver_1.default.parse("7.17.0");
        targetProtocolFormat = 4;
    }
    else if (semver_1.default.gte(targetSDKVersion, "7.15.3")) {
        targetProtocolVersion = semver_1.default.parse("7.15.3");
        targetProtocolFormat = 3;
    }
    else if (semver_1.default.gte(targetSDKVersion, "7.12.0")) {
        targetProtocolVersion = semver_1.default.parse("7.12.0");
        targetProtocolFormat = 2;
    }
    else {
        // All versions below 7.11.0 are handled in the _v7_0_0 method
        targetProtocolVersion = semver_1.default.parse("7.11.0");
        targetProtocolFormat = 1;
    }
    target.format = targetProtocolFormat;
    target.controller.applicationVersion = targetApplicationVersion.format();
    target.controller.protocolVersion = targetProtocolVersion.format();
    const applicationObjects = new Map();
    const protocolObjects = new Map();
    const addApplicationObjects = (...objects) => {
        for (const o of objects) {
            applicationObjects.set(o.key, o);
        }
    };
    const addProtocolObjects = (...objects) => {
        for (const o of objects) {
            protocolObjects.set(o.key, o);
        }
    };
    // Application files
    const applVersionFile = new files_1.ApplicationVersionFile({
        // The SDK compares 4-byte values where the format is set to 0 to determine whether a migration is needed
        format: 0,
        major: targetApplicationVersion.major,
        minor: targetApplicationVersion.minor,
        patch: targetApplicationVersion.patch,
        fileVersion: target.controller.applicationVersion, // does not matter for this file
    });
    addApplicationObjects(applVersionFile.serialize());
    // When converting it can be that the rfConfig doesn't exist. Make sure
    // that it is initialized with proper defaults.
    (_a = target.controller).rfConfig ?? (_a.rfConfig = {
        rfRegion: safe_1.RFRegion["Default (EU)"],
        txPower: 0.0,
        measured0dBm: +3.3,
        enablePTI: null,
        maxTXPower: null,
    });
    // Make sure the RF config format matches the application version.
    // Otherwise, the controller will ignore the file and not accept any changes to the RF config
    if (semver_1.default.gte(targetSDKVersion, "7.15.3")) {
        (_b = target.controller.rfConfig).enablePTI ?? (_b.enablePTI = 0);
        (_c = target.controller.rfConfig).maxTXPower ?? (_c.maxTXPower = 14.0);
    }
    addApplicationObjects(...serializeCommonApplicationObjects(target));
    // Protocol files
    const protocolVersionFile = new files_1.ProtocolVersionFile({
        format: targetProtocolFormat,
        major: targetProtocolVersion.major,
        minor: targetProtocolVersion.minor,
        patch: targetProtocolVersion.patch,
        fileVersion: target.controller.protocolVersion, // does not matter for this file
    });
    addProtocolObjects(protocolVersionFile.serialize());
    const nodeInfoFiles = new Map();
    const routeCacheFiles = new Map();
    const nodeInfoExists = new Set();
    const routeCacheExists = new Set();
    for (const [id, node] of Object.entries(target.nodes)) {
        const nodeId = parseInt(id);
        if (!nodeHasInfo(node))
            continue;
        nodeInfoExists.add(nodeId);
        // Create/update node info file
        const nodeInfoFileIndex = (0, files_1.nodeIdToNodeInfoFileIDV1)(nodeId);
        if (!nodeInfoFiles.has(nodeInfoFileIndex)) {
            nodeInfoFiles.set(nodeInfoFileIndex, new files_1.NodeInfoFileV1({
                nodeInfos: [],
                fileVersion: target.controller.protocolVersion,
            }));
        }
        const nodeInfoFile = nodeInfoFiles.get(nodeInfoFileIndex);
        nodeInfoFile.nodeInfos.push(nvmJSONNodeToNodeInfo(nodeId, node));
        // Create/update route cache file (if there is a route)
        if (node.lwr || node.nlwr) {
            routeCacheExists.add(nodeId);
            const routeCacheFileIndex = (0, files_1.nodeIdToRouteCacheFileIDV1)(nodeId);
            if (!routeCacheFiles.has(routeCacheFileIndex)) {
                routeCacheFiles.set(routeCacheFileIndex, new files_1.RouteCacheFileV1({
                    routeCaches: [],
                    fileVersion: target.controller.protocolVersion,
                }));
            }
            const routeCacheFile = routeCacheFiles.get(routeCacheFileIndex);
            routeCacheFile.routeCaches.push({
                nodeId,
                lwr: node.lwr ?? (0, files_1.getEmptyRoute)(),
                nlwr: node.nlwr ?? (0, files_1.getEmptyRoute)(),
            });
        }
    }
    // For v3+ targets, the ControllerInfoFile must contain the LongRange properties
    // or the controller will ignore the file and not have a home ID
    if (targetProtocolFormat >= 3) {
        (_d = target.controller).lastNodeIdLR ?? (_d.lastNodeIdLR = 255);
        (_e = target.controller).maxNodeIdLR ?? (_e.maxNodeIdLR = 0);
        (_f = target.controller).reservedIdLR ?? (_f.reservedIdLR = 0);
        (_g = target.controller).primaryLongRangeChannelId ?? (_g.primaryLongRangeChannelId = 0);
        (_h = target.controller).dcdcConfig ?? (_h.dcdcConfig = 255);
    }
    addProtocolObjects(...serializeCommonProtocolObjects(target));
    addProtocolObjects(new files_1.ProtocolNodeListFile({
        nodeIds: [...nodeInfoExists],
        fileVersion: target.controller.protocolVersion,
    }).serialize());
    addProtocolObjects(new files_1.ProtocolRouteCacheExistsNodeMaskFile({
        nodeIds: [...routeCacheExists],
        fileVersion: target.controller.protocolVersion,
    }).serialize());
    if (nodeInfoFiles.size > 0) {
        addProtocolObjects(...[...nodeInfoFiles.values()].map((f) => f.serialize()));
    }
    if (routeCacheFiles.size > 0) {
        addProtocolObjects(...[...routeCacheFiles.values()].map((f) => f.serialize()));
    }
    return {
        applicationObjects,
        protocolObjects,
    };
}
exports.jsonToNVMObjects_v7_11_0 = jsonToNVMObjects_v7_11_0;
/** Reads an NVM buffer and returns its JSON representation */
function nvmToJSON(buffer, debugLogs = false) {
    const nvm = (0, nvm_1.parseNVM)(buffer, debugLogs);
    const ret = nvmObjectsToJSON(nvm.applicationObjects, nvm.protocolObjects);
    ret.meta = (0, nvm_1.getNVMMeta)(nvm.protocolPages[0]);
    return ret;
}
exports.nvmToJSON = nvmToJSON;
/** Reads an NVM buffer of a 500-series stick and returns its JSON representation */
function nvm500ToJSON(buffer) {
    const parser = (0, NVMParser_1.createParser)(buffer);
    if (!parser)
        throw new safe_1.ZWaveError("Did not find a matching NVM 500 parser implementation! Make sure that the NVM data belongs to a controller with Z-Wave SDK 6.61 or higher.", safe_1.ZWaveErrorCodes.NVM_NotSupported);
    return parser.toJSON();
}
exports.nvm500ToJSON = nvm500ToJSON;
/** Takes a JSON represented NVM and converts it to binary */
function jsonToNVM(json, targetSDKVersion) {
    const parsedVersion = semver_1.default.parse(targetSDKVersion);
    if (!parsedVersion) {
        throw new safe_1.ZWaveError(`Invalid SDK version: ${targetSDKVersion}`, safe_1.ZWaveErrorCodes.Argument_Invalid);
    }
    let objects;
    if (semver_1.default.gte(parsedVersion, "7.11.0")) {
        objects = jsonToNVMObjects_v7_11_0(json, parsedVersion);
    }
    else if (semver_1.default.gte(parsedVersion, "7.0.0")) {
        objects = jsonToNVMObjects_v7_0_0(json, parsedVersion);
    }
    else {
        throw new safe_1.ZWaveError("jsonToNVM cannot convert to a pre-7.0 NVM version. Use jsonToNVM500 instead.", safe_1.ZWaveErrorCodes.Argument_Invalid);
    }
    return (0, nvm_1.encodeNVM)(objects.applicationObjects, objects.protocolObjects, json.meta);
}
exports.jsonToNVM = jsonToNVM;
/** Takes a JSON represented 500 series NVM and converts it to binary */
function jsonToNVM500(json, protocolVersion) {
    // Try to find a matching implementation
    const impl = NVMParser_1.nmvDetails500.find((p) => p.protocolVersions.includes(protocolVersion) &&
        p.name.toLowerCase().startsWith(json.meta.library));
    if (!impl) {
        throw new safe_1.ZWaveError(`Did not find a matching implementation for protocol version ${protocolVersion} and library ${json.meta.library}. To convert 500-series NVMs, both the source and the target controller must be using Z-Wave SDK 6.61 or higher.`, safe_1.ZWaveErrorCodes.NVM_NotSupported);
    }
    const serializer = new NVMParser_1.NVMSerializer(impl);
    serializer.parseJSON(json, protocolVersion);
    return serializer.serialize();
}
exports.jsonToNVM500 = jsonToNVM500;
function json500To700(json, truncateApplicationData) {
    const source = (0, safe_2.cloneDeep)(json);
    // On the 500 series, some properties are only defined for the nodes, so we pull it off the
    // controller's node entry
    let controllerNode = source.nodes[source.controller.nodeId || 1]; // Little hack because TS doesn't type check the union type properly
    if (!nodeHasInfo(controllerNode)) {
        // No information available, use sensible defaults
        controllerNode = {
            isListening: true,
            optionalFunctionality: false,
            // Static PC Controller
            genericDeviceClass: 0x02,
            specificDeviceClass: 0x01,
        };
    }
    let applicationData = null;
    if (source.controller.applicationData) {
        let raw = Buffer.from(source.controller.applicationData, "hex");
        // Find actual start and end of application data, ignoring zeroes
        let start = 0;
        while (start < raw.length && raw[start] === 0) {
            start++;
        }
        let end = raw.length - 1;
        while (end > start && raw[end] === 0) {
            end--;
        }
        raw = raw.slice(start, end + 1);
        if (raw.length > 512) {
            if (!truncateApplicationData) {
                throw new safe_1.ZWaveError("Invalid NVM JSON: Application data would be truncated! Set truncateApplicationData to true to allow this.", safe_1.ZWaveErrorCodes.NVM_InvalidJSON);
            }
            raw = raw.slice(0, 512);
        }
        applicationData = raw.toString("hex");
    }
    let homeId;
    if (source.controller.controllerConfiguration &
        safe_1.ControllerCapabilityFlags.OnOtherNetwork) {
        // The controller did not start the network itself
        if (!source.controller.learnedHomeId) {
            throw new safe_1.ZWaveError("Invalid NVM JSON: Controller is part of another network but has no learned Home ID!", safe_1.ZWaveErrorCodes.NVM_InvalidJSON);
        }
        else if (!source.controller.nodeId) {
            throw new safe_1.ZWaveError("Invalid NVM JSON: Controller is part of another network but node ID is zero!", safe_1.ZWaveErrorCodes.NVM_InvalidJSON);
        }
        homeId = source.controller.learnedHomeId;
    }
    else {
        // The controller did start the network itself
        homeId = source.controller.ownHomeId;
        // it is safe to set the node ID to 1
        source.controller.nodeId = 1;
    }
    const ret = {
        // Start out with format 0 (= protocol version 7.0.0), the jsonToNVM routines will do further conversion
        format: 0,
        controller: {
            // This will contain the original 6.x protocol version, but the jsonToNVM routines will update it
            protocolVersion: source.controller.protocolVersion,
            applicationVersion: source.controller.applicationVersion,
            homeId,
            nodeId: source.controller.nodeId,
            lastNodeId: source.controller.lastNodeId,
            staticControllerNodeId: source.controller.staticControllerNodeId,
            sucLastIndex: source.controller.sucLastIndex,
            controllerConfiguration: source.controller.controllerConfiguration,
            sucUpdateEntries: source.controller.sucUpdateEntries,
            maxNodeId: source.controller.maxNodeId,
            reservedId: source.controller.reservedId,
            systemState: source.controller.systemState,
            preferredRepeaters: source.controller.preferredRepeaters,
            // RF config exists on both series but isn't compatible
            isListening: controllerNode.isListening,
            optionalFunctionality: controllerNode.optionalFunctionality,
            genericDeviceClass: controllerNode.genericDeviceClass,
            specificDeviceClass: controllerNode.specificDeviceClass ?? 0,
            commandClasses: {
                includedInsecurely: source.controller.commandClasses,
                includedSecurelyInsecureCCs: [],
                includedSecurelySecureCCs: [],
            },
            applicationData,
        },
        // The node entries are actually compatible between the two JSON versions
        // but the types are structured differently
        nodes: source.nodes,
    };
    return ret;
}
exports.json500To700 = json500To700;
function json700To500(json) {
    const source = (0, safe_2.cloneDeep)(json);
    let ownHomeId;
    let learnedHomeId = null;
    let nodeId;
    if (source.controller.controllerConfiguration &
        safe_1.ControllerCapabilityFlags.OnOtherNetwork) {
        // The controller did not start the network itself
        ownHomeId = learnedHomeId = source.controller.homeId;
        nodeId = source.controller.nodeId;
    }
    else {
        // The controller did start the network itself
        ownHomeId = source.controller.homeId;
        // 500 series controllers expect the node ID to be 0 when they are the primary
        nodeId = 0;
    }
    const ret = {
        format: 500,
        controller: {
            // This will contain the original 7.x protocol version, but the jsonToNVM routines will update it
            protocolVersion: source.controller.protocolVersion,
            applicationVersion: source.controller.applicationVersion,
            // The 700 series does not distinguish between own and learned home ID in NVM
            // We infer it from the controller configuration if we need it
            ownHomeId,
            learnedHomeId,
            nodeId,
            lastNodeId: source.controller.lastNodeId,
            staticControllerNodeId: source.controller.staticControllerNodeId,
            sucLastIndex: source.controller.sucLastIndex,
            controllerConfiguration: source.controller.controllerConfiguration,
            sucUpdateEntries: source.controller.sucUpdateEntries,
            maxNodeId: source.controller.maxNodeId,
            reservedId: source.controller.reservedId,
            systemState: source.controller.systemState,
            watchdogStarted: 0,
            preferredRepeaters: json.controller.preferredRepeaters ?? [],
            // RF config exists on both series but isn't compatible. So set the default,
            // it will be taken from the target NVM on restore.
            rfConfig: {
                powerLevelNormal: [255, 255, 255],
                powerLevelLow: [255, 255, 255],
                powerMode: 255,
                powerModeExtintEnable: 255,
                powerModeWutTimeout: 0xffffffff,
            },
            commandClasses: source.controller.commandClasses.includedInsecurely,
            applicationData: source.controller.applicationData,
        },
        // The node entries are actually compatible between the two JSON versions
        // just the types are structured differently
        nodes: source.nodes,
    };
    return ret;
}
exports.json700To500 = json700To500;
/** Converts the given source NVM into a format that is compatible with the given target NVM */
function migrateNVM(sourceNVM, targetNVM) {
    let source;
    let target;
    let sourceProtocolFileFormat;
    let targetProtocolFileFormat;
    try {
        source = {
            type: 700,
            json: nvmToJSON(sourceNVM),
        };
        sourceProtocolFileFormat = source.json.format;
    }
    catch (e) {
        if ((0, safe_1.isZWaveError)(e) && e.code === safe_1.ZWaveErrorCodes.NVM_InvalidFormat) {
            // This is not a 700 series NVM, maybe it is a 500 series one?
            source = {
                type: 500,
                json: nvm500ToJSON(sourceNVM),
            };
        }
        else if ((0, safe_1.isZWaveError)(e) &&
            e.code === safe_1.ZWaveErrorCodes.NVM_NotSupported &&
            (0, typeguards_1.isObject)(e.context) &&
            typeof e.context.protocolFileFormat === "number") {
            // This is a 700 series NVM, but the protocol version is not (yet) supported
            source = { type: "unknown" };
            sourceProtocolFileFormat = e.context.protocolFileFormat;
        }
        else {
            source = { type: "unknown" };
        }
    }
    try {
        target = {
            type: 700,
            json: nvmToJSON(targetNVM),
        };
        targetProtocolFileFormat = target.json.format;
    }
    catch (e) {
        if ((0, safe_1.isZWaveError)(e) && e.code === safe_1.ZWaveErrorCodes.NVM_InvalidFormat) {
            // This is not a 700 series NVM, maybe it is a 500 series one?
            target = {
                type: 500,
                json: nvm500ToJSON(targetNVM),
            };
        }
        else if ((0, safe_1.isZWaveError)(e) &&
            e.code === safe_1.ZWaveErrorCodes.NVM_NotSupported &&
            source.type === 700 &&
            (0, typeguards_1.isObject)(e.context) &&
            typeof e.context.protocolFileFormat === "number") {
            // This is a 700 series NVM, but the protocol version is not (yet) supported
            target = { type: "unknown" };
            targetProtocolFileFormat = e.context.protocolFileFormat;
        }
        else {
            target = { type: "unknown" };
        }
    }
    // Short circuit if...
    if (target.type === "unknown" &&
        targetProtocolFileFormat &&
        targetProtocolFileFormat > consts_1.MAX_PROTOCOL_FILE_FORMAT &&
        sourceProtocolFileFormat &&
        sourceProtocolFileFormat <= targetProtocolFileFormat) {
        // ...both the source and the target are 700 series, but at least the target uses an unsupported protocol version.
        // We can be sure hwoever that the target can upgrade any 700 series NVM to its protocol version, as long as the
        // source protocol version is not higher than the target's
        return sourceNVM;
    }
    else if (source.type === 700 && target.type === 700) {
        //... the source and target protocol versions are compatible without conversion
        const sourceProtocolVersion = source.json.controller.protocolVersion;
        const targetProtocolVersion = target.json.controller.protocolVersion;
        // ... and the application version on the both is compatible with the respective protocol version
        const sourceApplicationVersion = source.json.controller.applicationVersion;
        const targetApplicationVersion = target.json.controller.applicationVersion;
        // The 700 series firmware can automatically upgrade backups from a previous protocol version
        // Not sure when that ability was added. To be on the safe side, allow it for 7.16+ which definitely supports it.
        if (semver_1.default.gte(targetProtocolVersion, "7.16.0") &&
            semver_1.default.gte(targetProtocolVersion, sourceProtocolVersion) &&
            // the application version is updated on every update, protocol version only when the format changes
            // so this is a good indicator if the NVMs are in a compatible state
            semver_1.default.gte(targetApplicationVersion, targetProtocolVersion) &&
            semver_1.default.gte(sourceApplicationVersion, sourceProtocolVersion) &&
            // avoid preserving broken 255.x versions which appear on some controllers
            semver_1.default.lt(sourceApplicationVersion, "255.0.0") &&
            semver_1.default.lt(targetApplicationVersion, "255.0.0")) {
            return sourceNVM;
        }
    }
    else if (source.type === "unknown" && target.type !== "unknown") {
        // ...only the source has an unsupported format, so we have to convert but can't
        throw new safe_1.ZWaveError(`The source NVM has an unsupported format, which cannot be restored on a ${target.type}-series NVM!`, safe_1.ZWaveErrorCodes.NVM_NotSupported);
    }
    else if (source.type !== "unknown" && target.type === "unknown") {
        // ...only the target has an unsupported format, so we have to convert but can't
        throw new safe_1.ZWaveError(`The target NVM has an unsupported format, cannot restore ${source.type}-series NVM onto it!`, safe_1.ZWaveErrorCodes.NVM_NotSupported);
    }
    else if (source.type === "unknown" && target.type === "unknown") {
        // ...both are an unsupported format, meaning pre-6.61 SDK, which we cannot convert
        return sourceNVM;
    }
    // TypeScript doesn't understand multi-variable narrowings (yet)
    source = source;
    target = target;
    // Some 700 series NVMs have a strange 255.x application version - fix that first
    if (target.type === 700 &&
        semver_1.default.gte(target.json.controller.applicationVersion, "255.0.0")) {
        // replace both with the protocol version
        target.json.controller.applicationVersion =
            target.json.controller.protocolVersion;
    }
    // In any case, preserve the application version of the target stick
    source.json.controller.applicationVersion =
        target.json.controller.applicationVersion;
    if (source.type === 500 && target.type === 500) {
        // Both are 500, so we just need to update the metadata to match the target
        const json = {
            ...source.json,
            meta: target.json.meta,
        };
        // If the target is a 500 series stick, preserve the RF config
        json.controller.rfConfig = target.json.controller.rfConfig;
        return jsonToNVM500(json, target.json.controller.protocolVersion);
    }
    else if (source.type === 500 && target.type === 700) {
        // We need to upgrade the source to 700 series
        const json = {
            ...json500To700(source.json, true),
            meta: target.json.meta,
        };
        // The target is a different series, try to preserve the RF config of the target stick
        json.controller.rfConfig = target.json.controller.rfConfig;
        // 700 series distinguishes the NVM format by the application version
        return jsonToNVM(json, target.json.controller.applicationVersion);
    }
    else if (source.type === 700 && target.type === 500) {
        // We need to downgrade the source to 500 series
        const json = {
            ...json700To500(source.json),
            meta: target.json.meta,
        };
        // The target is a different series, try to preserve the RF config of the target stick
        json.controller.rfConfig = target.json.controller.rfConfig;
        return jsonToNVM500(json, target.json.controller.protocolVersion);
    }
    else {
        // Both are 700, so we just need to update the metadata to match the target
        const json = {
            ...source.json,
            meta: target.json.meta,
        };
        // 700 series distinguishes the NVM format by the application version
        return jsonToNVM(json, target.json.controller.applicationVersion);
    }
}
exports.migrateNVM = migrateNVM;
//# sourceMappingURL=convert.js.map