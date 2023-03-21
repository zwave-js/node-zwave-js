"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZWaveController = void 0;
const cc_1 = require("@zwave-js/cc");
const core_1 = require("@zwave-js/core");
const nvmedit_1 = require("@zwave-js/nvmedit");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
const arrays_1 = require("alcalzone-shared/arrays");
const async_1 = require("alcalzone-shared/async");
const deferred_promise_1 = require("alcalzone-shared/deferred-promise");
const math_1 = require("alcalzone-shared/math");
const typeguards_1 = require("alcalzone-shared/typeguards");
const crypto_1 = __importDefault(require("crypto"));
const util_1 = __importDefault(require("util"));
const NetworkCache_1 = require("../driver/NetworkCache");
const DeviceClass_1 = require("../node/DeviceClass");
const Node_1 = require("../node/Node");
const VirtualNode_1 = require("../node/VirtualNode");
const _Types_1 = require("../node/_Types");
const ApplicationUpdateRequest_1 = require("../serialapi/application/ApplicationUpdateRequest");
const ShutdownMessages_1 = require("../serialapi/application/ShutdownMessages");
const GetControllerCapabilitiesMessages_1 = require("../serialapi/capability/GetControllerCapabilitiesMessages");
const GetControllerVersionMessages_1 = require("../serialapi/capability/GetControllerVersionMessages");
const GetProtocolVersionMessages_1 = require("../serialapi/capability/GetProtocolVersionMessages");
const GetSerialApiCapabilitiesMessages_1 = require("../serialapi/capability/GetSerialApiCapabilitiesMessages");
const GetSerialApiInitDataMessages_1 = require("../serialapi/capability/GetSerialApiInitDataMessages");
const HardResetRequest_1 = require("../serialapi/capability/HardResetRequest");
const SerialAPISetupMessages_1 = require("../serialapi/capability/SerialAPISetupMessages");
const SetApplicationNodeInformationRequest_1 = require("../serialapi/capability/SetApplicationNodeInformationRequest");
const GetControllerIdMessages_1 = require("../serialapi/memory/GetControllerIdMessages");
const GetBackgroundRSSIMessages_1 = require("../serialapi/misc/GetBackgroundRSSIMessages");
const SetRFReceiveModeMessages_1 = require("../serialapi/misc/SetRFReceiveModeMessages");
const SetSerialApiTimeoutsMessages_1 = require("../serialapi/misc/SetSerialApiTimeoutsMessages");
const AddNodeToNetworkRequest_1 = require("../serialapi/network-mgmt/AddNodeToNetworkRequest");
const AssignPriorityReturnRouteMessages_1 = require("../serialapi/network-mgmt/AssignPriorityReturnRouteMessages");
const AssignPrioritySUCReturnRouteMessages_1 = require("../serialapi/network-mgmt/AssignPrioritySUCReturnRouteMessages");
const AssignReturnRouteMessages_1 = require("../serialapi/network-mgmt/AssignReturnRouteMessages");
const AssignSUCReturnRouteMessages_1 = require("../serialapi/network-mgmt/AssignSUCReturnRouteMessages");
const DeleteReturnRouteMessages_1 = require("../serialapi/network-mgmt/DeleteReturnRouteMessages");
const DeleteSUCReturnRouteMessages_1 = require("../serialapi/network-mgmt/DeleteSUCReturnRouteMessages");
const GetPriorityRouteMessages_1 = require("../serialapi/network-mgmt/GetPriorityRouteMessages");
const GetRoutingInfoMessages_1 = require("../serialapi/network-mgmt/GetRoutingInfoMessages");
const GetSUCNodeIdMessages_1 = require("../serialapi/network-mgmt/GetSUCNodeIdMessages");
const IsFailedNodeMessages_1 = require("../serialapi/network-mgmt/IsFailedNodeMessages");
const RemoveFailedNodeMessages_1 = require("../serialapi/network-mgmt/RemoveFailedNodeMessages");
const RemoveNodeFromNetworkRequest_1 = require("../serialapi/network-mgmt/RemoveNodeFromNetworkRequest");
const ReplaceFailedNodeRequest_1 = require("../serialapi/network-mgmt/ReplaceFailedNodeRequest");
const RequestNodeNeighborUpdateMessages_1 = require("../serialapi/network-mgmt/RequestNodeNeighborUpdateMessages");
const SetPriorityRouteMessages_1 = require("../serialapi/network-mgmt/SetPriorityRouteMessages");
const SetSUCNodeIDMessages_1 = require("../serialapi/network-mgmt/SetSUCNodeIDMessages");
const ExtNVMReadLongBufferMessages_1 = require("../serialapi/nvm/ExtNVMReadLongBufferMessages");
const ExtNVMReadLongByteMessages_1 = require("../serialapi/nvm/ExtNVMReadLongByteMessages");
const ExtNVMWriteLongBufferMessages_1 = require("../serialapi/nvm/ExtNVMWriteLongBufferMessages");
const ExtNVMWriteLongByteMessages_1 = require("../serialapi/nvm/ExtNVMWriteLongByteMessages");
const FirmwareUpdateNVMMessages_1 = require("../serialapi/nvm/FirmwareUpdateNVMMessages");
const GetNVMIdMessages_1 = require("../serialapi/nvm/GetNVMIdMessages");
const NVMOperationsMessages_1 = require("../serialapi/nvm/NVMOperationsMessages");
const _Types_2 = require("../serialapi/_Types");
const ControllerStatistics_1 = require("./ControllerStatistics");
const Features_1 = require("./Features");
const FirmwareUpdateService_1 = require("./FirmwareUpdateService");
const Inclusion_1 = require("./Inclusion");
const NodeInformationFrame_1 = require("./NodeInformationFrame");
const utils_1 = require("./utils");
const ZWaveSDKVersions_1 = require("./ZWaveSDKVersions");
const _Types_3 = require("./_Types");
let ZWaveController = class ZWaveController extends shared_1.TypedEventEmitter {
    /** @internal */
    constructor(driver, bootloaderOnly = false) {
        super();
        this.driver = driver;
        this._healNetworkActive = false;
        this._inclusionState = Inclusion_1.InclusionState.Idle;
        this._smartStartEnabled = false;
        this._includeController = false;
        this._healNetworkProgress = new Map();
        this._firmwareUpdateInProgress = false;
        this._nodes = (0, shared_1.createThrowingMap)((nodeId) => {
            throw new core_1.ZWaveError(`Node ${nodeId} was not found!`, core_1.ZWaveErrorCodes.Controller_NodeNotFound);
        });
        // Limit interaction with the controller in bootloader-only mode
        if (bootloaderOnly)
            return;
        // register message handlers
        driver.registerRequestHandler(serial_1.FunctionType.AddNodeToNetwork, this.handleAddNodeStatusReport.bind(this));
        driver.registerRequestHandler(serial_1.FunctionType.RemoveNodeFromNetwork, this.handleRemoveNodeStatusReport.bind(this));
        driver.registerRequestHandler(serial_1.FunctionType.ReplaceFailedNode, this.handleReplaceNodeStatusReport.bind(this));
    }
    get type() {
        return this._type;
    }
    get protocolVersion() {
        return this._protocolVersion;
    }
    get sdkVersion() {
        return this._sdkVersion;
    }
    get zwaveApiVersion() {
        return this._zwaveApiVersion;
    }
    get zwaveChipType() {
        return this._zwaveChipType;
    }
    /** A 32bit number identifying the current network */
    get homeId() {
        return this._homeId;
    }
    /** The ID of the controller in the current network */
    get ownNodeId() {
        return this._ownNodeId;
    }
    get isPrimary() {
        return this._isPrimary;
    }
    get isUsingHomeIdFromOtherNetwork() {
        return this._isUsingHomeIdFromOtherNetwork;
    }
    get isSISPresent() {
        return this._isSISPresent;
    }
    get wasRealPrimary() {
        return this._wasRealPrimary;
    }
    get isSIS() {
        return this._isSIS;
    }
    get isSUC() {
        return this._isSUC;
    }
    get nodeType() {
        return this._nodeType;
    }
    /** Checks if the SDK version is greater than the given one */
    sdkVersionGt(version) {
        return (0, utils_1.sdkVersionGt)(this._sdkVersion, version);
    }
    /** Checks if the SDK version is greater than or equal to the given one */
    sdkVersionGte(version) {
        return (0, utils_1.sdkVersionGte)(this._sdkVersion, version);
    }
    /** Checks if the SDK version is lower than the given one */
    sdkVersionLt(version) {
        return (0, utils_1.sdkVersionLt)(this._sdkVersion, version);
    }
    /** Checks if the SDK version is lower than or equal to the given one */
    sdkVersionLte(version) {
        return (0, utils_1.sdkVersionLte)(this._sdkVersion, version);
    }
    get manufacturerId() {
        return this._manufacturerId;
    }
    get productType() {
        return this._productType;
    }
    get productId() {
        return this._productId;
    }
    get firmwareVersion() {
        return this._firmwareVersion;
    }
    get supportedFunctionTypes() {
        return this._supportedFunctionTypes;
    }
    /** Checks if a given Z-Wave function type is supported by this controller */
    isFunctionSupported(functionType) {
        if (this._supportedFunctionTypes == null) {
            throw new core_1.ZWaveError("Cannot check yet if a function is supported by the controller. The interview process has not been completed.", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._supportedFunctionTypes.indexOf(functionType) > -1;
    }
    get supportedSerialAPISetupCommands() {
        return this._supportedSerialAPISetupCommands;
    }
    /** Checks if a given Serial API setup command is supported by this controller */
    isSerialAPISetupCommandSupported(command) {
        if (!this._supportedSerialAPISetupCommands) {
            throw new core_1.ZWaveError("Cannot check yet if a Serial API setup command is supported by the controller. The interview process has not been completed.", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._supportedSerialAPISetupCommands.indexOf(command) > -1;
    }
    /**
     * Tests if the controller supports a certain feature.
     * Returns `undefined` if this information isn't known yet.
     */
    supportsFeature(feature) {
        switch (feature) {
            case Features_1.ZWaveFeature.SmartStart:
                return this.sdkVersionGte(Features_1.minFeatureVersions[feature]);
        }
    }
    /** Throws if the controller does not support a certain feature */
    assertFeature(feature) {
        if (!this.supportsFeature(feature)) {
            throw new core_1.ZWaveError(`The controller does not support the ${(0, shared_1.getEnumMemberName)(Features_1.ZWaveFeature, feature)} feature`, core_1.ZWaveErrorCodes.Controller_NotSupported);
        }
    }
    get sucNodeId() {
        return this._sucNodeId;
    }
    get supportsTimers() {
        return this._supportsTimers;
    }
    /** Whether the controller is known to support soft reset */
    get supportsSoftReset() {
        return this.driver.cacheGet(NetworkCache_1.cacheKeys.controller.supportsSoftReset);
    }
    /** @internal */
    set supportsSoftReset(value) {
        this.driver.cacheSet(NetworkCache_1.cacheKeys.controller.supportsSoftReset, value);
    }
    /** Which RF region the controller is currently set to, or `undefined` if it could not be determined (yet). This value is cached and can be changed through {@link setRFRegion}. */
    get rfRegion() {
        return this._rfRegion;
    }
    /** A dictionary of the nodes connected to this controller */
    get nodes() {
        return this._nodes;
    }
    /** Returns the node with the given DSK */
    getNodeByDSK(dsk) {
        try {
            if (typeof dsk === "string")
                dsk = (0, core_1.dskFromString)(dsk);
        }
        catch (e) {
            // Return undefined if the DSK is invalid
            if ((0, core_1.isZWaveError)(e) && e.code === core_1.ZWaveErrorCodes.Argument_Invalid)
                return undefined;
            throw e;
        }
        for (const node of this._nodes.values()) {
            if (node.dsk?.equals(dsk))
                return node;
        }
    }
    /** Returns the controller node's value DB */
    get valueDB() {
        return this._nodes.get(this._ownNodeId).valueDB;
    }
    /** Returns whether the network or a node is currently being healed. */
    get isHealNetworkActive() {
        return this._healNetworkActive;
    }
    groupNodesBySecurityClass(nodeIDs) {
        const ret = new Map();
        const nodes = nodeIDs
            ? nodeIDs.map((id) => this._nodes.getOrThrow(id))
            : [...this._nodes.values()];
        for (const node of nodes) {
            const secClass = node.getHighestSecurityClass();
            if (secClass === core_1.SecurityClass.Temporary || secClass == undefined) {
                continue;
            }
            if (!ret.has(secClass)) {
                ret.set(secClass, []);
            }
            ret.get(secClass).push(node.id);
        }
        return ret;
    }
    /**
     * Returns a reference to the (virtual) broadcast node, which allows sending commands to all nodes.
     * @deprecated Use {@link getBroadcastNodes} instead, which automatically groups nodes by security class and ignores nodes that cannot be controlled via multicast/broadcast.
     */
    getBroadcastNode() {
        return this.getBroadcastNodeInsecure();
    }
    /** Returns a reference to the (virtual) broadcast node, which allows sending commands to all insecure nodes. */
    getBroadcastNodeInsecure() {
        return new VirtualNode_1.VirtualNode(core_1.NODE_ID_BROADCAST, this.driver, this.nodes.values());
    }
    /**
     * Creates the necessary virtual nodes to be able to send commands to all nodes in the network.
     * Nodes are grouped by security class automatically, and get ignored if they cannot be controlled via multicast/broadcast.
     */
    getBroadcastNodes() {
        const nodesBySecurityClass = this.groupNodesBySecurityClass();
        nodesBySecurityClass.delete(core_1.SecurityClass.S0_Legacy);
        if (nodesBySecurityClass.size === 1 &&
            nodesBySecurityClass.has(core_1.SecurityClass.None)) {
            // All nodes are insecure, we can use actual broadcasting
            return [this.getBroadcastNodeInsecure()];
        }
        // We have to do multiple multicasts to reach all nodes
        // Create a virtual node for each security class
        return [...nodesBySecurityClass].map(([secClass, nodeIDs]) => {
            if (secClass === core_1.SecurityClass.None) {
                return this.getMulticastGroupInsecure(nodeIDs);
            }
            else {
                return this.getMulticastGroupS2(nodeIDs);
            }
        });
    }
    /**
     * Creates a virtual node that can be used to send multicast commands to several nodes.
     * @deprecated Use {@link getMulticastGroups} instead, which automatically groups nodes by security class and ignores nodes that cannot be controlled via multicast.
     */
    getMulticastGroup(nodeIDs) {
        if (nodeIDs.length === 0) {
            throw new core_1.ZWaveError("Cannot create an empty multicast group", core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const nodes = nodeIDs.map((id) => this._nodes.getOrThrow(id));
        return new VirtualNode_1.VirtualNode(undefined, this.driver, nodes);
    }
    /**
     * Creates the necessary virtual nodes to be able to send commands to the given nodes.
     * Nodes are grouped by security class automatically, and get ignored if they cannot be controlled via multicast.
     */
    getMulticastGroups(nodeIDs) {
        const nodesBySecurityClass = this.groupNodesBySecurityClass(nodeIDs);
        nodesBySecurityClass.delete(core_1.SecurityClass.S0_Legacy);
        // Create a virtual node for each security class
        return [...nodesBySecurityClass].map(([secClass, nodeIDs]) => {
            if (secClass === core_1.SecurityClass.None) {
                return this.getMulticastGroupInsecure(nodeIDs);
            }
            else {
                return this.getMulticastGroupS2(nodeIDs);
            }
        });
    }
    /**
     * Creates a virtual node that can be used to send multicast commands to several insecure nodes.
     * All nodes MUST be included insecurely.
     */
    getMulticastGroupInsecure(nodeIDs) {
        if (nodeIDs.length === 0) {
            throw new core_1.ZWaveError("Cannot create an empty multicast group", core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const nodes = nodeIDs.map((id) => this._nodes.getOrThrow(id));
        if (nodes.some((n) => n.isSecure !== false)) {
            throw new core_1.ZWaveError("All nodes must be included insecurely", core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        return new VirtualNode_1.VirtualNode(undefined, this.driver, nodes);
    }
    /**
     * Creates a virtual node that can be used to send multicast commands to several nodes using Security S2.
     * All nodes MUST be included using Security S2 and MUST have the same (highest) security class.
     */
    getMulticastGroupS2(nodeIDs) {
        if (nodeIDs.length === 0) {
            throw new core_1.ZWaveError("Cannot create an empty multicast group", core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        if (!this.driver.securityManager2) {
            throw new core_1.ZWaveError(`Security S2 multicast can only be used when the network keys are configured!`, core_1.ZWaveErrorCodes.Driver_NoSecurity);
        }
        const nodes = nodeIDs.map((id) => this._nodes.getOrThrow(id));
        const fail = () => {
            throw new core_1.ZWaveError("All nodes must be included using Security S2 and must have the same (highest) security class", core_1.ZWaveErrorCodes.Argument_Invalid);
        };
        const node0Class = nodes[0].getHighestSecurityClass();
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const secClass = node.getHighestSecurityClass();
            if (!(0, core_1.securityClassIsS2)(secClass))
                throw fail();
            if (i > 0 && secClass !== node0Class)
                throw fail();
        }
        return new VirtualNode_1.VirtualNode(undefined, this.driver, nodes, 
        // For convenience, we automatically decide whether to use actual multicast
        // or fall back to singlecast when there's only a single node
        // in the multicast "group"
        nodes.length > 1
            ? {
                s2MulticastGroupId: this.driver.securityManager2.createMulticastGroup(nodeIDs, node0Class),
            }
            : undefined);
    }
    /** @internal */
    get provisioningList() {
        return (this.driver.cacheGet(NetworkCache_1.cacheKeys.controller.provisioningList) ?? []);
    }
    set provisioningList(value) {
        this.driver.cacheSet(NetworkCache_1.cacheKeys.controller.provisioningList, value);
    }
    /** Adds the given entry (DSK and security classes) to the controller's SmartStart provisioning list or replaces an existing entry */
    provisionSmartStartNode(entry) {
        // Make sure the controller supports SmartStart
        this.assertFeature(Features_1.ZWaveFeature.SmartStart);
        // And that the entry contains valid data
        (0, utils_1.assertProvisioningEntry)(entry);
        const provisioningList = [...this.provisioningList];
        const index = provisioningList.findIndex((e) => e.dsk === entry.dsk);
        if (index === -1) {
            provisioningList.push(entry);
        }
        else {
            provisioningList[index] = entry;
        }
        this.provisioningList = provisioningList;
        this.autoProvisionSmartStart();
    }
    /**
     * Removes the given DSK or node ID from the controller's SmartStart provisioning list.
     *
     * **Note:** If this entry corresponds to an included node, it will **NOT** be excluded
     */
    unprovisionSmartStartNode(dskOrNodeId) {
        const provisioningList = [...this.provisioningList];
        const entry = this.getProvisioningEntryInternal(dskOrNodeId);
        if (!entry)
            return;
        const index = provisioningList.indexOf(entry);
        if (index >= 0) {
            provisioningList.splice(index, 1);
            this.autoProvisionSmartStart();
            this.provisioningList = provisioningList;
        }
    }
    getProvisioningEntryInternal(dskOrNodeId) {
        if (typeof dskOrNodeId === "string") {
            return this.provisioningList.find((e) => e.dsk === dskOrNodeId);
        }
        else {
            // The provisioning list may or may not contain the node ID for an entry, even if the node is already included.
            let ret = this.provisioningList.find((e) => "nodeId" in e && e.nodeId === dskOrNodeId);
            if (!ret) {
                // Try to get the DSK from the node instance
                const dsk = this.nodes.get(dskOrNodeId)?.dsk;
                if (dsk) {
                    ret = this.provisioningList.find((e) => e.dsk === (0, core_1.dskToString)(dsk));
                }
            }
            return ret;
        }
    }
    /**
     * Returns the entry for the given DSK or node ID from the controller's SmartStart provisioning list.
     */
    getProvisioningEntry(dskOrNodeId) {
        const entry = this.getProvisioningEntryInternal(dskOrNodeId);
        // Try to look up the node ID for this entry
        if (entry) {
            const ret = {
                ...entry,
            };
            const node = typeof dskOrNodeId === "string"
                ? this.getNodeByDSK(dskOrNodeId)
                : this.nodes.get(dskOrNodeId);
            if (node)
                ret.nodeId = node.id;
            return ret;
        }
    }
    /**
     * Returns all entries from the controller's SmartStart provisioning list.
     */
    getProvisioningEntries() {
        // Determine which DSKs belong to which node IDs
        const dskNodeMap = new Map();
        for (const node of this.nodes.values()) {
            if (node.dsk)
                dskNodeMap.set((0, core_1.dskToString)(node.dsk), node.id);
        }
        // Make copies so no one can modify the internal list (except for user info)
        return this.provisioningList.map((e) => {
            const { dsk, securityClasses, nodeId, ...rest } = e;
            return {
                dsk,
                securityClasses: [...securityClasses],
                ...(dskNodeMap.has(dsk)
                    ? { nodeId: dskNodeMap.get(dsk) }
                    : {}),
                ...rest,
            };
        });
    }
    /** Returns whether the SmartStart provisioning list contains active entries that have not been included yet */
    hasPlannedProvisioningEntries() {
        return this.provisioningList.some((e) => (e.status == undefined ||
            e.status === Inclusion_1.ProvisioningEntryStatus.Active) &&
            !this.getNodeByDSK(e.dsk));
    }
    /**
     * @internal
     * Automatically starts smart start inclusion if there are nodes pending inclusion.
     */
    autoProvisionSmartStart() {
        // Make sure the controller supports SmartStart
        if (!this.supportsFeature(Features_1.ZWaveFeature.SmartStart))
            return;
        if (this.hasPlannedProvisioningEntries()) {
            // SmartStart should be enabled
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            void this.enableSmartStart().catch(() => { });
        }
        else {
            // SmartStart should be disabled
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            void this.disableSmartStart().catch(() => { });
        }
    }
    /**
     * @internal
     * Queries the controller IDs and its Serial API capabilities
     */
    async identify() {
        // get the home and node id of the controller
        this.driver.controllerLog.print(`querying controller IDs...`);
        const ids = await this.driver.sendMessage(new GetControllerIdMessages_1.GetControllerIdRequest(this.driver), { supportCheck: false });
        this._homeId = ids.homeId;
        this._ownNodeId = ids.ownNodeId;
        this.driver.controllerLog.print(`received controller IDs:
  home ID:     ${(0, shared_1.num2hex)(this._homeId)}
  own node ID: ${this._ownNodeId}`);
        // Figure out what the serial API can do
        this.driver.controllerLog.print(`querying API capabilities...`);
        const apiCaps = await this.driver.sendMessage(new GetSerialApiCapabilitiesMessages_1.GetSerialApiCapabilitiesRequest(this.driver), {
            supportCheck: false,
        });
        this._firmwareVersion = apiCaps.firmwareVersion;
        this._manufacturerId = apiCaps.manufacturerId;
        this._productType = apiCaps.productType;
        this._productId = apiCaps.productId;
        this._supportedFunctionTypes = apiCaps.supportedFunctionTypes;
        this.driver.controllerLog.print(`received API capabilities:
  firmware version:    ${this._firmwareVersion}
  manufacturer ID:     ${(0, shared_1.num2hex)(this._manufacturerId)}
  product type:        ${(0, shared_1.num2hex)(this._productType)}
  product ID:          ${(0, shared_1.num2hex)(this._productId)}
  supported functions: ${this._supportedFunctionTypes
            .map((fn) => `\n  · ${serial_1.FunctionType[fn]} (${(0, shared_1.num2hex)(fn)})`)
            .join("")}`);
    }
    /**
     * @internal
     * Interviews the controller for the necessary information.
     * @param restoreFromCache Asynchronous callback for the driver to restore the network from cache after nodes are created
     */
    async interview(restoreFromCache) {
        // get basic controller version info
        this.driver.controllerLog.print(`querying version info...`);
        const version = await this.driver.sendMessage(new GetControllerVersionMessages_1.GetControllerVersionRequest(this.driver), {
            supportCheck: false,
        });
        this._protocolVersion = version.libraryVersion;
        this._type = version.controllerType;
        this.driver.controllerLog.print(`received version info:
  controller type: ${(0, shared_1.getEnumMemberName)(_Types_2.ZWaveLibraryTypes, this._type)}
  library version: ${this._protocolVersion}`);
        // If supported, get more fine-grained version info
        if (this.isFunctionSupported(serial_1.FunctionType.GetProtocolVersion)) {
            this.driver.controllerLog.print(`querying protocol version info...`);
            const protocol = await this.driver.sendMessage(new GetProtocolVersionMessages_1.GetProtocolVersionRequest(this.driver));
            this._protocolVersion = protocol.protocolVersion;
            let message = `received protocol version info:
  protocol type:             ${(0, shared_1.getEnumMemberName)(core_1.ProtocolType, protocol.protocolType)}
  protocol version:          ${protocol.protocolVersion}`;
            if (protocol.applicationFrameworkBuildNumber) {
                message += `
  appl. framework build no.: ${protocol.applicationFrameworkBuildNumber}`;
            }
            if (protocol.gitCommitHash) {
                message += `
  git commit hash:           ${protocol.gitCommitHash}`;
            }
            this.driver.controllerLog.print(message);
        }
        // The SDK version cannot be queried directly, but we can deduce it from the protocol version
        this._sdkVersion = (0, ZWaveSDKVersions_1.protocolVersionToSDKVersion)(this._protocolVersion);
        this.driver.controllerLog.print(`supported Z-Wave features: ${Object.keys(Features_1.ZWaveFeature)
            .filter((k) => /^\d+$/.test(k))
            .map((k) => parseInt(k))
            .filter((feat) => this.supportsFeature(feat))
            .map((feat) => `\n  · ${(0, shared_1.getEnumMemberName)(Features_1.ZWaveFeature, feat)}`)
            .join("")}`);
        // find out what the controller can do
        this.driver.controllerLog.print(`querying controller capabilities...`);
        const ctrlCaps = await this.driver.sendMessage(new GetControllerCapabilitiesMessages_1.GetControllerCapabilitiesRequest(this.driver), {
            supportCheck: false,
        });
        this._isPrimary = !ctrlCaps.isSecondary;
        this._isUsingHomeIdFromOtherNetwork =
            ctrlCaps.isUsingHomeIdFromOtherNetwork;
        this._isSISPresent = ctrlCaps.isSISPresent;
        this._wasRealPrimary = ctrlCaps.wasRealPrimary;
        this._isSUC = ctrlCaps.isStaticUpdateController;
        this.driver.controllerLog.print(`received controller capabilities:
  controller role:      ${this._isPrimary ? "primary" : "secondary"}
  is the SUC:           ${this._isSUC}
  started this network: ${!this._isUsingHomeIdFromOtherNetwork}
  SIS is present:       ${this._isSISPresent}
  was real primary:     ${this._wasRealPrimary}`);
        // Figure out which sub commands of SerialAPISetup are supported
        if (this.isFunctionSupported(serial_1.FunctionType.SerialAPISetup)) {
            this.driver.controllerLog.print(`querying serial API setup capabilities...`);
            const setupCaps = await this.driver.sendMessage(new SerialAPISetupMessages_1.SerialAPISetup_GetSupportedCommandsRequest(this.driver));
            this._supportedSerialAPISetupCommands = setupCaps.supportedCommands;
            this.driver.controllerLog.print(`supported serial API setup commands:${this._supportedSerialAPISetupCommands
                .map((cmd) => `\n· ${(0, shared_1.getEnumMemberName)(SerialAPISetupMessages_1.SerialAPISetupCommand, cmd)}`)
                .join("")}`);
        }
        else {
            this._supportedSerialAPISetupCommands = [];
        }
        // Enable TX status report if supported
        if (this.isSerialAPISetupCommandSupported(SerialAPISetupMessages_1.SerialAPISetupCommand.SetTxStatusReport)) {
            this.driver.controllerLog.print(`Enabling TX status report...`);
            const resp = await this.driver.sendMessage(new SerialAPISetupMessages_1.SerialAPISetup_SetTXStatusReportRequest(this.driver, {
                enabled: true,
            }));
            this.driver.controllerLog.print(`Enabling TX status report ${resp.success ? "successful" : "failed"}...`);
        }
        // Also query the controller's current RF region if possible
        if (this.isSerialAPISetupCommandSupported(SerialAPISetupMessages_1.SerialAPISetupCommand.GetRFRegion)) {
            this.driver.controllerLog.print(`Querying configured RF region...`);
            const resp = await this.getRFRegion().catch(() => undefined);
            if (resp != undefined) {
                this.driver.controllerLog.print(`The controller is using RF region ${(0, shared_1.getEnumMemberName)(core_1.RFRegion, resp)}`);
            }
            else {
                this.driver.controllerLog.print(`Querying the RF region failed!`, "warn");
            }
        }
        // find the SUC
        this.driver.controllerLog.print(`finding SUC...`);
        const suc = await this.driver.sendMessage(new GetSUCNodeIdMessages_1.GetSUCNodeIdRequest(this.driver), { supportCheck: false });
        this._sucNodeId = suc.sucNodeId;
        if (this._sucNodeId === 0) {
            this.driver.controllerLog.print(`No SUC present in the network`);
        }
        else if (this._sucNodeId === this._ownNodeId) {
            this.driver.controllerLog.print(`This is the SUC`);
        }
        else {
            this.driver.controllerLog.print(`SUC has node ID ${this.sucNodeId}`);
        }
        // There needs to be a SUC/SIS in the network. If not, we promote ourselves to one if the following conditions are met:
        // We are the primary controller, but we are not SUC, there is no SUC and there is no SIS
        if (this._isPrimary &&
            this._sucNodeId === 0 &&
            !this._isSUC &&
            !this._isSISPresent) {
            this.driver.controllerLog.print(`There is no SUC/SIS in the network - promoting ourselves...`);
            try {
                const result = await this.configureSUC(this._ownNodeId, true, true);
                if (result) {
                    this._sucNodeId = this._ownNodeId;
                }
                this.driver.controllerLog.print(`Promotion to SUC/SIS ${result ? "succeeded" : "failed"}.`, result ? undefined : "warn");
            }
            catch (e) {
                this.driver.controllerLog.print(`Error while promoting to SUC/SIS: ${(0, shared_1.getErrorMessage)(e)}`, "error");
            }
        }
        // if it's a bridge controller, request the virtual nodes
        if (this.type === _Types_2.ZWaveLibraryTypes["Bridge Controller"] &&
            this.isFunctionSupported(serial_1.FunctionType.FUNC_ID_ZW_GET_VIRTUAL_NODES)) {
            // TODO: send FUNC_ID_ZW_GET_VIRTUAL_NODES message
        }
        // Request additional information about the controller/Z-Wave chip
        this.driver.controllerLog.print(`querying additional controller information...`);
        const initData = await this.driver.sendMessage(new GetSerialApiInitDataMessages_1.GetSerialApiInitDataRequest(this.driver));
        // and remember the new info
        this._zwaveApiVersion = initData.zwaveApiVersion;
        this._zwaveChipType = initData.zwaveChipType;
        this._isPrimary = initData.isPrimary;
        this._isSIS = initData.isSIS;
        this._nodeType = initData.nodeType;
        this._supportsTimers = initData.supportsTimers;
        // ignore the initVersion, no clue what to do with it
        this.driver.controllerLog.print(`received additional controller information:
  Z-Wave API version:         ${this._zwaveApiVersion.version} (${this._zwaveApiVersion.kind})${this._zwaveChipType
            ? `
  Z-Wave chip type:           ${typeof this._zwaveChipType === "string"
                ? this._zwaveChipType
                : `unknown (type: ${(0, shared_1.num2hex)(this._zwaveChipType.type)}, version: ${(0, shared_1.num2hex)(this._zwaveChipType.version)})`}`
            : ""}
  node type                   ${(0, shared_1.getEnumMemberName)(core_1.NodeType, this._nodeType)}
  controller role:            ${this._isPrimary ? "primary" : "secondary"}
  controller is the SIS:      ${this._isSIS}
  controller supports timers: ${this._supportsTimers}
  nodes in the network:       ${initData.nodeIds.join(", ")}`);
        // Index the value DB for optimal performance
        const valueDBIndexes = (0, core_1.indexDBsByNode)([
            this.driver.valueDB,
            this.driver.metadataDB,
        ]);
        // create an empty entry in the nodes map so we can initialize them afterwards
        for (const nodeId of initData.nodeIds) {
            this._nodes.set(nodeId, new Node_1.ZWaveNode(nodeId, this.driver, undefined, undefined, undefined, 
            // Use the previously created index to avoid doing extra work when creating the value DB
            this.createValueDBForNode(nodeId, valueDBIndexes.get(nodeId))));
        }
        // Now try to deserialize all nodes from the cache
        await restoreFromCache();
        // Set manufacturer information for the controller node
        const controllerValueDB = this.valueDB;
        controllerValueDB.setMetadata(cc_1.ManufacturerSpecificCCValues.manufacturerId.id, cc_1.ManufacturerSpecificCCValues.manufacturerId.meta);
        controllerValueDB.setMetadata(cc_1.ManufacturerSpecificCCValues.productType.id, cc_1.ManufacturerSpecificCCValues.productType.meta);
        controllerValueDB.setMetadata(cc_1.ManufacturerSpecificCCValues.productId.id, cc_1.ManufacturerSpecificCCValues.productId.meta);
        controllerValueDB.setValue(cc_1.ManufacturerSpecificCCValues.manufacturerId.id, this._manufacturerId);
        controllerValueDB.setValue(cc_1.ManufacturerSpecificCCValues.productType.id, this._productType);
        controllerValueDB.setValue(cc_1.ManufacturerSpecificCCValues.productId.id, this._productId);
        // Set firmware version information for the controller node
        controllerValueDB.setMetadata(cc_1.VersionCCValues.firmwareVersions.id, cc_1.VersionCCValues.firmwareVersions.meta);
        controllerValueDB.setValue(cc_1.VersionCCValues.firmwareVersions.id, [
            this._firmwareVersion,
        ]);
        controllerValueDB.setMetadata(cc_1.VersionCCValues.zWaveProtocolVersion.id, cc_1.VersionCCValues.zWaveProtocolVersion.meta);
        controllerValueDB.setValue(cc_1.VersionCCValues.zWaveProtocolVersion.id, this._protocolVersion);
        controllerValueDB.setMetadata(cc_1.VersionCCValues.sdkVersion.id, cc_1.VersionCCValues.sdkVersion.meta);
        controllerValueDB.setValue(cc_1.VersionCCValues.sdkVersion.id, this._sdkVersion);
        if (this.type !== _Types_2.ZWaveLibraryTypes["Bridge Controller"] &&
            this.isFunctionSupported(serial_1.FunctionType.SetSerialApiTimeouts)) {
            const { ack, byte } = this.driver.options.timeouts;
            this.driver.controllerLog.print(`setting serial API timeouts: ack = ${ack} ms, byte = ${byte} ms`);
            const resp = await this.driver.sendMessage(new SetSerialApiTimeoutsMessages_1.SetSerialApiTimeoutsRequest(this.driver, {
                ackTimeout: ack,
                byteTimeout: byte,
            }));
            this.driver.controllerLog.print(`serial API timeouts overwritten. The old values were: ack = ${resp.oldAckTimeout} ms, byte = ${resp.oldByteTimeout} ms`);
        }
        this.driver.controllerLog.print("Interview completed");
    }
    createValueDBForNode(nodeId, ownKeys) {
        return new core_1.ValueDB(nodeId, this.driver.valueDB, this.driver.metadataDB, ownKeys);
    }
    /**
     * Sets the NIF of the controller to the Gateway device type and to include the CCs supported by Z-Wave JS.
     * Warning: This only works when followed up by a hard-reset, so don't call this directly
     * @internal
     */
    async setControllerNIF() {
        this.driver.controllerLog.print("Updating the controller NIF...");
        await this.driver.sendMessage(new SetApplicationNodeInformationRequest_1.SetApplicationNodeInformationRequest(this.driver, {
            isListening: true,
            ...(0, NodeInformationFrame_1.determineNIF)(),
        }));
    }
    /**
     * Performs a hard reset on the controller. This wipes out all configuration!
     * Warning: The driver needs to re-interview the controller, so don't call this directly
     * @internal
     */
    async hardReset() {
        // begin the reset process
        try {
            this.driver.controllerLog.print("performing hard reset...");
            await this.driver.sendMessage(new HardResetRequest_1.HardResetRequest(this.driver), {
                supportCheck: false,
            });
            this.driver.controllerLog.print(`hard reset succeeded`);
            // Clean up
            this._nodes.forEach((node) => node.removeAllListeners());
            this._nodes.clear();
        }
        catch (e) {
            this.driver.controllerLog.print(`hard reset failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
            throw e;
        }
    }
    /**
     * @internal
     */
    async shutdown() {
        // begin the reset process
        try {
            this.driver.controllerLog.print("Shutting down the Z-Wave API...");
            const response = await this.driver.sendMessage(new ShutdownMessages_1.ShutdownRequest(this.driver));
            if (response.success) {
                this.driver.controllerLog.print("Z-Wave API was shut down");
            }
            else {
                this.driver.controllerLog.print("Failed to shut down the Z-Wave API");
            }
            return response.success;
        }
        catch (e) {
            this.driver.controllerLog.print(`shutdown failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
            throw e;
        }
    }
    get inclusionState() {
        return this._inclusionState;
    }
    /** @internal */
    setInclusionState(state) {
        if (this._inclusionState === state)
            return;
        this._inclusionState = state;
        if (state === Inclusion_1.InclusionState.Idle &&
            this._smartStartEnabled &&
            this.supportsFeature(Features_1.ZWaveFeature.SmartStart)) {
            // If Smart Start was enabled before the inclusion/exclusion,
            // enable it again and ignore errors
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            this.enableSmartStart().catch(() => { });
        }
    }
    /**
     * Starts the inclusion process of new nodes.
     * Resolves to true when the process was started, and false if the inclusion was already active.
     *
     * @param options Defines the inclusion strategy to use.
     */
    async beginInclusion(options = {
        strategy: Inclusion_1.InclusionStrategy.Insecure,
    }) {
        if (this._inclusionState === Inclusion_1.InclusionState.Including ||
            this._inclusionState === Inclusion_1.InclusionState.Excluding ||
            this._inclusionState === Inclusion_1.InclusionState.Busy) {
            return false;
        }
        // Protect against invalid inclusion options
        if (!(options.strategy in Inclusion_1.InclusionStrategy) ||
            // @ts-expect-error We're checking for user errors
            options.strategy === Inclusion_1.InclusionStrategy.SmartStart) {
            throw new core_1.ZWaveError(`Invalid inclusion strategy: ${options.strategy}`, core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        // Leave SmartStart listening mode so we can switch to exclusion mode
        await this.pauseSmartStart();
        this.setInclusionState(Inclusion_1.InclusionState.Including);
        this._inclusionOptions = options;
        try {
            this.driver.controllerLog.print(`Starting inclusion process with strategy ${(0, shared_1.getEnumMemberName)(Inclusion_1.InclusionStrategy, options.strategy)}...`);
            // kick off the inclusion process
            await this.driver.sendMessage(new AddNodeToNetworkRequest_1.AddNodeToNetworkRequest(this.driver, {
                addNodeType: AddNodeToNetworkRequest_1.AddNodeType.Any,
                highPower: true,
                networkWide: true,
            }));
            this.driver.controllerLog.print(`The controller is now ready to add nodes`);
            this.emit("inclusion started", 
            // TODO: Remove first parameter in next major version
            options.strategy !== Inclusion_1.InclusionStrategy.Insecure, options.strategy);
        }
        catch (e) {
            this.setInclusionState(Inclusion_1.InclusionState.Idle);
            if ((0, core_1.isZWaveError)(e) &&
                e.code === core_1.ZWaveErrorCodes.Controller_CallbackNOK) {
                this.driver.controllerLog.print(`Starting the inclusion failed`, "error");
                throw new core_1.ZWaveError("The inclusion could not be started.", core_1.ZWaveErrorCodes.Controller_InclusionFailed);
            }
            throw e;
        }
        return true;
    }
    /** @internal */
    async beginInclusionSmartStart(provisioningEntry) {
        if (this._inclusionState === Inclusion_1.InclusionState.Including ||
            this._inclusionState === Inclusion_1.InclusionState.Excluding ||
            this._inclusionState === Inclusion_1.InclusionState.Busy) {
            return false;
        }
        // Disable listening mode so we can switch to inclusion mode
        await this.stopInclusion();
        this.setInclusionState(Inclusion_1.InclusionState.Including);
        this._inclusionOptions = {
            strategy: Inclusion_1.InclusionStrategy.SmartStart,
            provisioning: provisioningEntry,
        };
        try {
            this.driver.controllerLog.print(`Including SmartStart node with DSK ${provisioningEntry.dsk}`);
            // kick off the inclusion process
            const dskBuffer = (0, core_1.dskFromString)(provisioningEntry.dsk);
            await this.driver.sendMessage(new AddNodeToNetworkRequest_1.AddNodeDSKToNetworkRequest(this.driver, {
                nwiHomeId: (0, core_1.nwiHomeIdFromDSK)(dskBuffer),
                authHomeId: (0, core_1.authHomeIdFromDSK)(dskBuffer),
                highPower: true,
                networkWide: true,
            }));
            this.emit("inclusion started", 
            // TODO: Remove first parameter in next major version
            true, Inclusion_1.InclusionStrategy.SmartStart);
        }
        catch (e) {
            this.setInclusionState(Inclusion_1.InclusionState.Idle);
            // Error handling for this happens at the call site
            throw e;
        }
        return true;
    }
    /**
     * Is used internally to stop an active inclusion process without waiting for a confirmation
     * @internal
     */
    async stopInclusionNoCallback() {
        await this.driver.sendMessage(new AddNodeToNetworkRequest_1.AddNodeToNetworkRequest(this.driver, {
            callbackId: 0,
            addNodeType: AddNodeToNetworkRequest_1.AddNodeType.Stop,
            highPower: true,
            networkWide: true,
        }));
        this.driver.controllerLog.print(`The inclusion process was stopped`);
        this.emit("inclusion stopped");
    }
    /**
     * Finishes an inclusion process. This must only be called after the ProtocolDone status is received.
     * Returns the ID of the newly added node.
     */
    async finishInclusion() {
        this.driver.controllerLog.print(`finishing inclusion process...`);
        const response = await this.driver.sendMessage(new AddNodeToNetworkRequest_1.AddNodeToNetworkRequest(this.driver, {
            addNodeType: AddNodeToNetworkRequest_1.AddNodeType.Stop,
            highPower: true,
            networkWide: true,
        }));
        if (response.status === AddNodeToNetworkRequest_1.AddNodeStatus.Done) {
            return response.statusContext.nodeId;
        }
        this.driver.controllerLog.print(`Finishing the inclusion failed`, "error");
        throw new core_1.ZWaveError("Finishing the inclusion failed", core_1.ZWaveErrorCodes.Controller_InclusionFailed);
    }
    /**
     * Stops an active inclusion process. Resolves to true when the controller leaves inclusion mode,
     * and false if the inclusion was not active.
     */
    async stopInclusion() {
        if (this._inclusionState !== Inclusion_1.InclusionState.Including) {
            return false;
        }
        this.driver.controllerLog.print(`stopping inclusion process...`);
        try {
            // stop the inclusion process
            await this.driver.sendMessage(new AddNodeToNetworkRequest_1.AddNodeToNetworkRequest(this.driver, {
                addNodeType: AddNodeToNetworkRequest_1.AddNodeType.Stop,
                highPower: true,
                networkWide: true,
            }));
            this.driver.controllerLog.print(`The inclusion process was stopped`);
            this.emit("inclusion stopped");
            this.setInclusionState(Inclusion_1.InclusionState.Idle);
            return true;
        }
        catch (e) {
            if ((0, core_1.isZWaveError)(e) &&
                e.code === core_1.ZWaveErrorCodes.Controller_CallbackNOK) {
                this.driver.controllerLog.print(`Stopping the inclusion failed`, "error");
                throw new core_1.ZWaveError("The inclusion could not be stopped.", core_1.ZWaveErrorCodes.Controller_InclusionFailed);
            }
            throw e;
        }
    }
    /**
     * Puts the controller into listening mode for Smart Start inclusion.
     * Whenever a node on the provisioning list announces itself, it will automatically be added.
     *
     * Resolves to `true` when the listening mode is started or was active, and `false` if it is scheduled for later activation.
     */
    async enableSmartStart() {
        if (!this.supportsFeature(Features_1.ZWaveFeature.SmartStart)) {
            this.driver.controllerLog.print(`Smart Start is not supported by this controller, NOT enabling listening mode...`, "warn");
        }
        this._smartStartEnabled = true;
        if (this._inclusionState === Inclusion_1.InclusionState.Idle) {
            this.setInclusionState(Inclusion_1.InclusionState.SmartStart);
            this.driver.controllerLog.print(`Enabling Smart Start listening mode...`);
            try {
                await this.driver.sendMessage(new AddNodeToNetworkRequest_1.EnableSmartStartListenRequest(this.driver, {}));
                this.driver.controllerLog.print(`Smart Start listening mode enabled`);
                return true;
            }
            catch (e) {
                this.setInclusionState(Inclusion_1.InclusionState.Idle);
                this.driver.controllerLog.print(`Smart Start listening mode could not be enabled: ${(0, shared_1.getErrorMessage)(e)}`, "error");
                throw e;
            }
        }
        else if (this._inclusionState === Inclusion_1.InclusionState.SmartStart) {
            return true;
        }
        else {
            this.driver.controllerLog.print(`Smart Start listening mode scheduled for later activation...`);
            return false;
        }
    }
    /**
     * Disables the listening mode for Smart Start inclusion.
     *
     * Resolves to `true` when the listening mode is stopped, and `false` if was not active.
     */
    async disableSmartStart() {
        if (!this.supportsFeature(Features_1.ZWaveFeature.SmartStart))
            return true;
        this._smartStartEnabled = false;
        if (this._inclusionState === Inclusion_1.InclusionState.SmartStart) {
            this.setInclusionState(Inclusion_1.InclusionState.Idle);
            this.driver.controllerLog.print(`disabling Smart Start listening mode...`);
            try {
                await this.driver.sendMessage(new AddNodeToNetworkRequest_1.AddNodeToNetworkRequest(this.driver, {
                    callbackId: 0,
                    addNodeType: AddNodeToNetworkRequest_1.AddNodeType.Stop,
                    highPower: true,
                    networkWide: true,
                }));
                this.driver.controllerLog.print(`Smart Start listening mode disabled`);
                return true;
            }
            catch (e) {
                this.setInclusionState(Inclusion_1.InclusionState.SmartStart);
                this.driver.controllerLog.print(`Smart Start listening mode could not be disabled: ${(0, shared_1.getErrorMessage)(e)}`, "error");
                throw e;
            }
        }
        else if (this._inclusionState === Inclusion_1.InclusionState.Idle) {
            return true;
        }
        else {
            this.driver.controllerLog.print(`Smart Start listening mode disabled`);
            return true;
        }
    }
    async pauseSmartStart() {
        if (!this.supportsFeature(Features_1.ZWaveFeature.SmartStart))
            return true;
        if (this._inclusionState === Inclusion_1.InclusionState.SmartStart) {
            this.driver.controllerLog.print(`Leaving Smart Start listening mode...`);
            try {
                await this.driver.sendMessage(new AddNodeToNetworkRequest_1.AddNodeToNetworkRequest(this.driver, {
                    callbackId: 0,
                    addNodeType: AddNodeToNetworkRequest_1.AddNodeType.Stop,
                    highPower: true,
                    networkWide: true,
                }));
                this.driver.controllerLog.print(`Left Smart Start listening mode`);
                return true;
            }
            catch (e) {
                this.driver.controllerLog.print(`Smart Start listening mode could not be left: ${(0, shared_1.getErrorMessage)(e)}`, "error");
                throw e;
            }
        }
        else {
            return true;
        }
    }
    async beginExclusion(options = {
        strategy: Inclusion_1.ExclusionStrategy.DisableProvisioningEntry,
    }) {
        if (this._inclusionState === Inclusion_1.InclusionState.Including ||
            this._inclusionState === Inclusion_1.InclusionState.Excluding ||
            this._inclusionState === Inclusion_1.InclusionState.Busy) {
            return false;
        }
        if (typeof options === "boolean") {
            options = {
                strategy: options
                    ? Inclusion_1.ExclusionStrategy.Unprovision
                    : Inclusion_1.ExclusionStrategy.ExcludeOnly,
            };
        }
        else if (options === "inactive") {
            options = {
                strategy: Inclusion_1.ExclusionStrategy.DisableProvisioningEntry,
            };
        }
        // Leave SmartStart listening mode so we can switch to exclusion mode
        await this.pauseSmartStart();
        this.setInclusionState(Inclusion_1.InclusionState.Excluding);
        this.driver.controllerLog.print(`starting exclusion process...`);
        try {
            // kick off the inclusion process
            await this.driver.sendMessage(new RemoveNodeFromNetworkRequest_1.RemoveNodeFromNetworkRequest(this.driver, {
                removeNodeType: RemoveNodeFromNetworkRequest_1.RemoveNodeType.Any,
                highPower: true,
                networkWide: true,
            }));
            this.driver.controllerLog.print(`The controller is now ready to remove nodes`);
            this._exclusionOptions = options;
            this.emit("exclusion started");
            return true;
        }
        catch (e) {
            this.setInclusionState(Inclusion_1.InclusionState.Idle);
            if ((0, core_1.isZWaveError)(e) &&
                e.code === core_1.ZWaveErrorCodes.Controller_CallbackNOK) {
                this.driver.controllerLog.print(`Starting the exclusion failed`, "error");
                throw new core_1.ZWaveError("The exclusion could not be started.", core_1.ZWaveErrorCodes.Controller_ExclusionFailed);
            }
            throw e;
        }
    }
    /**
     * Is used internally to stop an active exclusion process without waiting for confirmation
     * @internal
     */
    async stopExclusionNoCallback() {
        await this.driver.sendMessage(new RemoveNodeFromNetworkRequest_1.RemoveNodeFromNetworkRequest(this.driver, {
            callbackId: 0,
            removeNodeType: RemoveNodeFromNetworkRequest_1.RemoveNodeType.Stop,
            highPower: true,
            networkWide: true,
        }));
        this.driver.controllerLog.print(`the exclusion process was stopped`);
        this.emit("exclusion stopped");
    }
    /**
     * Stops an active exclusion process. Resolves to true when the controller leaves exclusion mode,
     * and false if the inclusion was not active.
     */
    async stopExclusion() {
        if (this._inclusionState !== Inclusion_1.InclusionState.Excluding) {
            return false;
        }
        this.driver.controllerLog.print(`stopping exclusion process...`);
        try {
            // kick off the inclusion process
            await this.driver.sendMessage(new RemoveNodeFromNetworkRequest_1.RemoveNodeFromNetworkRequest(this.driver, {
                removeNodeType: RemoveNodeFromNetworkRequest_1.RemoveNodeType.Stop,
                highPower: true,
                networkWide: true,
            }));
            this.driver.controllerLog.print(`the exclusion process was stopped`);
            this.emit("exclusion stopped");
            this.setInclusionState(Inclusion_1.InclusionState.Idle);
            return true;
        }
        catch (e) {
            if ((0, core_1.isZWaveError)(e) &&
                e.code === core_1.ZWaveErrorCodes.Controller_CallbackNOK) {
                this.driver.controllerLog.print(`Stopping the exclusion failed`, "error");
                throw new core_1.ZWaveError("The exclusion could not be stopped.", core_1.ZWaveErrorCodes.Controller_ExclusionFailed);
            }
            throw e;
        }
    }
    /** @internal */
    async handleApplicationUpdateRequest(msg) {
        const nodeId = msg.getNodeId();
        let node;
        if (nodeId != undefined) {
            node = this.nodes.get(nodeId);
        }
        if (msg instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequestNodeInfoReceived) {
            if (node) {
                this.driver.controllerLog.logNode(node.id, {
                    message: "Received updated node info",
                    direction: "inbound",
                });
                node.updateNodeInfo(msg.nodeInformation);
                // Tell the send thread that we received a NIF from the node
                this.driver["sendThread"].send({
                    type: "NIF",
                    nodeId: node.id,
                });
                if (node.canSleep &&
                    node.supportsCC(core_1.CommandClasses["Wake Up"])) {
                    // In case this is a sleeping node and there are no messages in the queue, the node may go back to sleep very soon
                    this.driver.debounceSendNodeToSleep(node);
                }
                return;
            }
        }
        else if (msg instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequestSmartStartHomeIDReceived) {
            // the controller is in Smart Start learn mode and a node requests inclusion via Smart Start
            this.driver.controllerLog.print("Received Smart Start inclusion request");
            if (this.inclusionState !== Inclusion_1.InclusionState.Idle &&
                this.inclusionState !== Inclusion_1.InclusionState.SmartStart) {
                this.driver.controllerLog.print("Controller is busy and cannot handle this inclusion request right now...");
                return;
            }
            // Check if the node is on the provisioning list
            const provisioningEntry = this.provisioningList.find((entry) => (0, core_1.nwiHomeIdFromDSK)((0, core_1.dskFromString)(entry.dsk)).equals(msg.nwiHomeId));
            if (!provisioningEntry) {
                this.driver.controllerLog.print("NWI Home ID not found in provisioning list, ignoring request...");
                return;
            }
            else if (provisioningEntry.status === Inclusion_1.ProvisioningEntryStatus.Inactive) {
                this.driver.controllerLog.print("The provisioning entry for this node is inactive, ignoring request...");
                return;
            }
            this.driver.controllerLog.print("NWI Home ID found in provisioning list, including node...");
            try {
                const result = await this.beginInclusionSmartStart(provisioningEntry);
                if (!result) {
                    this.driver.controllerLog.print("Smart Start inclusion could not be started", "error");
                }
            }
            catch (e) {
                this.driver.controllerLog.print(`Smart Start inclusion could not be started: ${(0, shared_1.getErrorMessage)(e)}`, "error");
            }
        }
        else if (msg instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequestNodeRemoved) {
            // A node was removed by another controller
            const node = this.nodes.get(msg.nodeId);
            if (node) {
                this.driver.controllerLog.logNode(node.id, "was removed from the network by another controller");
                this.emit("node removed", node, false);
            }
        }
        else if (msg instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequestNodeAdded) {
            // A node was included by another controller
            const nodeId = msg.nodeId;
            const nodeInfo = msg.nodeInformation;
            this.setInclusionState(Inclusion_1.InclusionState.Busy);
            const deviceClass = new DeviceClass_1.DeviceClass(this.driver.configManager, nodeInfo.basicDeviceClass, nodeInfo.genericDeviceClass, nodeInfo.specificDeviceClass);
            const newNode = new Node_1.ZWaveNode(nodeId, this.driver, deviceClass, nodeInfo.supportedCCs, undefined, 
            // Create an empty value DB and specify that it contains no values
            // to avoid indexing the existing values
            this.createValueDBForNode(nodeId, new Set()));
            this._nodes.set(nodeId, newNode);
            this.emit("node found", {
                id: nodeId,
                deviceClass,
                supportedCCs: nodeInfo.supportedCCs,
            });
            this.driver.controllerLog.print(`Node ${newNode.id} was included by another controller:
basic device class:    ${newNode.deviceClass?.basic.label}
generic device class:  ${newNode.deviceClass?.generic.label}
specific device class: ${newNode.deviceClass?.specific.label}
supported CCs: ${nodeInfo.supportedCCs
                .map((cc) => `\n  · ${core_1.CommandClasses[cc]} (${(0, shared_1.num2hex)(cc)})`)
                .join("")}`);
            this.driver.controllerLog.logNode(nodeId, "Waiting for initiate command to bootstrap node...");
            // Handle inclusion in the background
            process.nextTick(async () => {
                // If an Inclusion Controller that does not support the Inclusion Controller Command Class includes a
                // new node in a network, the SIS will never receive an Inclusion Controller Initiate Command. If no
                // Initiate Command has been received approximately 10 seconds after a new node has been added to a
                // network, the SIS SHOULD start interviewing the newly included node
                const initiate = await this.driver
                    .waitForCommand((cc) => cc instanceof cc_1.InclusionControllerCCInitiate &&
                    cc.isSinglecast() &&
                    cc.includedNodeId === nodeId &&
                    cc.step === cc_1.InclusionControllerStep.ProxyInclusion, 10000)
                    .catch(() => undefined);
                // Assume the device is alive
                // If it is actually a sleeping device, it will be marked as such later
                newNode.markAsAlive();
                let inclCtrlr;
                let bootstrapFailure;
                if (initiate) {
                    inclCtrlr = this.nodes.getOrThrow(initiate.nodeId);
                    this.driver.controllerLog.logNode(nodeId, `Initiate command received from node ${inclCtrlr.id}`);
                    // Inclusion is handled by the inclusion controller, which (hopefully) sets the SUC return route
                    newNode.hasSUCReturnRoute = true;
                    // SIS, A, MUST request a Node Info Frame from Joining Node, B
                    const requestedNodeInfo = await newNode
                        .requestNodeInfo()
                        .catch(() => undefined);
                    if (requestedNodeInfo)
                        newNode.updateNodeInfo(requestedNodeInfo);
                    // Perform S0/S2 bootstrapping
                    bootstrapFailure = await this.proxyBootstrap(newNode, inclCtrlr);
                }
                else {
                    // No command received, bootstrap node by ourselves
                    this.driver.controllerLog.logNode(nodeId, "no initiate command received, bootstrapping node...");
                    // Assign SUC return route to make sure the node knows where to get its routes from
                    newNode.hasSUCReturnRoute = await this.assignSUCReturnRoute(newNode.id);
                    // Include using the default inclusion strategy:
                    // * Use S2 if possible,
                    // * only use S0 if necessary,
                    // * use no encryption otherwise
                    if (newNode.supportsCC(core_1.CommandClasses["Security 2"])) {
                        bootstrapFailure = await this.secureBootstrapS2(newNode);
                        if (bootstrapFailure == undefined) {
                            const actualSecurityClass = newNode.getHighestSecurityClass();
                            if (actualSecurityClass == undefined ||
                                actualSecurityClass <
                                    core_1.SecurityClass.S2_Unauthenticated) {
                                bootstrapFailure =
                                    Inclusion_1.SecurityBootstrapFailure.Unknown;
                            }
                        }
                    }
                    else if (newNode.supportsCC(core_1.CommandClasses.Security) &&
                        (deviceClass.specific ?? deviceClass.generic)
                            .requiresSecurity) {
                        bootstrapFailure = await this.secureBootstrapS0(newNode);
                        if (bootstrapFailure == undefined) {
                            const actualSecurityClass = newNode.getHighestSecurityClass();
                            if (actualSecurityClass == undefined ||
                                actualSecurityClass < core_1.SecurityClass.S0_Legacy) {
                                bootstrapFailure =
                                    Inclusion_1.SecurityBootstrapFailure.Unknown;
                            }
                        }
                    }
                    else {
                        // Remember that no security classes were granted
                        for (const secClass of core_1.securityClassOrder) {
                            newNode.securityClasses.set(secClass, false);
                        }
                    }
                }
                // Bootstrap the node's lifelines, so it knows where the controller is
                await this.bootstrapLifelineAndWakeup(newNode);
                // We're done adding this node, notify listeners
                const result = bootstrapFailure != undefined
                    ? {
                        lowSecurity: true,
                        lowSecurityReason: bootstrapFailure,
                    }
                    : { lowSecurity: false };
                this.setInclusionState(Inclusion_1.InclusionState.Idle);
                this.emit("node added", newNode, result);
                if (inclCtrlr && initiate) {
                    const inclCtrlrId = inclCtrlr.id;
                    const step = initiate.step;
                    newNode.once("ready", () => {
                        this.driver.controllerLog.logNode(nodeId, `Notifying node ${inclCtrlrId} of finished inclusion`);
                        void inclCtrlr.commandClasses["Inclusion Controller"]
                            .completeStep(step, cc_1.InclusionControllerStatus.OK)
                            // eslint-disable-next-line @typescript-eslint/no-empty-function
                            .catch(() => { });
                    });
                }
            });
        }
    }
    /**
     * @internal
     * Handles replace requests from an inclusion controller
     */
    handleInclusionControllerCCInitiateReplace(initiate) {
        if (initiate.step !== cc_1.InclusionControllerStep.ProxyInclusionReplace) {
            throw new core_1.ZWaveError("Expected an inclusion controller replace request, but got a different step", core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        this.setInclusionState(Inclusion_1.InclusionState.Busy);
        const inclCtrlr = this.nodes.getOrThrow(initiate.nodeId);
        const replacedNodeId = initiate.includedNodeId;
        const oldNode = this.nodes.get(replacedNodeId);
        if (oldNode) {
            this.emit("node removed", oldNode, true);
            this._nodes.delete(oldNode.id);
        }
        // Create a fresh node instance and forget the old one
        const newNode = new Node_1.ZWaveNode(replacedNodeId, this.driver, undefined, undefined, undefined, 
        // Create an empty value DB and specify that it contains no values
        // to avoid indexing the existing values
        this.createValueDBForNode(replacedNodeId, new Set()));
        this._nodes.set(newNode.id, newNode);
        this.emit("node found", {
            id: newNode.id,
        });
        // Assume the device is alive
        // If it is actually a sleeping device, it will be marked as such later
        newNode.markAsAlive();
        // Inclusion is handled by the inclusion controller, which (hopefully) sets the SUC return route
        newNode.hasSUCReturnRoute = true;
        // Handle communication with the node in the background
        process.nextTick(async () => {
            // SIS, A, MUST request a Node Info Frame from Joining Node, B
            const requestedNodeInfo = await newNode
                .requestNodeInfo()
                .catch(() => undefined);
            if (requestedNodeInfo) {
                newNode.updateNodeInfo(requestedNodeInfo);
                // TODO: Check if this stuff works for a normal replace too
                const deviceClass = new DeviceClass_1.DeviceClass(this.driver.configManager, requestedNodeInfo.basicDeviceClass, requestedNodeInfo.genericDeviceClass, requestedNodeInfo.specificDeviceClass);
                newNode["applyDeviceClass"](deviceClass);
            }
            // Perform S0/S2 bootstrapping
            const bootstrapFailure = await this.proxyBootstrap(newNode, inclCtrlr);
            // Bootstrap the node's lifelines, so it knows where the controller is
            await this.bootstrapLifelineAndWakeup(newNode);
            // We're done adding this node, notify listeners
            const result = bootstrapFailure != undefined
                ? {
                    lowSecurity: true,
                    lowSecurityReason: bootstrapFailure,
                }
                : { lowSecurity: false };
            this.setInclusionState(Inclusion_1.InclusionState.Idle);
            this.emit("node added", newNode, result);
            // And notify the inclusion controller after we're done interviewing
            newNode.once("ready", () => {
                this.driver.controllerLog.logNode(inclCtrlr.nodeId, `Notifying inclusion controller of finished inclusion`);
                void inclCtrlr.commandClasses["Inclusion Controller"]
                    .completeStep(initiate.step, cc_1.InclusionControllerStatus.OK)
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    .catch(() => { });
            });
        });
    }
    /**
     * Handles bootstrapping the security keys for a node that was included by an inclusion controller
     */
    async proxyBootstrap(newNode, inclCtrlr) {
        // This part is to be done before the interview
        const deviceClass = newNode.deviceClass;
        let bootstrapFailure;
        // Include using the default inclusion strategy:
        // * Use S2 if possible,
        // * only use S0 if necessary,
        // * use no encryption otherwise
        if (newNode.supportsCC(core_1.CommandClasses["Security 2"])) {
            bootstrapFailure = await this.secureBootstrapS2(newNode);
            if (bootstrapFailure == undefined) {
                const actualSecurityClass = newNode.getHighestSecurityClass();
                if (actualSecurityClass == undefined ||
                    actualSecurityClass < core_1.SecurityClass.S2_Unauthenticated) {
                    bootstrapFailure = Inclusion_1.SecurityBootstrapFailure.Unknown;
                }
            }
        }
        else if (newNode.supportsCC(core_1.CommandClasses.Security) &&
            (deviceClass.specific ?? deviceClass.generic).requiresSecurity) {
            // S0 bootstrapping is deferred to the inclusion controller
            this.driver.controllerLog.logNode(newNode.id, `Waiting for node ${inclCtrlr.id} to perform S0 bootstrapping...`);
            await inclCtrlr.commandClasses["Inclusion Controller"].initiateStep(newNode.id, cc_1.InclusionControllerStep.S0Inclusion);
            // Wait 60s for the S0 bootstrapping to complete
            const s0result = await this.driver
                .waitForCommand((cc) => cc.nodeId === inclCtrlr.id &&
                cc instanceof cc_1.InclusionControllerCCComplete &&
                cc.step === cc_1.InclusionControllerStep.S0Inclusion, 60000)
                .catch(() => undefined);
            this.driver.controllerLog.logNode(newNode.id, `S0 bootstrapping ${s0result == undefined
                ? "timed out"
                : s0result.status === cc_1.InclusionControllerStatus.OK
                    ? "succeeded"
                    : "failed"}`);
            bootstrapFailure =
                s0result == undefined
                    ? Inclusion_1.SecurityBootstrapFailure.Timeout
                    : s0result.status === cc_1.InclusionControllerStatus.OK
                        ? undefined
                        : Inclusion_1.SecurityBootstrapFailure.Unknown;
            // When bootstrapping with S0, no other keys are granted
            for (const secClass of core_1.securityClassOrder) {
                if (secClass !== core_1.SecurityClass.S0_Legacy) {
                    newNode.securityClasses.set(secClass, false);
                }
            }
            // Whether the S0 key is granted depends on the result
            // received from the inclusion controller
            newNode.securityClasses.set(core_1.SecurityClass.S0_Legacy, s0result?.status === cc_1.InclusionControllerStatus.OK);
        }
        else {
            // Remember that no security classes were granted
            for (const secClass of core_1.securityClassOrder) {
                newNode.securityClasses.set(secClass, false);
            }
        }
        return bootstrapFailure;
    }
    async secureBootstrapS0(node, assumeSupported = false) {
        // When bootstrapping with S0, no other keys are granted
        for (const secClass of core_1.securityClassOrder) {
            if (secClass !== core_1.SecurityClass.S0_Legacy) {
                node.securityClasses.set(secClass, false);
            }
        }
        if (!this.driver.securityManager) {
            // Remember that the node was NOT granted the S0 security class
            node.securityClasses.set(core_1.SecurityClass.S0_Legacy, false);
            return Inclusion_1.SecurityBootstrapFailure.NoKeysConfigured;
        }
        // If security has been set up and we are allowed to include the node securely, try to do it
        try {
            // When replacing a node, we receive no NIF, so we cannot know that the Security CC is supported.
            // Querying the node info however kicks some devices out of secure inclusion mode.
            // Therefore we must assume that the node supports Security in order to support replacing a node securely
            if (assumeSupported && !node.supportsCC(core_1.CommandClasses.Security)) {
                node.addCC(core_1.CommandClasses.Security, {
                    secure: true,
                    isSupported: true,
                    version: 1,
                });
            }
            // SDS13783 - impose a 10s timeout on each message
            const api = node.commandClasses.Security.withOptions({
                expire: 10000,
            });
            // Request security scheme, because it is required by the specs
            await api.getSecurityScheme(); // ignore the result
            // Request nonce separately, so we can impose a timeout
            await api.getNonce();
            // send the network key
            await api.setNetworkKey(this.driver.securityManager.networkKey);
            if (this._includeController) {
                // Tell the controller which security scheme to use
                await api.inheritSecurityScheme();
            }
            // Remember that the node was granted the S0 security class
            node.securityClasses.set(core_1.SecurityClass.S0_Legacy, true);
        }
        catch (e) {
            let errorMessage = `Security S0 bootstrapping failed, the node was not granted the S0 security class`;
            let failure = Inclusion_1.SecurityBootstrapFailure.Unknown;
            if (!(0, core_1.isZWaveError)(e)) {
                errorMessage += `: ${e}`;
            }
            else if (e.code === core_1.ZWaveErrorCodes.Controller_MessageExpired) {
                errorMessage += ": a secure inclusion timer has elapsed.";
                failure = Inclusion_1.SecurityBootstrapFailure.Timeout;
            }
            else if (e.code !== core_1.ZWaveErrorCodes.Controller_MessageDropped &&
                e.code !== core_1.ZWaveErrorCodes.Controller_NodeTimeout) {
                errorMessage += `: ${e.message}`;
                failure = Inclusion_1.SecurityBootstrapFailure.Timeout;
            }
            this.driver.controllerLog.logNode(node.id, errorMessage, "warn");
            // Remember that the node was NOT granted the S0 security class
            node.securityClasses.set(core_1.SecurityClass.S0_Legacy, false);
            node.removeCC(core_1.CommandClasses.Security);
            return failure;
        }
    }
    /**
     * @internal
     * Returns which node is currently being bootstrapped with S2
     */
    get bootstrappingS2NodeId() {
        return this._bootstrappingS2NodeId;
    }
    cancelSecureBootstrapS2(reason) {
        if (this.cancelBootstrapS2Promise) {
            this.cancelBootstrapS2Promise.resolve(reason);
            this.cancelBootstrapS2Promise = undefined;
        }
    }
    async secureBootstrapS2(node, assumeSupported = false) {
        const unGrantSecurityClasses = () => {
            for (const secClass of core_1.securityClassOrder) {
                node.securityClasses.set(secClass, false);
            }
        };
        if (!this.driver.securityManager2) {
            // Remember that the node was NOT granted any S2 security classes
            unGrantSecurityClasses();
            return Inclusion_1.SecurityBootstrapFailure.NoKeysConfigured;
        }
        let userCallbacks;
        const inclusionOptions = this
            ._inclusionOptions;
        if ("provisioning" in inclusionOptions &&
            !!inclusionOptions.provisioning) {
            const grantedSecurityClasses = inclusionOptions.provisioning.securityClasses;
            const fullDSK = inclusionOptions.provisioning.dsk;
            // SmartStart and S2 with QR code are pre-provisioned, so we don't need to ask the user for anything
            userCallbacks = {
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                abort() { },
                grantSecurityClasses: (requested) => {
                    return Promise.resolve({
                        clientSideAuth: false,
                        securityClasses: requested.securityClasses.filter((r) => grantedSecurityClasses.includes(r)),
                    });
                },
                validateDSKAndEnterPIN: (dsk) => {
                    const pin = fullDSK.slice(0, 5);
                    // Make sure the DSK matches
                    if (pin + dsk !== fullDSK)
                        return Promise.resolve(false);
                    return Promise.resolve(pin);
                },
            };
        }
        else if ("userCallbacks" in inclusionOptions &&
            !!inclusionOptions.userCallbacks) {
            // Use the callbacks provided to this inclusion attempt
            userCallbacks = inclusionOptions.userCallbacks;
        }
        else if (this.driver.options.inclusionUserCallbacks) {
            // Use the callbacks defined in the driver options as fallback
            userCallbacks = this.driver.options.inclusionUserCallbacks;
        }
        else {
            // Cannot bootstrap S2 without user callbacks, abort.
            // Remember that the node was NOT granted any S2 security classes
            unGrantSecurityClasses();
            return Inclusion_1.SecurityBootstrapFailure.S2NoUserCallbacks;
        }
        // When replacing a node, we receive no NIF, so we cannot know that the Security CC is supported.
        // Querying the node info however kicks some devices out of secure inclusion mode.
        // Therefore we must assume that the node supports Security in order to support replacing a node securely
        if (assumeSupported && !node.supportsCC(core_1.CommandClasses["Security 2"])) {
            node.addCC(core_1.CommandClasses["Security 2"], {
                secure: true,
                isSupported: true,
                version: 1,
            });
        }
        const deleteTempKey = () => {
            // Whatever happens, no further communication needs the temporary key
            this.driver.securityManager2?.deleteNonce(node.id);
            this.driver.securityManager2?.tempKeys.delete(node.id);
        };
        // Allow canceling the bootstrapping process
        this._bootstrappingS2NodeId = node.id;
        this.cancelBootstrapS2Promise = (0, deferred_promise_1.createDeferredPromise)();
        try {
            const api = node.commandClasses["Security 2"];
            const abort = async (failType) => {
                if (failType != undefined) {
                    try {
                        await api.abortKeyExchange(failType);
                    }
                    catch {
                        // ignore
                    }
                }
                // Un-grant S2 security classes we might have granted
                unGrantSecurityClasses();
                deleteTempKey();
                // We're no longer bootstrapping
                this._bootstrappingS2NodeId = undefined;
                this.cancelBootstrapS2Promise = undefined;
            };
            const abortUser = async () => {
                setImmediate(() => {
                    try {
                        userCallbacks.abort();
                    }
                    catch {
                        // ignore errors in application callbacks
                    }
                });
                await abort(cc_1.KEXFailType.BootstrappingCanceled);
                return Inclusion_1.SecurityBootstrapFailure.UserCanceled;
            };
            // Ask the node for its desired security classes and key exchange params
            const kexParams = await api
                .withOptions({ expire: cc_1.inclusionTimeouts.TA1 })
                .getKeyExchangeParameters();
            if (!kexParams) {
                this.driver.controllerLog.logNode(node.id, {
                    message: `Security S2 bootstrapping failed: did not receive the node's desired security classes.`,
                    level: "warn",
                });
                await abort();
                return Inclusion_1.SecurityBootstrapFailure.Timeout;
            }
            // Validate the response
            // At the time of implementation, only these are defined
            if (!kexParams.supportedKEXSchemes.includes(cc_1.KEXSchemes.KEXScheme1)) {
                this.driver.controllerLog.logNode(node.id, {
                    message: `Security S2 bootstrapping failed: No supported key exchange scheme.`,
                    level: "warn",
                });
                await abort(cc_1.KEXFailType.NoSupportedScheme);
                return Inclusion_1.SecurityBootstrapFailure.ParameterMismatch;
            }
            else if (!kexParams.supportedECDHProfiles.includes(cc_1.ECDHProfiles.Curve25519)) {
                this.driver.controllerLog.logNode(node.id, {
                    message: `Security S2 bootstrapping failed: No supported ECDH profile.`,
                    level: "warn",
                });
                await abort(cc_1.KEXFailType.NoSupportedCurve);
                return Inclusion_1.SecurityBootstrapFailure.ParameterMismatch;
            }
            const supportedKeys = kexParams.requestedKeys.filter((k) => core_1.securityClassOrder.includes(k));
            if (!supportedKeys.length) {
                this.driver.controllerLog.logNode(node.id, {
                    message: `Security S2 bootstrapping failed: None of the requested security classes are supported.`,
                    level: "warn",
                });
                await abort(cc_1.KEXFailType.NoKeyMatch);
                return Inclusion_1.SecurityBootstrapFailure.ParameterMismatch;
            }
            // TODO: Validate client-side auth if requested
            const grantResult = await Promise.race([
                (0, async_1.wait)(cc_1.inclusionTimeouts.TAI1, true).then(() => false),
                userCallbacks
                    .grantSecurityClasses({
                    securityClasses: supportedKeys,
                    clientSideAuth: false,
                })
                    // ignore errors in application callbacks
                    .catch(() => false),
            ]);
            if (grantResult === false) {
                // There was a timeout or the user did not confirm the request, abort
                this.driver.controllerLog.logNode(node.id, {
                    message: `Security S2 bootstrapping failed: User rejected the requested security classes or interaction timed out.`,
                    level: "warn",
                });
                return abortUser();
            }
            const grantedKeys = supportedKeys.filter((k) => grantResult.securityClasses.includes(k));
            if (!grantedKeys.length) {
                // The user did not grant any of the requested keys
                this.driver.controllerLog.logNode(node.id, {
                    message: `Security S2 bootstrapping failed: None of the requested keys were granted by the user.`,
                    level: "warn",
                });
                return abortUser();
            }
            // Tell the node how we want the inclusion to go and grant it the keys
            // It will send its public key in response
            await api.grantKeys({
                grantedKeys,
                permitCSA: false,
                selectedECDHProfile: cc_1.ECDHProfiles.Curve25519,
                selectedKEXScheme: cc_1.KEXSchemes.KEXScheme1,
            });
            const pubKeyResponse = await this.driver.waitForCommand((cc) => cc instanceof cc_1.Security2CCPublicKeyReport ||
                cc instanceof cc_1.Security2CCKEXFail, cc_1.inclusionTimeouts.TA2);
            if (pubKeyResponse instanceof cc_1.Security2CCKEXFail ||
                pubKeyResponse.includingNode) {
                this.driver.controllerLog.logNode(node.id, {
                    message: `The joining node canceled the Security S2 bootstrapping.`,
                    direction: "inbound",
                    level: "warn",
                });
                await abort();
                return Inclusion_1.SecurityBootstrapFailure.NodeCanceled;
            }
            const nodePublicKey = pubKeyResponse.publicKey;
            // This is the starting point of the timer TAI2.
            const timerStartTAI2 = Date.now();
            // Generate ECDH key pair. We need to immediately send the other node our public key,
            // so it won't abort bootstrapping
            const keyPair = await util_1.default.promisify(crypto_1.default.generateKeyPair)("x25519");
            const publicKey = (0, core_1.decodeX25519KeyDER)(keyPair.publicKey.export({
                type: "spki",
                format: "der",
            }));
            await api.sendPublicKey(publicKey);
            // After this, the node will start sending us a KEX SET every 10 seconds.
            // We won't be able to decode it until the DSK was verified
            if (grantedKeys.includes(core_1.SecurityClass.S2_AccessControl) ||
                grantedKeys.includes(core_1.SecurityClass.S2_Authenticated)) {
                // For authenticated encryption, the DSK (first 16 bytes of the public key) is obfuscated (missing the first 2 bytes)
                // Request the user to enter the missing part as a 5-digit PIN
                const dsk = (0, core_1.dskToString)(nodePublicKey.slice(0, 16)).slice(5);
                // The time the user has to enter the PIN is limited by the timeout TAI2
                const tai2RemainingMs = cc_1.inclusionTimeouts.TAI2 - (Date.now() - timerStartTAI2);
                let pinResult;
                if ("dsk" in inclusionOptions &&
                    typeof inclusionOptions.dsk === "string" &&
                    (0, core_1.isValidDSK)(inclusionOptions.dsk)) {
                    pinResult = inclusionOptions.dsk.slice(0, 5);
                }
                else {
                    pinResult = await Promise.race([
                        (0, async_1.wait)(tai2RemainingMs, true).then(() => false),
                        userCallbacks
                            .validateDSKAndEnterPIN(dsk)
                            // ignore errors in application callbacks
                            .catch(() => false),
                    ]);
                }
                if (typeof pinResult !== "string" ||
                    !/^\d{5}$/.test(pinResult)) {
                    // There was a timeout, the user did not confirm the DSK or entered an invalid PIN
                    this.driver.controllerLog.logNode(node.id, {
                        message: `Security S2 bootstrapping failed: User rejected the DSK, entered an invalid PIN or the interaction timed out.`,
                        level: "warn",
                    });
                    return abortUser();
                }
                // Fill in the missing two bytes of the public key
                nodePublicKey.writeUInt16BE(parseInt(pinResult, 10), 0);
            }
            // After the user has verified the DSK, we can derive the shared secret
            // Z-Wave works with the "raw" keys, so this is a tad complicated
            const sharedSecret = crypto_1.default.diffieHellman({
                publicKey: crypto_1.default.createPublicKey({
                    key: (0, core_1.encodeX25519KeyDERSPKI)(nodePublicKey),
                    format: "der",
                    type: "spki",
                }),
                privateKey: keyPair.privateKey,
            });
            // Derive temporary key from ECDH key pair - this will allow us to receive the node's KEX SET commands
            const tempKeys = (0, core_1.deriveTempKeys)((0, core_1.computePRK)(sharedSecret, publicKey, nodePublicKey));
            this.driver.securityManager2.deleteNonce(node.id);
            this.driver.securityManager2.tempKeys.set(node.id, {
                keyCCM: tempKeys.tempKeyCCM,
                personalizationString: tempKeys.tempPersonalizationString,
            });
            // Now wait for the next KEXSet from the node (if there is even time left)
            const tai2RemainingMs = cc_1.inclusionTimeouts.TAI2 - (Date.now() - timerStartTAI2);
            if (tai2RemainingMs < 1) {
                this.driver.controllerLog.logNode(node.id, {
                    message: `Security S2 bootstrapping failed: a secure inclusion timer has elapsed`,
                    level: "warn",
                });
                return abortUser();
            }
            const keySetEcho = await Promise.race([
                this.driver.waitForCommand((cc) => cc instanceof cc_1.Security2CCKEXSet ||
                    cc instanceof cc_1.Security2CCKEXFail, tai2RemainingMs),
                this.cancelBootstrapS2Promise,
            ]);
            if (typeof keySetEcho === "number") {
                // The bootstrapping process was canceled - this is most likely because the PIN was incorrect
                // and the node's commands cannot be decoded
                await abort(keySetEcho);
                return Inclusion_1.SecurityBootstrapFailure.S2IncorrectPIN;
            }
            // Validate that the received command contains the correct list of keys
            if (keySetEcho instanceof cc_1.Security2CCKEXFail || !keySetEcho.echo) {
                this.driver.controllerLog.logNode(node.id, {
                    message: `The joining node canceled the Security S2 bootstrapping.`,
                    direction: "inbound",
                    level: "warn",
                });
                await abort();
                return Inclusion_1.SecurityBootstrapFailure.NodeCanceled;
            }
            else if (keySetEcho.grantedKeys.length !== grantedKeys.length ||
                !keySetEcho.grantedKeys.every((k) => grantedKeys.includes(k))) {
                this.driver.controllerLog.logNode(node.id, {
                    message: `Security S2 bootstrapping failed: Granted key mismatch.`,
                    level: "warn",
                });
                await abort(cc_1.KEXFailType.WrongSecurityLevel);
                return Inclusion_1.SecurityBootstrapFailure.S2WrongSecurityLevel;
            }
            // Confirm the keys - the node will start requesting the granted keys in response
            await api.confirmGrantedKeys({
                requestCSA: kexParams.requestCSA,
                requestedKeys: [...kexParams.requestedKeys],
                supportedECDHProfiles: [...kexParams.supportedECDHProfiles],
                supportedKEXSchemes: [...kexParams.supportedKEXSchemes],
            });
            for (let i = 0; i < grantedKeys.length; i++) {
                // Wait for the key request
                const keyRequest = await this.driver.waitForCommand((cc) => cc instanceof cc_1.Security2CCNetworkKeyGet ||
                    cc instanceof cc_1.Security2CCKEXFail, cc_1.inclusionTimeouts.TA3);
                if (keyRequest instanceof cc_1.Security2CCKEXFail) {
                    this.driver.controllerLog.logNode(node.id, {
                        message: `The joining node canceled the Security S2 bootstrapping.`,
                        direction: "inbound",
                        level: "warn",
                    });
                    await abort();
                    return Inclusion_1.SecurityBootstrapFailure.NodeCanceled;
                }
                const securityClass = keyRequest.requestedKey;
                // Ensure it was received encrypted with the temporary key
                if (!this.driver.securityManager2.hasUsedSecurityClass(node.id, core_1.SecurityClass.Temporary)) {
                    this.driver.controllerLog.logNode(node.id, {
                        message: `Security S2 bootstrapping failed: Node used wrong key to communicate.`,
                        level: "warn",
                    });
                    await abort(cc_1.KEXFailType.WrongSecurityLevel);
                    return Inclusion_1.SecurityBootstrapFailure.S2WrongSecurityLevel;
                }
                else if (!grantedKeys.includes(securityClass)) {
                    // and that the requested key is one of the granted keys
                    this.driver.controllerLog.logNode(node.id, {
                        message: `Security S2 bootstrapping failed: Node used key it was not granted.`,
                        level: "warn",
                    });
                    await abort(cc_1.KEXFailType.KeyNotGranted);
                    return Inclusion_1.SecurityBootstrapFailure.S2WrongSecurityLevel;
                }
                // Send the node the requested key
                await api.sendNetworkKey(securityClass, this.driver.securityManager2.getKeysForSecurityClass(securityClass).pnk);
                // We need to temporarily mark this security class as granted, so the following exchange will use this
                // key for decryption
                node.securityClasses.set(securityClass, true);
                // And wait for verification
                const verify = await this.driver.waitForCommand((cc) => cc instanceof cc_1.Security2CCNetworkKeyVerify ||
                    cc instanceof cc_1.Security2CCKEXFail, cc_1.inclusionTimeouts.TA4);
                if (verify instanceof cc_1.Security2CCKEXFail) {
                    this.driver.controllerLog.logNode(node.id, {
                        message: `The joining node canceled the Security S2 bootstrapping.`,
                        direction: "inbound",
                        level: "warn",
                    });
                    await abort();
                    return Inclusion_1.SecurityBootstrapFailure.NodeCanceled;
                }
                if (!this.driver.securityManager2.hasUsedSecurityClass(node.id, securityClass)) {
                    this.driver.controllerLog.logNode(node.id, {
                        message: `Security S2 bootstrapping failed: Node used wrong key to communicate.`,
                        level: "warn",
                    });
                    await abort(cc_1.KEXFailType.NoVerify);
                    return Inclusion_1.SecurityBootstrapFailure.S2WrongSecurityLevel;
                }
                // Tell the node that verification was successful. We need to reset the SPAN state
                // so the temporary key will be used again. Also we don't know in which order the node requests the keys
                // so our logic to use the highest security class for decryption might be problematic. Therefore delete the
                // security class for now.
                node.securityClasses.delete(securityClass);
                this.driver.securityManager2.deleteNonce(node.id);
                await api.confirmKeyVerification();
            }
            // After all keys were sent and verified, we need to wait for the node to confirm that it is done
            const transferEnd = await this.driver.waitForCommand((cc) => cc instanceof cc_1.Security2CCTransferEnd, cc_1.inclusionTimeouts.TA5);
            if (!transferEnd.keyRequestComplete) {
                // S2 bootstrapping failed
                this.driver.controllerLog.logNode(node.id, {
                    message: `Security S2 bootstrapping failed: Node did not confirm completion of the key exchange`,
                    level: "warn",
                });
                await abort();
                return Inclusion_1.SecurityBootstrapFailure.Timeout;
            }
            // Remember all security classes we have granted
            for (const securityClass of core_1.securityClassOrder) {
                node.securityClasses.set(securityClass, grantedKeys.includes(securityClass));
            }
            // Remember the DSK (first 16 bytes of the public key)
            node.dsk = nodePublicKey.slice(0, 16);
            this.driver.controllerLog.logNode(node.id, {
                message: `Security S2 bootstrapping successful with these security classes:${[
                    ...node.securityClasses.entries(),
                ]
                    .filter(([, v]) => v)
                    .map(([k]) => `\n· ${(0, shared_1.getEnumMemberName)(core_1.SecurityClass, k)}`)
                    .join("")}`,
            });
            // success 🎉
        }
        catch (e) {
            let errorMessage = `Security S2 bootstrapping failed, the node was not granted any S2 security class`;
            if (!(0, core_1.isZWaveError)(e)) {
                errorMessage += `: ${e}`;
            }
            else if (e.code === core_1.ZWaveErrorCodes.Controller_MessageExpired) {
                errorMessage += ": a secure inclusion timer has elapsed.";
            }
            else if (e.code !== core_1.ZWaveErrorCodes.Controller_MessageDropped &&
                e.code !== core_1.ZWaveErrorCodes.Controller_NodeTimeout) {
                errorMessage += `: ${e.message}`;
            }
            this.driver.controllerLog.logNode(node.id, errorMessage, "warn");
            // Remember that the node was NOT granted any S2 security classes
            unGrantSecurityClasses();
            node.removeCC(core_1.CommandClasses["Security 2"]);
        }
        finally {
            // Whatever happens, no further communication needs the temporary key
            deleteTempKey();
            // And we're no longer bootstrapping
            this._bootstrappingS2NodeId = undefined;
            this.cancelBootstrapS2Promise = undefined;
        }
    }
    /** Ensures that the node knows where to reach the controller */
    async bootstrapLifelineAndWakeup(node) {
        // If the node was bootstrapped with S2, all these requests must happen securely
        if ((0, core_1.securityClassIsS2)(node.getHighestSecurityClass())) {
            for (const cc of [
                core_1.CommandClasses["Wake Up"],
                core_1.CommandClasses.Association,
                core_1.CommandClasses["Multi Channel Association"],
                core_1.CommandClasses.Version,
            ]) {
                if (node.supportsCC(cc)) {
                    node.addCC(cc, { secure: true });
                }
            }
        }
        if (node.supportsCC(core_1.CommandClasses["Z-Wave Plus Info"])) {
            // SDS11846: The Z-Wave+ lifeline must be assigned to a node as the very first thing
            if (node.supportsCC(core_1.CommandClasses.Association) ||
                node.supportsCC(core_1.CommandClasses["Multi Channel Association"])) {
                this.driver.controllerLog.logNode(node.id, {
                    message: `Configuring Z-Wave+ Lifeline association...`,
                    direction: "none",
                });
                const ownNodeId = this.driver.controller.ownNodeId;
                try {
                    if (node.supportsCC(core_1.CommandClasses.Association)) {
                        await node.commandClasses.Association.addNodeIds(1, ownNodeId);
                    }
                    else {
                        await node.commandClasses["Multi Channel Association"].addDestinations({
                            groupId: 1,
                            endpoints: [{ nodeId: ownNodeId, endpoint: 0 }],
                        });
                    }
                    // After setting the association, make sure the node knows how to reach us
                    await this.assignReturnRoute(node.id, ownNodeId);
                }
                catch (e) {
                    if ((0, core_1.isTransmissionError)(e) || (0, core_1.isRecoverableZWaveError)(e)) {
                        this.driver.controllerLog.logNode(node.id, {
                            message: `Failed to configure Z-Wave+ Lifeline association: ${e.message}`,
                            direction: "none",
                            level: "warn",
                        });
                    }
                    else {
                        throw e;
                    }
                }
            }
            else {
                this.driver.controllerLog.logNode(node.id, {
                    message: `Cannot configure Z-Wave+ Lifeline association: Node does not support associations...`,
                    direction: "none",
                    level: "warn",
                });
            }
        }
        if (node.supportsCC(core_1.CommandClasses["Wake Up"])) {
            try {
                // Query the version, so we can setup the wakeup destination correctly.
                let supportedVersion;
                if (node.supportsCC(core_1.CommandClasses.Version)) {
                    supportedVersion =
                        await node.commandClasses.Version.getCCVersion(core_1.CommandClasses["Wake Up"]);
                }
                // If querying the version can't be done, we should at least assume that it supports V1
                supportedVersion ?? (supportedVersion = 1);
                if (supportedVersion > 0) {
                    node.addCC(core_1.CommandClasses["Wake Up"], {
                        version: supportedVersion,
                    });
                    const instance = node.createCCInstance(core_1.CommandClasses["Wake Up"]);
                    await instance.interview(this.driver);
                }
            }
            catch (e) {
                if ((0, core_1.isTransmissionError)(e) || (0, core_1.isRecoverableZWaveError)(e)) {
                    this.driver.controllerLog.logNode(node.id, {
                        message: `Cannot configure wakeup destination: ${e.message}`,
                        direction: "none",
                        level: "warn",
                    });
                }
                else {
                    // we want to pass all other errors through
                    throw e;
                }
            }
        }
    }
    /**
     * Is called when an AddNode request is received from the controller.
     * Handles and controls the inclusion process.
     */
    async handleAddNodeStatusReport(msg) {
        this.driver.controllerLog.print(`handling add node request (status = ${AddNodeToNetworkRequest_1.AddNodeStatus[msg.status]})`);
        if (this._inclusionState !== Inclusion_1.InclusionState.Including ||
            this._inclusionOptions == undefined) {
            this.driver.controllerLog.print(`  inclusion is NOT active, ignoring it...`);
            return true; // Don't invoke any more handlers
        }
        switch (msg.status) {
            case AddNodeToNetworkRequest_1.AddNodeStatus.Failed:
                // This code is handled elsewhere for starting the inclusion, so this means
                // that adding a node failed
                this.driver.controllerLog.print(`Adding the node failed`, "error");
                this.emit("inclusion failed");
                // in any case, stop the inclusion process so we don't accidentally add another node
                try {
                    await this.stopInclusion();
                }
                catch {
                    /* ok */
                }
                return true; // Don't invoke any more handlers
            case AddNodeToNetworkRequest_1.AddNodeStatus.AddingController:
                this._includeController = true;
            // fall through!
            case AddNodeToNetworkRequest_1.AddNodeStatus.AddingSlave: {
                // this is called when a new node is added
                this._nodePendingInclusion = new Node_1.ZWaveNode(msg.statusContext.nodeId, this.driver, new DeviceClass_1.DeviceClass(this.driver.configManager, msg.statusContext.basicDeviceClass, msg.statusContext.genericDeviceClass, msg.statusContext.specificDeviceClass), msg.statusContext.supportedCCs, msg.statusContext.controlledCCs, 
                // Create an empty value DB and specify that it contains no values
                // to avoid indexing the existing values
                this.createValueDBForNode(msg.statusContext.nodeId, new Set()));
                // TODO: According to INS13954, there are several more steps and different timeouts when including a controller
                // For now do the absolute minimum - that is include the controller
                return true; // Don't invoke any more handlers
            }
            case AddNodeToNetworkRequest_1.AddNodeStatus.ProtocolDone: {
                // this is called after a new node is added
                // stop the inclusion process so we don't accidentally add another node
                let nodeId;
                try {
                    nodeId = await this.finishInclusion();
                }
                catch {
                    // ignore the error
                }
                // It is recommended to send another STOP command to the controller
                try {
                    await this.stopInclusionNoCallback();
                }
                catch {
                    // ignore the error
                }
                if (!nodeId || !this._nodePendingInclusion) {
                    // The inclusion did not succeed
                    this.setInclusionState(Inclusion_1.InclusionState.Idle);
                    this._nodePendingInclusion = undefined;
                    return true;
                }
                else if (nodeId === core_1.NODE_ID_BROADCAST) {
                    // No idea how this can happen but it dit at least once
                    this.driver.controllerLog.print(`Cannot add a node with the Node ID ${core_1.NODE_ID_BROADCAST}, aborting...`, "warn");
                    this.setInclusionState(Inclusion_1.InclusionState.Idle);
                    this._nodePendingInclusion = undefined;
                    return true;
                }
                // We're technically done with the inclusion but should not include
                // anything else until the node has been bootstrapped
                this.setInclusionState(Inclusion_1.InclusionState.Busy);
                // Inclusion is now completed, bootstrap the node
                const newNode = this._nodePendingInclusion;
                const supportedCCs = [
                    ...newNode.implementedCommandClasses.entries(),
                ]
                    .filter(([, info]) => info.isSupported)
                    .map(([cc]) => cc);
                const controlledCCs = [
                    ...newNode.implementedCommandClasses.entries(),
                ]
                    .filter(([, info]) => info.isControlled)
                    .map(([cc]) => cc);
                this.emit("node found", {
                    id: newNode.id,
                    deviceClass: newNode.deviceClass,
                    supportedCCs,
                    controlledCCs,
                });
                this.driver.controllerLog.print(`finished adding node ${newNode.id}:
  basic device class:    ${newNode.deviceClass?.basic.label}
  generic device class:  ${newNode.deviceClass?.generic.label}
  specific device class: ${newNode.deviceClass?.specific.label}
  supported CCs: ${supportedCCs
                    .map((cc) => `\n  · ${core_1.CommandClasses[cc]} (${(0, shared_1.num2hex)(cc)})`)
                    .join("")}
  controlled CCs: ${controlledCCs
                    .map((cc) => `\n  · ${core_1.CommandClasses[cc]} (${(0, shared_1.num2hex)(cc)})`)
                    .join("")}`);
                // remember the node
                this._nodes.set(newNode.id, newNode);
                this._nodePendingInclusion = undefined;
                // We're communicating with the device, so assume it is alive
                // If it is actually a sleeping device, it will be marked as such later
                newNode.markAsAlive();
                // Assign SUC return route to make sure the node knows where to get its routes from
                newNode.hasSUCReturnRoute = await this.assignSUCReturnRoute(newNode.id);
                const opts = this._inclusionOptions;
                // The default inclusion strategy is: Use S2 if possible, only use S0 if necessary, use no encryption otherwise
                let bootstrapFailure;
                if (newNode.supportsCC(core_1.CommandClasses["Security 2"]) &&
                    (opts.strategy === Inclusion_1.InclusionStrategy.Default ||
                        opts.strategy === Inclusion_1.InclusionStrategy.Security_S2 ||
                        opts.strategy === Inclusion_1.InclusionStrategy.SmartStart)) {
                    bootstrapFailure = await this.secureBootstrapS2(newNode);
                    if (bootstrapFailure == undefined) {
                        const actualSecurityClass = newNode.getHighestSecurityClass();
                        if (actualSecurityClass == undefined ||
                            actualSecurityClass <
                                core_1.SecurityClass.S2_Unauthenticated) {
                            bootstrapFailure = Inclusion_1.SecurityBootstrapFailure.Unknown;
                        }
                    }
                }
                else if (newNode.supportsCC(core_1.CommandClasses.Security) &&
                    (opts.strategy === Inclusion_1.InclusionStrategy.Security_S0 ||
                        (opts.strategy === Inclusion_1.InclusionStrategy.Default &&
                            (opts.forceSecurity ||
                                (newNode.deviceClass?.specific ??
                                    newNode.deviceClass?.generic)?.requiresSecurity)))) {
                    bootstrapFailure = await this.secureBootstrapS0(newNode);
                    if (bootstrapFailure == undefined) {
                        const actualSecurityClass = newNode.getHighestSecurityClass();
                        if (actualSecurityClass == undefined ||
                            actualSecurityClass < core_1.SecurityClass.S0_Legacy) {
                            bootstrapFailure = Inclusion_1.SecurityBootstrapFailure.Unknown;
                        }
                    }
                }
                else {
                    // Remember that no security classes were granted
                    for (const secClass of core_1.securityClassOrder) {
                        newNode.securityClasses.set(secClass, false);
                    }
                }
                this._includeController = false;
                // Bootstrap the node's lifelines, so it knows where the controller is
                await this.bootstrapLifelineAndWakeup(newNode);
                // We're done adding this node, notify listeners
                const result = bootstrapFailure != undefined
                    ? {
                        lowSecurity: true,
                        lowSecurityReason: bootstrapFailure,
                    }
                    : { lowSecurity: false };
                this.setInclusionState(Inclusion_1.InclusionState.Idle);
                this.emit("node added", newNode, result);
                return true; // Don't invoke any more handlers
            }
        }
        // not sure what to do with this message
        return false;
    }
    /**
     * Is called when an ReplaceFailed request is received from the controller.
     * Handles and controls the replace process.
     */
    async handleReplaceNodeStatusReport(msg) {
        this.driver.controllerLog.print(`handling replace node request (status = ${ReplaceFailedNodeRequest_1.ReplaceFailedNodeStatus[msg.replaceStatus]})`);
        if (this._inclusionOptions == undefined) {
            this.driver.controllerLog.print(`  currently NOT replacing a node, ignoring it...`);
            return true; // Don't invoke any more handlers
        }
        switch (msg.replaceStatus) {
            case ReplaceFailedNodeRequest_1.ReplaceFailedNodeStatus.NodeOK:
                this.setInclusionState(Inclusion_1.InclusionState.Idle);
                this._replaceFailedPromise?.reject(new core_1.ZWaveError(`The node could not be replaced because it has responded`, core_1.ZWaveErrorCodes.ReplaceFailedNode_NodeOK));
                break;
            case ReplaceFailedNodeRequest_1.ReplaceFailedNodeStatus.FailedNodeReplaceFailed:
                this.setInclusionState(Inclusion_1.InclusionState.Idle);
                this._replaceFailedPromise?.reject(new core_1.ZWaveError(`The failed node has not been replaced`, core_1.ZWaveErrorCodes.ReplaceFailedNode_Failed));
                break;
            case ReplaceFailedNodeRequest_1.ReplaceFailedNodeStatus.FailedNodeReplace:
                // failed node is now ready to be replaced and controller is ready to add a new
                // node with the nodeID of the failed node
                this.driver.controllerLog.print(`The failed node is ready to be replaced, inclusion started...`);
                this.emit("inclusion started", 
                // TODO: Remove first parameter in next major version
                this._inclusionOptions.strategy !==
                    Inclusion_1.InclusionStrategy.Insecure, this._inclusionOptions.strategy);
                this.setInclusionState(Inclusion_1.InclusionState.Including);
                this._replaceFailedPromise?.resolve(true);
                // stop here, don't emit inclusion failed
                return true;
            case ReplaceFailedNodeRequest_1.ReplaceFailedNodeStatus.FailedNodeReplaceDone:
                this.driver.controllerLog.print(`The failed node was replaced`);
                this.emit("inclusion stopped");
                if (this._nodePendingReplace) {
                    this.emit("node removed", this._nodePendingReplace, true);
                    this._nodes.delete(this._nodePendingReplace.id);
                    // We're technically done with the replacing but should not include
                    // anything else until the node has been bootstrapped
                    this.setInclusionState(Inclusion_1.InclusionState.Busy);
                    // Create a fresh node instance and forget the old one
                    const newNode = new Node_1.ZWaveNode(this._nodePendingReplace.id, this.driver, undefined, undefined, undefined, 
                    // Create an empty value DB and specify that it contains no values
                    // to avoid indexing the existing values
                    this.createValueDBForNode(this._nodePendingReplace.id, new Set()));
                    this._nodePendingReplace = undefined;
                    this._nodes.set(newNode.id, newNode);
                    this.emit("node found", {
                        id: newNode.id,
                    });
                    // We're communicating with the device, so assume it is alive
                    // If it is actually a sleeping device, it will be marked as such later
                    newNode.markAsAlive();
                    // Assign SUC return route to make sure the node knows where to get its routes from
                    newNode.hasSUCReturnRoute = await this.assignSUCReturnRoute(newNode.id);
                    // Try perform the security bootstrap process. When replacing a node, we don't know any supported CCs
                    // yet, so we need to trust the chosen inclusion strategy.
                    const strategy = this._inclusionOptions.strategy;
                    let bootstrapFailure;
                    if (strategy === Inclusion_1.InclusionStrategy.Security_S2) {
                        bootstrapFailure = await this.secureBootstrapS2(newNode, true);
                        if (bootstrapFailure == undefined) {
                            const actualSecurityClass = newNode.getHighestSecurityClass();
                            if (actualSecurityClass == undefined ||
                                actualSecurityClass <
                                    core_1.SecurityClass.S2_Unauthenticated) {
                                bootstrapFailure =
                                    Inclusion_1.SecurityBootstrapFailure.Unknown;
                            }
                        }
                    }
                    else if (strategy === Inclusion_1.InclusionStrategy.Security_S0) {
                        bootstrapFailure = await this.secureBootstrapS0(newNode, true);
                        if (bootstrapFailure == undefined) {
                            const actualSecurityClass = newNode.getHighestSecurityClass();
                            if (actualSecurityClass == undefined ||
                                actualSecurityClass < core_1.SecurityClass.S0_Legacy) {
                                bootstrapFailure =
                                    Inclusion_1.SecurityBootstrapFailure.Unknown;
                            }
                        }
                    }
                    else {
                        // Remember that no security classes were granted
                        for (const secClass of core_1.securityClassOrder) {
                            newNode.securityClasses.set(secClass, false);
                        }
                    }
                    // Bootstrap the node's lifelines, so it knows where the controller is
                    await this.bootstrapLifelineAndWakeup(newNode);
                    // We're done adding this node, notify listeners. This also kicks off the node interview
                    const result = bootstrapFailure != undefined
                        ? {
                            lowSecurity: true,
                            lowSecurityReason: bootstrapFailure,
                        }
                        : { lowSecurity: false };
                    this.setInclusionState(Inclusion_1.InclusionState.Idle);
                    this.emit("node added", newNode, result);
                }
                // stop here, don't emit inclusion failed
                return true;
        }
        this.emit("inclusion failed");
        return false; // Don't invoke any more handlers
    }
    /**
     * Is called when a RemoveNode request is received from the controller.
     * Handles and controls the exclusion process.
     */
    async handleRemoveNodeStatusReport(msg) {
        this.driver.controllerLog.print(`handling remove node request (status = ${RemoveNodeFromNetworkRequest_1.RemoveNodeStatus[msg.status]})`);
        if (this._inclusionState !== Inclusion_1.InclusionState.Excluding) {
            this.driver.controllerLog.print(`  exclusion is NOT active, ignoring it...`);
            return true; // Don't invoke any more handlers
        }
        switch (msg.status) {
            case RemoveNodeFromNetworkRequest_1.RemoveNodeStatus.Failed:
                // This code is handled elsewhere for starting the exclusion, so this means
                // that removing a node failed
                this.driver.controllerLog.print(`Removing the node failed`, "error");
                this.emit("exclusion failed");
                // in any case, stop the exclusion process so we don't accidentally remove another node
                try {
                    await this.stopExclusion();
                }
                catch {
                    /* ok */
                }
                return true; // Don't invoke any more handlers
            case RemoveNodeFromNetworkRequest_1.RemoveNodeStatus.RemovingSlave:
            case RemoveNodeFromNetworkRequest_1.RemoveNodeStatus.RemovingController: {
                // this is called when a node is removed
                this._nodePendingExclusion = this.nodes.get(msg.statusContext.nodeId);
                return true; // Don't invoke any more handlers
            }
            case RemoveNodeFromNetworkRequest_1.RemoveNodeStatus.Done: {
                // this is called when the exclusion was completed
                // stop the exclusion process so we don't accidentally remove another node
                try {
                    await this.stopExclusionNoCallback();
                }
                catch {
                    /* ok */
                }
                if (!this._nodePendingExclusion) {
                    // The exclusion did not succeed
                    this.setInclusionState(Inclusion_1.InclusionState.Idle);
                    return true;
                }
                const nodeId = this._nodePendingExclusion.id;
                this.driver.controllerLog.print(`Node ${nodeId} was removed`);
                // Avoid automatic re-inclusion using SmartStart if desired
                switch (this._exclusionOptions?.strategy) {
                    case Inclusion_1.ExclusionStrategy.Unprovision:
                        this.unprovisionSmartStartNode(nodeId);
                        break;
                    case Inclusion_1.ExclusionStrategy.DisableProvisioningEntry: {
                        const entry = this.getProvisioningEntryInternal(nodeId);
                        if (entry) {
                            entry.status = Inclusion_1.ProvisioningEntryStatus.Inactive;
                            this.provisionSmartStartNode(entry);
                        }
                        break;
                    }
                }
                this._exclusionOptions = undefined;
                // notify listeners
                this.emit("node removed", this._nodePendingExclusion, false);
                // and forget the node
                this._nodes.delete(nodeId);
                this._nodePendingExclusion = undefined;
                this.setInclusionState(Inclusion_1.InclusionState.Idle);
                return true; // Don't invoke any more handlers
            }
        }
        // not sure what to do with this message
        return false;
    }
    /**
     * Performs a healing process for all alive nodes in the network,
     * requesting updated neighbor lists and assigning fresh routes to
     * association targets.
     */
    beginHealingNetwork(options = {}) {
        // Don't start the process twice
        if (this._healNetworkActive)
            return false;
        this._healNetworkActive = true;
        options.includeSleeping ?? (options.includeSleeping = true);
        this.driver.controllerLog.print(`starting network heal${options.includeSleeping ? "" : " for mains-powered nodes"}...`);
        // Reset all nodes to "not healed"
        this._healNetworkProgress.clear();
        for (const [id, node] of this._nodes) {
            if (id === this._ownNodeId)
                continue;
            if (
            // The node is known to be dead
            node.status === _Types_1.NodeStatus.Dead ||
                // The node is assumed asleep but has never been interviewed.
                // It is most likely dead
                (node.status === _Types_1.NodeStatus.Asleep &&
                    node.interviewStage === _Types_1.InterviewStage.ProtocolInfo)) {
                // Don't heal dead nodes
                this.driver.controllerLog.logNode(id, `Skipping heal because the node is not responding.`);
                this._healNetworkProgress.set(id, "skipped");
            }
            else if (!options.includeSleeping && node.canSleep) {
                this._healNetworkProgress.set(id, "skipped");
            }
            else {
                this._healNetworkProgress.set(id, "pending");
            }
        }
        // Do the heal process in the background
        void this.healNetwork(options).catch(() => {
            /* ignore errors */
        });
        // And update the progress once at the start
        this.emit("heal network progress", new Map(this._healNetworkProgress));
        return true;
    }
    async healNetwork(options) {
        const pendingNodes = new Set([...this._healNetworkProgress]
            .filter(([, status]) => status === "pending")
            .map(([nodeId]) => nodeId));
        const todoListening = [];
        const todoSleeping = [];
        const addTodo = (nodeId) => {
            if (pendingNodes.has(nodeId)) {
                pendingNodes.delete(nodeId);
                const node = this.nodes.getOrThrow(nodeId);
                if (node.canSleep) {
                    if (options.includeSleeping) {
                        this.driver.controllerLog.logNode(nodeId, "added to healing queue for sleeping nodes");
                        todoSleeping.push(nodeId);
                    }
                }
                else {
                    this.driver.controllerLog.logNode(nodeId, "added to healing queue for listening nodes");
                    todoListening.push(nodeId);
                }
            }
        };
        // We heal outwards from the controller and start with non-sleeping nodes that are healed one by one
        try {
            const neighbors = await this.getNodeNeighbors(this._ownNodeId);
            neighbors.forEach((id) => addTodo(id));
        }
        catch {
            // ignore
        }
        const doHeal = async (nodeId) => {
            // await the heal process for each node and treat errors as a non-successful heal
            const result = await this.healNodeInternal(nodeId).catch(() => false);
            if (!this._healNetworkActive)
                return;
            // Track the success in a map
            this._healNetworkProgress.set(nodeId, result ? "done" : "failed");
            // Notify listeners about the progress
            this.emit("heal network progress", new Map(this._healNetworkProgress));
            // Figure out which nodes to heal next
            try {
                const neighbors = await this.getNodeNeighbors(nodeId);
                neighbors.forEach((id) => addTodo(id));
            }
            catch {
                // ignore
            }
        };
        // First try to heal as many nodes as possible one by one
        while (todoListening.length > 0) {
            const nodeId = todoListening.shift();
            await doHeal(nodeId);
            if (!this._healNetworkActive)
                return;
        }
        // We might end up with a few unconnected listening nodes, try to heal them too
        pendingNodes.forEach((nodeId) => addTodo(nodeId));
        while (todoListening.length > 0) {
            const nodeId = todoListening.shift();
            await doHeal(nodeId);
            if (!this._healNetworkActive)
                return;
        }
        if (options.includeSleeping) {
            // Now heal all sleeping nodes at once
            this.driver.controllerLog.print("Healing sleeping nodes in parallel. Wake them up to heal.");
            const tasks = todoSleeping.map((nodeId) => doHeal(nodeId));
            await Promise.all(tasks);
        }
        // Only emit the done event when the process wasn't stopped in the meantime
        if (this._healNetworkActive) {
            this.driver.controllerLog.print("network heal completed");
            this.emit("heal network done", new Map(this._healNetworkProgress));
        }
        else {
            this.driver.controllerLog.print("network heal aborted");
        }
        // We're done!
        this._healNetworkActive = false;
    }
    /**
     * Stops an network healing process. Resolves false if the process was not active, true otherwise.
     */
    stopHealingNetwork() {
        // don't stop it twice
        if (!this._healNetworkActive)
            return false;
        this._healNetworkActive = false;
        this.driver.controllerLog.print(`stopping network heal...`);
        // Cancel all transactions that were created by the healing process
        this.driver.rejectTransactions((t) => t.message instanceof RequestNodeNeighborUpdateMessages_1.RequestNodeNeighborUpdateRequest ||
            t.message instanceof DeleteReturnRouteMessages_1.DeleteReturnRouteRequest ||
            t.message instanceof AssignReturnRouteMessages_1.AssignReturnRouteRequest);
        return true;
    }
    /**
     * Performs a healing process for a single alive node in the network,
     * updating the neighbor list and assigning fresh routes to
     * association targets.
     *
     * Returns `true` if the process succeeded, `false` otherwise.
     */
    async healNode(nodeId) {
        const node = this.nodes.getOrThrow(nodeId);
        // Don't start the process twice
        if (this._healNetworkActive) {
            this.driver.controllerLog.logNode(nodeId, `Skipping individual node heal because another heal is in progress.`);
            return false;
        }
        this._healNetworkActive = true;
        // Don't try to heal actually dead nodes
        if (
        // The node is known to be dead
        node.status === _Types_1.NodeStatus.Dead ||
            // The node is assumed asleep but has never been interviewed.
            // It is most likely dead
            (node.status === _Types_1.NodeStatus.Asleep &&
                node.interviewStage === _Types_1.InterviewStage.ProtocolInfo)) {
            // To avoid skipping the heal when the node has a flaky connection, ping first though
            if (!(await node.ping())) {
                this.driver.controllerLog.logNode(nodeId, `Skipping heal because the node is not responding.`);
                return false;
            }
        }
        try {
            return await this.healNodeInternal(nodeId);
        }
        finally {
            this._healNetworkActive = false;
        }
    }
    async healNodeInternal(nodeId) {
        const node = this.nodes.getOrThrow(nodeId);
        // Keep battery powered nodes awake during the healing process
        // and make sure that the flag gets reset at the end
        const keepAwake = node.keepAwake;
        try {
            node.keepAwake = true;
            this.driver.controllerLog.logNode(nodeId, {
                message: `Healing node...`,
                direction: "none",
            });
            // The healing process consists of four steps
            // Each step is tried up to 5 times before the healing process is considered failed
            const maxAttempts = 5;
            // 1. command the node to refresh its neighbor list
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                // If the process was stopped in the meantime, cancel
                if (!this._healNetworkActive)
                    return false;
                this.driver.controllerLog.logNode(nodeId, {
                    message: `refreshing neighbor list (attempt ${attempt})...`,
                    direction: "outbound",
                });
                // During inclusion, the timeout is mainly required for the node to detect all neighbors
                // We do the same here, so we just reuse the timeout
                const discoveryTimeout = (0, AddNodeToNetworkRequest_1.computeNeighborDiscoveryTimeout)(this.driver, 
                // Controllers take longer, just assume the worst case here
                core_1.NodeType.Controller);
                try {
                    const resp = await this.driver.sendMessage(new RequestNodeNeighborUpdateMessages_1.RequestNodeNeighborUpdateRequest(this.driver, {
                        nodeId,
                        discoveryTimeout,
                    }));
                    if (resp.updateStatus ===
                        RequestNodeNeighborUpdateMessages_1.NodeNeighborUpdateStatus.UpdateDone) {
                        this.driver.controllerLog.logNode(nodeId, {
                            message: "neighbor list refreshed...",
                            direction: "inbound",
                        });
                        // this step was successful, continue with the next
                        break;
                    }
                    else {
                        // UpdateFailed
                        this.driver.controllerLog.logNode(nodeId, {
                            message: "refreshing neighbor list failed...",
                            direction: "inbound",
                            level: "warn",
                        });
                    }
                }
                catch (e) {
                    this.driver.controllerLog.logNode(nodeId, `refreshing neighbor list failed: ${(0, shared_1.getErrorMessage)(e)}`, "warn");
                }
                if (attempt === maxAttempts) {
                    this.driver.controllerLog.logNode(nodeId, {
                        message: `failed to update the neighbor list after ${maxAttempts} attempts, healing failed`,
                        level: "warn",
                        direction: "none",
                    });
                    return false;
                }
            }
            // 2. re-create the SUC return route, just in case
            if (await this.deleteSUCReturnRoute(nodeId)) {
                node.hasSUCReturnRoute = false;
            }
            node.hasSUCReturnRoute = await this.assignSUCReturnRoute(nodeId);
            // 3. delete all return routes so we can assign new ones
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                this.driver.controllerLog.logNode(nodeId, {
                    message: `deleting return routes (attempt ${attempt})...`,
                    direction: "outbound",
                });
                try {
                    await this.driver.sendMessage(new DeleteReturnRouteMessages_1.DeleteReturnRouteRequest(this.driver, { nodeId }));
                    // this step was successful, continue with the next
                    break;
                }
                catch (e) {
                    this.driver.controllerLog.logNode(nodeId, `deleting return routes failed: ${(0, shared_1.getErrorMessage)(e)}`, "warn");
                }
                if (attempt === maxAttempts) {
                    this.driver.controllerLog.logNode(nodeId, {
                        message: `failed to delete return routes after ${maxAttempts} attempts, healing failed`,
                        level: "warn",
                        direction: "none",
                    });
                    return false;
                }
            }
            // 4. Assign up to 4 return routes for associations, one of which should be the controller
            let associatedNodes = [];
            const maxReturnRoutes = 4;
            try {
                associatedNodes = (0, arrays_1.distinct)((0, shared_1.flatMap)([...this.getAssociations({ nodeId }).values()], (assocs) => assocs.map((a) => a.nodeId))).sort();
            }
            catch {
                /* ignore */
            }
            // Always include ourselves first
            if (!associatedNodes.includes(this._ownNodeId)) {
                associatedNodes.unshift(this._ownNodeId);
            }
            if (associatedNodes.length > maxReturnRoutes) {
                associatedNodes = associatedNodes.slice(0, maxReturnRoutes);
            }
            this.driver.controllerLog.logNode(nodeId, {
                message: `assigning return routes to the following nodes:
${associatedNodes.join(", ")}`,
                direction: "outbound",
            });
            for (const destinationNodeId of associatedNodes) {
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    this.driver.controllerLog.logNode(nodeId, {
                        message: `assigning return route to node ${destinationNodeId} (attempt ${attempt})...`,
                        direction: "outbound",
                    });
                    try {
                        await this.driver.sendMessage(new AssignReturnRouteMessages_1.AssignReturnRouteRequest(this.driver, {
                            nodeId,
                            destinationNodeId,
                        }));
                        // this step was successful, continue with the next
                        break;
                    }
                    catch (e) {
                        this.driver.controllerLog.logNode(nodeId, `assigning return route failed: ${(0, shared_1.getErrorMessage)(e)}`, "warn");
                    }
                    if (attempt === maxAttempts) {
                        this.driver.controllerLog.logNode(nodeId, {
                            message: `failed to assign return route after ${maxAttempts} attempts, healing failed`,
                            level: "warn",
                            direction: "none",
                        });
                        return false;
                    }
                }
            }
            this.driver.controllerLog.logNode(nodeId, {
                message: `healed successfully`,
                direction: "none",
            });
            return true;
        }
        finally {
            node.keepAwake = keepAwake;
            if (!keepAwake) {
                setImmediate(() => {
                    this.driver.debounceSendNodeToSleep(node);
                });
            }
        }
    }
    /** Configures the given Node to be SUC/SIS or not */
    async configureSUC(nodeId, enableSUC, enableSIS) {
        const result = await this.driver.sendMessage(new SetSUCNodeIDMessages_1.SetSUCNodeIdRequest(this.driver, {
            sucNodeId: nodeId,
            enableSUC,
            enableSIS,
        }));
        return result.isOK();
    }
    async assignSUCReturnRoute(nodeId) {
        this.driver.controllerLog.logNode(nodeId, {
            message: `Assigning SUC return route...`,
            direction: "outbound",
        });
        try {
            const result = await this.driver.sendMessage(new AssignSUCReturnRouteMessages_1.AssignSUCReturnRouteRequest(this.driver, {
                nodeId,
            }));
            return this.handleRouteAssignmentTransmitReport(result, nodeId);
        }
        catch (e) {
            this.driver.controllerLog.logNode(nodeId, `Assigning SUC return route failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
            return false;
        }
    }
    async deleteSUCReturnRoute(nodeId) {
        this.driver.controllerLog.logNode(nodeId, {
            message: `Deleting SUC return route...`,
            direction: "outbound",
        });
        try {
            const result = await this.driver.sendMessage(new DeleteSUCReturnRouteMessages_1.DeleteSUCReturnRouteRequest(this.driver, {
                nodeId,
            }));
            return this.handleRouteAssignmentTransmitReport(result, nodeId);
        }
        catch (e) {
            this.driver.controllerLog.logNode(nodeId, `Deleting SUC return route failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
            return false;
        }
    }
    async assignReturnRoute(nodeId, destinationNodeId) {
        this.driver.controllerLog.logNode(nodeId, {
            message: `Assigning return route to node ${destinationNodeId}...`,
            direction: "outbound",
        });
        try {
            const result = await this.driver.sendMessage(new AssignReturnRouteMessages_1.AssignReturnRouteRequest(this.driver, {
                nodeId,
                destinationNodeId,
            }));
            return this.handleRouteAssignmentTransmitReport(result, nodeId);
        }
        catch (e) {
            this.driver.controllerLog.logNode(nodeId, `Assigning return route failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
            return false;
        }
    }
    async deleteReturnRoute(nodeId) {
        this.driver.controllerLog.logNode(nodeId, {
            message: `Deleting all return routes...`,
            direction: "outbound",
        });
        try {
            const result = await this.driver.sendMessage(new DeleteReturnRouteMessages_1.DeleteReturnRouteRequest(this.driver, {
                nodeId,
            }));
            return this.handleRouteAssignmentTransmitReport(result, nodeId);
        }
        catch (e) {
            this.driver.controllerLog.logNode(nodeId, `Deleting return routes failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
            return false;
        }
    }
    /**
     * Assigns a priority route between two end nodes. This route will always be used for the first transmission attempt.
     * @param nodeId The ID of the source node of the route
     * @param destinationNodeId The ID of the destination node of the route
     * @param repeaters The IDs of the nodes that should be used as repeaters, or an empty array for direct connection
     * @param routeSpeed The transmission speed to use for the route
     */
    async assignPriorityReturnRoute(nodeId, destinationNodeId, repeaters, routeSpeed) {
        this.driver.controllerLog.logNode(nodeId, {
            message: `Assigning priority return route to node ${destinationNodeId}...`,
            direction: "outbound",
        });
        try {
            const result = await this.driver.sendMessage(new AssignPriorityReturnRouteMessages_1.AssignPriorityReturnRouteRequest(this.driver, {
                nodeId,
                destinationNodeId,
                repeaters,
                routeSpeed,
            }));
            return this.handleRouteAssignmentTransmitReport(result, nodeId);
        }
        catch (e) {
            this.driver.controllerLog.logNode(nodeId, `Assigning priority return route failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
            return false;
        }
    }
    /**
     * Assigns a priority route from an end node to the SUC. This route will always be used for the first transmission attempt.
     * @param nodeId The ID of the end node for which to assign the route
     * @param repeaters The IDs of the nodes that should be used as repeaters, or an empty array for direct connection
     * @param routeSpeed The transmission speed to use for the route
     */
    async assignPrioritySUCReturnRoute(nodeId, repeaters, routeSpeed) {
        this.driver.controllerLog.logNode(nodeId, {
            message: `Assigning priority SUC return route...`,
            direction: "outbound",
        });
        try {
            const result = await this.driver.sendMessage(new AssignPrioritySUCReturnRouteMessages_1.AssignPrioritySUCReturnRouteRequest(this.driver, {
                nodeId,
                repeaters,
                routeSpeed,
            }));
            return this.handleRouteAssignmentTransmitReport(result, nodeId);
        }
        catch (e) {
            this.driver.controllerLog.logNode(nodeId, `Assigning priority SUC return route failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
            return false;
        }
    }
    handleRouteAssignmentTransmitReport(msg, nodeId) {
        switch (msg.transmitStatus) {
            case core_1.TransmitStatus.OK:
                return true;
            case core_1.TransmitStatus.NoAck:
                return false;
            case core_1.TransmitStatus.NoRoute:
                this.driver.controllerLog.logNode(nodeId, `Route resolution failed`, "warn");
                return false;
            default:
                return false;
        }
    }
    /**
     * Sets the priority route which will always be used for the first transmission attempt from the controller to the given node.
     * @param destinationNodeId The ID of the node that should be reached via the priority route
     * @param repeaters The IDs of the nodes that should be used as repeaters, or an empty array for direct connection
     * @param routeSpeed The transmission speed to use for the route
     */
    async setPriorityRoute(destinationNodeId, repeaters, routeSpeed) {
        this.driver.controllerLog.print(`Setting priority route to node ${destinationNodeId}...`);
        try {
            const result = await this.driver.sendMessage(new SetPriorityRouteMessages_1.SetPriorityRouteRequest(this.driver, {
                destinationNodeId,
                repeaters,
                routeSpeed,
            }));
            return result.isOK();
        }
        catch (e) {
            this.driver.controllerLog.print(`Setting priority route failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
            return false;
        }
    }
    /**
     * Returns the priority route which is currently set for a node. If none is set, either the LWR or the NLWR is returned.
     * @param destinationNodeId The ID of the node for which the priority route should be returned
     */
    async getPriorityRoute(destinationNodeId) {
        this.driver.controllerLog.print(`Retrieving priority route to node ${destinationNodeId}...`);
        try {
            const result = await this.driver.sendMessage(new GetPriorityRouteMessages_1.GetPriorityRouteRequest(this.driver, {
                destinationNodeId,
            }));
            return {
                repeaters: result.repeaters,
                routeSpeed: result.routeSpeed,
            };
        }
        catch (e) {
            this.driver.controllerLog.print(`Retrieving priority route failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
        }
    }
    /**
     * Returns a dictionary of all association groups of this node or endpoint and their information.
     * If no endpoint is given, the associations of the root device (endpoint 0) are returned.
     * This only works AFTER the interview process
     */
    getAssociationGroups(source) {
        const node = this.nodes.getOrThrow(source.nodeId);
        const endpoint = node.getEndpointOrThrow(source.endpoint ?? 0);
        return cc_1.utils.getAssociationGroups(this.driver, endpoint);
    }
    /**
     * Returns all association groups that exist on a node and all its endpoints.
     * The returned map uses the endpoint index as keys and its values are maps of group IDs to their definition
     */
    getAllAssociationGroups(nodeId) {
        const node = this.nodes.getOrThrow(nodeId);
        return cc_1.utils.getAllAssociationGroups(this.driver, node);
    }
    /**
     * Returns all associations (Multi Channel or normal) that are configured on the root device or an endpoint of a node.
     * If no endpoint is given, the associations of the root device (endpoint 0) are returned.
     */
    getAssociations(source) {
        const node = this.nodes.getOrThrow(source.nodeId);
        const endpoint = node.getEndpointOrThrow(source.endpoint ?? 0);
        return cc_1.utils.getAssociations(this.driver, endpoint);
    }
    /**
     * Returns all associations (Multi Channel or normal) that are configured on a node and all its endpoints.
     * The returned map uses the source node+endpoint as keys and its values are a map of association group IDs to target node+endpoint.
     */
    getAllAssociations(nodeId) {
        const node = this.nodes.getOrThrow(nodeId);
        return cc_1.utils.getAllAssociations(this.driver, node);
    }
    /**
     * Checks if a given association is allowed.
     */
    isAssociationAllowed(source, group, destination) {
        const node = this.nodes.getOrThrow(source.nodeId);
        const endpoint = node.getEndpointOrThrow(source.endpoint ?? 0);
        return cc_1.utils.isAssociationAllowed(this.driver, endpoint, group, destination);
    }
    /**
     * Adds associations to a node or endpoint
     */
    async addAssociations(source, group, destinations) {
        const node = this.nodes.getOrThrow(source.nodeId);
        const endpoint = node.getEndpointOrThrow(source.endpoint ?? 0);
        await cc_1.utils.addAssociations(this.driver, endpoint, group, destinations);
        // Nodes need a return route to be able to send commands to other nodes
        const destinationNodeIDs = (0, arrays_1.distinct)(destinations.map((d) => d.nodeId)).filter((id) => id !== this.ownNodeId);
        for (const id of destinationNodeIDs) {
            await this.assignReturnRoute(source.nodeId, id);
        }
    }
    /**
     * Removes the given associations from a node or endpoint
     */
    removeAssociations(source, group, destinations) {
        const node = this.nodes.getOrThrow(source.nodeId);
        const endpoint = node.getEndpointOrThrow(source.endpoint ?? 0);
        return cc_1.utils.removeAssociations(this.driver, endpoint, group, destinations);
    }
    /**
     * Removes a node from all other nodes' associations
     * WARNING: It is not recommended to await this method
     */
    async removeNodeFromAllAssociations(nodeId) {
        const tasks = [];
        // Check each endpoint of each node if they have an association to this node
        for (const node of this.nodes.values()) {
            if (node.id === this._ownNodeId || node.id === nodeId)
                continue;
            if (node.interviewStage !== _Types_1.InterviewStage.Complete)
                continue;
            for (const endpoint of node.getAllEndpoints()) {
                // Prefer multi channel associations if that is available
                if (endpoint.commandClasses["Multi Channel Association"].isSupported()) {
                    const existing = cc_1.MultiChannelAssociationCC.getAllDestinationsCached(this.driver, endpoint);
                    if ([...existing.values()].some((dests) => dests.some((a) => a.nodeId === nodeId))) {
                        tasks.push(endpoint.commandClasses["Multi Channel Association"].removeDestinations({
                            nodeIds: [nodeId],
                        }));
                    }
                }
                else if (endpoint.commandClasses.Association.isSupported()) {
                    const existing = cc_1.AssociationCC.getAllDestinationsCached(this.driver, endpoint);
                    if ([...existing.values()].some((dests) => dests.some((a) => a.nodeId === nodeId))) {
                        tasks.push(endpoint.commandClasses.Association.removeNodeIdsFromAllGroups([nodeId]));
                    }
                }
            }
        }
        await Promise.all(tasks);
    }
    /**
     * Tests if a node is marked as failed in the controller's memory
     * @param nodeId The id of the node in question
     */
    async isFailedNode(nodeId) {
        const result = await this.driver.sendMessage(new IsFailedNodeMessages_1.IsFailedNodeRequest(this.driver, { failedNodeId: nodeId }));
        return result.result;
    }
    /**
     * Removes a failed node from the controller's memory. If the process fails, this will throw an exception with the details why.
     * @param nodeId The id of the node to remove
     */
    async removeFailedNode(nodeId) {
        const node = this.nodes.getOrThrow(nodeId);
        if (await node.ping()) {
            throw new core_1.ZWaveError(`The node removal process could not be started because the node responded to a ping.`, core_1.ZWaveErrorCodes.RemoveFailedNode_Failed);
        }
        const result = await this.driver.sendMessage(new RemoveFailedNodeMessages_1.RemoveFailedNodeRequest(this.driver, { failedNodeId: nodeId }));
        if (result instanceof RemoveFailedNodeMessages_1.RemoveFailedNodeResponse) {
            // This implicates that the process was unsuccessful.
            let message = `The node removal process could not be started due to the following reasons:`;
            if (!!(result.removeStatus &
                RemoveFailedNodeMessages_1.RemoveFailedNodeStartFlags.NotPrimaryController)) {
                message += "\n· This controller is not the primary controller";
            }
            if (!!(result.removeStatus &
                RemoveFailedNodeMessages_1.RemoveFailedNodeStartFlags.NodeNotFound)) {
                message += `\n· Node ${nodeId} is not in the list of failed nodes`;
            }
            if (!!(result.removeStatus &
                RemoveFailedNodeMessages_1.RemoveFailedNodeStartFlags.RemoveProcessBusy)) {
                message += `\n· The node removal process is currently busy`;
            }
            if (!!(result.removeStatus &
                RemoveFailedNodeMessages_1.RemoveFailedNodeStartFlags.RemoveFailed)) {
                message += `\n· The controller is busy or the node has responded`;
            }
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.RemoveFailedNode_Failed);
        }
        else {
            switch (result.removeStatus) {
                case RemoveFailedNodeMessages_1.RemoveFailedNodeStatus.NodeOK:
                    throw new core_1.ZWaveError(`The node could not be removed because it has responded`, core_1.ZWaveErrorCodes.RemoveFailedNode_NodeOK);
                case RemoveFailedNodeMessages_1.RemoveFailedNodeStatus.NodeNotRemoved:
                    throw new core_1.ZWaveError(`The removal process could not be completed`, core_1.ZWaveErrorCodes.RemoveFailedNode_Failed);
                default:
                    // If everything went well, the status is RemoveFailedNodeStatus.NodeRemoved
                    // Emit the removed event so the driver and applications can react
                    this.emit("node removed", this.nodes.get(nodeId), false);
                    // and forget the node
                    this._nodes.delete(nodeId);
                    return;
            }
        }
    }
    /**
     * Replace a failed node from the controller's memory. If the process fails, this will throw an exception with the details why.
     * @param nodeId The id of the node to replace
     * @param options Defines the inclusion strategy to use for the replacement node
     */
    async replaceFailedNode(nodeId, options = {
        strategy: Inclusion_1.InclusionStrategy.Insecure,
    }) {
        if (this._inclusionState === Inclusion_1.InclusionState.Including ||
            this._inclusionState === Inclusion_1.InclusionState.Excluding ||
            this._inclusionState === Inclusion_1.InclusionState.Busy) {
            return false;
        }
        // Leave SmartStart listening mode so we can switch to exclusion mode
        await this.pauseSmartStart();
        this.setInclusionState(Inclusion_1.InclusionState.Busy);
        this.driver.controllerLog.print(`starting replace failed node process...`);
        const node = this.nodes.getOrThrow(nodeId);
        if (await node.ping()) {
            this.setInclusionState(Inclusion_1.InclusionState.Idle);
            throw new core_1.ZWaveError(`The node replace process could not be started because the node responded to a ping.`, core_1.ZWaveErrorCodes.ReplaceFailedNode_Failed);
        }
        this._inclusionOptions = options;
        const result = await this.driver.sendMessage(new ReplaceFailedNodeRequest_1.ReplaceFailedNodeRequest(this.driver, {
            failedNodeId: nodeId,
        }));
        if (!result.isOK()) {
            // This implicates that the process was unsuccessful.
            let message = `The node replace process could not be started due to the following reasons:`;
            if (!!(result.replaceStatus &
                ReplaceFailedNodeRequest_1.ReplaceFailedNodeStartFlags.NotPrimaryController)) {
                message += "\n· This controller is not the primary controller";
            }
            if (!!(result.replaceStatus &
                ReplaceFailedNodeRequest_1.ReplaceFailedNodeStartFlags.NodeNotFound)) {
                message += `\n· Node ${nodeId} is not in the list of failed nodes`;
            }
            if (!!(result.replaceStatus &
                ReplaceFailedNodeRequest_1.ReplaceFailedNodeStartFlags.ReplaceProcessBusy)) {
                message += `\n· The node replace process is currently busy`;
            }
            if (!!(result.replaceStatus &
                ReplaceFailedNodeRequest_1.ReplaceFailedNodeStartFlags.ReplaceFailed)) {
                message += `\n· The controller is busy or the node has responded`;
            }
            this.setInclusionState(Inclusion_1.InclusionState.Idle);
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.ReplaceFailedNode_Failed);
        }
        else {
            // Remember which node we're trying to replace
            this._nodePendingReplace = this.nodes.get(nodeId);
            this._replaceFailedPromise = (0, deferred_promise_1.createDeferredPromise)();
            return this._replaceFailedPromise;
        }
    }
    /** Configure the RF region at the Z-Wave API Module */
    async setRFRegion(region) {
        const result = await this.driver.sendMessage(new SerialAPISetupMessages_1.SerialAPISetup_SetRFRegionRequest(this.driver, { region }));
        if (result instanceof SerialAPISetupMessages_1.SerialAPISetup_CommandUnsupportedResponse) {
            throw new core_1.ZWaveError(`Your hardware does not support setting the RF region!`, core_1.ZWaveErrorCodes.Driver_NotSupported);
        }
        if (result.success)
            await this.driver.trySoftReset();
        this._rfRegion = region;
        return result.success;
    }
    /** Request the current RF region configured at the Z-Wave API Module */
    async getRFRegion() {
        const result = await this.driver.sendMessage(new SerialAPISetupMessages_1.SerialAPISetup_GetRFRegionRequest(this.driver));
        if (result instanceof SerialAPISetupMessages_1.SerialAPISetup_CommandUnsupportedResponse) {
            throw new core_1.ZWaveError(`Your hardware does not support getting the RF region!`, core_1.ZWaveErrorCodes.Driver_NotSupported);
        }
        this._rfRegion = result.region;
        return result.region;
    }
    /** Configure the Powerlevel setting of the Z-Wave API */
    async setPowerlevel(powerlevel, measured0dBm) {
        let request;
        if (this.supportedSerialAPISetupCommands?.includes(SerialAPISetupMessages_1.SerialAPISetupCommand.SetPowerlevel16Bit)) {
            request = new SerialAPISetupMessages_1.SerialAPISetup_SetPowerlevel16BitRequest(this.driver, {
                powerlevel,
                measured0dBm,
            });
        }
        else {
            request = new SerialAPISetupMessages_1.SerialAPISetup_SetPowerlevelRequest(this.driver, {
                powerlevel,
                measured0dBm,
            });
        }
        const result = await this.driver.sendMessage(request);
        if (result instanceof SerialAPISetupMessages_1.SerialAPISetup_CommandUnsupportedResponse) {
            throw new core_1.ZWaveError(`Your hardware does not support setting the powerlevel!`, core_1.ZWaveErrorCodes.Driver_NotSupported);
        }
        return result.success;
    }
    /** Request the Powerlevel setting of the Z-Wave API */
    async getPowerlevel() {
        let request;
        if (this.supportedSerialAPISetupCommands?.includes(SerialAPISetupMessages_1.SerialAPISetupCommand.GetPowerlevel16Bit)) {
            request = new SerialAPISetupMessages_1.SerialAPISetup_GetPowerlevel16BitRequest(this.driver);
        }
        else {
            request = new SerialAPISetupMessages_1.SerialAPISetup_GetPowerlevelRequest(this.driver);
        }
        const result = await this.driver.sendMessage(request);
        if (result instanceof SerialAPISetupMessages_1.SerialAPISetup_CommandUnsupportedResponse) {
            throw new core_1.ZWaveError(`Your hardware does not support getting the powerlevel!`, core_1.ZWaveErrorCodes.Driver_NotSupported);
        }
        return (0, shared_1.pick)(result, ["powerlevel", "measured0dBm"]);
    }
    /**
     * @internal
     * Configure whether the Z-Wave API should use short (8 bit) or long (16 bit) Node IDs
     */
    async setNodeIDType(nodeIdType) {
        const result = await this.driver.sendMessage(new SerialAPISetupMessages_1.SerialAPISetup_SetNodeIDTypeRequest(this.driver, {
            nodeIdType,
        }));
        if (result instanceof SerialAPISetupMessages_1.SerialAPISetup_CommandUnsupportedResponse) {
            throw new core_1.ZWaveError(`Your hardware does not support switching between short and long node IDs!`, core_1.ZWaveErrorCodes.Driver_NotSupported);
        }
        return result.success;
    }
    /**
     * @internal
     * Request the maximum payload that the Z-Wave API Module can accept for transmitting Z-Wave frames. This value depends on the RF Profile
     */
    async getMaxPayloadSize() {
        const result = await this.driver.sendMessage(new SerialAPISetupMessages_1.SerialAPISetup_GetMaximumPayloadSizeRequest(this.driver), {
            supportCheck: false,
        });
        if (result instanceof SerialAPISetupMessages_1.SerialAPISetup_CommandUnsupportedResponse) {
            throw new core_1.ZWaveError(`Your hardware does not support getting the max. payload size!`, core_1.ZWaveErrorCodes.Driver_NotSupported);
        }
        return result.maxPayloadSize;
    }
    /**
     * @internal
     * Request the maximum payload that the Z-Wave API Module can accept for transmitting Z-Wave Long Range frames. This value depends on the RF Profile
     */
    async getMaxPayloadSizeLongRange() {
        const result = await this.driver.sendMessage(new SerialAPISetupMessages_1.SerialAPISetup_GetLRMaximumPayloadSizeRequest(this.driver));
        if (result instanceof SerialAPISetupMessages_1.SerialAPISetup_CommandUnsupportedResponse) {
            throw new core_1.ZWaveError(`Your hardware does not support getting the max. long range payload size!`, core_1.ZWaveErrorCodes.Driver_NotSupported);
        }
        return result.maxPayloadSize;
    }
    /**
     * Returns the known list of neighbors for a node
     */
    async getNodeNeighbors(nodeId, onlyRepeaters = false) {
        this.driver.controllerLog.logNode(nodeId, {
            message: "requesting node neighbors...",
            direction: "outbound",
        });
        try {
            const resp = await this.driver.sendMessage(new GetRoutingInfoMessages_1.GetRoutingInfoRequest(this.driver, {
                nodeId,
                removeBadLinks: false,
                removeNonRepeaters: onlyRepeaters,
            }));
            this.driver.controllerLog.logNode(nodeId, {
                message: `node neighbors received: ${resp.nodeIds.join(", ")}`,
                direction: "inbound",
            });
            return resp.nodeIds;
        }
        catch (e) {
            this.driver.controllerLog.logNode(nodeId, `requesting the node neighbors failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
            throw e;
        }
    }
    /**
     * Returns the known routes the controller will use to communicate with the nodes.
     *
     * This information is dynamically built using TX status reports and may not be accurate at all times.
     * Also, it may not be available immediately after startup or at all if the controller doesn't support this feature.
     *
     * **Note:** To keep information returned by this method updated, use the information contained in each node's `"statistics"` event.
     */
    getKnownLifelineRoutes() {
        const ret = new Map();
        for (const node of this.nodes.values()) {
            if (node.isControllerNode)
                continue;
            ret.set(node.id, {
                lwr: node.statistics.lwr,
                nlwr: node.statistics.nlwr,
            });
        }
        return ret;
    }
    /**
     * @internal
     * Deserializes the controller information and all nodes from the cache.
     */
    async deserialize() {
        if (!this.driver.networkCache)
            return;
        const cache = this.driver.networkCache;
        // Deserialize information for all nodes
        for (const node of this.nodes.values()) {
            await node.deserialize();
        }
        // Remove nodes which no longer exist from the cache
        // TODO: Do the same when removing a node
        for (const cacheKey of cache.keys()) {
            const nodeId = NetworkCache_1.cacheKeyUtils.nodeIdFromKey(cacheKey);
            if (nodeId && !this.nodes.has(nodeId)) {
                cache.delete(cacheKey);
            }
        }
    }
    /** Turns the Z-Wave radio on or off */
    async toggleRF(enabled) {
        try {
            this.driver.controllerLog.print(`Turning RF ${enabled ? "on" : "off"}...`);
            const ret = await this.driver.sendMessage(new SetRFReceiveModeMessages_1.SetRFReceiveModeRequest(this.driver, { enabled }));
            return ret.isOK();
        }
        catch (e) {
            this.driver.controllerLog.print(`Error turning RF ${enabled ? "on" : "off"}: ${(0, shared_1.getErrorMessage)(e)}`, "error");
            return false;
        }
    }
    /**
     * **Z-Wave 500 series only**
     *
     * Initialize the Firmware Update functionality and determine if the firmware can be updated.
     */
    async firmwareUpdateNVMInit() {
        const ret = await this.driver.sendMessage(new FirmwareUpdateNVMMessages_1.FirmwareUpdateNVM_InitRequest(this.driver));
        return ret.supported;
    }
    /**
     * **Z-Wave 500 series only**
     *
     * Set the NEWIMAGE marker in the NVM (to the given value), which is used to signal that a new firmware image is present
     */
    async firmwareUpdateNVMSetNewImage(value = true) {
        await this.driver.sendMessage(new FirmwareUpdateNVMMessages_1.FirmwareUpdateNVM_SetNewImageRequest(this.driver, {
            newImage: value,
        }));
    }
    /**
     * **Z-Wave 500 series only**
     *
     * Return the value of the NEWIMAGE marker in the NVM, which is used to signal that a new firmware image is present
     */
    async firmwareUpdateNVMGetNewImage() {
        const ret = await this.driver.sendMessage(new FirmwareUpdateNVMMessages_1.FirmwareUpdateNVM_GetNewImageRequest(this.driver));
        return ret.newImage;
    }
    /**
     * **Z-Wave 500 series only**
     *
     * Calculates the CRC-16 for the specified block of data in the NVM
     */
    async firmwareUpdateNVMUpdateCRC16(offset, blockLength, crcSeed) {
        const ret = await this.driver.sendMessage(new FirmwareUpdateNVMMessages_1.FirmwareUpdateNVM_UpdateCRC16Request(this.driver, {
            offset,
            blockLength,
            crcSeed,
        }));
        return ret.crc16;
    }
    /**
     * **Z-Wave 500 series only**
     *
     * Writes the given data into the firmware update region of the NVM.
     */
    async firmwareUpdateNVMWrite(offset, buffer) {
        await this.driver.sendMessage(new FirmwareUpdateNVMMessages_1.FirmwareUpdateNVM_WriteRequest(this.driver, {
            offset,
            buffer,
        }));
    }
    /**
     * **Z-Wave 500 series only**
     *
     * Checks if the firmware present in the NVM is valid
     */
    async firmwareUpdateNVMIsValidCRC16() {
        const ret = await this.driver.sendMessage(new FirmwareUpdateNVMMessages_1.FirmwareUpdateNVM_IsValidCRC16Request(this.driver));
        return ret.isValid;
    }
    /**
     * **Z-Wave 500 series only**
     *
     * Returns information of the controller's external NVM
     */
    async getNVMId() {
        const ret = await this.driver.sendMessage(new GetNVMIdMessages_1.GetNVMIdRequest(this.driver));
        return (0, shared_1.pick)(ret, ["nvmManufacturerId", "memoryType", "memorySize"]);
    }
    /**
     * **Z-Wave 500 series only**
     *
     * Reads a byte from the external NVM at the given offset
     */
    async externalNVMReadByte(offset) {
        const ret = await this.driver.sendMessage(new ExtNVMReadLongByteMessages_1.ExtNVMReadLongByteRequest(this.driver, { offset }));
        return ret.byte;
    }
    /**
     * **Z-Wave 500 series only**
     *
     * Writes a byte to the external NVM at the given offset
     * **WARNING:** This function can write in the full NVM address space and is not offset to start at the application area.
     * Take care not to accidentally overwrite the protocol NVM area!
     *
     * @returns `true` when writing succeeded, `false` otherwise
     */
    async externalNVMWriteByte(offset, data) {
        const ret = await this.driver.sendMessage(new ExtNVMWriteLongByteMessages_1.ExtNVMWriteLongByteRequest(this.driver, { offset, byte: data }));
        return ret.success;
    }
    /**
     * **Z-Wave 500 series only**
     *
     * Reads a buffer from the external NVM at the given offset
     */
    async externalNVMReadBuffer(offset, length) {
        const ret = await this.driver.sendMessage(new ExtNVMReadLongBufferMessages_1.ExtNVMReadLongBufferRequest(this.driver, {
            offset,
            length,
        }));
        return ret.buffer;
    }
    /**
     * **Z-Wave 700 series only**
     *
     * Reads a buffer from the external NVM at the given offset
     */
    async externalNVMReadBuffer700(offset, length) {
        const ret = await this.driver.sendMessage(new NVMOperationsMessages_1.NVMOperationsReadRequest(this.driver, {
            offset,
            length,
        }));
        if (!ret.isOK()) {
            let message = "Could not read from the external NVM";
            if (ret.status === NVMOperationsMessages_1.NVMOperationStatus.Error_OperationInterference) {
                message += ": interference between read and write operation.";
            }
            else if (ret.status === NVMOperationsMessages_1.NVMOperationStatus.Error_OperationMismatch) {
                message += ": wrong operation requested.";
            }
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.Controller_CommandError);
        }
        return {
            buffer: ret.buffer,
            endOfFile: ret.status === NVMOperationsMessages_1.NVMOperationStatus.EndOfFile,
        };
    }
    /**
     * **Z-Wave 500 series only**
     *
     * Writes a buffer to the external NVM at the given offset
     * **WARNING:** This function can write in the full NVM address space and is not offset to start at the application area.
     * Take care not to accidentally overwrite the protocol NVM area!
     *
     * @returns `true` when writing succeeded, `false` otherwise
     */
    async externalNVMWriteBuffer(offset, buffer) {
        const ret = await this.driver.sendMessage(new ExtNVMWriteLongBufferMessages_1.ExtNVMWriteLongBufferRequest(this.driver, {
            offset,
            buffer,
        }));
        return ret.success;
    }
    /**
     * **Z-Wave 700 series only**
     *
     * Writes a buffer to the external NVM at the given offset
     * **WARNING:** This function can write in the full NVM address space and is not offset to start at the application area.
     * Take care not to accidentally overwrite the protocol NVM area!
     */
    async externalNVMWriteBuffer700(offset, buffer) {
        const ret = await this.driver.sendMessage(new NVMOperationsMessages_1.NVMOperationsWriteRequest(this.driver, {
            offset,
            buffer,
        }));
        if (!ret.isOK()) {
            let message = "Could not write to the external NVM";
            if (ret.status === NVMOperationsMessages_1.NVMOperationStatus.Error_OperationInterference) {
                message += ": interference between read and write operation.";
            }
            else if (ret.status === NVMOperationsMessages_1.NVMOperationStatus.Error_OperationMismatch) {
                message += ": wrong operation requested.";
            }
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.Controller_CommandError);
        }
        return {
            endOfFile: ret.status === NVMOperationsMessages_1.NVMOperationStatus.EndOfFile,
        };
    }
    /**
     * **Z-Wave 700 series only**
     *
     * Opens the controller's external NVM for reading/writing and returns the NVM size
     */
    async externalNVMOpen() {
        const ret = await this.driver.sendMessage(new NVMOperationsMessages_1.NVMOperationsOpenRequest(this.driver));
        if (!ret.isOK()) {
            throw new core_1.ZWaveError("Failed to open the external NVM", core_1.ZWaveErrorCodes.Controller_CommandError);
        }
        return ret.offsetOrSize;
    }
    /**
     * **Z-Wave 700 series only**
     *
     * Closes the controller's external NVM
     */
    async externalNVMClose() {
        const ret = await this.driver.sendMessage(new NVMOperationsMessages_1.NVMOperationsCloseRequest(this.driver));
        if (!ret.isOK()) {
            throw new core_1.ZWaveError("Failed to close the external NVM", core_1.ZWaveErrorCodes.Controller_CommandError);
        }
    }
    /**
     * Creates a backup of the NVM and returns the raw data as a Buffer. The Z-Wave radio is turned off/on automatically.
     * @param onProgress Can be used to monitor the progress of the operation, which may take several seconds up to a few minutes depending on the NVM size
     * @returns The raw NVM buffer
     */
    async backupNVMRaw(onProgress) {
        this.driver.controllerLog.print("Backing up NVM...");
        // Turn Z-Wave radio off to avoid having the protocol write to the NVM while dumping it
        if (!(await this.toggleRF(false))) {
            throw new core_1.ZWaveError("Could not turn off the Z-Wave radio before creating NVM backup!", core_1.ZWaveErrorCodes.Controller_ResponseNOK);
        }
        let ret;
        try {
            if (this.sdkVersionGte("7.0")) {
                ret = await this.backupNVMRaw700(onProgress);
                // All 7.xx versions so far seem to have a bug where the NVM is not properly closed after reading
                // resulting in extremely strange controller behavior after a backup. To work around this, restart the stick if possible
                await this.driver.trySoftReset();
            }
            else {
                ret = await this.backupNVMRaw500(onProgress);
            }
            this.driver.controllerLog.print("NVM backup completed");
        }
        finally {
            // Whatever happens, turn Z-Wave radio back on
            await this.toggleRF(true);
        }
        // TODO: You can also get away with eliding all the 0xff pages. The NVR also holds the page size of the NVM (NVMP),
        // so you can figure out which pages you don't have to save or restore. If you do this, you need to make sure to issue a
        // "factory reset" before restoring the NVM - that'll blank out the NVM to 0xffs before initializing it.
        return ret;
    }
    async backupNVMRaw500(onProgress) {
        const size = (0, GetNVMIdMessages_1.nvmSizeToBufferSize)((await this.getNVMId()).memorySize);
        if (!size) {
            throw new core_1.ZWaveError("Unknown NVM size - cannot backup!", core_1.ZWaveErrorCodes.Controller_NotSupported);
        }
        const ret = Buffer.allocUnsafe(size);
        let offset = 0;
        // Try reading the maximum size at first, the Serial API should return chunks in a size it supports
        // For some reason, there is no documentation and no official command for this
        let chunkSize = Math.min(0xffff, ret.length);
        while (offset < ret.length) {
            const chunk = await this.externalNVMReadBuffer(offset, Math.min(chunkSize, ret.length - offset));
            if (chunk.length === 0) {
                // Some SDK versions return an empty buffer when trying to read a buffer that is too long
                // Fallback to a sane (but maybe slow) size
                chunkSize = 48;
                continue;
            }
            chunk.copy(ret, offset);
            offset += chunk.length;
            if (chunkSize > chunk.length)
                chunkSize = chunk.length;
            // Report progress for listeners
            if (onProgress)
                setImmediate(() => onProgress(offset, size));
        }
        return ret;
    }
    async backupNVMRaw700(onProgress) {
        // Open NVM for reading
        const size = await this.externalNVMOpen();
        const ret = Buffer.allocUnsafe(size);
        let offset = 0;
        // Try reading the maximum size at first, the Serial API should return chunks in a size it supports
        // For some reason, there is no documentation and no official command for this
        let chunkSize = Math.min(0xff, ret.length);
        try {
            while (offset < ret.length) {
                const { buffer: chunk, endOfFile } = await this.externalNVMReadBuffer700(offset, Math.min(chunkSize, ret.length - offset));
                if (chunkSize === 0xff && chunk.length === 0) {
                    // Some SDK versions return an empty buffer when trying to read a buffer that is too long
                    // Fallback to a sane (but maybe slow) size
                    chunkSize = 48;
                    continue;
                }
                chunk.copy(ret, offset);
                offset += chunk.length;
                if (chunkSize > chunk.length)
                    chunkSize = chunk.length;
                // Report progress for listeners
                if (onProgress)
                    setImmediate(() => onProgress(offset, size));
                if (endOfFile)
                    break;
            }
        }
        finally {
            // Whatever happens, close the NVM
            await this.externalNVMClose();
        }
        return ret;
    }
    /**
     * Restores an NVM backup that was created with `backupNVMRaw`. The Z-Wave radio is turned off/on automatically.
     * If the given buffer is in a different NVM format, it is converted automatically. If a conversion is required but not supported, the operation will be aborted.
     *
     * **WARNING:** If both the source and target NVM use an an unsupported format, they will NOT be checked for compatibility!
     *
     * **WARNING:** A failure during this process may brick your controller. Use at your own risk!
     *
     * @param nvmData The NVM backup to be restored
     * @param convertProgress Can be used to monitor the progress of the NVM conversion, which may take several seconds up to a few minutes depending on the NVM size
     * @param restoreProgress Can be used to monitor the progress of the restore operation, which may take several seconds up to a few minutes depending on the NVM size
     */
    async restoreNVM(nvmData, convertProgress, restoreProgress) {
        // Turn Z-Wave radio off to avoid having the protocol write to the NVM while dumping it
        if (!(await this.toggleRF(false))) {
            throw new core_1.ZWaveError("Could not turn off the Z-Wave radio before restoring NVM backup!", core_1.ZWaveErrorCodes.Controller_ResponseNOK);
        }
        // Restoring a potentially incompatible NVM happens in three steps:
        // 1. the current NVM is read
        // 2. the given NVM data is converted to match the current format
        // 3. the converted data is written to the NVM
        try {
            this.driver.controllerLog.print("Converting NVM to target format...");
            let targetNVM;
            if (this.sdkVersionGte("7.0")) {
                targetNVM = await this.backupNVMRaw700(convertProgress);
            }
            else {
                targetNVM = await this.backupNVMRaw500(convertProgress);
            }
            const convertedNVM = (0, nvmedit_1.migrateNVM)(nvmData, targetNVM);
            this.driver.controllerLog.print("Restoring NVM backup...");
            if (this.sdkVersionGte("7.0")) {
                await this.restoreNVMRaw700(convertedNVM, restoreProgress);
            }
            else {
                await this.restoreNVMRaw500(convertedNVM, restoreProgress);
            }
            this.driver.controllerLog.print("NVM backup restored");
        }
        finally {
            // Whatever happens, turn Z-Wave radio back on
            await this.toggleRF(true);
        }
        // After restoring an NVM backup, the controller's capabilities may have changed.
        // At the very least reset the information about the soft reset capability.
        this.supportsSoftReset = undefined;
        // Also, we could be talking to different nodes than the cache file contains.
        // Reset all info about all nodes, so they get re-interviewed.
        this._nodes.clear();
        // Normally we'd only need to soft reset the stick, but we also need to re-interview the controller and potentially all nodes.
        // Just forcing a restart of the driver seems easier.
        await this.driver.softResetAndRestart("Restarting driver to activate restored NVM backup...", "Applying the NVM backup requires a driver restart!");
    }
    /**
     * Restores an NVM backup that was created with `backupNVMRaw`. The Z-Wave radio is turned off/on automatically.
     *
     * **WARNING:** The given buffer is NOT checked for compatibility with the current stick. To have Z-Wave JS do that, use the {@link restoreNVM} method instead.
     *
     * **WARNING:** A failure during this process may brick your controller. Use at your own risk!
     * @param nvmData The raw NVM backup to be restored
     * @param onProgress Can be used to monitor the progress of the operation, which may take several seconds up to a few minutes depending on the NVM size
     */
    async restoreNVMRaw(nvmData, onProgress) {
        this.driver.controllerLog.print("Restoring NVM...");
        // Turn Z-Wave radio off to avoid having the protocol write to the NVM while dumping it
        if (!(await this.toggleRF(false))) {
            throw new core_1.ZWaveError("Could not turn off the Z-Wave radio before restoring NVM backup!", core_1.ZWaveErrorCodes.Controller_ResponseNOK);
        }
        try {
            if (this.sdkVersionGte("7.0")) {
                await this.restoreNVMRaw700(nvmData, onProgress);
            }
            else {
                await this.restoreNVMRaw500(nvmData, onProgress);
            }
            this.driver.controllerLog.print("NVM backup restored");
        }
        finally {
            // Whatever happens, turn Z-Wave radio back on
            await this.toggleRF(true);
        }
        // TODO: You can also get away with eliding all the 0xff pages. The NVR also holds the page size of the NVM (NVMP),
        // so you can figure out which pages you don't have to save or restore. If you do this, you need to make sure to issue a
        // "factory reset" before restoring the NVM - that'll blank out the NVM to 0xffs before initializing it.
        // After a restored NVM backup, the controller's capabilities may have changed. At the very least reset the information
        // about soft reset capability
        this.supportsSoftReset = undefined;
        // Normally we'd only need to soft reset the stick, but we also need to re-interview the controller and potentially all nodes.
        // Just forcing a restart of the driver seems easier.
        // if (this.driver.options.enableSoftReset) {
        // 	this.driver.controllerLog.print(
        // 		"Activating restored NVM backup...",
        // 	);
        // 	await this.driver.softReset();
        // } else {
        // 	this.driver.controllerLog.print(
        // 		"Soft reset not enabled, cannot automatically activate restored NVM backup!",
        // 		"warn",
        // 	);
        // }
        this.driver.controllerLog.print("Restarting driver to activate restored NVM backup...");
        this.driver.emit("error", new core_1.ZWaveError("Activating the NVM backup requires a driver restart!", core_1.ZWaveErrorCodes.Driver_Failed));
        await this.driver.destroy();
    }
    async restoreNVMRaw500(nvmData, onProgress) {
        const size = (0, GetNVMIdMessages_1.nvmSizeToBufferSize)((await this.getNVMId()).memorySize);
        if (!size) {
            throw new core_1.ZWaveError("Unknown NVM size - cannot restore!", core_1.ZWaveErrorCodes.Controller_NotSupported);
        }
        else if (size !== nvmData.length) {
            // This might be a converted NVM buffer which contains only the first relevant part.
            // The first two bytes must point to the last byte in the buffer then
            const actualSize = 1 + nvmData.readUInt16BE(0);
            if (actualSize !== nvmData.length) {
                throw new core_1.ZWaveError("The given data does not match the NVM size - cannot restore!", core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            // Now we only need to figure out which part of the NVM needs to be overwritten when restoring
            const oldSize = 1 + (await this.externalNVMReadBuffer(0, 2)).readUInt16BE(0);
            if (oldSize > actualSize) {
                // Pad the rest with 0xff
                nvmData = Buffer.concat([
                    nvmData,
                    Buffer.alloc(oldSize - actualSize, 0xff),
                ]);
            }
        }
        // Figure out the maximum chunk size the Serial API supports
        // For some reason, there is no documentation and no official command for this
        // The write requests need 5 bytes more than the read response, so subtract 5 from the returned length
        const chunkSize = (await this.externalNVMReadBuffer(0, 0xffff)).length - 5;
        for (let offset = 0; offset < nvmData.length; offset += chunkSize) {
            await this.externalNVMWriteBuffer(offset, nvmData.slice(offset, offset + chunkSize));
            // Report progress for listeners
            if (onProgress)
                setImmediate(() => onProgress(offset, nvmData.length));
        }
    }
    async restoreNVMRaw700(nvmData, onProgress) {
        // Open NVM for reading
        const size = await this.externalNVMOpen();
        if (size !== nvmData.length) {
            throw new core_1.ZWaveError("The given data does not match the NVM size - cannot restore!", core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        // Figure out the maximum chunk size the Serial API supports
        // For some reason, there is no documentation and no official command for this
        // The write requests have the same size as the read response - if this yields no
        // data, default to a sane (but maybe slow) size
        const chunkSize = (await this.externalNVMReadBuffer700(0, 0xff)).buffer.length || 48;
        // Close NVM and re-open again for writing
        await this.externalNVMClose();
        await this.externalNVMOpen();
        for (let offset = 0; offset < nvmData.length; offset += chunkSize) {
            const { endOfFile } = await this.externalNVMWriteBuffer700(offset, nvmData.slice(offset, offset + chunkSize));
            // Report progress for listeners
            if (onProgress)
                setImmediate(() => onProgress(offset, size));
            if (endOfFile)
                break;
        }
        // Close NVM
        await this.externalNVMClose();
    }
    /**
     * Request the most recent background RSSI levels detected by the controller.
     *
     * **Note:** This only returns useful values if something was transmitted recently.
     */
    async getBackgroundRSSI() {
        const ret = await this.driver.sendMessage(new GetBackgroundRSSIMessages_1.GetBackgroundRSSIRequest(this.driver));
        const rssi = (0, shared_1.pick)(ret, [
            "rssiChannel0",
            "rssiChannel1",
            "rssiChannel2",
        ]);
        this.updateStatistics((current) => {
            const updated = { ...current };
            updated.backgroundRSSI = {};
            // Average all channels, defaulting to the current measurement
            updated.backgroundRSSI.channel0 = {
                current: rssi.rssiChannel0,
                average: (0, core_1.averageRSSI)(current.backgroundRSSI?.channel0.average, rssi.rssiChannel0, 0.9),
            };
            updated.backgroundRSSI.channel1 = {
                current: rssi.rssiChannel1,
                average: (0, core_1.averageRSSI)(current.backgroundRSSI?.channel1.average, rssi.rssiChannel1, 0.9),
            };
            if (rssi.rssiChannel2 != undefined) {
                updated.backgroundRSSI.channel2 = {
                    current: rssi.rssiChannel2,
                    average: (0, core_1.averageRSSI)(current.backgroundRSSI?.channel2?.average, rssi.rssiChannel2, 0.9),
                };
            }
            updated.backgroundRSSI.timestamp = Date.now();
            return updated;
        });
        return rssi;
    }
    /**
     *
     * Returns whether an OTA firmware update is in progress for any node.
     */
    isAnyOTAFirmwareUpdateInProgress() {
        for (const node of this._nodes.values()) {
            if (!node.isControllerNode && node.isFirmwareUpdateInProgress())
                return true;
        }
        return false;
    }
    /**
     * Retrieves the available firmware updates for the given node from the Z-Wave JS firmware update service.
     *
     * **Note:** Sleeping nodes need to be woken up for this to work. This method will throw when called for a sleeping node
     * which did not wake up within a minute.
     *
     * **Note:** This requires an API key to be set in the driver options, or passed .
     */
    async getAvailableFirmwareUpdates(nodeId, options) {
        const node = this.nodes.getOrThrow(nodeId);
        // Ensure the node is awake if it can sleep
        if (node.canSleep) {
            const didNodeWakeup = await Promise.race([
                (0, async_1.wait)(60000, true).then(() => false),
                node.waitForWakeup().then(() => true),
            ]).catch(() => false);
            if (!didNodeWakeup) {
                throw new core_1.ZWaveError(`Cannot check for firmware updates for node ${nodeId}: The node did not wake up within 1 minute!`, core_1.ZWaveErrorCodes.FWUpdateService_MissingInformation);
            }
        }
        // Do not rely on stale information, query everything fresh from the node
        const manufacturerResponse = await node.commandClasses["Manufacturer Specific"].get();
        if (!manufacturerResponse) {
            throw new core_1.ZWaveError(`Cannot check for firmware updates for node ${nodeId}: Failed to query fingerprint from the node!`, core_1.ZWaveErrorCodes.FWUpdateService_MissingInformation);
        }
        const { manufacturerId, productType, productId } = manufacturerResponse;
        const versionResponse = await node.commandClasses.Version.get();
        if (!versionResponse) {
            throw new core_1.ZWaveError(`Cannot check for firmware updates for node ${nodeId}: Failed to query firmware version from the node!`, core_1.ZWaveErrorCodes.FWUpdateService_MissingInformation);
        }
        const firmwareVersion = versionResponse.firmwareVersions[0];
        // Now invoke the service
        try {
            return await (0, FirmwareUpdateService_1.getAvailableFirmwareUpdates)({
                manufacturerId,
                productType,
                productId,
                firmwareVersion,
                rfRegion: this.rfRegion,
            }, {
                userAgent: this.driver.getUserAgentStringWithComponents(options?.additionalUserAgentComponents),
                apiKey: options?.apiKey ??
                    this.driver.options.apiKeys?.firmwareUpdateService,
                includePrereleases: options?.includePrereleases,
            });
        }
        catch (e) {
            let message = `Cannot check for firmware updates for node ${nodeId}: `;
            if (e.response) {
                if ((0, typeguards_1.isObject)(e.response.data)) {
                    if (typeof e.response.data.error === "string") {
                        message += `${e.response.data.error} `;
                    }
                    else if (typeof e.response.data.message === "string") {
                        message += `${e.response.data.message} `;
                    }
                }
                message += `[${e.response.status} ${e.response.statusText}]`;
            }
            else if (typeof e.message === "string") {
                message += e.message;
            }
            else {
                message += `Failed to download update information!`;
            }
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.FWUpdateService_RequestError);
        }
    }
    /**
     * Downloads the desired firmware update from the Z-Wave JS firmware update service and starts a firmware update for the given node.
     *
     * @deprecated Use {@link firmwareUpdateOTA} instead, which properly handles multi-target updates
     */
    async beginOTAFirmwareUpdate(nodeId, update) {
        // Don't let two firmware updates happen in parallel
        if (this.isAnyOTAFirmwareUpdateInProgress()) {
            const message = `Failed to start the update: A firmware update is already in progress on this network!`;
            this.driver.controllerLog.print(message, "error");
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy);
        }
        // Don't allow updating firmware when the controller is currently updating its own firmware
        if (this.isFirmwareUpdateInProgress()) {
            const message = `Failed to start the update: The controller is currently being updated!`;
            this.driver.controllerLog.print(message, "error");
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy);
        }
        const node = this.nodes.getOrThrow(nodeId);
        let firmware;
        try {
            this.driver.controllerLog.logNode(nodeId, `Downloading firmware update from ${update.url}...`);
            firmware = await (0, FirmwareUpdateService_1.downloadFirmwareUpdate)(update);
        }
        catch (e) {
            let message = `Downloading the firmware update for node ${nodeId} failed:\n`;
            if ((0, core_1.isZWaveError)(e)) {
                // Pass "real" Z-Wave errors through
                throw new core_1.ZWaveError(message + e.message, e.code);
            }
            else if (e.response) {
                // And construct a better error message for HTTP errors
                if ((0, typeguards_1.isObject)(e.response.data) &&
                    typeof e.response.data.message === "string") {
                    message += `${e.response.data.message} `;
                }
                message += `[${e.response.status} ${e.response.statusText}]`;
            }
            else if (typeof e.message === "string") {
                message += e.message;
            }
            else {
                message += `Failed to download firmware update!`;
            }
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.FWUpdateService_RequestError);
        }
        this.driver.controllerLog.logNode(nodeId, `Firmware update ${update.url} downloaded, installing...`);
        await node.beginFirmwareUpdate(firmware.data, firmware.firmwareTarget);
    }
    /**
     * Downloads the desired firmware update(s) from the Z-Wave JS firmware update service and updates the firmware of the given node.
     *
     * The return value indicates whether the update was successful.
     * **WARNING:** This method will throw instead of returning `false` if invalid arguments are passed or downloading files or starting an update fails.
     */
    async firmwareUpdateOTA(nodeId, updates) {
        if (updates.length === 0) {
            throw new core_1.ZWaveError(`At least one update must be provided`, core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        // Don't let two firmware updates happen in parallel
        if (this.isAnyOTAFirmwareUpdateInProgress()) {
            const message = `Failed to start the update: A firmware update is already in progress on this network!`;
            this.driver.controllerLog.print(message, "error");
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy);
        }
        // Don't allow updating firmware when the controller is currently updating its own firmware
        if (this.isFirmwareUpdateInProgress()) {
            const message = `Failed to start the update: The controller is currently being updated!`;
            this.driver.controllerLog.print(message, "error");
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy);
        }
        const node = this.nodes.getOrThrow(nodeId);
        this.driver.controllerLog.logNode(nodeId, `OTA firmware update started, downloading ${updates.length} updates...`);
        const loglevel = this.driver.getLogConfig().level;
        const firmwares = [];
        for (let i = 0; i < updates.length; i++) {
            const update = updates[i];
            let logMessage = `Downloading firmware update ${i} of ${updates.length}...`;
            if (loglevel === "silly") {
                logMessage += `
  URL:       ${update.url}
  integrity: ${update.integrity}`;
            }
            this.driver.controllerLog.logNode(nodeId, logMessage);
            try {
                const firmware = await (0, FirmwareUpdateService_1.downloadFirmwareUpdate)(update);
                firmwares.push(firmware);
            }
            catch (e) {
                let message = `Downloading the firmware update for node ${nodeId} failed:\n`;
                if ((0, core_1.isZWaveError)(e)) {
                    // Pass "real" Z-Wave errors through
                    throw new core_1.ZWaveError(message + e.message, e.code);
                }
                else if (e.response) {
                    // And construct a better error message for HTTP errors
                    if ((0, typeguards_1.isObject)(e.response.data) &&
                        typeof e.response.data.message === "string") {
                        message += `${e.response.data.message} `;
                    }
                    message += `[${e.response.status} ${e.response.statusText}]`;
                }
                else if (typeof e.message === "string") {
                    message += e.message;
                }
                else {
                    message += `Failed to download firmware update!`;
                }
                throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.FWUpdateService_RequestError);
            }
        }
        this.driver.controllerLog.logNode(nodeId, `All updates downloaded, installing...`);
        return node.updateFirmware(firmwares);
    }
    /**
     * Returns whether a firmware update is in progress for the controller.
     */
    isFirmwareUpdateInProgress() {
        return this._firmwareUpdateInProgress;
    }
    /**
     * Updates the firmware of the controller using the given firmware file.
     *
     * The return value indicates whether the update was successful.
     * **WARNING:** After a successful update, the Z-Wave driver will destroy itself so it can be restarted.
     *
     * **WARNING:** A failure during this process may put your controller in recovery mode, rendering it unusable until a correct firmware image is uploaded. Use at your own risk!
     */
    async firmwareUpdateOTW(data) {
        // Don't let two firmware updates happen in parallel
        if (this.isAnyOTAFirmwareUpdateInProgress()) {
            const message = `Failed to start the update: A firmware update is already in progress on this network!`;
            this.driver.controllerLog.print(message, "error");
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.OTW_Update_Busy);
        }
        // Don't allow updating firmware when the controller is currently updating its own firmware
        if (this.isFirmwareUpdateInProgress()) {
            const message = `Failed to start the update: The controller is currently being updated!`;
            this.driver.controllerLog.print(message, "error");
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.OTW_Update_Busy);
        }
        if (this.driver.isInBootloader() || this.sdkVersionGte("7.0")) {
            // If the controller is stuck in bootloader mode, always use the 700 series update method
            return this.firmwareUpdateOTW700(data);
        }
        else if (this.sdkVersionGte("6.50.0") &&
            this.supportedFunctionTypes?.includes(serial_1.FunctionType.FirmwareUpdateNVM)) {
            // This is 500 series
            const wasUpdated = await this.firmwareUpdateOTW500(data);
            if (wasUpdated) {
                // After updating the firmware on 500 series sticks, we MUST soft-reset them
                await this.driver.softResetAndRestart("Activating new firmware and restarting driver...", "Controller firmware updates require a driver restart!");
            }
            return wasUpdated;
        }
        else {
            throw new core_1.ZWaveError(`Firmware updates are not supported on this controller`, core_1.ZWaveErrorCodes.Controller_NotSupported);
        }
    }
    async firmwareUpdateOTW500(data) {
        this._firmwareUpdateInProgress = true;
        let turnedRadioOff = false;
        try {
            this.driver.controllerLog.print("Beginning firmware update");
            const canUpdate = await this.firmwareUpdateNVMInit();
            if (!canUpdate) {
                this.driver.controllerLog.print("OTW update failed: This controller does not support firmware updates", "error");
                this.emit("firmware update finished", {
                    success: false,
                    status: _Types_3.ControllerFirmwareUpdateStatus.Error_NotSupported,
                });
                return false;
            }
            // Avoid interruption by incoming messages
            await this.toggleRF(false);
            turnedRadioOff = true;
            // Upload the firmware data
            const BLOCK_SIZE = 64;
            const numFragments = Math.ceil(data.length / BLOCK_SIZE);
            for (let fragment = 0; fragment < numFragments; fragment++) {
                const fragmentData = data.slice(fragment * BLOCK_SIZE, (fragment + 1) * BLOCK_SIZE);
                await this.firmwareUpdateNVMWrite(fragment * BLOCK_SIZE, fragmentData);
                // This progress is technically too low, but we can keep 100% for after CRC checking this way
                const progress = {
                    sentFragments: fragment,
                    totalFragments: numFragments,
                    progress: (0, math_1.roundTo)((fragment / numFragments) * 100, 2),
                };
                this.emit("firmware update progress", progress);
            }
            // Check if a valid image was written
            const isValidCRC = await this.firmwareUpdateNVMIsValidCRC16();
            if (!isValidCRC) {
                this.driver.controllerLog.print("OTW update failed: The firmware image is invalid", "error");
                this.emit("firmware update finished", {
                    success: false,
                    status: _Types_3.ControllerFirmwareUpdateStatus.Error_Aborted,
                });
                return false;
            }
            this.emit("firmware update progress", {
                sentFragments: numFragments,
                totalFragments: numFragments,
                progress: 100,
            });
            // Enable the image
            await this.firmwareUpdateNVMSetNewImage();
            this.driver.controllerLog.print("Firmware update succeeded");
            this.emit("firmware update finished", {
                success: true,
                status: _Types_3.ControllerFirmwareUpdateStatus.OK,
            });
            return true;
        }
        finally {
            this._firmwareUpdateInProgress = false;
            if (turnedRadioOff)
                await this.toggleRF(true);
        }
    }
    async firmwareUpdateOTW700(data) {
        this._firmwareUpdateInProgress = true;
        let destroy = false;
        try {
            if (!this.driver.isInBootloader()) {
                await this.driver.enterBootloader();
            }
            // Start the update process
            this.driver.controllerLog.print("Beginning firmware upload");
            await this.driver.bootloader.beginUpload();
            // Wait for the bootloader to accept fragments
            try {
                await this.driver.waitForBootloaderChunk((c) => c.type === serial_1.BootloaderChunkType.Message &&
                    c.message === "begin upload", 5000);
                await this.driver.waitForBootloaderChunk((c) => c.type === serial_1.BootloaderChunkType.FlowControl &&
                    c.command === serial_1.XModemMessageHeaders.C, 1000);
            }
            catch {
                this.driver.controllerLog.print("OTW update failed: Expected response not received from the bootloader", "error");
                this.emit("firmware update finished", {
                    success: false,
                    status: _Types_3.ControllerFirmwareUpdateStatus.Error_Timeout,
                });
                return false;
            }
            const BLOCK_SIZE = 128;
            if (data.length % BLOCK_SIZE !== 0) {
                // Pad the data to a multiple of BLOCK_SIZE
                data = Buffer.concat([
                    data,
                    Buffer.alloc(BLOCK_SIZE - (data.length % BLOCK_SIZE), 0xff),
                ]);
            }
            const numFragments = Math.ceil(data.length / BLOCK_SIZE);
            let aborted = false;
            transfer: for (let fragment = 1; fragment <= numFragments; fragment++) {
                const fragmentData = data.slice((fragment - 1) * BLOCK_SIZE, fragment * BLOCK_SIZE);
                retry: for (let retry = 0; retry < 3; retry++) {
                    await this.driver.bootloader.uploadFragment(fragment, fragmentData);
                    let result;
                    try {
                        result = await this.driver.waitForBootloaderChunk((c) => c.type === serial_1.BootloaderChunkType.FlowControl, 1000);
                    }
                    catch (e) {
                        this.driver.controllerLog.print("OTW update failed: The bootloader did not acknowledge the start of transfer.", "error");
                        this.emit("firmware update finished", {
                            success: false,
                            status: _Types_3.ControllerFirmwareUpdateStatus.Error_Timeout,
                        });
                        return false;
                    }
                    switch (result.command) {
                        case serial_1.XModemMessageHeaders.ACK: {
                            // The fragment was accepted
                            const progress = {
                                sentFragments: fragment,
                                totalFragments: numFragments,
                                progress: (0, math_1.roundTo)((fragment / numFragments) * 100, 2),
                            };
                            this.emit("firmware update progress", progress);
                            // we've transmitted at least one fragment, so we need to destroy the driver afterwards
                            destroy = true;
                            continue transfer;
                        }
                        case serial_1.XModemMessageHeaders.NAK:
                            // The fragment was rejected, try again
                            continue retry;
                        case serial_1.XModemMessageHeaders.CAN:
                            // The bootloader aborted the update. We'll receive the reason afterwards as a message
                            aborted = true;
                            break transfer;
                    }
                }
                this.driver.controllerLog.print("OTW update failed: Maximum retry attempts reached", "error");
                this.emit("firmware update finished", {
                    success: false,
                    status: _Types_3.ControllerFirmwareUpdateStatus.Error_RetryLimitReached,
                });
                return false;
            }
            if (aborted) {
                // wait for the reason to craft a good error message
                const error = await this.driver
                    .waitForBootloaderChunk((c) => c.type === serial_1.BootloaderChunkType.Message &&
                    c.message.includes("error 0x"), 1000)
                    .catch(() => undefined);
                // wait for the menu screen so it doesn't show up in logs
                await this.driver
                    .waitForBootloaderChunk((c) => c.type === serial_1.BootloaderChunkType.Menu, 1000)
                    .catch(() => undefined);
                let message = `OTW update was aborted by the bootloader.`;
                if (error) {
                    message += ` ${error.message}`;
                    // TODO: parse error code
                }
                this.driver.controllerLog.print(message, "error");
                this.emit("firmware update finished", {
                    success: false,
                    status: _Types_3.ControllerFirmwareUpdateStatus.Error_Aborted,
                });
                return false;
            }
            else {
                // We're done, send EOT and wait for the menu screen
                await this.driver.bootloader.finishUpload();
                try {
                    await this.driver.waitForBootloaderChunk((c) => c.type === serial_1.BootloaderChunkType.Message &&
                        c.message.includes("upload complete"), 1000);
                    await this.driver.waitForBootloaderChunk((c) => c.type === serial_1.BootloaderChunkType.Menu, 1000);
                }
                catch (e) {
                    this.driver.controllerLog.print("OTW update failed: The bootloader did not acknowledge the end of transfer.", "error");
                    this.emit("firmware update finished", {
                        success: false,
                        status: _Types_3.ControllerFirmwareUpdateStatus.Error_Timeout,
                    });
                    return false;
                }
            }
            this.driver.controllerLog.print("Firmware update succeeded");
            this.emit("firmware update finished", {
                success: true,
                status: _Types_3.ControllerFirmwareUpdateStatus.OK,
            });
            return true;
        }
        finally {
            await this.driver.leaveBootloader(destroy);
            this._firmwareUpdateInProgress = false;
        }
    }
};
ZWaveController = __decorate([
    (0, shared_1.Mixin)([ControllerStatistics_1.ControllerStatisticsHost])
], ZWaveController);
exports.ZWaveController = ZWaveController;
//# sourceMappingURL=Controller.js.map