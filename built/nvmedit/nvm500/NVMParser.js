"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NVMSerializer = exports.NVMParser = exports.createParser = exports.nmvDetails500 = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const consts_1 = require("../consts");
const convert_1 = require("../convert");
const files_1 = require("../files");
const EntryParsers_1 = require("./EntryParsers");
const Bridge_6_6x_1 = require("./parsers/Bridge_6_6x");
const Bridge_6_7x_1 = require("./parsers/Bridge_6_7x");
const Bridge_6_8x_1 = require("./parsers/Bridge_6_8x");
const Static_6_6x_1 = require("./parsers/Static_6_6x");
const Static_6_7x_1 = require("./parsers/Static_6_7x");
const Static_6_8x_1 = require("./parsers/Static_6_8x");
const shared_1 = require("./shared");
exports.nmvDetails500 = [
    Bridge_6_6x_1.Bridge_6_6x,
    Bridge_6_7x_1.Bridge_6_7x,
    Bridge_6_8x_1.Bridge_6_8x,
    Static_6_6x_1.Static_6_6x,
    Static_6_7x_1.Static_6_7x,
    Static_6_8x_1.Static_6_8x,
];
/** Detects which parser is able to parse the given NVM */
function createParser(nvm) {
    for (const impl of exports.nmvDetails500) {
        try {
            const parser = new NVMParser(impl, nvm);
            return parser;
        }
        catch {
            continue;
        }
    }
}
exports.createParser = createParser;
class NVMParser {
    constructor(impl, nvm) {
        this.impl = impl;
        this.cache = new Map();
        this.parse(nvm);
        if (!this.isValid())
            throw new safe_1.ZWaveError("Invalid NVM!", safe_1.ZWaveErrorCodes.NVM_InvalidFormat);
    }
    /** Tests if the given NVM is a valid NVM for this parser version */
    isValid() {
        // Checking if an NVM is valid requires checking multiple bytes at different locations
        const eeoffset_magic = this.cache.get("EEOFFSET_MAGIC_far")
            ?.data[0];
        const configuration_valid_0 = this.cache.get("NVM_CONFIGURATION_VALID_far")?.data[0];
        const configuration_valid_1 = this.cache.get("NVM_CONFIGURATION_REALLYVALID_far")?.data[0];
        const routecache_valid = this.cache.get("EX_NVM_ROUTECACHE_MAGIC_far")
            ?.data[0];
        const nvm = this.cache.get("nvmDescriptor")?.data[0];
        const endMarker = this.cache.get("nvmModuleSizeEndMarker")
            ?.data[0];
        return (eeoffset_magic === shared_1.MAGIC_VALUE &&
            configuration_valid_0 === shared_1.CONFIGURATION_VALID_0 &&
            configuration_valid_1 === shared_1.CONFIGURATION_VALID_1 &&
            routecache_valid === shared_1.ROUTECACHE_VALID &&
            this.impl.protocolVersions.includes(nvm.protocolVersion) &&
            endMarker === 0);
    }
    parse(nvm) {
        let offset = 0;
        let moduleStart = -1;
        let moduleSize = -1;
        const nvmEnd = nvm.readUInt16BE(0);
        for (const entry of this.impl.layout) {
            const size = entry.size ?? shared_1.NVMEntrySizes[entry.type];
            if (entry.type === shared_1.NVMEntryType.NVMModuleSize) {
                if (moduleStart !== -1) {
                    // All following NVM modules must start at the last module's end
                    offset = moduleStart + moduleSize;
                }
                moduleStart = offset;
                moduleSize = nvm.readUInt16BE(offset);
            }
            else if (entry.type === shared_1.NVMEntryType.NVMModuleDescriptor) {
                // The module descriptor is always at the end of the module
                offset = moduleStart + moduleSize - size;
            }
            if (entry.offset != undefined && entry.offset !== offset) {
                // The entry has a defined offset but is at the wrong location
                throw new safe_1.ZWaveError(`${entry.name} is at wrong location in NVM buffer!`, safe_1.ZWaveErrorCodes.NVM_InvalidFormat);
            }
            const data = [];
            for (let i = 0; i < entry.count; i++) {
                data.push(nvm.slice(offset + i * size, offset + (i + 1) * size));
            }
            const converted = data.map((buffer) => {
                switch (entry.type) {
                    case shared_1.NVMEntryType.Byte:
                        return buffer.readUInt8(0);
                    case shared_1.NVMEntryType.Word:
                    case shared_1.NVMEntryType.NVMModuleSize:
                        return buffer.readUInt16BE(0);
                    case shared_1.NVMEntryType.DWord:
                        return buffer.readUInt32BE(0);
                    case shared_1.NVMEntryType.NodeInfo:
                        if (buffer.every((byte) => byte === 0))
                            return undefined;
                        return (0, EntryParsers_1.parseNVM500NodeInfo)(buffer, 0);
                    case shared_1.NVMEntryType.NodeMask:
                        return (0, safe_1.parseBitMask)(buffer);
                    case shared_1.NVMEntryType.SUCUpdateEntry:
                        if (buffer.every((byte) => byte === 0))
                            return undefined;
                        return (0, files_1.parseSUCUpdateEntry)(buffer, 0);
                    case shared_1.NVMEntryType.Route:
                        if (buffer.every((byte) => byte === 0))
                            return undefined;
                        return (0, files_1.parseRoute)(buffer, 0);
                    case shared_1.NVMEntryType.NVMModuleDescriptor: {
                        const ret = (0, EntryParsers_1.parseNVMModuleDescriptor)(buffer);
                        if (ret.size !== moduleSize) {
                            throw new safe_1.ZWaveError("NVM module descriptor size does not match module size!", safe_1.ZWaveErrorCodes.NVM_InvalidFormat);
                        }
                        return ret;
                    }
                    case shared_1.NVMEntryType.NVMDescriptor:
                        return (0, EntryParsers_1.parseNVMDescriptor)(buffer);
                    default:
                        // This includes NVMEntryType.BUFFER
                        return buffer;
                }
            });
            this.cache.set(entry.name, {
                ...entry,
                data: converted,
            });
            // Skip forward
            offset += size * entry.count;
            if (offset >= nvmEnd)
                return;
        }
    }
    getOne(key) {
        return this.cache.get(key)?.data[0];
    }
    getAll(key) {
        return this.cache.get(key)?.data;
    }
    toJSON() {
        const nvmDescriptor = this.getOne("nvmDescriptor");
        const ownHomeId = this.getOne("EX_NVM_HOME_ID_far");
        const learnedHomeId = this.getOne("NVM_HOMEID_far");
        const lastNodeId = this.getOne("EX_NVM_LAST_USED_NODE_ID_START_far");
        const maxNodeId = this.getOne("EX_NVM_MAX_NODE_ID_far");
        const nodeInfos = this.getAll("EX_NVM_NODE_TABLE_START_far");
        const sucUpdateIndizes = this.getAll("EX_NVM_SUC_CONTROLLER_LIST_START_far");
        const appRouteLock = new Set(this.getOne("EX_NVM_ROUTECACHE_APP_LOCK_far"));
        const routeSlaveSUC = new Set(this.getOne("EX_NVM_SUC_ROUTING_SLAVE_LIST_START_far"));
        const pendingDiscovery = new Set(this.getOne("NVM_PENDING_DISCOVERY_far"));
        const sucPendingUpdate = new Set(this.getOne("EX_NVM_PENDING_UPDATE_far"));
        const virtualNodes = new Set(this.getOne("EX_NVM_BRIDGE_NODEPOOL_START_far") ?? []);
        const lwr = this.getAll("EX_NVM_ROUTECACHE_START_far");
        const nlwr = this.getAll("EX_NVM_ROUTECACHE_NLWR_SR_START_far");
        const neighbors = this.getAll("EX_NVM_ROUTING_TABLE_START_far");
        const numCCs = this.getOne("EEOFFSET_CMDCLASS_LEN_far");
        const commandClasses = this.getAll("EEOFFSET_CMDCLASS_far").slice(0, numCCs);
        const nodes = {};
        for (let nodeId = 1; nodeId <= safe_1.MAX_NODES; nodeId++) {
            const nodeInfo = nodeInfos[nodeId - 1];
            const isVirtual = virtualNodes.has(nodeId);
            if (!nodeInfo) {
                if (isVirtual) {
                    nodes[nodeId] = { isVirtual: true };
                }
                continue;
            }
            nodes[nodeId] = {
                ...nodeInfo,
                isVirtual,
                neighbors: neighbors[nodeId - 1] ?? [],
                sucUpdateIndex: sucUpdateIndizes[nodeId - 1],
                appRouteLock: appRouteLock.has(nodeId),
                routeSlaveSUC: routeSlaveSUC.has(nodeId),
                sucPendingUpdate: sucPendingUpdate.has(nodeId),
                pendingDiscovery: pendingDiscovery.has(nodeId),
                lwr: lwr[nodeId - 1] ?? null,
                nlwr: nlwr[nodeId - 1] ?? null,
            };
        }
        return {
            format: 500,
            meta: {
                library: this.impl.library,
                ...(0, safe_2.pick)(nvmDescriptor, [
                    "manufacturerID",
                    "firmwareID",
                    "productType",
                    "productID",
                ]),
            },
            controller: {
                protocolVersion: nvmDescriptor.protocolVersion,
                applicationVersion: nvmDescriptor.firmwareVersion,
                ownHomeId: (0, safe_2.num2hex)(ownHomeId),
                learnedHomeId: learnedHomeId ? (0, safe_2.num2hex)(learnedHomeId) : null,
                nodeId: this.getOne("NVM_NODEID_far"),
                lastNodeId,
                staticControllerNodeId: this.getOne("EX_NVM_STATIC_CONTROLLER_NODE_ID_START_far"),
                sucLastIndex: this.getOne("EX_NVM_SUC_LAST_INDEX_START_far"),
                controllerConfiguration: this.getOne("EX_NVM_CONTROLLER_CONFIGURATION_far"),
                sucUpdateEntries: this.getAll("EX_NVM_SUC_NODE_LIST_START_far").filter(Boolean),
                maxNodeId,
                reservedId: this.getOne("EX_NVM_RESERVED_ID_far"),
                systemState: this.getOne("NVM_SYSTEM_STATE"),
                watchdogStarted: this.getOne("EEOFFSET_WATCHDOG_STARTED_far"),
                rfConfig: {
                    powerLevelNormal: this.getAll("EEOFFSET_POWERLEVEL_NORMAL_far"),
                    powerLevelLow: this.getAll("EEOFFSET_POWERLEVEL_LOW_far"),
                    powerMode: this.getOne("EEOFFSET_MODULE_POWER_MODE_far"),
                    powerModeExtintEnable: this.getOne("EEOFFSET_MODULE_POWER_MODE_EXTINT_ENABLE_far"),
                    powerModeWutTimeout: this.getOne("EEOFFSET_MODULE_POWER_MODE_WUT_TIMEOUT_far"),
                },
                preferredRepeaters: this.getOne("NVM_PREFERRED_REPEATERS_far"),
                commandClasses,
                applicationData: this.getOne("EEOFFSET_HOST_OFFSET_START_far").toString("hex"),
            },
            nodes,
        };
    }
}
exports.NVMParser = NVMParser;
class NVMSerializer {
    constructor(impl) {
        this.impl = impl;
        this.entries = new Map();
        this.nvmSize = 0;
    }
    setOne(key, value) {
        const entry = this.impl.layout.find((e) => e.name === key);
        // Skip entries not present in this layout
        if (!entry)
            return;
        this.entries.set(key, {
            ...entry,
            data: [value],
        });
    }
    setMany(key, value) {
        const entry = this.impl.layout.find((e) => e.name === key);
        // Skip entries not present in this layout
        if (!entry)
            return;
        this.entries.set(key, {
            ...entry,
            data: value,
        });
    }
    setFromNodeMap(key, map, fill) {
        const entry = this.impl.layout.find((e) => e.name === key);
        // Skip entries not present in this layout
        if (!entry)
            return;
        const data = new Array(safe_1.MAX_NODES).fill(fill);
        for (const [nodeId, value] of map) {
            data[nodeId - 1] = value;
        }
        this.entries.set(key, {
            ...entry,
            data,
        });
    }
    fill(key, value) {
        const entry = this.impl.layout.find((e) => e.name === key);
        // Skip entries not present in this layout
        if (!entry)
            return;
        const size = entry.size ?? shared_1.NVMEntrySizes[entry.type];
        const data = [];
        for (let i = 1; i <= entry.count; i++) {
            switch (entry.type) {
                case shared_1.NVMEntryType.Byte:
                case shared_1.NVMEntryType.Word:
                case shared_1.NVMEntryType.DWord:
                    data.push(value);
                    break;
                case shared_1.NVMEntryType.Buffer:
                    data.push(Buffer.alloc(size, value));
                    break;
                case shared_1.NVMEntryType.NodeMask:
                    // This ignores the fill value
                    data.push(new Array(size).fill(0));
                    break;
                default:
                    throw new Error(`Cannot fill entry of type ${shared_1.NVMEntryType[entry.type]}`);
            }
        }
        this.entries.set(key, {
            ...entry,
            data,
        });
    }
    parseJSON(json, protocolVersion) {
        this.entries.clear();
        // Set controller infos
        const c = json.controller;
        this.setOne("EX_NVM_HOME_ID_far", parseInt(c.ownHomeId.replace(/^0x/, ""), 16));
        if (c.learnedHomeId) {
            this.setOne("NVM_HOMEID_far", parseInt(c.learnedHomeId.replace(/^0x/, ""), 16));
        }
        else {
            this.setOne("NVM_HOMEID_far", 0);
        }
        this.setOne("EX_NVM_LAST_USED_NODE_ID_START_far", c.lastNodeId);
        this.setOne("NVM_NODEID_far", c.nodeId);
        this.setOne("EX_NVM_STATIC_CONTROLLER_NODE_ID_START_far", c.staticControllerNodeId);
        this.setOne("EX_NVM_SUC_LAST_INDEX_START_far", c.sucLastIndex);
        this.setOne("EX_NVM_CONTROLLER_CONFIGURATION_far", c.controllerConfiguration);
        const sucUpdateEntries = new Array(consts_1.SUC_MAX_UPDATES).fill(undefined);
        for (let i = 0; i < c.sucUpdateEntries.length; i++) {
            if (i < consts_1.SUC_MAX_UPDATES) {
                sucUpdateEntries[i] = c.sucUpdateEntries[i];
            }
        }
        this.setMany("EX_NVM_SUC_NODE_LIST_START_far", sucUpdateEntries);
        this.setOne("EX_NVM_MAX_NODE_ID_far", c.maxNodeId);
        this.setOne("EX_NVM_RESERVED_ID_far", c.reservedId);
        this.setOne("NVM_SYSTEM_STATE", c.systemState);
        this.setOne("EEOFFSET_WATCHDOG_STARTED_far", c.watchdogStarted);
        this.setMany("EEOFFSET_POWERLEVEL_NORMAL_far", c.rfConfig.powerLevelNormal);
        this.setMany("EEOFFSET_POWERLEVEL_LOW_far", c.rfConfig.powerLevelLow);
        this.setOne("EEOFFSET_MODULE_POWER_MODE_far", c.rfConfig.powerMode);
        this.setOne("EEOFFSET_MODULE_POWER_MODE_EXTINT_ENABLE_far", c.rfConfig.powerModeExtintEnable);
        this.setOne("EEOFFSET_MODULE_POWER_MODE_WUT_TIMEOUT_far", c.rfConfig.powerModeWutTimeout);
        this.setOne("NVM_PREFERRED_REPEATERS_far", c.preferredRepeaters);
        this.setOne("EEOFFSET_CMDCLASS_LEN_far", c.commandClasses.length);
        const CCs = new Array(shared_1.APPL_NODEPARM_MAX).fill(0xff);
        for (let i = 0; i < c.commandClasses.length; i++) {
            if (i < shared_1.APPL_NODEPARM_MAX) {
                CCs[i] = c.commandClasses[i];
            }
        }
        this.setMany("EEOFFSET_CMDCLASS_far", CCs);
        if (c.applicationData) {
            this.setOne("EEOFFSET_HOST_OFFSET_START_far", Buffer.from(c.applicationData, "hex"));
        }
        else {
            this.setOne("EEOFFSET_HOST_OFFSET_START_far", Buffer.alloc(shared_1.NVM_SERIALAPI_HOST_SIZE, 0xff));
        }
        // Set node infos
        const nodeInfos = new Map();
        const sucUpdateIndizes = new Map();
        const appRouteLock = [];
        const routeSlaveSUC = [];
        const pendingDiscovery = [];
        const sucPendingUpdate = [];
        const virtualNodes = [];
        const lwr = new Map();
        const nlwr = new Map();
        const neighbors = new Map();
        for (const [id, node] of Object.entries(json.nodes)) {
            const nodeId = parseInt(id);
            if (!(0, convert_1.nodeHasInfo)(node)) {
                virtualNodes.push(nodeId);
                continue;
            }
            nodeInfos.set(nodeId, (0, safe_2.pick)(node, [
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
            ]));
            sucUpdateIndizes.set(nodeId, node.sucUpdateIndex);
            if (node.appRouteLock)
                appRouteLock.push(nodeId);
            if (node.routeSlaveSUC)
                routeSlaveSUC.push(nodeId);
            if (node.pendingDiscovery)
                pendingDiscovery.push(nodeId);
            if (node.sucPendingUpdate)
                sucPendingUpdate.push(nodeId);
            if (node.lwr)
                lwr.set(nodeId, node.lwr);
            if (node.nlwr)
                nlwr.set(nodeId, node.nlwr);
            neighbors.set(nodeId, node.neighbors);
        }
        this.setFromNodeMap("EX_NVM_NODE_TABLE_START_far", nodeInfos);
        this.setFromNodeMap("EX_NVM_SUC_CONTROLLER_LIST_START_far", sucUpdateIndizes, 0xfe);
        this.setOne("EX_NVM_ROUTECACHE_APP_LOCK_far", appRouteLock);
        this.setOne("EX_NVM_SUC_ROUTING_SLAVE_LIST_START_far", routeSlaveSUC);
        this.setOne("NVM_PENDING_DISCOVERY_far", pendingDiscovery);
        this.setOne("EX_NVM_PENDING_UPDATE_far", sucPendingUpdate);
        this.setOne("EX_NVM_BRIDGE_NODEPOOL_START_far", virtualNodes);
        this.setFromNodeMap("EX_NVM_ROUTECACHE_START_far", lwr);
        this.setFromNodeMap("EX_NVM_ROUTECACHE_NLWR_SR_START_far", nlwr);
        this.setFromNodeMap("EX_NVM_ROUTING_TABLE_START_far", neighbors);
        // Set some entries that are always identical
        this.setOne("NVM_CONFIGURATION_VALID_far", shared_1.CONFIGURATION_VALID_0);
        this.setOne("NVM_CONFIGURATION_REALLYVALID_far", shared_1.CONFIGURATION_VALID_1);
        this.setOne("EEOFFSET_MAGIC_far", shared_1.MAGIC_VALUE);
        this.setOne("EX_NVM_ROUTECACHE_MAGIC_far", shared_1.ROUTECACHE_VALID);
        this.setOne("nvmModuleSizeEndMarker", 0);
        // Set NVM descriptor
        this.setOne("nvmDescriptor", {
            ...(0, safe_2.pick)(json.meta, [
                "manufacturerID",
                "productType",
                "productID",
                "firmwareID",
            ]),
            // Override the protocol version with the specified one
            protocolVersion,
            firmwareVersion: c.applicationVersion,
        });
        // Set dummy entries we're never going to fill
        this.fill("NVM_INTERNAL_RESERVED_1_far", 0);
        this.fill("NVM_INTERNAL_RESERVED_2_far", 0xff);
        this.fill("NVM_INTERNAL_RESERVED_3_far", 0);
        this.fill("NVM_RTC_TIMERS_far", 0);
        this.fill("EX_NVM_SUC_ACTIVE_START_far", 0);
        this.fill("EX_NVM_ZENSOR_TABLE_START_far", 0);
        this.fill("NVM_SECURITY0_KEY_far", 0);
        // Auto-compute some fields
        const entrySizes = this.impl.layout.map((e) => e.count * (e.size ?? shared_1.NVMEntrySizes[e.type]));
        this.nvmSize = (0, safe_2.sum)(entrySizes);
        this.setOne("nvmTotalEnd", this.nvmSize - 1); // the value points to the last byte
        let moduleSize = 0;
        let moduleKey;
        for (let i = 0; i < this.impl.layout.length; i++) {
            const entry = this.impl.layout[i];
            if (entry.type === shared_1.NVMEntryType.NVMModuleSize) {
                // Start of NVM module
                moduleSize = 0;
                moduleKey = entry.name;
            }
            moduleSize += entrySizes[i];
            if (entry.type === shared_1.NVMEntryType.NVMModuleDescriptor) {
                // End of NVM module
                // set size at the start
                this.setOne(moduleKey, moduleSize);
                // and descriptor at the end
                const moduleType = entry.name === "nvmZWlibraryDescriptor"
                    ? shared_1.NVMModuleType.ZW_LIBRARY
                    : entry.name === "nvmApplicationDescriptor"
                        ? shared_1.NVMModuleType.APPLICATION
                        : entry.name === "nvmHostApplicationDescriptor"
                            ? shared_1.NVMModuleType.HOST_APPLICATION
                            : entry.name === "nvmDescriptorDescriptor"
                                ? shared_1.NVMModuleType.NVM_DESCRIPTOR
                                : 0;
                this.setOne(entry.name, {
                    size: moduleSize,
                    type: moduleType,
                    version: entry.name === "nvmZWlibraryDescriptor"
                        ? c.protocolVersion
                        : c.applicationVersion,
                });
            }
        }
    }
    serialize() {
        const ret = Buffer.alloc(this.nvmSize, 0xff);
        let offset = 0;
        for (const entry of this.impl.layout) {
            // In 500 NVMs there are no optional entries. Make sure they all exist
            const value = this.entries.get(entry.name);
            if (value == undefined) {
                throw new Error(`Required entry ${entry.name} is missing`);
            }
            const size = entry.size ?? shared_1.NVMEntrySizes[entry.type];
            const converted = value.data.map((data) => {
                switch (entry.type) {
                    case shared_1.NVMEntryType.Byte:
                        return Buffer.from([data]);
                    case shared_1.NVMEntryType.Word:
                    case shared_1.NVMEntryType.NVMModuleSize: {
                        const ret = Buffer.allocUnsafe(2);
                        ret.writeUInt16BE(data, 0);
                        return ret;
                    }
                    case shared_1.NVMEntryType.DWord: {
                        const ret = Buffer.allocUnsafe(4);
                        ret.writeUInt32BE(data, 0);
                        return ret;
                    }
                    case shared_1.NVMEntryType.NodeInfo:
                        return data
                            ? (0, EntryParsers_1.encodeNVM500NodeInfo)(data)
                            : Buffer.alloc(size, 0);
                    case shared_1.NVMEntryType.NodeMask: {
                        const ret = Buffer.alloc(size, 0);
                        if (data) {
                            (0, safe_1.encodeBitMask)(data, safe_1.MAX_NODES, 1).copy(ret, 0);
                        }
                        return ret;
                    }
                    case shared_1.NVMEntryType.SUCUpdateEntry:
                        return (0, files_1.encodeSUCUpdateEntry)(data);
                    case shared_1.NVMEntryType.Route:
                        return (0, files_1.encodeRoute)(data);
                    case shared_1.NVMEntryType.NVMModuleDescriptor:
                        return (0, EntryParsers_1.encodeNVMModuleDescriptor)(data);
                    case shared_1.NVMEntryType.NVMDescriptor:
                        return (0, EntryParsers_1.encodeNVMDescriptor)(data);
                    case shared_1.NVMEntryType.Buffer:
                        return data;
                }
            });
            for (const buf of converted) {
                buf.copy(ret, offset);
                offset += size; // Not all entries have the same size as the raw buffer
            }
        }
        return ret;
    }
}
exports.NVMSerializer = NVMSerializer;
//# sourceMappingURL=NVMParser.js.map