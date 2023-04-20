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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZWaveNode = void 0;
const cc_1 = require("@zwave-js/cc");
const AssociationCC_1 = require("@zwave-js/cc/AssociationCC");
const BasicCC_1 = require("@zwave-js/cc/BasicCC");
const CentralSceneCC_1 = require("@zwave-js/cc/CentralSceneCC");
const ClockCC_1 = require("@zwave-js/cc/ClockCC");
const DoorLockCC_1 = require("@zwave-js/cc/DoorLockCC");
const EntryControlCC_1 = require("@zwave-js/cc/EntryControlCC");
const FirmwareUpdateMetaDataCC_1 = require("@zwave-js/cc/FirmwareUpdateMetaDataCC");
const HailCC_1 = require("@zwave-js/cc/HailCC");
const LockCC_1 = require("@zwave-js/cc/LockCC");
const ManufacturerSpecificCC_1 = require("@zwave-js/cc/ManufacturerSpecificCC");
const MultiChannelCC_1 = require("@zwave-js/cc/MultiChannelCC");
const MultilevelSwitchCC_1 = require("@zwave-js/cc/MultilevelSwitchCC");
const NodeNamingCC_1 = require("@zwave-js/cc/NodeNamingCC");
const NotificationCC_1 = require("@zwave-js/cc/NotificationCC");
const PowerlevelCC_1 = require("@zwave-js/cc/PowerlevelCC");
const SceneActivationCC_1 = require("@zwave-js/cc/SceneActivationCC");
const Security2CC_1 = require("@zwave-js/cc/Security2CC");
const SecurityCC_1 = require("@zwave-js/cc/SecurityCC");
const VersionCC_1 = require("@zwave-js/cc/VersionCC");
const WakeUpCC_1 = require("@zwave-js/cc/WakeUpCC");
const ZWavePlusCC_1 = require("@zwave-js/cc/ZWavePlusCC");
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const arrays_1 = require("alcalzone-shared/arrays");
const deferred_promise_1 = require("alcalzone-shared/deferred-promise");
const math_1 = require("alcalzone-shared/math");
const strings_1 = require("alcalzone-shared/strings");
const typeguards_1 = require("alcalzone-shared/typeguards");
const crypto_1 = require("crypto");
const events_1 = require("events");
const util_1 = require("util");
const NetworkCache_1 = require("../driver/NetworkCache");
const StateMachineShared_1 = require("../driver/StateMachineShared");
const ApplicationUpdateRequest_1 = require("../serialapi/application/ApplicationUpdateRequest");
const GetNodeProtocolInfoMessages_1 = require("../serialapi/network-mgmt/GetNodeProtocolInfoMessages");
const RequestNodeInfoMessages_1 = require("../serialapi/network-mgmt/RequestNodeInfoMessages");
const DeviceClass_1 = require("./DeviceClass");
const Endpoint_1 = require("./Endpoint");
const HealthCheck_1 = require("./HealthCheck");
const NodeReadyMachine_1 = require("./NodeReadyMachine");
const NodeStatistics_1 = require("./NodeStatistics");
const NodeStatusMachine_1 = require("./NodeStatusMachine");
const nodeUtils = __importStar(require("./utils"));
const _Types_1 = require("./_Types");
/**
 * A ZWaveNode represents a node in a Z-Wave network. It is also an instance
 * of its root endpoint (index 0)
 */
let ZWaveNode = class ZWaveNode extends Endpoint_1.Endpoint {
    constructor(id, driver, deviceClass, supportedCCs = [], controlledCCs = [], valueDB) {
        // Define this node's intrinsic endpoint as the root device (0)
        super(id, driver, 0, deviceClass, supportedCCs);
        this.id = id;
        this._status = _Types_1.NodeStatus.Unknown;
        this._ready = false;
        /**
         * @internal
         * All polls that are currently scheduled for this node
         */
        this.scheduledPolls = new shared_1.ObjectKeyMap();
        /** Cache for this node's endpoint instances */
        this._endpointInstances = new Map();
        this._interviewAttempts = 0;
        this._hasEmittedNoS2NetworkKeyError = false;
        this._hasEmittedNoS0NetworkKeyError = false;
        this._refreshInfoPending = false;
        this.hasLoggedNoNetworkKey = false;
        this.busyPollingAfterHail = false;
        this.centralSceneForcedKeyUp = false;
        /**
         * Allows automatically resetting notification values to idle if the node does not do it itself
         */
        this.notificationIdleTimeouts = new Map();
        this.busySettingClock = false;
        this._firmwareUpdateInProgress = false;
        this.recentEntryControlNotificationSequenceNumbers = [];
        /**
         * Whether the node should be kept awake when there are no pending messages.
         */
        this.keepAwake = false;
        this.isSendingNoMoreInformation = false;
        this._valueDB =
            valueDB ?? new core_1.ValueDB(id, driver.valueDB, driver.metadataDB);
        // Pass value events to our listeners
        for (const event of [
            "value added",
            "value updated",
            "value removed",
            "value notification",
            "metadata updated",
        ]) {
            this._valueDB.on(event, this.translateValueEvent.bind(this, event));
        }
        // Also avoid verifying a value change for which we recently received an update
        for (const event of ["value updated", "value removed"]) {
            this._valueDB.on(event, (args) => {
                // Value updates caused by the driver should never cancel a scheduled poll
                if ("source" in args && args.source === "driver")
                    return;
                if (this.cancelScheduledPoll(args, args.newValue)) {
                    this.driver.controllerLog.logNode(this.nodeId, "Scheduled poll canceled because expected value was received", "verbose");
                }
            });
        }
        this.securityClasses = new core_1.CacheBackedMap(this.driver.networkCache, {
            prefix: NetworkCache_1.cacheKeys.node(this.id)._securityClassBaseKey + ".",
            suffixSerializer: (value) => (0, shared_1.getEnumMemberName)(core_1.SecurityClass, value),
            suffixDeserializer: (key) => {
                if (key in core_1.SecurityClass &&
                    typeof core_1.SecurityClass[key] === "number") {
                    return core_1.SecurityClass[key];
                }
            },
        });
        // Add optional controlled CCs - endpoints don't have this
        for (const cc of controlledCCs)
            this.addCC(cc, { isControlled: true });
        // Create and hook up the status machine
        this.statusMachine = (0, StateMachineShared_1.interpretEx)((0, NodeStatusMachine_1.createNodeStatusMachine)(this));
        this.statusMachine.onTransition((state) => {
            if (state.changed) {
                this.onStatusChange((0, NodeStatusMachine_1.nodeStatusMachineStateToNodeStatus)(state.value));
            }
        });
        this.statusMachine.start();
        this.readyMachine = (0, StateMachineShared_1.interpretEx)((0, NodeReadyMachine_1.createNodeReadyMachine)());
        this.readyMachine.onTransition((state) => {
            if (state.changed) {
                this.onReadyChange(state.value === "ready");
            }
        });
        this.readyMachine.start();
    }
    /**
     * Cleans up all resources used by this node
     */
    destroy() {
        // Stop all state machines
        this.statusMachine.stop();
        this.readyMachine.stop();
        // Remove all timeouts
        for (const timeout of [
            this.centralSceneKeyHeldDownContext?.timeout,
            ...this.notificationIdleTimeouts.values(),
        ]) {
            if (timeout)
                clearTimeout(timeout);
        }
        // Remove all event handlers
        this.removeAllListeners();
        // Clear all scheduled polls that would interfere with the interview
        for (const valueId of this.scheduledPolls.keys()) {
            this.cancelScheduledPoll(valueId);
        }
    }
    /**
     * Enhances the raw event args of the ValueDB so it can be consumed better by applications
     */
    translateValueEvent(eventName, arg) {
        // Try to retrieve the speaking CC name
        const outArg = nodeUtils.translateValueID(this.driver, this, arg);
        // This can happen for value updated events
        if ("source" in outArg)
            delete outArg.source;
        const loglevel = this.driver.getLogConfig().level;
        // If this is a metadata event, make sure we return the merged metadata
        if ("metadata" in outArg) {
            outArg.metadata =
                this.getValueMetadata(arg);
        }
        const ccInstance = cc_1.CommandClass.createInstanceUnchecked(this.driver, this, arg.commandClass);
        const isInternalValue = !!ccInstance?.isInternalValue(arg);
        // Check whether this value change may be logged
        const isSecretValue = !!ccInstance?.isSecretValue(arg);
        if (loglevel === "silly") {
            this.driver.controllerLog.logNode(this.id, {
                message: `[translateValueEvent: ${eventName}]
  commandClass: ${(0, core_1.getCCName)(arg.commandClass)}
  endpoint:     ${arg.endpoint}
  property:     ${arg.property}
  propertyKey:  ${arg.propertyKey}
  internal:     ${isInternalValue}
  secret:       ${isSecretValue}
  event source: ${arg.source}`,
                level: "silly",
            });
        }
        if (!isSecretValue &&
            arg.source !== "driver") {
            // Log the value change, except for updates caused by the driver itself
            // I don't like the splitting and any but its the easiest solution here
            const [changeTarget, changeType] = eventName.split(" ");
            const logArgument = {
                ...outArg,
                nodeId: this.nodeId,
                internal: isInternalValue,
            };
            if (changeTarget === "value") {
                this.driver.controllerLog.value(changeType, logArgument);
            }
            else if (changeTarget === "metadata") {
                this.driver.controllerLog.metadataUpdated(logArgument);
            }
        }
        //Don't expose value events for internal value IDs...
        if (isInternalValue)
            return;
        if (loglevel === "silly") {
            this.driver.controllerLog.logNode(this.id, {
                message: `[translateValueEvent: ${eventName}]
  is root endpoint:        ${!arg.endpoint}
  is application CC:       ${core_1.applicationCCs.includes(arg.commandClass)}
  should hide root values: ${nodeUtils.shouldHideRootApplicationCCValues(this.driver, this)}`,
                level: "silly",
            });
        }
        // ... and root values ID that mirrors endpoint functionality
        if (
        // Only root endpoint values need to be filtered
        !arg.endpoint &&
            // Only application CCs need to be filtered
            core_1.applicationCCs.includes(arg.commandClass) &&
            // and only if the endpoints are not unnecessary and the root values mirror them
            nodeUtils.shouldHideRootApplicationCCValues(this.driver, this)) {
            // Iterate through all possible non-root endpoints of this node and
            // check if there is a value ID that mirrors root endpoint functionality
            for (const endpoint of this.getEndpointIndizes()) {
                const possiblyMirroredValueID = {
                    // same CC, property and key
                    ...(0, shared_1.pick)(arg, ["commandClass", "property", "propertyKey"]),
                    // but different endpoint
                    endpoint,
                };
                if (this.valueDB.hasValue(possiblyMirroredValueID)) {
                    if (loglevel === "silly") {
                        this.driver.controllerLog.logNode(this.id, {
                            message: `[translateValueEvent: ${eventName}] found mirrored value ID on different endpoint, ignoring event:
  commandClass: ${(0, core_1.getCCName)(possiblyMirroredValueID.commandClass)}
  endpoint:     ${possiblyMirroredValueID.endpoint}
  property:     ${possiblyMirroredValueID.property}
  propertyKey:  ${possiblyMirroredValueID.propertyKey}`,
                            level: "silly",
                        });
                    }
                    return;
                }
            }
        }
        // And pass the translated event to our listeners
        this.emit(eventName, this, outArg);
    }
    onStatusChange(newStatus) {
        // Ignore duplicate events
        if (newStatus === this._status)
            return;
        const oldStatus = this._status;
        this._status = newStatus;
        if (this._status === _Types_1.NodeStatus.Asleep) {
            this.emit("sleep", this, oldStatus);
        }
        else if (this._status === _Types_1.NodeStatus.Awake) {
            this.emit("wake up", this, oldStatus);
        }
        else if (this._status === _Types_1.NodeStatus.Dead) {
            this.emit("dead", this, oldStatus);
        }
        else if (this._status === _Types_1.NodeStatus.Alive) {
            this.emit("alive", this, oldStatus);
        }
        // To be marked ready, a node must be known to be not dead.
        // This means that listening nodes must have communicated with us and
        // sleeping nodes are assumed to be ready
        this.readyMachine.send(this._status !== _Types_1.NodeStatus.Unknown &&
            this._status !== _Types_1.NodeStatus.Dead
            ? "NOT_DEAD"
            : "MAYBE_DEAD");
    }
    /**
     * Which status the node is believed to be in
     */
    get status() {
        return this._status;
    }
    /**
     * @internal
     * Marks this node as dead (if applicable)
     */
    markAsDead() {
        this.statusMachine.send("DEAD");
    }
    /**
     * @internal
     * Marks this node as alive (if applicable)
     */
    markAsAlive() {
        this.statusMachine.send("ALIVE");
    }
    /**
     * @internal
     * Marks this node as asleep (if applicable)
     */
    markAsAsleep() {
        this.statusMachine.send("ASLEEP");
    }
    /**
     * @internal
     * Marks this node as awake (if applicable)
     */
    markAsAwake() {
        this.statusMachine.send("AWAKE");
    }
    /** Returns a promise that resolves when the node wakes up the next time or immediately if the node is already awake. */
    waitForWakeup() {
        if (!this.canSleep || !this.supportsCC(core_1.CommandClasses["Wake Up"])) {
            throw new core_1.ZWaveError(`Node ${this.id} does not support wakeup!`, core_1.ZWaveErrorCodes.CC_NotSupported);
        }
        else if (this._status === _Types_1.NodeStatus.Awake) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this.once("wake up", () => resolve());
        });
    }
    onReadyChange(ready) {
        // Ignore duplicate events
        if (ready === this._ready)
            return;
        this._ready = ready;
        if (ready)
            this.emit("ready", this);
    }
    /**
     * Whether the node is ready to be used
     */
    get ready() {
        return this._ready;
    }
    /** Whether this node is always listening or not */
    get isListening() {
        return this.driver.cacheGet(NetworkCache_1.cacheKeys.node(this.id).isListening);
    }
    set isListening(value) {
        this.driver.cacheSet(NetworkCache_1.cacheKeys.node(this.id).isListening, value);
    }
    /** Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't. */
    get isFrequentListening() {
        return this.driver.cacheGet(NetworkCache_1.cacheKeys.node(this.id).isFrequentListening);
    }
    set isFrequentListening(value) {
        this.driver.cacheSet(NetworkCache_1.cacheKeys.node(this.id).isFrequentListening, value);
    }
    get canSleep() {
        // The controller node can never sleep (apparently it can report otherwise though)
        if (this.isControllerNode)
            return false;
        if (this.isListening == undefined)
            return undefined;
        if (this.isFrequentListening == undefined)
            return undefined;
        return !this.isListening && !this.isFrequentListening;
    }
    /** Whether the node supports routing/forwarding messages. */
    get isRouting() {
        return this.driver.cacheGet(NetworkCache_1.cacheKeys.node(this.id).isRouting);
    }
    set isRouting(value) {
        this.driver.cacheSet(NetworkCache_1.cacheKeys.node(this.id).isRouting, value);
    }
    get supportedDataRates() {
        return this.driver.cacheGet(NetworkCache_1.cacheKeys.node(this.id).supportedDataRates);
    }
    set supportedDataRates(value) {
        this.driver.cacheSet(NetworkCache_1.cacheKeys.node(this.id).supportedDataRates, value);
    }
    get maxDataRate() {
        if (this.supportedDataRates) {
            return Math.max(...this.supportedDataRates);
        }
    }
    /**
     * The device specific key (DSK) of this node in binary format.
     * This is only set if included with Security S2.
     */
    get dsk() {
        return this.driver.cacheGet(NetworkCache_1.cacheKeys.node(this.id).dsk);
    }
    /** @internal */
    set dsk(value) {
        const cacheKey = NetworkCache_1.cacheKeys.node(this.id).dsk;
        this.driver.cacheSet(cacheKey, value);
    }
    /** Whether the node was granted at least one security class */
    get isSecure() {
        const securityClass = this.getHighestSecurityClass();
        if (securityClass == undefined)
            return core_1.unknownBoolean;
        if (securityClass === core_1.SecurityClass.None)
            return false;
        return true;
    }
    hasSecurityClass(securityClass) {
        return this.securityClasses.get(securityClass) ?? core_1.unknownBoolean;
    }
    setSecurityClass(securityClass, granted) {
        this.securityClasses.set(securityClass, granted);
    }
    /** Returns the highest security class this node was granted or `undefined` if that information isn't known yet */
    getHighestSecurityClass() {
        if (this.securityClasses.size === 0)
            return undefined;
        let missingSome = false;
        for (const secClass of core_1.securityClassOrder) {
            if (this.securityClasses.get(secClass) === true)
                return secClass;
            if (!this.securityClasses.has(secClass)) {
                missingSome = true;
            }
        }
        // If we don't have the info for every security class, we don't know the highest one yet
        return missingSome ? undefined : core_1.SecurityClass.None;
    }
    /** The Z-Wave protocol version this node implements */
    get protocolVersion() {
        return this.driver.cacheGet(NetworkCache_1.cacheKeys.node(this.id).protocolVersion);
    }
    set protocolVersion(value) {
        this.driver.cacheSet(NetworkCache_1.cacheKeys.node(this.id).protocolVersion, value);
    }
    /** Whether this node is a controller (can calculate routes) or an end node (relies on route info) */
    get nodeType() {
        return this.driver.cacheGet(NetworkCache_1.cacheKeys.node(this.id).nodeType);
    }
    set nodeType(value) {
        this.driver.cacheSet(NetworkCache_1.cacheKeys.node(this.id).nodeType, value);
    }
    /**
     * Whether this node supports security (S0 or S2).
     * **WARNING:** Nodes often report this incorrectly - do not blindly trust it.
     */
    get supportsSecurity() {
        return this.driver.cacheGet(NetworkCache_1.cacheKeys.node(this.id).supportsSecurity);
    }
    set supportsSecurity(value) {
        this.driver.cacheSet(NetworkCache_1.cacheKeys.node(this.id).supportsSecurity, value);
    }
    /** Whether this node can issue wakeup beams to FLiRS nodes */
    get supportsBeaming() {
        return this.driver.cacheGet(NetworkCache_1.cacheKeys.node(this.id).supportsBeaming);
    }
    set supportsBeaming(value) {
        this.driver.cacheSet(NetworkCache_1.cacheKeys.node(this.id).supportsBeaming, value);
    }
    get manufacturerId() {
        return this.getValue(ManufacturerSpecificCC_1.ManufacturerSpecificCCValues.manufacturerId.id);
    }
    get productId() {
        return this.getValue(ManufacturerSpecificCC_1.ManufacturerSpecificCCValues.productId.id);
    }
    get productType() {
        return this.getValue(ManufacturerSpecificCC_1.ManufacturerSpecificCCValues.productType.id);
    }
    get firmwareVersion() {
        // On supporting nodes, use the applicationVersion, which MUST be
        // same as the first (main) firmware, plus the patch version.
        const firmware0Version = this.getValue(VersionCC_1.VersionCCValues.firmwareVersions.id)?.[0];
        const applicationVersion = this.getValue(VersionCC_1.VersionCCValues.applicationVersion.id);
        let ret = firmware0Version;
        if (applicationVersion) {
            // If the application version is set, we cannot blindly trust that it is the firmware version.
            // Some nodes incorrectly set this field to the Z-Wave Application Framework API Version
            if (!ret || applicationVersion.startsWith(`${ret}.`)) {
                ret = applicationVersion;
            }
        }
        // Special case for the official 700 series firmwares which are aligned with the SDK version
        // We want to work with the full x.y.z firmware version here.
        if (ret && this.isControllerNode) {
            const sdkVersion = this.sdkVersion;
            if (sdkVersion && sdkVersion.startsWith(`${ret}.`)) {
                return sdkVersion;
            }
        }
        // For all others, just return the simple x.y firmware version
        return ret;
    }
    get sdkVersion() {
        return this.getValue(VersionCC_1.VersionCCValues.sdkVersion.id);
    }
    get zwavePlusVersion() {
        return this.getValue(ZWavePlusCC_1.ZWavePlusCCValues.zwavePlusVersion.id);
    }
    get zwavePlusNodeType() {
        return this.getValue(ZWavePlusCC_1.ZWavePlusCCValues.nodeType.id);
    }
    get zwavePlusRoleType() {
        return this.getValue(ZWavePlusCC_1.ZWavePlusCCValues.roleType.id);
    }
    get supportsWakeUpOnDemand() {
        return this.getValue(WakeUpCC_1.WakeUpCCValues.wakeUpOnDemandSupported.id);
    }
    /**
     * The user-defined name of this node. Uses the value reported by `Node Naming and Location CC` if it exists.
     *
     * **Note:** Setting this value only updates the name locally. To permanently change the name of the node, use
     * the `commandClasses` API.
     */
    get name() {
        return this.getValue(NodeNamingCC_1.NodeNamingAndLocationCCValues.name.id);
    }
    set name(value) {
        if (value != undefined) {
            this._valueDB.setValue(NodeNamingCC_1.NodeNamingAndLocationCCValues.name.id, value);
        }
        else {
            this._valueDB.removeValue(NodeNamingCC_1.NodeNamingAndLocationCCValues.name.id);
        }
    }
    /**
     * The user-defined location of this node. Uses the value reported by `Node Naming and Location CC` if it exists.
     *
     * **Note:** Setting this value only updates the location locally. To permanently change the location of the node, use
     * the `commandClasses` API.
     */
    get location() {
        return this.getValue(NodeNamingCC_1.NodeNamingAndLocationCCValues.location.id);
    }
    set location(value) {
        if (value != undefined) {
            this._valueDB.setValue(NodeNamingCC_1.NodeNamingAndLocationCCValues.location.id, value);
        }
        else {
            this._valueDB.removeValue(NodeNamingCC_1.NodeNamingAndLocationCCValues.location.id);
        }
    }
    /** Whether a SUC return route was configured for this node */
    get hasSUCReturnRoute() {
        return !!this.driver.cacheGet(NetworkCache_1.cacheKeys.node(this.id).hasSUCReturnRoute);
    }
    set hasSUCReturnRoute(value) {
        this.driver.cacheSet(NetworkCache_1.cacheKeys.node(this.id).hasSUCReturnRoute, value);
    }
    /**
     * Contains additional information about this node, loaded from a config file
     */
    get deviceConfig() {
        return this._deviceConfig;
    }
    get label() {
        return this._deviceConfig?.label;
    }
    get deviceDatabaseUrl() {
        if (this.manufacturerId != undefined &&
            this.productType != undefined &&
            this.productId != undefined) {
            const manufacturerId = (0, shared_1.formatId)(this.manufacturerId);
            const productType = (0, shared_1.formatId)(this.productType);
            const productId = (0, shared_1.formatId)(this.productId);
            const firmwareVersion = this.firmwareVersion || "0.0";
            return `https://devices.zwave-js.io/?jumpTo=${manufacturerId}:${productType}:${productId}:${firmwareVersion}`;
        }
    }
    /**
     * Provides access to this node's values
     * @internal
     */
    get valueDB() {
        return this._valueDB;
    }
    /**
     * Retrieves a stored value for a given value id.
     * This does not request an updated value from the node!
     */
    getValue(valueId) {
        return this._valueDB.getValue(valueId);
    }
    /**
     * Returns when the given value id was last updated by an update from the node.
     */
    getValueTimestamp(valueId) {
        return this._valueDB.getTimestamp(valueId);
    }
    /**
     * Retrieves metadata for a given value id.
     * This can be used to enhance the user interface of an application
     */
    getValueMetadata(valueId) {
        // Check if a corresponding CC value is defined for this value ID
        // so we can extend the returned metadata
        const definedCCValues = (0, cc_1.getCCValues)(valueId.commandClass);
        let valueOptions;
        let meta;
        if (definedCCValues) {
            const value = Object.values(definedCCValues).find((v) => v?.is(valueId));
            if (value && typeof value !== "function") {
                meta = value.meta;
                valueOptions = value.options;
            }
        }
        // The priority for returned metadata is valueDB > defined value > Any (default)
        return {
            ...(this._valueDB.getMetadata(valueId) ??
                meta ??
                core_1.ValueMetadata.Any),
            // Don't allow overriding these flags:
            stateful: valueOptions?.stateful ?? cc_1.defaultCCValueOptions.stateful,
            secret: valueOptions?.secret ?? cc_1.defaultCCValueOptions.secret,
        };
    }
    /** Returns a list of all value names that are defined on all endpoints of this node */
    getDefinedValueIDs() {
        return nodeUtils.getDefinedValueIDs(this.driver, this);
    }
    /**
     * Updates a value for a given property of a given CommandClass on the node.
     * This will communicate with the node!
     */
    async setValue(valueId, value, options) {
        // Ensure we're dealing with a valid value ID, with no extra properties
        valueId = (0, core_1.normalizeValueID)(valueId);
        // Try to retrieve the corresponding CC API
        const loglevel = this.driver.getLogConfig().level;
        try {
            // Access the CC API by name
            const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
            if (!endpointInstance)
                return false;
            const api = endpointInstance.commandClasses[valueId.commandClass];
            // Check if the setValue method is implemented
            if (!api.setValue)
                return false;
            if (loglevel === "silly") {
                this.driver.controllerLog.logNode(this.id, {
                    message: `[setValue] calling SET_VALUE API ${api.constructor.name}:
  property:     ${valueId.property}
  property key: ${valueId.propertyKey}
  optimistic:   ${api.isSetValueOptimistic(valueId)}`,
                    level: "silly",
                });
            }
            // And call it
            const result = await api.setValue({
                property: valueId.property,
                propertyKey: valueId.propertyKey,
            }, value, options);
            if (loglevel === "silly") {
                let message = `[setValue] result of SET_VALUE API call for ${api.constructor.name}:`;
                if (result) {
                    if ((0, core_1.isSupervisionResult)(result)) {
                        message += ` (SupervisionResult)
  status:   ${(0, shared_1.getEnumMemberName)(core_1.SupervisionStatus, result.status)}`;
                        if (result.remainingDuration) {
                            message += `
  duration: ${result.remainingDuration.toString()}`;
                        }
                    }
                    else {
                        message +=
                            " (other) " + JSON.stringify(result, null, 2);
                    }
                }
                else {
                    message += " undefined";
                }
                this.driver.controllerLog.logNode(this.id, {
                    message,
                    level: "silly",
                });
            }
            // Remember the new value if...
            // ... the call did not throw (assume that the call was successful)
            // ... the call was supervised and successful
            if (api.isSetValueOptimistic(valueId) &&
                (0, core_1.isUnsupervisedOrSucceeded)(result)) {
                const emitEvent = !!result ||
                    !!this.driver.options.emitValueUpdateAfterSetValue;
                if (loglevel === "silly") {
                    const message = emitEvent
                        ? "updating value with event"
                        : "updating value without event";
                    this.driver.controllerLog.logNode(this.id, {
                        message: `[setValue] ${message}`,
                        level: "silly",
                    });
                }
                const options = {};
                // We need to emit an event if applications opted in, or if this was a supervised call
                // because in this case there won't be a verification query which would result in an update
                if (emitEvent) {
                    options.source = "driver";
                }
                else {
                    options.noEvent = true;
                }
                // Only update the timestamp of the value for successful supervised commands. Otherwise we don't know
                // if the command was actually executed. If it wasn't, we'd have a wrong timestamp.
                options.updateTimestamp = (0, core_1.supervisedCommandSucceeded)(result);
                this._valueDB.setValue(valueId, value, options);
            }
            else if (loglevel === "silly") {
                this.driver.controllerLog.logNode(this.id, {
                    message: `[setValue] not updating value`,
                    level: "silly",
                });
            }
            return (0, core_1.isUnsupervisedOrSucceeded)(result);
        }
        catch (e) {
            // Define which errors during setValue are expected and won't crash
            // the driver:
            if ((0, core_1.isZWaveError)(e)) {
                let handled = false;
                let emitErrorEvent = false;
                switch (e.code) {
                    // This CC or API is not implemented
                    case core_1.ZWaveErrorCodes.CC_NotImplemented:
                    case core_1.ZWaveErrorCodes.CC_NoAPI:
                        handled = true;
                        break;
                    // A user tried to set an invalid value
                    case core_1.ZWaveErrorCodes.Argument_Invalid:
                        handled = true;
                        emitErrorEvent = true;
                        break;
                }
                if (loglevel === "silly") {
                    this.driver.controllerLog.logNode(this.id, {
                        message: `[setValue] raised ZWaveError (${handled ? "handled" : "not handled"}, code ${(0, shared_1.getEnumMemberName)(core_1.ZWaveErrorCodes, e.code)}): ${e.message}`,
                        level: "silly",
                    });
                }
                if (emitErrorEvent)
                    this.driver.emit("error", e);
                if (handled)
                    return false;
            }
            throw e;
        }
    }
    /**
     * Requests a value for a given property of a given CommandClass by polling the node.
     * **Warning:** Some value IDs share a command, so make sure not to blindly call this for every property
     */
    pollValue(valueId, sendCommandOptions = {}) {
        // Ensure we're dealing with a valid value ID, with no extra properties
        valueId = (0, core_1.normalizeValueID)(valueId);
        // Try to retrieve the corresponding CC API
        const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
        if (!endpointInstance) {
            throw new core_1.ZWaveError(`Endpoint ${valueId.endpoint} does not exist on Node ${this.id}`, core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const api = endpointInstance.commandClasses[valueId.commandClass].withOptions({
            // We do not want to delay more important communication by polling, so give it
            // the lowest priority and don't retry unless overwritten by the options
            maxSendAttempts: 1,
            priority: core_1.MessagePriority.Poll,
            ...sendCommandOptions,
        });
        // Check if the pollValue method is implemented
        if (!api.pollValue) {
            throw new core_1.ZWaveError(`The pollValue API is not implemented for CC ${(0, core_1.getCCName)(valueId.commandClass)}!`, core_1.ZWaveErrorCodes.CC_NoAPI);
        }
        // And call it
        return api.pollValue({
            property: valueId.property,
            propertyKey: valueId.propertyKey,
        });
    }
    /**
     * @internal
     * Schedules a value to be polled after a given time. Only one schedule can be active for a given value ID.
     * @returns `true` if the poll was scheduled, `false` otherwise
     */
    schedulePoll(valueId, options = {}) {
        const { timeoutMs = this.driver.options.timeouts.refreshValue, expectedValue, } = options;
        // Avoid false positives or false negatives due to a mis-formatted value ID
        valueId = (0, core_1.normalizeValueID)(valueId);
        // Try to retrieve the corresponding CC API
        const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
        if (!endpointInstance)
            return false;
        const api = endpointInstance.commandClasses[valueId.commandClass].withOptions({
            // We do not want to delay more important communication by polling, so give it
            // the lowest priority and don't retry unless overwritten by the options
            maxSendAttempts: 1,
            priority: core_1.MessagePriority.Poll,
        });
        // Check if the pollValue method is implemented
        if (!api.pollValue)
            return false;
        // make sure there is only one timeout instance per poll
        this.cancelScheduledPoll(valueId);
        const timeout = setTimeout(async () => {
            // clean up after the timeout
            this.cancelScheduledPoll(valueId);
            try {
                await api.pollValue(valueId);
            }
            catch {
                /* ignore */
            }
        }, timeoutMs).unref();
        this.scheduledPolls.set(valueId, { timeout, expectedValue });
        return true;
    }
    /**
     * @internal
     * Cancels a poll that has been scheduled with schedulePoll.
     *
     * @param actualValue If given, this indicates the value that was received by a node, which triggered the poll to be canceled.
     * If the scheduled poll expects a certain value and this matches the expected value for the scheduled poll, the poll will be canceled.
     */
    cancelScheduledPoll(valueId, actualValue) {
        // Avoid false positives or false negatives due to a mis-formatted value ID
        valueId = (0, core_1.normalizeValueID)(valueId);
        const poll = this.scheduledPolls.get(valueId);
        if (!poll)
            return false;
        if (actualValue != undefined &&
            poll.expectedValue != undefined &&
            !(0, util_1.isDeepStrictEqual)(poll.expectedValue, actualValue)) {
            return false;
        }
        clearTimeout(poll.timeout);
        this.scheduledPolls.delete(valueId);
        return true;
    }
    get endpointCountIsDynamic() {
        return nodeUtils.endpointCountIsDynamic(this.driver, this);
    }
    get endpointsHaveIdenticalCapabilities() {
        return nodeUtils.endpointsHaveIdenticalCapabilities(this.driver, this);
    }
    get individualEndpointCount() {
        return nodeUtils.getIndividualEndpointCount(this.driver, this);
    }
    get aggregatedEndpointCount() {
        return nodeUtils.getAggregatedEndpointCount(this.driver, this);
    }
    /** Returns the device class of an endpoint. Falls back to the node's device class if the information is not known. */
    getEndpointDeviceClass(index) {
        const deviceClass = this.getValue(MultiChannelCC_1.MultiChannelCCValues.endpointDeviceClass.endpoint(this.endpointsHaveIdenticalCapabilities ? 1 : index));
        if (deviceClass && this.deviceClass) {
            return new DeviceClass_1.DeviceClass(this.driver.configManager, this.deviceClass.basic.key, deviceClass.generic, deviceClass.specific);
        }
        // fall back to the node's device class if it is known
        return this.deviceClass;
    }
    getEndpointCCs(index) {
        const ret = this.getValue(MultiChannelCC_1.MultiChannelCCValues.endpointCCs.endpoint(this.endpointsHaveIdenticalCapabilities ? 1 : index));
        // Workaround for the change in #1977
        if ((0, typeguards_1.isArray)(ret)) {
            // The value is set up correctly, return it
            return ret;
        }
        else if ((0, typeguards_1.isObject)(ret) && "supportedCCs" in ret) {
            return ret.supportedCCs;
        }
    }
    /**
     * Returns the current endpoint count of this node.
     *
     * If you want to enumerate the existing endpoints, use `getEndpointIndizes` instead.
     * Some devices are known to contradict themselves.
     */
    getEndpointCount() {
        return nodeUtils.getEndpointCount(this.driver, this);
    }
    /**
     * Returns indizes of all endpoints on the node.
     */
    getEndpointIndizes() {
        return nodeUtils.getEndpointIndizes(this.driver, this);
    }
    /** Whether the Multi Channel CC has been interviewed and all endpoint information is known */
    get isMultiChannelInterviewComplete() {
        return nodeUtils.isMultiChannelInterviewComplete(this.driver, this);
    }
    getEndpoint(index) {
        if (index < 0)
            throw new core_1.ZWaveError("The endpoint index must be positive!", core_1.ZWaveErrorCodes.Argument_Invalid);
        // Zero is the root endpoint - i.e. this node
        if (index === 0)
            return this;
        // Check if the Multi Channel CC interview for this node is completed,
        // because we don't have all the information before that
        if (!this.isMultiChannelInterviewComplete) {
            this.driver.driverLog.print(`Node ${this.nodeId}, Endpoint ${index}: Trying to access endpoint instance before Multi Channel interview`, "error");
            return undefined;
        }
        // Check if the endpoint index is in the list of known endpoint indizes
        if (!this.getEndpointIndizes().includes(index))
            return undefined;
        // Create an endpoint instance if it does not exist
        if (!this._endpointInstances.has(index)) {
            this._endpointInstances.set(index, new Endpoint_1.Endpoint(this.id, this.driver, index, this.getEndpointDeviceClass(index), this.getEndpointCCs(index)));
        }
        return this._endpointInstances.get(index);
    }
    getEndpointOrThrow(index) {
        const ret = this.getEndpoint(index);
        if (!ret) {
            throw new core_1.ZWaveError(`Endpoint ${index} does not exist on Node ${this.id}`, core_1.ZWaveErrorCodes.Controller_EndpointNotFound);
        }
        return ret;
    }
    /** Returns a list of all endpoints of this node, including the root endpoint (index 0) */
    getAllEndpoints() {
        return nodeUtils.getAllEndpoints(this.driver, this);
    }
    /**
     * This tells us which interview stage was last completed
     */
    get interviewStage() {
        return (this.driver.cacheGet(NetworkCache_1.cacheKeys.node(this.id).interviewStage) ??
            _Types_1.InterviewStage.None);
    }
    set interviewStage(value) {
        this.driver.cacheSet(NetworkCache_1.cacheKeys.node(this.id).interviewStage, value);
    }
    /** How many attempts to interview this node have already been made */
    get interviewAttempts() {
        return this._interviewAttempts;
    }
    /** Returns whether this node is the controller */
    get isControllerNode() {
        return this.id === this.driver.controller.ownNodeId;
    }
    /**
     * Starts or resumes a deferred initial interview of this node.
     *
     * **WARNING:** This is only allowed when the initial interview was deferred using the
     * `interview.disableOnNodeAdded` option. Otherwise, this method will throw an error.
     *
     * **NOTE:** It is advised to NOT await this method as it can take a very long time (minutes to hours)!
     */
    async interview() {
        // The initial interview of the controller node is always done
        // and cannot be deferred.
        if (this.isControllerNode)
            return;
        if (!this.driver.options.interview?.disableOnNodeAdded) {
            throw new core_1.ZWaveError(`Calling ZWaveNode.interview() is not allowed because automatic node interviews are enabled. Wait for the driver to interview the node or use ZWaveNode.refreshInfo() to re-interview a node.`, core_1.ZWaveErrorCodes.Driver_FeatureDisabled);
        }
        return this.driver.interviewNodeInternal(this);
    }
    /**
     * Resets all information about this node and forces a fresh interview.
     * **Note:** This does nothing for the controller node.
     *
     * **WARNING:** Take care NOT to call this method when the node is already being interviewed.
     * Otherwise the node information may become inconsistent.
     */
    async refreshInfo(options = {}) {
        // It does not make sense to re-interview the controller. All important information is queried
        // directly via the serial API
        if (this.isControllerNode)
            return;
        // The driver does deduplicate re-interview requests, but only at the end of this method.
        // Without blocking here, many re-interview tasks for sleeping nodes may be queued, leading to parallel interviews
        if (this._refreshInfoPending)
            return;
        this._refreshInfoPending = true;
        const { resetSecurityClasses = false, waitForWakeup = true } = options;
        // Unless desired, don't forget the information about sleeping nodes immediately, so they continue to function
        let didWakeUp = false;
        if (waitForWakeup &&
            this.canSleep &&
            this.supportsCC(core_1.CommandClasses["Wake Up"])) {
            didWakeUp = await this.waitForWakeup()
                .then(() => true)
                .catch(() => false);
        }
        // preserve the node name and location, since they might not be stored on the node
        const name = this.name;
        const location = this.location;
        // Force a new detection of security classes if desired
        if (resetSecurityClasses)
            this.securityClasses.clear();
        this._interviewAttempts = 0;
        this.interviewStage = _Types_1.InterviewStage.None;
        this._ready = false;
        this.deviceClass = undefined;
        this.isListening = undefined;
        this.isFrequentListening = undefined;
        this.isRouting = undefined;
        this.supportedDataRates = undefined;
        this.protocolVersion = undefined;
        this.nodeType = undefined;
        this.supportsSecurity = undefined;
        this.supportsBeaming = undefined;
        this._deviceConfig = undefined;
        this._hasEmittedNoS0NetworkKeyError = false;
        this._hasEmittedNoS2NetworkKeyError = false;
        this._valueDB.clear({ noEvent: true });
        this._endpointInstances.clear();
        super.reset();
        // Restart all state machines
        this.readyMachine.restart();
        this.statusMachine.restart();
        // Remove queued polls that would interfere with the interview
        for (const valueId of this.scheduledPolls.keys()) {
            this.cancelScheduledPoll(valueId);
        }
        // Restore the previously saved name/location
        if (name != undefined)
            this.name = name;
        if (location != undefined)
            this.location = location;
        // Don't keep the node awake after the interview
        this.keepAwake = false;
        // If we did wait for the wakeup, mark the node as awake again so it does not
        // get considered asleep after querying protocol info.
        if (didWakeUp)
            this.markAsAwake();
        void this.driver.interviewNodeInternal(this);
        this._refreshInfoPending = false;
    }
    /**
     * @internal
     * Interviews this node. Returns true when it succeeded, false otherwise
     *
     * WARNING: Do not call this method from application code. To refresh the information
     * for a specific node, use `node.refreshInfo()` instead
     */
    async interviewInternal() {
        if (this.interviewStage === _Types_1.InterviewStage.Complete) {
            this.driver.controllerLog.logNode(this.id, `skipping interview because it is already completed`);
            return true;
        }
        else {
            this.driver.controllerLog.interviewStart(this);
        }
        // Remember that we tried to interview this node
        this._interviewAttempts++;
        // Wrapper around interview methods to return false in case of a communication error
        // This way the single methods don't all need to have the same error handler
        const tryInterviewStage = async (method) => {
            try {
                await method();
                return true;
            }
            catch (e) {
                if ((0, core_1.isTransmissionError)(e)) {
                    return false;
                }
                throw e;
            }
        };
        // The interview is done in several stages. At each point, the interview process might be aborted
        // due to a stage failing. The reached stage is saved, so we can continue it later without
        // repeating stages unnecessarily
        if (this.interviewStage === _Types_1.InterviewStage.None) {
            // do a full interview starting with the protocol info
            this.driver.controllerLog.logNode(this.id, `new node, doing a full interview...`);
            this.emit("interview started", this);
            await this.queryProtocolInfo();
        }
        if (!this.isControllerNode) {
            if ((this.isListening || this.isFrequentListening) &&
                this.status !== _Types_1.NodeStatus.Alive) {
                // Ping non-sleeping nodes to determine their status
                await this.ping();
            }
            if (this.interviewStage === _Types_1.InterviewStage.ProtocolInfo) {
                if (!(await tryInterviewStage(() => this.interviewNodeInfo()))) {
                    return false;
                }
            }
            // At this point the basic interview of new nodes is done. Start here when re-interviewing known nodes
            // to get updated information about command classes
            if (this.interviewStage === _Types_1.InterviewStage.NodeInfo) {
                // Only advance the interview if it was completed, otherwise abort
                if (await this.interviewCCs()) {
                    this.setInterviewStage(_Types_1.InterviewStage.CommandClasses);
                }
                else {
                    return false;
                }
            }
        }
        if ((this.isControllerNode &&
            this.interviewStage === _Types_1.InterviewStage.ProtocolInfo) ||
            (!this.isControllerNode &&
                this.interviewStage === _Types_1.InterviewStage.CommandClasses)) {
            // Load a config file for this node if it exists and overwrite the previously reported information
            await this.overwriteConfig();
        }
        this.setInterviewStage(_Types_1.InterviewStage.Complete);
        this.readyMachine.send("INTERVIEW_DONE");
        // Tell listeners that the interview is completed
        // The driver will then send this node to sleep
        this.emit("interview completed", this);
        return true;
    }
    /** Updates this node's interview stage and saves to cache when appropriate */
    setInterviewStage(completedStage) {
        this.interviewStage = completedStage;
        this.emit("interview stage completed", this, (0, shared_1.getEnumMemberName)(_Types_1.InterviewStage, completedStage));
        this.driver.controllerLog.interviewStage(this);
    }
    /** Step #1 of the node interview */
    async queryProtocolInfo() {
        this.driver.controllerLog.logNode(this.id, {
            message: "querying protocol info...",
            direction: "outbound",
        });
        const resp = await this.driver.sendMessage(new GetNodeProtocolInfoMessages_1.GetNodeProtocolInfoRequest(this.driver, {
            requestedNodeId: this.id,
        }));
        this.isListening = resp.isListening;
        this.isFrequentListening = resp.isFrequentListening;
        this.isRouting = resp.isRouting;
        this.supportedDataRates = resp.supportedDataRates;
        this.protocolVersion = resp.protocolVersion;
        this.nodeType = resp.nodeType;
        this.supportsSecurity = resp.supportsSecurity;
        this.supportsBeaming = resp.supportsBeaming;
        const deviceClass = new DeviceClass_1.DeviceClass(this.driver.configManager, resp.basicDeviceClass, resp.genericDeviceClass, resp.specificDeviceClass);
        this.applyDeviceClass(deviceClass);
        const logMessage = `received response for protocol info:
basic device class:    ${this.deviceClass.basic.label}
generic device class:  ${this.deviceClass.generic.label}
specific device class: ${this.deviceClass.specific.label}
node type:             ${(0, shared_1.getEnumMemberName)(core_1.NodeType, this.nodeType)}
is always listening:   ${this.isListening}
is frequent listening: ${this.isFrequentListening}
can route messages:    ${this.isRouting}
supports security:     ${this.supportsSecurity}
supports beaming:      ${this.supportsBeaming}
maximum data rate:     ${this.maxDataRate} kbps
protocol version:      ${this.protocolVersion}`;
        this.driver.controllerLog.logNode(this.id, {
            message: logMessage,
            direction: "inbound",
        });
        // Assume that sleeping nodes start asleep (unless we know it is awake)
        if (this.canSleep) {
            if (this.status === _Types_1.NodeStatus.Alive) {
                // If it was just included and is currently communicating with us,
                // then we didn't know yet that it can sleep. So we need to switch from alive/dead to awake/asleep
                this.markAsAwake();
            }
            else if (this.status !== _Types_1.NodeStatus.Awake) {
                this.markAsAsleep();
            }
        }
        this.setInterviewStage(_Types_1.InterviewStage.ProtocolInfo);
    }
    /** Node interview: pings the node to see if it responds */
    async ping() {
        if (this.isControllerNode) {
            this.driver.controllerLog.logNode(this.id, "is the controller node, cannot ping", "warn");
            return true;
        }
        this.driver.controllerLog.logNode(this.id, {
            message: "pinging the node...",
            direction: "outbound",
        });
        try {
            await this.commandClasses["No Operation"].send();
            this.driver.controllerLog.logNode(this.id, {
                message: "ping successful",
                direction: "inbound",
            });
            return true;
        }
        catch (e) {
            this.driver.controllerLog.logNode(this.id, `ping failed: ${(0, shared_1.getErrorMessage)(e)}`);
            return false;
        }
    }
    /**
     * Step #5 of the node interview
     * Request node info
     */
    async interviewNodeInfo() {
        if (this.isControllerNode) {
            this.driver.controllerLog.logNode(this.id, "is the controller node, cannot query node info", "warn");
            return;
        }
        this.driver.controllerLog.logNode(this.id, {
            message: "querying node info...",
            direction: "outbound",
        });
        try {
            const nodeInfo = await this.requestNodeInfo();
            const logLines = ["node info received", "supported CCs:"];
            for (const cc of nodeInfo.supportedCCs) {
                const ccName = core_1.CommandClasses[cc];
                logLines.push(`· ${ccName ? ccName : (0, shared_1.num2hex)(cc)}`);
            }
            this.driver.controllerLog.logNode(this.id, {
                message: logLines.join("\n"),
                direction: "inbound",
            });
            this.updateNodeInfo(nodeInfo);
        }
        catch (e) {
            if ((0, core_1.isZWaveError)(e) &&
                (e.code === core_1.ZWaveErrorCodes.Controller_ResponseNOK ||
                    e.code === core_1.ZWaveErrorCodes.Controller_CallbackNOK)) {
                this.driver.controllerLog.logNode(this.id, `Querying the node info failed`, "error");
            }
            throw e;
        }
        this.setInterviewStage(_Types_1.InterviewStage.NodeInfo);
    }
    async requestNodeInfo() {
        const resp = await this.driver.sendMessage(new RequestNodeInfoMessages_1.RequestNodeInfoRequest(this.driver, { nodeId: this.id }));
        if (resp instanceof RequestNodeInfoMessages_1.RequestNodeInfoResponse && !resp.wasSent) {
            // TODO: handle this in SendThreadMachine
            throw new core_1.ZWaveError(`Querying the node info failed`, core_1.ZWaveErrorCodes.Controller_ResponseNOK);
        }
        else if (resp instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequestNodeInfoRequestFailed) {
            // TODO: handle this in SendThreadMachine
            throw new core_1.ZWaveError(`Querying the node info failed`, core_1.ZWaveErrorCodes.Controller_CallbackNOK);
        }
        else if (resp instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequestNodeInfoReceived) {
            const logLines = ["node info received", "supported CCs:"];
            for (const cc of resp.nodeInformation.supportedCCs) {
                const ccName = core_1.CommandClasses[cc];
                logLines.push(`· ${ccName ? ccName : (0, shared_1.num2hex)(cc)}`);
            }
            this.driver.controllerLog.logNode(this.id, {
                message: logLines.join("\n"),
                direction: "inbound",
            });
            return resp.nodeInformation;
        }
        throw new core_1.ZWaveError(`Received unexpected response to RequestNodeInfoRequest`, core_1.ZWaveErrorCodes.Controller_CommandError);
    }
    /**
     * Loads the device configuration for this node from a config file
     */
    async loadDeviceConfig() {
        // But the configuration definitions might change
        if (this.manufacturerId != undefined &&
            this.productType != undefined &&
            this.productId != undefined) {
            // Try to load the config file
            this._deviceConfig = await this.driver.configManager.lookupDevice(this.manufacturerId, this.productType, this.productId, this.firmwareVersion);
            if (this._deviceConfig) {
                this.driver.controllerLog.logNode(this.id, `${this._deviceConfig.isEmbedded
                    ? "Embedded"
                    : "User-provided"} device config loaded`);
            }
            else {
                this.driver.controllerLog.logNode(this.id, "No device config found", "warn");
            }
        }
    }
    /** Step #? of the node interview */
    async interviewCCs() {
        if (this.isControllerNode) {
            this.driver.controllerLog.logNode(this.id, "is the controller node, cannot interview CCs", "warn");
            return true;
        }
        /**
         * @param force When this is `true`, the interview will be attempted even when the CC is not supported by the endpoint.
         */
        const interviewEndpoint = async (endpoint, cc, force = false) => {
            let instance;
            try {
                if (force) {
                    instance = cc_1.CommandClass.createInstanceUnchecked(this.driver, endpoint, cc);
                }
                else {
                    instance = endpoint.createCCInstance(cc);
                }
            }
            catch (e) {
                if ((0, core_1.isZWaveError)(e) &&
                    e.code === core_1.ZWaveErrorCodes.CC_NotSupported) {
                    // The CC is no longer supported. This can happen if the node tells us
                    // something different in the Version interview than it did in its NIF
                    return "continue";
                }
                // we want to pass all other errors through
                throw e;
            }
            if (endpoint.isCCSecure(cc) &&
                !this.driver.securityManager &&
                !this.driver.securityManager2) {
                // The CC is only supported securely, but the network key is not set up
                // Skip the CC
                this.driver.controllerLog.logNode(this.id, `Skipping interview for secure CC ${(0, core_1.getCCName)(cc)} because no network key is configured!`, "error");
                return "continue";
            }
            // Skip this step if the CC was already interviewed
            if (instance.isInterviewComplete(this.driver))
                return "continue";
            try {
                await instance.interview(this.driver);
            }
            catch (e) {
                if ((0, core_1.isTransmissionError)(e)) {
                    // We had a CAN or timeout during the interview
                    // or the node is presumed dead. Abort the process
                    return false;
                }
                // we want to pass all other errors through
                throw e;
            }
        };
        // Always interview Security first because it changes the interview order
        if (this.supportsCC(core_1.CommandClasses["Security 2"])) {
            // Security S2 is always supported *securely*
            this.addCC(core_1.CommandClasses["Security 2"], { secure: true });
            // Query supported CCs unless we know for sure that the node wasn't assigned a S2 security class
            const securityClass = this.getHighestSecurityClass();
            if (securityClass == undefined ||
                (0, core_1.securityClassIsS2)(securityClass)) {
                this.driver.controllerLog.logNode(this.nodeId, "Root device interview: Security S2", "silly");
                if (!this.driver.securityManager2) {
                    if (!this._hasEmittedNoS2NetworkKeyError) {
                        // Cannot interview a secure device securely without a network key
                        const errorMessage = `supports Security S2, but no S2 network keys were configured. The interview might not include all functionality.`;
                        this.driver.controllerLog.logNode(this.nodeId, errorMessage, "error");
                        this.driver.emit("error", new core_1.ZWaveError(`Node ${(0, strings_1.padStart)(this.id.toString(), 3, "0")} ${errorMessage}`, core_1.ZWaveErrorCodes.Controller_NodeInsecureCommunication));
                        this._hasEmittedNoS2NetworkKeyError = true;
                    }
                }
                else {
                    await interviewEndpoint(this, core_1.CommandClasses["Security 2"]);
                }
            }
        }
        else {
            // If there is any doubt about granted S2 security classes, we now know they are not granted
            for (const secClass of [
                core_1.SecurityClass.S2_AccessControl,
                core_1.SecurityClass.S2_Authenticated,
                core_1.SecurityClass.S2_Unauthenticated,
            ]) {
                if (this.hasSecurityClass(secClass) === core_1.unknownBoolean) {
                    this.securityClasses.set(secClass, false);
                }
            }
        }
        if (this.supportsCC(core_1.CommandClasses.Security)) {
            // Security S0 is always supported *securely*
            this.addCC(core_1.CommandClasses.Security, { secure: true });
            // Query supported CCs unless we know for sure that the node wasn't assigned the S0 security class
            if (this.hasSecurityClass(core_1.SecurityClass.S0_Legacy) !== false) {
                this.driver.controllerLog.logNode(this.nodeId, "Root device interview: Security S0", "silly");
                if (!this.driver.securityManager) {
                    if (!this._hasEmittedNoS0NetworkKeyError) {
                        // Cannot interview a secure device securely without a network key
                        const errorMessage = `supports Security S0, but the S0 network key was not configured. The interview might not include all functionality.`;
                        this.driver.controllerLog.logNode(this.nodeId, errorMessage, "error");
                        this.driver.emit("error", new core_1.ZWaveError(`Node ${(0, strings_1.padStart)(this.id.toString(), 3, "0")} ${errorMessage}`, core_1.ZWaveErrorCodes.Controller_NodeInsecureCommunication));
                        this._hasEmittedNoS0NetworkKeyError = true;
                    }
                }
                else {
                    await interviewEndpoint(this, core_1.CommandClasses.Security);
                }
            }
        }
        else {
            if (this.hasSecurityClass(core_1.SecurityClass.S0_Legacy) ===
                core_1.unknownBoolean) {
                // Remember that this node hasn't been granted the S0 security class
                this.securityClasses.set(core_1.SecurityClass.S0_Legacy, false);
            }
        }
        // Manufacturer Specific and Version CC need to be handled before the other CCs because they are needed to
        // identify the device and apply device configurations
        if (this.supportsCC(core_1.CommandClasses["Manufacturer Specific"])) {
            this.driver.controllerLog.logNode(this.nodeId, "Root device interview: Manufacturer Specific", "silly");
            await interviewEndpoint(this, core_1.CommandClasses["Manufacturer Specific"]);
        }
        if (this.supportsCC(core_1.CommandClasses.Version)) {
            this.driver.controllerLog.logNode(this.nodeId, "Root device interview: Version", "silly");
            await interviewEndpoint(this, core_1.CommandClasses.Version);
            // After the version CC interview of the root endpoint, we have enough info to load the correct device config file
            await this.loadDeviceConfig();
            // At this point we may need to make some changes to the CCs the device reports
            this.applyCommandClassesCompatFlag();
        }
        // Don't offer or interview the Basic CC if any actuator CC is supported - except if the config files forbid us
        // to map the Basic CC to other CCs or expose Basic Set as an event
        const compat = this._deviceConfig?.compat;
        if (compat?.treatBasicSetAsEvent) {
            // To create the compat event value, we need to force a Basic CC interview
            this.addCC(core_1.CommandClasses.Basic, {
                isSupported: true,
                version: 1,
            });
        }
        else if (!compat?.disableBasicMapping) {
            this.hideBasicCCInFavorOfActuatorCCs();
        }
        // We determine the correct interview order of the remaining CCs by topologically sorting two dependency graph
        // In order to avoid emitting unnecessary value events for the root endpoint,
        // we defer the application CC interview until after the other endpoints have been interviewed
        const rootInterviewGraphBeforeEndpoints = this.buildCCInterviewGraph([
            core_1.CommandClasses.Security,
            core_1.CommandClasses["Security 2"],
            core_1.CommandClasses["Manufacturer Specific"],
            core_1.CommandClasses.Version,
            ...core_1.applicationCCs,
        ]);
        let rootInterviewOrderBeforeEndpoints;
        const rootInterviewGraphAfterEndpoints = this.buildCCInterviewGraph([
            core_1.CommandClasses.Security,
            core_1.CommandClasses["Security 2"],
            core_1.CommandClasses["Manufacturer Specific"],
            core_1.CommandClasses.Version,
            ...core_1.nonApplicationCCs,
        ]);
        let rootInterviewOrderAfterEndpoints;
        try {
            rootInterviewOrderBeforeEndpoints = (0, core_1.topologicalSort)(rootInterviewGraphBeforeEndpoints);
            rootInterviewOrderAfterEndpoints = (0, core_1.topologicalSort)(rootInterviewGraphAfterEndpoints);
        }
        catch (e) {
            // This interview cannot be done
            throw new core_1.ZWaveError("The CC interview cannot be completed because there are circular dependencies between CCs!", core_1.ZWaveErrorCodes.CC_Invalid);
        }
        this.driver.controllerLog.logNode(this.nodeId, `Root device interviews before endpoints: ${rootInterviewOrderBeforeEndpoints
            .map((cc) => `\n· ${(0, core_1.getCCName)(cc)}`)
            .join("")}`, "silly");
        this.driver.controllerLog.logNode(this.nodeId, `Root device interviews after endpoints: ${rootInterviewOrderAfterEndpoints
            .map((cc) => `\n· ${(0, core_1.getCCName)(cc)}`)
            .join("")}`, "silly");
        // Now that we know the correct order, do the interview in sequence
        for (const cc of rootInterviewOrderBeforeEndpoints) {
            this.driver.controllerLog.logNode(this.nodeId, `Root device interview: ${(0, core_1.getCCName)(cc)}`, "silly");
            const action = await interviewEndpoint(this, cc);
            if (action === "continue")
                continue;
            else if (typeof action === "boolean")
                return action;
        }
        // Before querying the endpoints, we may need to make some more changes to the CCs the device reports
        // This time, the non-root endpoints are relevant
        this.applyCommandClassesCompatFlag();
        // Now query ALL endpoints
        for (const endpointIndex of this.getEndpointIndizes()) {
            const endpoint = this.getEndpoint(endpointIndex);
            if (!endpoint)
                continue;
            // The root endpoint has been interviewed, so we know if the device supports security and which security classes it has
            const securityClass = this.getHighestSecurityClass();
            // From the specs, Multi Channel Capability Report Command:
            // Non-secure End Point capabilities MUST also be supported securely and MUST also be advertised in
            // the S0/S2 Commands Supported Report Commands unless they are encapsulated outside Security or
            // Security themselves.
            // Nodes supporting S2 MUST support addressing every End Point with S2 encapsulation and MAY
            // explicitly list S2 in the non-secure End Point capabilities.
            // This means we need to explicitly add S2 to the list of supported CCs of the endpoint, if the node is using S2.
            // Otherwise the communication will incorrectly use no encryption.
            const endpointMissingS2 = (0, core_1.securityClassIsS2)(securityClass) &&
                this.supportsCC(core_1.CommandClasses["Security 2"]) &&
                !endpoint.supportsCC(core_1.CommandClasses["Security 2"]);
            if (endpointMissingS2) {
                endpoint.addCC(core_1.CommandClasses["Security 2"], this.implementedCommandClasses.get(core_1.CommandClasses["Security 2"]));
            }
            // Always interview Security first because it changes the interview order
            if (endpoint.supportsCC(core_1.CommandClasses["Security 2"])) {
                // Security S2 is always supported *securely*
                endpoint.addCC(core_1.CommandClasses["Security 2"], { secure: true });
                // If S2 is the highest security class, interview it for the endpoint
                if ((0, core_1.securityClassIsS2)(securityClass) &&
                    !!this.driver.securityManager2) {
                    this.driver.controllerLog.logNode(this.nodeId, {
                        endpoint: endpoint.index,
                        message: `Endpoint ${endpoint.index} interview: Security S2`,
                        level: "silly",
                    });
                    const action = await interviewEndpoint(endpoint, core_1.CommandClasses["Security 2"]);
                    if (typeof action === "boolean")
                        return action;
                }
            }
            if (endpoint.supportsCC(core_1.CommandClasses.Security)) {
                // Security S0 is always supported *securely*
                endpoint.addCC(core_1.CommandClasses.Security, { secure: true });
                // If S0 is the highest security class, interview it for the endpoint
                if (securityClass === core_1.SecurityClass.S0_Legacy &&
                    !!this.driver.securityManager) {
                    this.driver.controllerLog.logNode(this.nodeId, {
                        endpoint: endpoint.index,
                        message: `Endpoint ${endpoint.index} interview: Security S0`,
                        level: "silly",
                    });
                    const action = await interviewEndpoint(endpoint, core_1.CommandClasses.Security);
                    if (typeof action === "boolean")
                        return action;
                }
            }
            // It has been found that legacy nodes do not always advertise the S0 Command Class in their Multi
            // Channel Capability Report and still accept all their Command Class using S0 encapsulation.
            // A controlling node SHOULD try to control End Points with S0 encapsulation even if S0 is not
            // listed in the Multi Channel Capability Report.
            const endpointMissingS0 = securityClass === core_1.SecurityClass.S0_Legacy &&
                this.supportsCC(core_1.CommandClasses.Security) &&
                !endpoint.supportsCC(core_1.CommandClasses.Security);
            if (endpointMissingS0) {
                // Define which CCs we can use to test this - and if supported, how
                const possibleTests = [
                    {
                        ccId: core_1.CommandClasses["Z-Wave Plus Info"],
                        test: () => endpoint.commandClasses["Z-Wave Plus Info"].get(),
                    },
                    {
                        ccId: core_1.CommandClasses["Binary Switch"],
                        test: () => endpoint.commandClasses["Binary Switch"].get(),
                    },
                    {
                        ccId: core_1.CommandClasses["Binary Sensor"],
                        test: () => endpoint.commandClasses["Binary Sensor"].get(),
                    },
                    {
                        ccId: core_1.CommandClasses["Multilevel Switch"],
                        test: () => endpoint.commandClasses["Multilevel Switch"].get(),
                    },
                    {
                        ccId: core_1.CommandClasses["Multilevel Sensor"],
                        test: () => endpoint.commandClasses["Multilevel Sensor"].get(),
                    },
                    // TODO: add other tests if necessary
                ];
                const foundTest = possibleTests.find((t) => endpoint.supportsCC(t.ccId));
                if (foundTest) {
                    this.driver.controllerLog.logNode(this.nodeId, {
                        endpoint: endpoint.index,
                        message: `is included using Security S0, but endpoint ${endpoint.index} does not list the CC. Testing if it accepts secure commands anyways.`,
                        level: "silly",
                    });
                    const { ccId, test } = foundTest;
                    // Temporarily mark the CC as secure so we can use it to test
                    endpoint.addCC(ccId, { secure: true });
                    // Perform the test and treat errors as negative results
                    const success = !!(await test().catch(() => false));
                    if (success) {
                        this.driver.controllerLog.logNode(this.nodeId, {
                            endpoint: endpoint.index,
                            message: `Endpoint ${endpoint.index} accepts/expects secure commands`,
                            level: "silly",
                        });
                        // Mark all endpoint CCs as secure
                        for (const [ccId] of endpoint.getCCs()) {
                            endpoint.addCC(ccId, { secure: true });
                        }
                    }
                    else {
                        this.driver.controllerLog.logNode(this.nodeId, {
                            endpoint: endpoint.index,
                            message: `Endpoint ${endpoint.index} is actually not using S0`,
                            level: "silly",
                        });
                        // Mark the CC as not secure again
                        endpoint.addCC(ccId, { secure: false });
                    }
                }
                else {
                    this.driver.controllerLog.logNode(this.nodeId, {
                        endpoint: endpoint.index,
                        message: `is included using Security S0, but endpoint ${endpoint.index} does not list the CC. Found no way to test if accepts secure commands anyways.`,
                        level: "silly",
                    });
                }
            }
            // This intentionally checks for Version CC support on the root device.
            // Endpoints SHOULD not support this CC, but we still need to query their
            // CCs that the root device may or may not support
            if (this.supportsCC(core_1.CommandClasses.Version)) {
                this.driver.controllerLog.logNode(this.nodeId, {
                    endpoint: endpoint.index,
                    message: `Endpoint ${endpoint.index} interview: ${(0, core_1.getCCName)(core_1.CommandClasses.Version)}`,
                    level: "silly",
                });
                await interviewEndpoint(endpoint, core_1.CommandClasses.Version, true);
            }
            // The Security S0/S2 CC adds new CCs to the endpoint, so we need to once more remove those
            // that aren't actually properly supported by the device.
            this.applyCommandClassesCompatFlag(endpoint.index);
            // Don't offer or interview the Basic CC if any actuator CC is supported - except if the config files forbid us
            // to map the Basic CC to other CCs or expose Basic Set as an event
            if (!compat?.disableBasicMapping && !compat?.treatBasicSetAsEvent) {
                endpoint.hideBasicCCInFavorOfActuatorCCs();
            }
            const endpointInterviewGraph = endpoint.buildCCInterviewGraph([
                core_1.CommandClasses.Security,
                core_1.CommandClasses["Security 2"],
                core_1.CommandClasses.Version,
            ]);
            let endpointInterviewOrder;
            try {
                endpointInterviewOrder = (0, core_1.topologicalSort)(endpointInterviewGraph);
            }
            catch (e) {
                // This interview cannot be done
                throw new core_1.ZWaveError("The CC interview cannot be completed because there are circular dependencies between CCs!", core_1.ZWaveErrorCodes.CC_Invalid);
            }
            this.driver.controllerLog.logNode(this.nodeId, {
                endpoint: endpoint.index,
                message: `Endpoint ${endpoint.index} interview order: ${endpointInterviewOrder
                    .map((cc) => `\n· ${(0, core_1.getCCName)(cc)}`)
                    .join("")}`,
                level: "silly",
            });
            // Now that we know the correct order, do the interview in sequence
            for (const cc of endpointInterviewOrder) {
                this.driver.controllerLog.logNode(this.nodeId, {
                    endpoint: endpoint.index,
                    message: `Endpoint ${endpoint.index} interview: ${(0, core_1.getCCName)(cc)}`,
                    level: "silly",
                });
                const action = await interviewEndpoint(endpoint, cc);
                if (action === "continue")
                    continue;
                else if (typeof action === "boolean")
                    return action;
            }
        }
        // Continue with the application CCs for the root endpoint
        for (const cc of rootInterviewOrderAfterEndpoints) {
            this.driver.controllerLog.logNode(this.nodeId, `Root device interview: ${(0, core_1.getCCName)(cc)}`, "silly");
            const action = await interviewEndpoint(this, cc);
            if (action === "continue")
                continue;
            else if (typeof action === "boolean")
                return action;
        }
        return true;
    }
    /**
     * @internal
     * Handles the receipt of a NIF / NodeUpdatePayload
     */
    updateNodeInfo(nodeInfo) {
        if (this.interviewStage < _Types_1.InterviewStage.NodeInfo) {
            for (const cc of nodeInfo.supportedCCs)
                this.addCC(cc, { isSupported: true });
        }
        // As the NIF is sent on wakeup, treat this as a sign that the node is awake
        this.markAsAwake();
        // SDS14223 Unless unsolicited <XYZ> Report Commands are received,
        // a controlling node MUST probe the current values when the
        // supporting node issues a Wake Up Notification Command for sleeping nodes.
        // This is not the handler for wakeup notifications, but some legacy devices send this
        // message whenever there's an update and want to be polled.
        if (this.interviewStage === _Types_1.InterviewStage.Complete &&
            !this.supportsCC(core_1.CommandClasses["Z-Wave Plus Info"]) &&
            !this.valueDB.getValue(AssociationCC_1.AssociationCCValues.hasLifeline.id)) {
            const delay = this.deviceConfig?.compat?.manualValueRefreshDelayMs || 0;
            this.driver.controllerLog.logNode(this.nodeId, {
                message: `Node does not send unsolicited updates; refreshing actuator and sensor values${delay > 0 ? ` in ${delay} ms` : ""}...`,
            });
            setTimeout(() => this.refreshValues(), delay);
        }
    }
    /**
     * Rediscovers all capabilities of a single CC on this node and all endpoints.
     * This can be considered a more targeted variant of `refreshInfo`.
     *
     * WARNING: It is not recommended to await this method!
     */
    async interviewCC(cc) {
        const endpoints = this.getAllEndpoints();
        // Interview the node itself last
        endpoints.push(endpoints.shift());
        for (const endpoint of endpoints) {
            const instance = endpoint.createCCInstanceUnsafe(cc);
            if (instance) {
                try {
                    await instance.interview(this.driver);
                }
                catch (e) {
                    this.driver.controllerLog.logNode(this.id, `failed to interview CC ${(0, core_1.getCCName)(cc)}, endpoint ${endpoint.index}: ${(0, shared_1.getErrorMessage)(e)}`, "error");
                }
            }
        }
    }
    /**
     * Refreshes all non-static values of a single CC from this node (all endpoints).
     * WARNING: It is not recommended to await this method!
     */
    async refreshCCValues(cc) {
        for (const endpoint of this.getAllEndpoints()) {
            const instance = endpoint.createCCInstanceUnsafe(cc);
            if (instance) {
                try {
                    await instance.refreshValues(this.driver);
                }
                catch (e) {
                    this.driver.controllerLog.logNode(this.id, `failed to refresh values for ${(0, core_1.getCCName)(cc)}, endpoint ${endpoint.index}: ${(0, shared_1.getErrorMessage)(e)}`, "error");
                }
            }
        }
    }
    /**
     * Refreshes all non-static values from this node's actuator and sensor CCs.
     * WARNING: It is not recommended to await this method!
     */
    async refreshValues() {
        for (const endpoint of this.getAllEndpoints()) {
            for (const cc of endpoint.getSupportedCCInstances()) {
                // Only query actuator and sensor CCs
                if (!core_1.actuatorCCs.includes(cc.ccId) &&
                    !core_1.sensorCCs.includes(cc.ccId)) {
                    continue;
                }
                try {
                    await cc.refreshValues(this.driver);
                }
                catch (e) {
                    this.driver.controllerLog.logNode(this.id, `failed to refresh values for ${(0, core_1.getCCName)(cc.ccId)}, endpoint ${endpoint.index}: ${(0, shared_1.getErrorMessage)(e)}`, "error");
                }
            }
        }
    }
    /**
     * Refreshes the values of all CCs that should be reporting regularly, but haven't been
     * @internal
     */
    async autoRefreshValues() {
        for (const endpoint of this.getAllEndpoints()) {
            for (const cc of endpoint.getSupportedCCInstances()) {
                if (!cc.shouldRefreshValues(this.driver))
                    continue;
                this.driver.controllerLog.logNode(this.id, {
                    message: `${(0, core_1.getCCName)(cc.ccId)} CC values may be stale, refreshing...`,
                    endpoint: endpoint.index,
                    direction: "outbound",
                });
                try {
                    await cc.refreshValues(this.driver);
                }
                catch (e) {
                    this.driver.controllerLog.logNode(this.id, {
                        message: `failed to refresh values for ${(0, core_1.getCCName)(cc.ccId)} CC: ${(0, shared_1.getErrorMessage)(e)}`,
                        endpoint: endpoint.index,
                        level: "error",
                    });
                }
            }
        }
    }
    /**
     * Uses the `commandClasses` compat flag defined in the node's config file to
     * override the reported command classes.
     * @param endpointIndex If given, limits the application of the compat flag to the given endpoint.
     */
    applyCommandClassesCompatFlag(endpointIndex) {
        if (this.deviceConfig) {
            // Add CCs the device config file tells us to
            const addCCs = this.deviceConfig.compat?.addCCs;
            if (addCCs) {
                for (const [cc, { endpoints }] of addCCs) {
                    if (endpointIndex === undefined) {
                        for (const [ep, info] of endpoints) {
                            this.getEndpoint(ep)?.addCC(cc, info);
                        }
                    }
                    else if (endpoints.has(endpointIndex)) {
                        this.getEndpoint(endpointIndex)?.addCC(cc, endpoints.get(endpointIndex));
                    }
                }
            }
            // And remove those that it marks as unsupported
            const removeCCs = this.deviceConfig.compat?.removeCCs;
            if (removeCCs) {
                for (const [cc, endpoints] of removeCCs) {
                    if (endpoints === "*") {
                        if (endpointIndex === undefined) {
                            for (const ep of this.getAllEndpoints()) {
                                ep.removeCC(cc);
                            }
                        }
                        else {
                            this.getEndpoint(endpointIndex)?.removeCC(cc);
                        }
                    }
                    else {
                        if (endpointIndex === undefined) {
                            for (const ep of endpoints) {
                                this.getEndpoint(ep)?.removeCC(cc);
                            }
                        }
                        else if (endpoints.includes(endpointIndex)) {
                            this.getEndpoint(endpointIndex)?.removeCC(cc);
                        }
                    }
                }
            }
        }
    }
    /** Overwrites the reported configuration with information from a config file */
    async overwriteConfig() {
        if (this.isControllerNode) {
            // The device config was not loaded prior to this step because the Version CC is not interviewed.
            // Therefore do it here.
            await this.loadDeviceConfig();
        }
        if (this.deviceConfig) {
            // Add CCs the device config file tells us to
            const addCCs = this.deviceConfig.compat?.addCCs;
            if (addCCs) {
                for (const [cc, { endpoints }] of addCCs) {
                    for (const [ep, info] of endpoints) {
                        this.getEndpoint(ep)?.addCC(cc, info);
                    }
                }
            }
            // And remove those that it marks as unsupported
            const removeCCs = this.deviceConfig.compat?.removeCCs;
            if (removeCCs) {
                for (const [cc, endpoints] of removeCCs) {
                    if (endpoints === "*") {
                        for (const ep of this.getAllEndpoints()) {
                            ep.removeCC(cc);
                        }
                    }
                    else {
                        for (const ep of endpoints) {
                            this.getEndpoint(ep)?.removeCC(cc);
                        }
                    }
                }
            }
        }
        this.setInterviewStage(_Types_1.InterviewStage.OverwriteConfig);
    }
    /**
     * @internal
     * Handles a CommandClass that was received from this node
     */
    async handleCommand(command) {
        // If this is a report for the root endpoint and the node supports the CC on another endpoint,
        // we need to map it to endpoint 1. Either it does not support multi channel associations or
        // it is misbehaving. In any case, we would hide this report if we didn't map it
        if (command.endpointIndex === 0 &&
            command.constructor.name.endsWith("Report") &&
            this.getEndpointCount() >= 1 &&
            // Only map reports from the root device to an endpoint if we know which one
            this._deviceConfig?.compat?.mapRootReportsToEndpoint != undefined) {
            const endpoint = this.getEndpoint(this._deviceConfig?.compat?.mapRootReportsToEndpoint);
            if (endpoint && endpoint.supportsCC(command.ccId)) {
                // Force the CC to store its values again under the supporting endpoint
                this.driver.controllerLog.logNode(this.nodeId, `Mapping unsolicited report from root device to endpoint #${endpoint.index}`);
                command.endpointIndex = endpoint.index;
                command.persistValues(this.driver);
            }
        }
        if (command instanceof BasicCC_1.BasicCC) {
            return this.handleBasicCommand(command);
        }
        else if (command instanceof MultilevelSwitchCC_1.MultilevelSwitchCC) {
            return this.handleMultilevelSwitchCommand(command);
        }
        else if (command instanceof CentralSceneCC_1.CentralSceneCCNotification) {
            return this.handleCentralSceneNotification(command);
        }
        else if (command instanceof WakeUpCC_1.WakeUpCCWakeUpNotification) {
            return this.handleWakeUpNotification();
        }
        else if (command instanceof NotificationCC_1.NotificationCCReport) {
            return this.handleNotificationReport(command);
        }
        else if (command instanceof ClockCC_1.ClockCCReport) {
            return this.handleClockReport(command);
        }
        else if (command instanceof SecurityCC_1.SecurityCCNonceGet) {
            return this.handleSecurityNonceGet();
        }
        else if (command instanceof SecurityCC_1.SecurityCCNonceReport) {
            return this.handleSecurityNonceReport(command);
        }
        else if (command instanceof Security2CC_1.Security2CCNonceGet) {
            return this.handleSecurity2NonceGet();
        }
        else if (command instanceof Security2CC_1.Security2CCNonceReport) {
            return this.handleSecurity2NonceReport(command);
        }
        else if (command instanceof HailCC_1.HailCC) {
            return this.handleHail(command);
        }
        else if (command instanceof FirmwareUpdateMetaDataCC_1.FirmwareUpdateMetaDataCCGet) {
            return this.handleUnexpectedFirmwareUpdateGet(command);
        }
        else if (command instanceof EntryControlCC_1.EntryControlCCNotification) {
            return this.handleEntryControlNotification(command);
        }
        else if (command instanceof PowerlevelCC_1.PowerlevelCCTestNodeReport) {
            return this.handlePowerlevelTestNodeReport(command);
        }
        else if (command instanceof cc_1.TimeCCTimeGet) {
            return this.handleTimeGet(command);
        }
        else if (command instanceof cc_1.TimeCCDateGet) {
            return this.handleDateGet(command);
        }
        else if (command instanceof cc_1.TimeCCTimeOffsetGet) {
            return this.handleTimeOffsetGet(command);
        }
        else if (command instanceof ZWavePlusCC_1.ZWavePlusCCGet) {
            return this.handleZWavePlusGet(command);
        }
        else if (command instanceof cc_1.InclusionControllerCCInitiate) {
            // Inclusion controller commands are handled by the controller class
            if (command.step === cc_1.InclusionControllerStep.ProxyInclusionReplace) {
                return this.driver.controller.handleInclusionControllerCCInitiateReplace(command);
            }
        }
        else if (command instanceof cc_1.MultiCommandCCCommandEncapsulation) {
            // Handle each encapsulated command individually
            for (const cmd of command.encapsulated) {
                await this.handleCommand(cmd);
            }
            return;
        }
        // Ignore all commands that don't need to be handled
        switch (true) {
            // Reports are either a response to a Get command or
            // automatically store their values in the Value DB.
            // No need to manually handle them - other than what we've already done
            case command.constructor.name.endsWith("Report"):
            // When this command is received, its values get emitted as an event.
            // Nothing else to do here
            case command instanceof SceneActivationCC_1.SceneActivationCCSet:
                return;
        }
        this.driver.controllerLog.logNode(this.id, {
            message: `TODO: no handler for application command`,
            direction: "inbound",
        });
    }
    /**
     * @internal
     * Handles a nonce request
     */
    async handleSecurityNonceGet() {
        // Only reply if secure communication is set up
        if (!this.driver.securityManager) {
            if (!this.hasLoggedNoNetworkKey) {
                this.hasLoggedNoNetworkKey = true;
                this.driver.controllerLog.logNode(this.id, {
                    message: `cannot reply to NonceGet because no network key was configured!`,
                    direction: "inbound",
                    level: "warn",
                });
            }
            return;
        }
        // When a node asks us for a nonce, it must support Security CC
        this.addCC(core_1.CommandClasses.Security, {
            isSupported: true,
            version: 1,
            // Security CC is always secure
            secure: true,
        });
        // Ensure that we're not flooding the queue with unnecessary NonceReports (GH#1059)
        const isNonceReport = (t) => t.message.getNodeId() === this.nodeId &&
            (0, cc_1.isCommandClassContainer)(t.message) &&
            t.message.command instanceof SecurityCC_1.SecurityCCNonceReport;
        if (this.driver.hasPendingTransactions(isNonceReport)) {
            this.driver.controllerLog.logNode(this.id, {
                message: "in the process of replying to a NonceGet, won't send another NonceReport",
                level: "warn",
            });
            return;
        }
        // Delete all previous nonces we sent the node, since they should no longer be used
        this.driver.securityManager.deleteAllNoncesForReceiver(this.id);
        // Now send the current nonce
        try {
            await this.commandClasses.Security.sendNonce();
        }
        catch (e) {
            this.driver.controllerLog.logNode(this.id, {
                message: `failed to send nonce: ${(0, shared_1.getErrorMessage)(e)}`,
                direction: "inbound",
            });
        }
    }
    /**
     * Is called when a nonce report is received that does not belong to any transaction.
     * The received nonce reports are stored as "free" nonces
     */
    handleSecurityNonceReport(command) {
        const secMan = this.driver.securityManager;
        if (!secMan)
            return;
        secMan.setNonce({
            issuer: this.id,
            nonceId: secMan.getNonceId(command.nonce),
        }, {
            nonce: command.nonce,
            receiver: this.driver.controller.ownNodeId,
        }, { free: true });
    }
    /**
     * @internal
     * Handles a nonce request for S2
     */
    async handleSecurity2NonceGet() {
        // Only reply if secure communication is set up
        if (!this.driver.securityManager2) {
            if (!this.hasLoggedNoNetworkKey) {
                this.hasLoggedNoNetworkKey = true;
                this.driver.controllerLog.logNode(this.id, {
                    message: `cannot reply to NonceGet (S2) because no network key was configured!`,
                    direction: "inbound",
                    level: "warn",
                });
            }
            return;
        }
        // When a node asks us for a nonce, it must support Security 2 CC
        this.addCC(core_1.CommandClasses["Security 2"], {
            isSupported: true,
            version: 1,
            // Security 2 CC is always secure
            secure: true,
        });
        // Ensure that we're not flooding the queue with unnecessary NonceReports (GH#1059)
        const isNonceReport = (t) => t.message.getNodeId() === this.nodeId &&
            (0, cc_1.isCommandClassContainer)(t.message) &&
            t.message.command instanceof Security2CC_1.Security2CCNonceReport;
        if (this.driver.hasPendingTransactions(isNonceReport)) {
            this.driver.controllerLog.logNode(this.id, {
                message: "in the process of replying to a NonceGet, won't send another NonceReport",
                level: "warn",
            });
            return;
        }
        try {
            await this.commandClasses["Security 2"].sendNonce();
        }
        catch (e) {
            this.driver.controllerLog.logNode(this.id, {
                message: `failed to send nonce: ${(0, shared_1.getErrorMessage)(e)}`,
                direction: "inbound",
            });
        }
    }
    /**
     * Is called when a nonce report is received that does not belong to any transaction.
     */
    handleSecurity2NonceReport(_command) {
        // const secMan = this.driver.securityManager2;
        // if (!secMan) return;
        // This has the potential of resetting our SPAN state in the middle of a transaction which may expect it to be valid
        // So we probably shouldn't react here, and instead handle the NonceReport we'll get in response to the next command we send
        // if (command.SOS && command.receiverEI) {
        // 	// The node couldn't decrypt the last command we sent it. Invalidate
        // 	// the shared SPAN, since it did the same
        // 	secMan.storeRemoteEI(this.nodeId, command.receiverEI);
        // }
        // Since we landed here, this is not in response to any command we sent
        this.driver.controllerLog.logNode(this.id, {
            message: `received S2 nonce without an active transaction, not sure what to do with it`,
            level: "warn",
            direction: "inbound",
        });
    }
    async handleHail(_command) {
        // treat this as a sign that the node is awake
        this.markAsAwake();
        if (this.busyPollingAfterHail) {
            this.driver.controllerLog.logNode(this.nodeId, {
                message: `Hail received from node, but still busy with previous one...`,
            });
            return;
        }
        this.busyPollingAfterHail = true;
        this.driver.controllerLog.logNode(this.nodeId, {
            message: `Hail received from node, refreshing actuator and sensor values...`,
        });
        try {
            await this.refreshValues();
        }
        catch {
            // ignore
        }
        this.busyPollingAfterHail = false;
    }
    /** Handles the receipt of a Central Scene notifification */
    handleCentralSceneNotification(command) {
        // Did we already receive this command?
        if (command.sequenceNumber ===
            this.lastCentralSceneNotificationSequenceNumber) {
            return;
        }
        else {
            this.lastCentralSceneNotificationSequenceNumber =
                command.sequenceNumber;
        }
        /*
        If the Slow Refresh field is false:
        - A new Key Held Down notification MUST be sent every 200ms until the key is released.
        - The Sequence Number field MUST be updated at each notification transmission.
        - If not receiving a new Key Held Down notification within 400ms, a controlling node SHOULD use an adaptive timeout approach as described in 4.17.1:
        A controller SHOULD apply an adaptive approach based on the reception of the Key Released Notification.
        Initially, the controller SHOULD time out if not receiving any Key Held Down Notification refresh after
        400ms and consider this to be a Key Up Notification. If, however, the controller subsequently receives a
        Key Released Notification, the controller SHOULD consider the sending node to be operating with the Slow
        Refresh capability enabled.

        If the Slow Refresh field is true:
        - A new Key Held Down notification MUST be sent every 55 seconds until the key is released.
        - The Sequence Number field MUST be updated at each notification refresh.
        - If not receiving a new Key Held Down notification within 60 seconds after the most recent Key Held Down
        notification, a receiving node MUST respond as if it received a Key Release notification.
        */
        const setSceneValue = (sceneNumber, key) => {
            const valueId = CentralSceneCC_1.CentralSceneCCValues.scene(sceneNumber).id;
            this.valueDB.setValue(valueId, key, { stateful: false });
        };
        const forceKeyUp = () => {
            this.centralSceneForcedKeyUp = true;
            // force key up event
            setSceneValue(this.centralSceneKeyHeldDownContext.sceneNumber, cc_1.CentralSceneKeys.KeyReleased);
            // clear old timer
            clearTimeout(this.centralSceneKeyHeldDownContext.timeout);
            // clear the key down context
            this.centralSceneKeyHeldDownContext = undefined;
        };
        if (this.centralSceneKeyHeldDownContext &&
            this.centralSceneKeyHeldDownContext.sceneNumber !==
                command.sceneNumber) {
            // The user pressed another button, force release
            forceKeyUp();
        }
        const slowRefreshValueId = CentralSceneCC_1.CentralSceneCCValues.slowRefresh.endpoint(this.index);
        if (command.keyAttribute === cc_1.CentralSceneKeys.KeyHeldDown) {
            // Set or refresh timer to force a release of the key
            this.centralSceneForcedKeyUp = false;
            if (this.centralSceneKeyHeldDownContext) {
                clearTimeout(this.centralSceneKeyHeldDownContext.timeout);
            }
            // If the node does not advertise support for the slow refresh capability, we might still be dealing with a
            // slow refresh node. We use the stored value for fallback behavior
            const slowRefresh = command.slowRefresh ??
                this.valueDB.getValue(slowRefreshValueId);
            this.centralSceneKeyHeldDownContext = {
                sceneNumber: command.sceneNumber,
                // Unref'ing long running timers allows the process to exit mid-timeout
                timeout: setTimeout(forceKeyUp, slowRefresh ? 60000 : 400).unref(),
            };
        }
        else if (command.keyAttribute === cc_1.CentralSceneKeys.KeyReleased) {
            // Stop the release timer
            if (this.centralSceneKeyHeldDownContext) {
                clearTimeout(this.centralSceneKeyHeldDownContext.timeout);
                this.centralSceneKeyHeldDownContext = undefined;
            }
            else if (this.centralSceneForcedKeyUp) {
                // If we timed out and the controller subsequently receives a Key Released Notification,
                // we SHOULD consider the sending node to be operating with the Slow Refresh capability enabled.
                this.valueDB.setValue(slowRefreshValueId, true);
                // Do not raise the duplicate event
                return;
            }
        }
        setSceneValue(command.sceneNumber, command.keyAttribute);
        this.driver.controllerLog.logNode(this.id, {
            message: `received CentralScene notification ${(0, shared_1.stringify)(command)}`,
            direction: "inbound",
        });
    }
    /** Handles the receipt of a Wake Up notification */
    handleWakeUpNotification() {
        this.driver.controllerLog.logNode(this.id, {
            message: `received wakeup notification`,
            direction: "inbound",
        });
        // It can happen that the node has not told us that it supports the Wake Up CC
        // https://sentry.io/share/issue/6a681729d7db46d591f1dcadabe8d02e/
        // To avoid a crash, mark it as supported
        if (this.getCCVersion(core_1.CommandClasses["Wake Up"]) === 0) {
            this.addCC(core_1.CommandClasses["Wake Up"], {
                isSupported: true,
                version: 1,
            });
        }
        this.markAsAwake();
        // From the specs:
        // A controlling node SHOULD read the Wake Up Interval of a supporting node when the delays between
        // Wake Up periods are larger than what was last set at the supporting node.
        const now = Date.now();
        if (this.lastWakeUp) {
            // we've already measured the wake up interval, so we can check whether a refresh is necessary
            const wakeUpInterval = this.getValue(WakeUpCC_1.WakeUpCCValues.wakeUpInterval.id) ?? 1;
            // The wakeup interval is specified in seconds. Also add 5 minutes tolerance to avoid
            // unnecessary queries since there might be some delay. A wakeup interval of 0 means manual wakeup,
            // so the interval shouldn't be verified
            if (wakeUpInterval > 0 &&
                (now - this.lastWakeUp) / 1000 > wakeUpInterval + 5 * 60) {
                this.commandClasses["Wake Up"].getInterval().catch(() => {
                    // Don't throw if there's an error
                });
            }
        }
        this.lastWakeUp = now;
        // Some legacy devices expect us to query them on wake up in order to function correctly
        if (this._deviceConfig?.compat?.queryOnWakeup) {
            void this.compatDoWakeupQueries();
        }
        else {
            // For other devices we may have to refresh their values from time to time
            void this.autoRefreshValues().catch(() => {
                // ignore
            });
        }
        // In case there are no messages in the queue, the node may go back to sleep very soon
        this.driver.debounceSendNodeToSleep(this);
    }
    async compatDoWakeupQueries() {
        if (!this._deviceConfig?.compat?.queryOnWakeup)
            return;
        this.driver.controllerLog.logNode(this.id, {
            message: `expects some queries after wake up, so it shall receive`,
            direction: "none",
        });
        for (const [ccName, apiMethod, ...args] of this._deviceConfig.compat
            .queryOnWakeup) {
            this.driver.controllerLog.logNode(this.id, {
                message: `compat query "${ccName}"::${apiMethod}(${args
                    .map((arg) => JSON.stringify(arg))
                    .join(", ")})`,
                direction: "none",
            });
            // Try to access the API - if it doesn't work, skip this option
            let API;
            try {
                API = this.commandClasses[ccName].withOptions({
                    // Tag the resulting transactions as compat queries
                    tag: "compat",
                    // Do not retry them or they may cause congestion if the node is asleep again
                    maxSendAttempts: 1,
                    // This is for a sleeping node - there's no point in keeping the transactions when the node is asleep
                    expire: 10000,
                });
            }
            catch {
                this.driver.controllerLog.logNode(this.id, {
                    message: `could not access API, skipping query`,
                    direction: "none",
                    level: "warn",
                });
                continue;
            }
            if (!API.isSupported()) {
                this.driver.controllerLog.logNode(this.id, {
                    message: `API not supported, skipping query`,
                    direction: "none",
                    level: "warn",
                });
                continue;
            }
            else if (!API[apiMethod]) {
                this.driver.controllerLog.logNode(this.id, {
                    message: `method ${apiMethod} not found on API, skipping query`,
                    direction: "none",
                    level: "warn",
                });
                continue;
            }
            // Retrieve the method
            // eslint-disable-next-line
            const method = API[apiMethod].bind(API);
            // And replace "smart" arguments with their corresponding value
            const methodArgs = args.map((arg) => {
                if ((0, typeguards_1.isObject)(arg)) {
                    const valueId = {
                        commandClass: API.ccId,
                        ...arg,
                    };
                    return this.getValue(valueId);
                }
                return arg;
            });
            // Do the API call and ignore/log any errors
            try {
                await method(...methodArgs);
                this.driver.controllerLog.logNode(this.id, {
                    message: `API call successful`,
                    direction: "none",
                });
            }
            catch (e) {
                this.driver.controllerLog.logNode(this.id, {
                    message: `error during API call: ${(0, shared_1.getErrorMessage)(e)}`,
                    direction: "none",
                    level: "warn",
                });
                if ((0, core_1.isZWaveError)(e) &&
                    e.code === core_1.ZWaveErrorCodes.Controller_MessageExpired) {
                    // A compat query expired - no point in trying the others too
                    return;
                }
            }
        }
    }
    /** Handles the receipt of a BasicCC Set or Report */
    handleBasicCommand(command) {
        // Retrieve the endpoint the command is coming from
        const sourceEndpoint = this.getEndpoint(command.endpointIndex ?? 0) ?? this;
        // Depending on the generic device class, we may need to map the basic command to other CCs
        let mappedTargetCC;
        // Do not map the basic CC if the device config forbids it
        if (!this._deviceConfig?.compat?.disableBasicMapping) {
            switch (sourceEndpoint.deviceClass?.generic.key) {
                case 0x20: // Binary Sensor
                    mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(core_1.CommandClasses["Binary Sensor"]);
                    break;
                case 0x10: // Binary Switch
                    mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(core_1.CommandClasses["Binary Switch"]);
                    break;
                case 0x11: // Multilevel Switch
                    mappedTargetCC = sourceEndpoint.createCCInstanceUnsafe(core_1.CommandClasses["Multilevel Switch"]);
                    break;
                case 0x12: // Remote Switch
                    switch (sourceEndpoint.deviceClass.specific.key) {
                        case 0x01: // Binary Remote Switch
                            mappedTargetCC =
                                sourceEndpoint.createCCInstanceUnsafe(core_1.CommandClasses["Binary Switch"]);
                            break;
                        case 0x02: // Multilevel Remote Switch
                            mappedTargetCC =
                                sourceEndpoint.createCCInstanceUnsafe(core_1.CommandClasses["Multilevel Switch"]);
                            break;
                    }
            }
        }
        if (command instanceof BasicCC_1.BasicCCReport) {
            // Try to set the mapped value on the target CC
            const didSetMappedValue = typeof command.currentValue === "number" &&
                mappedTargetCC?.setMappedBasicValue(this.driver, command.currentValue);
            // Otherwise fall back to setting it ourselves
            if (!didSetMappedValue) {
                // Store the value in the value DB now
                command.persistValues(this.driver);
                // Since the node sent us a Basic report, we are sure that it is at least supported
                // If this is the only supported actuator CC, add it to the support list,
                // so the information lands in the network cache
                if (!core_1.actuatorCCs.some((cc) => sourceEndpoint.supportsCC(cc))) {
                    sourceEndpoint.addCC(core_1.CommandClasses.Basic, {
                        isControlled: true,
                    });
                }
            }
        }
        else if (command instanceof BasicCC_1.BasicCCSet) {
            // Treat BasicCCSet as value events if desired
            if (this._deviceConfig?.compat?.treatBasicSetAsEvent) {
                this.driver.controllerLog.logNode(this.id, {
                    endpoint: command.endpointIndex,
                    message: "treating BasicCC::Set as a value event",
                });
                this._valueDB.setValue(BasicCC_1.BasicCCValues.compatEvent.endpoint(command.endpointIndex), command.targetValue, {
                    stateful: false,
                });
                return;
            }
            else {
                // Some devices send their current state using `BasicCCSet`s to their associations
                // instead of using reports. We still interpret them like reports
                this.driver.controllerLog.logNode(this.id, {
                    endpoint: command.endpointIndex,
                    message: "treating BasicCC::Set as a report",
                });
                // If enabled in a config file, try to set the mapped value on the target CC first
                const didSetMappedValue = !!this._deviceConfig?.compat?.enableBasicSetMapping &&
                    !!mappedTargetCC?.setMappedBasicValue(this.driver, command.targetValue);
                // Otherwise handle the command ourselves
                if (!didSetMappedValue) {
                    // Basic Set commands cannot store their value automatically, so store the values manually
                    this._valueDB.setValue(BasicCC_1.BasicCCValues.currentValue.endpoint(command.endpointIndex), command.targetValue);
                    // Since the node sent us a Basic command, we are sure that it is at least controlled
                    // Add it to the support list, so the information lands in the network cache
                    if (!sourceEndpoint.controlsCC(core_1.CommandClasses.Basic)) {
                        sourceEndpoint.addCC(core_1.CommandClasses.Basic, {
                            isControlled: true,
                        });
                    }
                }
            }
        }
    }
    /** Handles the receipt of a MultilevelCC Set or Report */
    handleMultilevelSwitchCommand(command) {
        if (command instanceof MultilevelSwitchCC_1.MultilevelSwitchCCSet) {
            this.driver.controllerLog.logNode(this.id, {
                endpoint: command.endpointIndex,
                message: "treating MultiLevelSwitchCCSet::Set as a value event",
            });
            this._valueDB.setValue(MultilevelSwitchCC_1.MultilevelSwitchCCValues.compatEvent.endpoint(command.endpointIndex), command.targetValue, {
                stateful: false,
            });
        }
        else if (command instanceof MultilevelSwitchCC_1.MultilevelSwitchCCStartLevelChange) {
            this.driver.controllerLog.logNode(this.id, {
                endpoint: command.endpointIndex,
                message: "treating MultilevelSwitchCC::StartLevelChange as a notification",
            });
            this.emit("notification", this, core_1.CommandClasses["Multilevel Switch"], {
                eventType: cc_1.MultilevelSwitchCommand.StartLevelChange,
                eventTypeLabel: "Start level change",
                direction: command.direction,
            });
        }
        else if (command instanceof MultilevelSwitchCC_1.MultilevelSwitchCCStopLevelChange) {
            this.driver.controllerLog.logNode(this.id, {
                endpoint: command.endpointIndex,
                message: "treating MultilevelSwitchCC::StopLevelChange as a notification",
            });
            this.emit("notification", this, core_1.CommandClasses["Multilevel Switch"], {
                eventType: cc_1.MultilevelSwitchCommand.StopLevelChange,
                eventTypeLabel: "Stop level change",
            });
        }
    }
    async handleZWavePlusGet(command) {
        // treat this as a sign that the node is awake
        this.markAsAwake();
        const endpoint = this.getEndpoint(command.endpointIndex) ?? this;
        await endpoint.commandClasses["Z-Wave Plus Info"]
            .withOptions({
            // Answer with the same encapsulation as asked
            encapsulationFlags: command.encapsulationFlags,
        })
            .sendReport({
            zwavePlusVersion: 2,
            roleType: cc_1.ZWavePlusRoleType.CentralStaticController,
            nodeType: cc_1.ZWavePlusNodeType.Node,
            installerIcon: 0x0500,
            userIcon: 0x0500, // Generic Gateway
        });
    }
    /** Schedules a notification value to be reset */
    scheduleNotificationIdleReset(valueId, handler) {
        this.clearNotificationIdleReset(valueId);
        const key = (0, core_1.valueIdToString)(valueId);
        this.notificationIdleTimeouts.set(key, 
        // Unref'ing long running timeouts allows to quit the application before the timeout elapses
        setTimeout(handler, 5 * 60 * 1000 /* 5 minutes */).unref());
    }
    /** Removes a scheduled notification reset */
    clearNotificationIdleReset(valueId) {
        const key = (0, core_1.valueIdToString)(valueId);
        if (this.notificationIdleTimeouts.has(key)) {
            clearTimeout(this.notificationIdleTimeouts.get(key));
            this.notificationIdleTimeouts.delete(key);
        }
    }
    /**
     * Handles the receipt of a Notification Report
     */
    handleNotificationReport(command) {
        if (command.notificationType == undefined) {
            if (command.alarmType == undefined) {
                this.driver.controllerLog.logNode(this.id, {
                    message: `received unsupported notification ${(0, shared_1.stringify)(command)}`,
                    direction: "inbound",
                });
            }
            return;
        }
        // Fallback for V2 notifications that don't allow us to predefine the metadata during the interview.
        // Instead of defining useless values for each possible notification event, we build the metadata on demand
        const extendValueMetadata = (valueId, notificationConfig, valueConfig) => {
            if (command.version === 2 || !this.valueDB.hasMetadata(valueId)) {
                const metadata = (0, NotificationCC_1.getNotificationValueMetadata)(this.valueDB.getMetadata(valueId), notificationConfig, valueConfig);
                this.valueDB.setMetadata(valueId, metadata);
            }
        };
        // Look up the received notification in the config
        const notificationConfig = this.driver.configManager.lookupNotification(command.notificationType);
        if (notificationConfig) {
            // This is a known notification (status or event)
            const notificationName = notificationConfig.name;
            this.driver.controllerLog.logNode(this.id, {
                message: `[handleNotificationReport] notificationName: ${notificationName}`,
                level: "silly",
            });
            /** Returns a single notification state to idle */
            const setStateIdle = (prevValue) => {
                const valueConfig = notificationConfig.lookupValue(prevValue);
                // Only known variables may be reset to idle
                if (!valueConfig || valueConfig.type !== "state")
                    return;
                // Some properties may not be reset to idle
                if (!valueConfig.idle)
                    return;
                const variableName = valueConfig.variableName;
                const valueId = NotificationCC_1.NotificationCCValues.notificationVariable(notificationName, variableName).endpoint(command.endpointIndex);
                // Since the node has reset the notification itself, we don't need the idle reset
                this.clearNotificationIdleReset(valueId);
                extendValueMetadata(valueId, notificationConfig, valueConfig);
                this.valueDB.setValue(valueId, 0 /* idle */);
            };
            const value = command.notificationEvent;
            if (value === 0) {
                // Generic idle notification, this contains a value to be reset
                if (Buffer.isBuffer(command.eventParameters) &&
                    command.eventParameters.length) {
                    // The target value is the first byte of the event parameters
                    setStateIdle(command.eventParameters[0]);
                }
                else {
                    // Reset all values to idle
                    const nonIdleValues = this.valueDB
                        .getValues(core_1.CommandClasses.Notification)
                        .filter((v) => (v.endpoint || 0) === command.endpointIndex &&
                        v.property === notificationName &&
                        typeof v.value === "number" &&
                        v.value !== 0);
                    for (const v of nonIdleValues) {
                        setStateIdle(v.value);
                    }
                }
                return;
            }
            // Find out which property we need to update
            const valueConfig = notificationConfig.lookupValue(value);
            if (valueConfig) {
                this.driver.controllerLog.logNode(this.id, {
                    message: `[handleNotificationReport] valueConfig:
  label: ${valueConfig.label}
  ${valueConfig.type === "event"
                        ? "type: event"
                        : `type: state
  variableName: ${valueConfig.variableName}`}`,
                    level: "silly",
                });
            }
            else {
                this.driver.controllerLog.logNode(this.id, {
                    message: `[handleNotificationReport] valueConfig: undefined`,
                    level: "silly",
                });
            }
            // Perform some heuristics on the known notification
            this.handleKnownNotification(command);
            let allowIdleReset;
            if (!valueConfig) {
                // We don't know what this notification refers to, so we don't force a reset
                allowIdleReset = false;
            }
            else if (valueConfig.type === "state") {
                allowIdleReset = valueConfig.idle;
            }
            else {
                this.emit("notification", this, core_1.CommandClasses.Notification, {
                    type: command.notificationType,
                    event: value,
                    label: notificationConfig.name,
                    eventLabel: valueConfig.label,
                    parameters: command.eventParameters,
                });
                return;
            }
            // Now that we've gathered all we need to know, update the value in our DB
            let valueId;
            if (valueConfig) {
                valueId = NotificationCC_1.NotificationCCValues.notificationVariable(notificationName, valueConfig.variableName).endpoint(command.endpointIndex);
                extendValueMetadata(valueId, notificationConfig, valueConfig);
            }
            else {
                // Collect unknown values in an "unknown" bucket
                const unknownValue = NotificationCC_1.NotificationCCValues.unknownNotificationVariable(command.notificationType, notificationName);
                valueId = unknownValue.endpoint(command.endpointIndex);
                if (command.version === 2) {
                    if (!this.valueDB.hasMetadata(valueId)) {
                        this.valueDB.setMetadata(valueId, unknownValue.meta);
                    }
                }
            }
            if (typeof command.eventParameters === "number") {
                // This notification contains an enum value. We set "fake" values for these to distinguish them
                // from states without enum values
                const valueWithEnum = (0, NotificationCC_1.getNotificationStateValueWithEnum)(value, command.eventParameters);
                this.valueDB.setValue(valueId, valueWithEnum);
            }
            else {
                this.valueDB.setValue(valueId, value);
            }
            // Nodes before V8 (and some misbehaving V8 ones) don't necessarily reset the notification to idle.
            // The specifications advise to auto-reset the variables, but it has been found that this interferes
            // with some motion sensors that don't refresh their active notification. Therefore, we set a fallback
            // timer if the `forceNotificationIdleReset` compat flag is set.
            if (allowIdleReset &&
                !!this._deviceConfig?.compat?.forceNotificationIdleReset) {
                this.driver.controllerLog.logNode(this.id, {
                    message: `[handleNotificationReport] scheduling idle reset`,
                    level: "silly",
                });
                this.scheduleNotificationIdleReset(valueId, () => setStateIdle(value));
            }
        }
        else {
            // This is an unknown notification
            const valueId = NotificationCC_1.NotificationCCValues.unknownNotificationType(command.notificationType).endpoint(command.endpointIndex);
            this.valueDB.setValue(valueId, command.notificationEvent);
            // We don't know what this notification refers to, so we don't force a reset
        }
    }
    handleKnownNotification(command) {
        const lockEvents = [0x01, 0x03, 0x05, 0x09];
        const unlockEvents = [0x02, 0x04, 0x06];
        if (
        // Access Control, manual/keypad/rf/auto (un)lock operation
        command.notificationType === 0x06 &&
            (lockEvents.includes(command.notificationEvent) ||
                unlockEvents.includes(command.notificationEvent)) &&
            (this.supportsCC(core_1.CommandClasses["Door Lock"]) ||
                this.supportsCC(core_1.CommandClasses.Lock))) {
            // The Door Lock Command Class is constrained to the S2 Access Control key,
            // while the Notification Command Class, in the same device, could use a
            // different key. This way the device can notify devices which don't belong
            // to the S2 Access Control key group of changes in its state.
            const isLocked = lockEvents.includes(command.notificationEvent);
            // Update the current lock status
            if (this.supportsCC(core_1.CommandClasses["Door Lock"])) {
                this.valueDB.setValue(DoorLockCC_1.DoorLockCCValues.currentMode.endpoint(command.endpointIndex), isLocked ? cc_1.DoorLockMode.Secured : cc_1.DoorLockMode.Unsecured);
            }
            if (this.supportsCC(core_1.CommandClasses.Lock)) {
                this.valueDB.setValue(LockCC_1.LockCCValues.locked.endpoint(command.endpointIndex), isLocked);
            }
        }
    }
    async handleClockReport(command) {
        if (this.busySettingClock)
            return;
        // A Z-Wave Plus node SHOULD issue a Clock Report Command via the Lifeline Association Group if they
        // suspect to have inaccurate time and/or weekdays (e.g. after battery removal).
        // A controlling node SHOULD compare the received time and weekday with its current time and set the
        // time again at the supporting node if a deviation is observed (e.g. different weekday or more than a
        // minute difference)
        // A sending node knowing the current time with seconds precision SHOULD round its
        // current time to the nearest minute when sending this command.
        let now = new Date();
        const seconds = now.getSeconds();
        if (seconds >= 30) {
            now = new Date(now.getTime() + (60 - seconds) * 1000);
        }
        // Get desired time in local time
        const hours = now.getHours();
        const minutes = now.getMinutes();
        // Sunday is 0 in JS, but 7 in Z-Wave
        let weekday = now.getDay();
        if (weekday === 0)
            weekday = 7;
        if (command.weekday !== weekday ||
            command.hour !== hours ||
            command.minute !== minutes) {
            const endpoint = this.driver.tryGetEndpoint(command);
            if (!endpoint /*|| !endpoint.commandClasses.Clock.isSupported()*/) {
                // Make sure the endpoint supports the CC (GH#1704)
                return;
            }
            this.driver.controllerLog.logNode(this.nodeId, `detected a deviation of the node's clock, updating it...`);
            this.busySettingClock = true;
            try {
                await endpoint.commandClasses.Clock.set(hours, minutes, weekday);
            }
            catch {
                // ignore
            }
            this.busySettingClock = false;
        }
    }
    async handleTimeGet(command) {
        // treat this as a sign that the node is awake
        this.markAsAwake();
        const endpoint = this.getEndpoint(command.endpointIndex) ?? this;
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        try {
            await endpoint.commandClasses.Time.withOptions({
                // Answer with the same encapsulation as asked
                encapsulationFlags: command.encapsulationFlags,
            }).reportTime(hours, minutes, seconds);
        }
        catch (e) {
            // ignore
        }
    }
    async handleDateGet(command) {
        // treat this as a sign that the node is awake
        this.markAsAwake();
        const endpoint = this.getEndpoint(command.endpointIndex) ?? this;
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        try {
            await endpoint.commandClasses.Time.withOptions({
                // Answer with the same encapsulation as asked
                encapsulationFlags: command.encapsulationFlags,
            }).reportDate(year, month, day);
        }
        catch (e) {
            // ignore
        }
    }
    async handleTimeOffsetGet(command) {
        // treat this as a sign that the node is awake
        this.markAsAwake();
        const endpoint = this.getEndpoint(command.endpointIndex) ?? this;
        const timezone = (0, core_1.getDSTInfo)(new Date());
        try {
            await endpoint.commandClasses.Time.withOptions({
                // Answer with the same encapsulation as asked
                encapsulationFlags: command.encapsulationFlags,
            }).reportTimezone(timezone);
        }
        catch (e) {
            // ignore
        }
    }
    /**
     * Returns whether a firmware update is in progress for this node.
     */
    isFirmwareUpdateInProgress() {
        if (this.isControllerNode) {
            return this.driver.controller.isFirmwareUpdateInProgress();
        }
        else {
            return this._firmwareUpdateInProgress;
        }
    }
    /**
     * Retrieves the firmware update capabilities of a node to decide which options to offer a user prior to the update.
     * This method uses cached information from the most recent interview.
     */
    getFirmwareUpdateCapabilitiesCached() {
        const firmwareUpgradable = this.getValue(FirmwareUpdateMetaDataCC_1.FirmwareUpdateMetaDataCCValues.firmwareUpgradable.id);
        const supportsActivation = this.getValue(FirmwareUpdateMetaDataCC_1.FirmwareUpdateMetaDataCCValues.supportsActivation.id);
        const continuesToFunction = this.getValue(FirmwareUpdateMetaDataCC_1.FirmwareUpdateMetaDataCCValues.continuesToFunction.id);
        const additionalFirmwareIDs = this.getValue(FirmwareUpdateMetaDataCC_1.FirmwareUpdateMetaDataCCValues.additionalFirmwareIDs.id);
        // Ensure all information was queried
        if (!firmwareUpgradable ||
            supportsActivation == undefined ||
            continuesToFunction == undefined ||
            !(0, typeguards_1.isArray)(additionalFirmwareIDs)) {
            return { firmwareUpgradable: false };
        }
        return {
            firmwareUpgradable: true,
            firmwareTargets: [0, ...additionalFirmwareIDs],
            continuesToFunction,
            supportsActivation,
        };
    }
    /**
     * Retrieves the firmware update capabilities of a node to decide which options to offer a user prior to the update.
     * This communicates with the node to retrieve fresh information.
     */
    async getFirmwareUpdateCapabilities() {
        const api = this.commandClasses["Firmware Update Meta Data"];
        const meta = await api.getMetaData();
        if (!meta) {
            throw new core_1.ZWaveError(`Failed to request firmware update capabilities: The node did not respond in time!`, core_1.ZWaveErrorCodes.Controller_NodeTimeout);
        }
        else if (!meta.firmwareUpgradable) {
            return {
                firmwareUpgradable: false,
            };
        }
        return {
            firmwareUpgradable: true,
            firmwareTargets: [0, ...meta.additionalFirmwareIDs],
            continuesToFunction: meta.continuesToFunction,
            supportsActivation: meta.supportsActivation,
        };
    }
    /**
     * Starts an OTA firmware update process for this node.
     *
     * This method will resolve after the process has **STARTED** successfully. It does not wait for the update to finish.
     *
     * @deprecated Use {@link updateFirmware} instead, which allows waiting for the update to finish.
     *
     * **WARNING: Use at your own risk! We don't take any responsibility if your devices don't work after an update.**
     *
     * @param data The firmware image
     * @param target The firmware target (i.e. chip) to upgrade. 0 updates the Z-Wave chip, >=1 updates others if they exist
     */
    async beginFirmwareUpdate(data, target = 0) {
        // Don't start the process twice
        if (this.isFirmwareUpdateInProgress()) {
            throw new core_1.ZWaveError(`Failed to start the update: A firmware upgrade for this node is already in progress!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_Busy);
        }
        // Don't let two firmware updates happen in parallel
        if (this.driver.controller.isAnyOTAFirmwareUpdateInProgress()) {
            throw new core_1.ZWaveError(`Failed to start the update: A firmware update is already in progress on this network!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy);
        }
        this._firmwareUpdateInProgress = true;
        // Support aborting the update
        const abortContext = {
            abort: false,
            tooLateToAbort: false,
            abortPromise: (0, deferred_promise_1.createDeferredPromise)(),
        };
        this._abortFirmwareUpdate = async () => {
            if (abortContext.tooLateToAbort) {
                throw new core_1.ZWaveError(`The firmware update was transmitted completely, cannot abort anymore.`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_FailedToAbort);
            }
            this.driver.controllerLog.logNode(this.id, {
                message: `Aborting firmware update...`,
                direction: "outbound",
            });
            // Trigger the abort
            abortContext.abort = true;
            const aborted = await abortContext.abortPromise;
            if (!aborted) {
                throw new core_1.ZWaveError(`The node did not acknowledge the aborted update`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_FailedToAbort);
            }
            this.driver.controllerLog.logNode(this.id, {
                message: `Firmware update aborted`,
                direction: "inbound",
            });
        };
        // If the node isn't supposed to be kept awake yet, do it
        this.keepAwake = true;
        // Reset persisted state after the update
        const restore = (keepAwake) => {
            this.keepAwake = keepAwake;
            this._firmwareUpdateInProgress = false;
            this._abortFirmwareUpdate = undefined;
            this._firmwareUpdatePrematureRequest = undefined;
        };
        // Kick off the firmware update "synchronously"
        let fragmentSize;
        try {
            const result = await this.prepareFirmwareUpdateInternal([target], abortContext);
            // Handle early aborts
            if (abortContext.abort) {
                this.emit("firmware update finished", this, cc_1.FirmwareUpdateStatus.Error_TransmissionFailed, undefined, {
                    success: false,
                    status: cc_1.FirmwareUpdateStatus.Error_TransmissionFailed,
                    reInterview: false,
                });
                restore(false);
                return;
            }
            let meta;
            ({ fragmentSize, ...meta } = result);
            await this.beginFirmwareUpdateInternal(data, target, meta, fragmentSize);
        }
        catch {
            restore(false);
            return;
        }
        // Perform the update in the background
        void (async () => {
            const result = await this.doFirmwareUpdateInternal(data, fragmentSize, abortContext, (fragment, total) => {
                const progress = {
                    currentFile: 1,
                    totalFiles: 1,
                    sentFragments: fragment,
                    totalFragments: total,
                    progress: (0, math_1.roundTo)((fragment / total) * 100, 2),
                };
                this.emit("firmware update progress", this, fragment, total, progress);
            });
            let waitTime = result.waitTime;
            if (result.success) {
                waitTime =
                    this.driver.getConservativeWaitTimeAfterFirmwareUpdate(result.waitTime);
            }
            this.emit("firmware update finished", this, result.status, waitTime, { ...result, waitTime, reInterview: result.success });
            restore(result.success);
        })();
    }
    /**
     * Performs an OTA firmware upgrade of one or more chips on this node.
     *
     * This method will resolve after the process has **COMPLETED**. Failure to start any one of the provided updates will throw an error.
     *
     * **WARNING: Use at your own risk! We don't take any responsibility if your devices don't work after an update.**
     *
     * @param updates An array of firmware updates that will be done in sequence
     *
     * @returns Whether all of the given updates were successful.
     */
    async updateFirmware(updates) {
        if (updates.length === 0) {
            throw new core_1.ZWaveError(`At least one update must be provided`, core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        // Check that each update has a buffer with at least 1 byte
        if (updates.some((u) => u.data.length === 0)) {
            throw new core_1.ZWaveError(`All firmware updates must have a non-empty data buffer`, core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        // Check that the targets are not duplicates
        if ((0, arrays_1.distinct)(updates.map((u) => u.firmwareTarget ?? 0)).length !==
            updates.length) {
            throw new core_1.ZWaveError(`The target of all provided firmware updates must be unique`, core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        // Don't start the process twice
        if (this.isFirmwareUpdateInProgress()) {
            throw new core_1.ZWaveError(`Failed to start the update: A firmware upgrade is already in progress!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_Busy);
        }
        // Don't let two firmware updates happen in parallel
        if (this.driver.controller.isAnyOTAFirmwareUpdateInProgress()) {
            throw new core_1.ZWaveError(`Failed to start the update: A firmware update is already in progress on this network!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy);
        }
        this._firmwareUpdateInProgress = true;
        // Support aborting the update
        const abortContext = {
            abort: false,
            tooLateToAbort: false,
            abortPromise: (0, deferred_promise_1.createDeferredPromise)(),
        };
        this._abortFirmwareUpdate = async () => {
            if (abortContext.tooLateToAbort) {
                throw new core_1.ZWaveError(`The firmware update was transmitted completely, cannot abort anymore.`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_FailedToAbort);
            }
            this.driver.controllerLog.logNode(this.id, {
                message: `Aborting firmware update...`,
                direction: "outbound",
            });
            // Trigger the abort
            abortContext.abort = true;
            const aborted = await abortContext.abortPromise;
            if (!aborted) {
                throw new core_1.ZWaveError(`The node did not acknowledge the aborted update`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_FailedToAbort);
            }
            this.driver.controllerLog.logNode(this.id, {
                message: `Firmware update aborted`,
                direction: "inbound",
            });
        };
        // If the node isn't supposed to be kept awake yet, do it
        this.keepAwake = true;
        // Reset persisted state after the update
        const restore = (keepAwake) => {
            this.keepAwake = keepAwake;
            this._firmwareUpdateInProgress = false;
            this._abortFirmwareUpdate = undefined;
            this._firmwareUpdatePrematureRequest = undefined;
        };
        // Prepare the firmware update
        let fragmentSize;
        let meta;
        try {
            const result = await this.prepareFirmwareUpdateInternal(updates.map((u) => u.firmwareTarget ?? 0), abortContext);
            // Handle early aborts
            if (abortContext.abort) {
                this.emit("firmware update finished", this, cc_1.FirmwareUpdateStatus.Error_TransmissionFailed, undefined, {
                    success: false,
                    status: cc_1.FirmwareUpdateStatus.Error_TransmissionFailed,
                    reInterview: false,
                });
                restore(false);
                return false;
            }
            // If the firmware update was not aborted, result is definitely defined
            ({ fragmentSize, ...meta } = result);
        }
        catch {
            restore(false);
            return false;
        }
        // Perform all firmware updates in sequence
        let result;
        let conservativeWaitTime;
        const totalFragments = updates.reduce((total, update) => total + Math.ceil(update.data.length / fragmentSize), 0);
        let sentFragmentsOfPreviousFiles = 0;
        for (let i = 0; i < updates.length; i++) {
            this.driver.controllerLog.logNode(this.id, `Updating firmware (part ${i + 1} / ${updates.length})...`);
            const { firmwareTarget: target = 0, data } = updates[i];
            // Tell the node to start requesting fragments
            await this.beginFirmwareUpdateInternal(data, target, meta, fragmentSize);
            // And handle them
            result = await this.doFirmwareUpdateInternal(data, fragmentSize, abortContext, (fragment, total) => {
                const progress = {
                    currentFile: i + 1,
                    totalFiles: updates.length,
                    sentFragments: fragment,
                    totalFragments: total,
                    progress: (0, math_1.roundTo)(((sentFragmentsOfPreviousFiles + fragment) /
                        totalFragments) *
                        100, 2),
                };
                this.emit("firmware update progress", this, fragment, total, progress);
                // When this file is done, add the fragments to the total, so we can compute the total progress correctly
                if (fragment === total) {
                    sentFragmentsOfPreviousFiles += fragment;
                }
            });
            // If we wait, wait a bit longer than the device told us, so it is actually ready to use
            conservativeWaitTime =
                this.driver.getConservativeWaitTimeAfterFirmwareUpdate(result.waitTime);
            if (!result.success) {
                this.driver.controllerLog.logNode(this.id, {
                    message: `Firmware update (part ${i + 1} / ${updates.length}) failed with status ${(0, shared_1.getEnumMemberName)(cc_1.FirmwareUpdateStatus, result.status)}`,
                    direction: "inbound",
                });
                this.emit("firmware update finished", this, result.status, undefined, { ...result, waitTime: undefined, reInterview: false });
                restore(false);
                return false;
            }
            else if (i < updates.length - 1) {
                // Update succeeded, but we're not done yet
                this.driver.controllerLog.logNode(this.id, {
                    message: `Firmware update (part ${i + 1} / ${updates.length}) succeeded with status ${(0, shared_1.getEnumMemberName)(cc_1.FirmwareUpdateStatus, result.status)}`,
                    direction: "inbound",
                });
                this.driver.controllerLog.logNode(this.id, `Continuing with next part in ${conservativeWaitTime} seconds...`);
            }
        }
        this.emit("firmware update finished", this, result.status, conservativeWaitTime, { ...result, waitTime: conservativeWaitTime, reInterview: true });
        restore(true);
        return true;
    }
    /** Prepares the firmware update of a single target by collecting the necessary information */
    async prepareFirmwareUpdateInternal(targets, abortContext) {
        const api = this.commandClasses["Firmware Update Meta Data"];
        // ================================
        // STEP 1:
        // Check if this update is possible
        const meta = await api.getMetaData();
        if (!meta) {
            throw new core_1.ZWaveError(`Failed to start the update: The node did not respond in time!`, core_1.ZWaveErrorCodes.Controller_NodeTimeout);
        }
        for (const target of targets) {
            if (target === 0) {
                if (!meta.firmwareUpgradable) {
                    throw new core_1.ZWaveError(`Failed to start the update: The Z-Wave chip firmware is not upgradable!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_NotUpgradable);
                }
            }
            else {
                if (api.version < 3) {
                    throw new core_1.ZWaveError(`Failed to start the update: The node does not support upgrading a different firmware target than 0!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_TargetNotFound);
                }
                else if (meta.additionalFirmwareIDs[target - 1] == undefined) {
                    throw new core_1.ZWaveError(`Failed to start the update: Firmware target #${target} not found on this node!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_TargetNotFound);
                }
            }
        }
        // ================================
        // STEP 2:
        // Determine the fragment size
        const fcc = new FirmwareUpdateMetaDataCC_1.FirmwareUpdateMetaDataCC(this.driver, {
            nodeId: this.id,
        });
        const maxNetPayloadSize = this.driver.computeNetCCPayloadSize(fcc) -
            2 - // report number
            (fcc.version >= 2 ? 2 : 0); // checksum
        // Use the smallest allowed payload
        const fragmentSize = Math.min(maxNetPayloadSize, meta.maxFragmentSize ?? Number.POSITIVE_INFINITY);
        if (abortContext.abort) {
            abortContext.abortPromise.resolve(true);
            return;
        }
        else {
            return { ...meta, fragmentSize };
        }
    }
    /** Kicks off a firmware update of a single target */
    async beginFirmwareUpdateInternal(data, target, meta, fragmentSize) {
        const api = this.commandClasses["Firmware Update Meta Data"];
        // ================================
        // STEP 3:
        // Start the update
        this.driver.controllerLog.logNode(this.id, {
            message: `Starting firmware update...`,
            direction: "outbound",
        });
        // Request the node to start the upgrade
        // TODO: Should manufacturer id and firmware id be provided externally?
        const requestUpdateStatus = await api.requestUpdate({
            manufacturerId: meta.manufacturerId,
            firmwareId: target == 0
                ? meta.firmwareId
                : meta.additionalFirmwareIDs[target - 1],
            firmwareTarget: target,
            fragmentSize,
            checksum: (0, core_1.CRC16_CCITT)(data),
        });
        switch (requestUpdateStatus) {
            case cc_1.FirmwareUpdateRequestStatus.Error_AuthenticationExpected:
                throw new core_1.ZWaveError(`Failed to start the update: A manual authentication event (e.g. button push) was expected!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart);
            case cc_1.FirmwareUpdateRequestStatus.Error_BatteryLow:
                throw new core_1.ZWaveError(`Failed to start the update: The battery level is too low!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart);
            case cc_1.FirmwareUpdateRequestStatus.Error_FirmwareUpgradeInProgress:
                throw new core_1.ZWaveError(`Failed to start the update: A firmware upgrade is already in progress!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_Busy);
            case cc_1.FirmwareUpdateRequestStatus.Error_InvalidManufacturerOrFirmwareID:
                throw new core_1.ZWaveError(`Failed to start the update: Invalid manufacturer or firmware id!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart);
            case cc_1.FirmwareUpdateRequestStatus.Error_InvalidHardwareVersion:
                throw new core_1.ZWaveError(`Failed to start the update: Invalid hardware version!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart);
            case cc_1.FirmwareUpdateRequestStatus.Error_NotUpgradable:
                throw new core_1.ZWaveError(`Failed to start the update: Firmware target #${target} is not upgradable!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_NotUpgradable);
            case cc_1.FirmwareUpdateRequestStatus.Error_FragmentSizeTooLarge:
                throw new core_1.ZWaveError(`Failed to start the update: The chosen fragment size is too large!`, core_1.ZWaveErrorCodes.FirmwareUpdateCC_FailedToStart);
            case cc_1.FirmwareUpdateRequestStatus.OK:
                // All good, we have started!
                // Keep the node awake until the update is done.
                this.keepAwake = true;
        }
    }
    /** Performs the firmware update of a single target */
    async doFirmwareUpdateInternal(data, fragmentSize, abortContext, onProgress) {
        const numFragments = Math.ceil(data.length / fragmentSize);
        // Make sure we're not responding to an outdated request immediately
        this._firmwareUpdatePrematureRequest = undefined;
        // ================================
        // STEP 4:
        // Respond to fragment requests from the node
        update: while (true) {
            // During ongoing firmware updates, it can happen that the next request is received before the callback for the previous response
            // is back. In that case we can immediately handle the premature request. Otherwise wait for the next request.
            const fragmentRequest = this._firmwareUpdatePrematureRequest ??
                (await this.driver
                    .waitForCommand((cc) => cc.nodeId === this.nodeId &&
                    cc instanceof FirmwareUpdateMetaDataCC_1.FirmwareUpdateMetaDataCCGet, 30000)
                    .catch(() => undefined));
            this._firmwareUpdatePrematureRequest = undefined;
            if (!fragmentRequest) {
                // In some cases it can happen that the device stops requesting update frames
                // We need to timeout the update in this case so it can be restarted
                this.driver.controllerLog.logNode(this.id, {
                    message: `Firmware update timed out`,
                    direction: "none",
                    level: "warn",
                });
                return {
                    success: false,
                    status: cc_1.FirmwareUpdateStatus.Error_Timeout,
                };
            }
            // When a node requests a firmware update fragment, it must be awake
            try {
                this.markAsAwake();
            }
            catch {
                /* ignore */
            }
            if (fragmentRequest.reportNumber > numFragments) {
                this.driver.controllerLog.logNode(this.id, {
                    message: `Received Firmware Update Get for an out-of-bounds fragment. Forcing the node to abort...`,
                    direction: "inbound",
                });
                await this.sendCorruptedFirmwareUpdateReport(fragmentRequest.reportNumber, (0, crypto_1.randomBytes)(fragmentSize));
                // This will cause the node to abort the process, wait for that
                break update;
            }
            // Actually send the requested frames
            request: for (let num = fragmentRequest.reportNumber; num < fragmentRequest.reportNumber + fragmentRequest.numReports; num++) {
                // Check if the node requested more fragments than are left
                if (num > numFragments) {
                    break;
                }
                const fragment = data.slice((num - 1) * fragmentSize, num * fragmentSize);
                if (abortContext.abort) {
                    await this.sendCorruptedFirmwareUpdateReport(fragmentRequest.reportNumber, (0, crypto_1.randomBytes)(fragment.length));
                    // This will cause the node to abort the process, wait for that
                    break update;
                }
                else {
                    // Avoid queuing duplicate fragments
                    if (this.hasPendingFirmwareUpdateFragment(num)) {
                        this.driver.controllerLog.logNode(this.id, {
                            message: `Firmware fragment ${num} already queued`,
                            level: "warn",
                        });
                        continue request;
                    }
                    this.driver.controllerLog.logNode(this.id, {
                        message: `Sending firmware fragment ${num} / ${numFragments}`,
                        direction: "outbound",
                    });
                    const isLast = num === numFragments;
                    try {
                        await this.commandClasses["Firmware Update Meta Data"].sendFirmwareFragment(num, isLast, fragment);
                        onProgress(num, numFragments);
                        // If that was the last one wait for status report from the node and restart interview
                        if (isLast) {
                            abortContext.tooLateToAbort = true;
                            break update;
                        }
                    }
                    catch {
                        // When transmitting fails, simply stop responding to this request and wait for the node to re-request the fragment
                        this.driver.controllerLog.logNode(this.id, {
                            message: `Failed to send firmware fragment ${num} / ${numFragments}`,
                            direction: "outbound",
                            level: "warn",
                        });
                        break request;
                    }
                }
            }
        }
        // ================================
        // STEP 5:
        // Finalize the update process
        const statusReport = await this.driver
            .waitForCommand((cc) => cc.nodeId === this.nodeId &&
            cc instanceof FirmwareUpdateMetaDataCC_1.FirmwareUpdateMetaDataCCStatusReport, 
        // Wait up to 5 minutes. It should never take that long, but the specs
        // don't say anything specific
        5 * 60000)
            .catch(() => undefined);
        if (abortContext.abort) {
            abortContext.abortPromise.resolve(statusReport?.status ===
                cc_1.FirmwareUpdateStatus.Error_TransmissionFailed);
        }
        if (!statusReport) {
            this.driver.controllerLog.logNode(this.id, `The node did not acknowledge the completed update`, "warn");
            return {
                success: false,
                status: cc_1.FirmwareUpdateStatus.Error_Timeout,
            };
        }
        const { status, waitTime } = statusReport;
        // Actually, OK_WaitingForActivation should never happen since we don't allow
        // delayed activation in the RequestGet command
        const success = status >= cc_1.FirmwareUpdateStatus.OK_WaitingForActivation;
        return {
            success,
            status,
            waitTime,
        };
    }
    /**
     * Aborts an active firmware update process
     */
    async abortFirmwareUpdate() {
        if (!this._abortFirmwareUpdate)
            return;
        await this._abortFirmwareUpdate();
    }
    async sendCorruptedFirmwareUpdateReport(reportNum, fragment) {
        try {
            await this.commandClasses["Firmware Update Meta Data"].sendFirmwareFragment(reportNum, true, fragment);
        }
        catch {
            // ignore
        }
    }
    hasPendingFirmwareUpdateFragment(fragmentNumber) {
        // Avoid queuing duplicate fragments
        const isCurrentFirmwareFragment = (t) => t.message.getNodeId() === this.nodeId &&
            (0, cc_1.isCommandClassContainer)(t.message) &&
            t.message.command instanceof FirmwareUpdateMetaDataCC_1.FirmwareUpdateMetaDataCCReport &&
            t.message.command.reportNumber === fragmentNumber;
        return this.driver.hasPendingTransactions(isCurrentFirmwareFragment);
    }
    async handleUnexpectedFirmwareUpdateGet(command) {
        // This method will only be called under two circumstances:
        // 1. The node is currently busy responding to a firmware update request -> remember the request
        if (this.isFirmwareUpdateInProgress()) {
            this._firmwareUpdatePrematureRequest = command;
            return;
        }
        // 2. No firmware update is in progress -> abort
        this.driver.controllerLog.logNode(this.id, {
            message: `Received Firmware Update Get, but no firmware update is in progress. Forcing the node to abort...`,
            direction: "inbound",
        });
        // Since no update is in progress, we need to determine the fragment size again
        const fcc = new FirmwareUpdateMetaDataCC_1.FirmwareUpdateMetaDataCC(this.driver, {
            nodeId: this.id,
        });
        const fragmentSize = this.driver.computeNetCCPayloadSize(fcc) -
            2 - // report number
            (fcc.version >= 2 ? 2 : 0); // checksum
        const fragment = (0, crypto_1.randomBytes)(fragmentSize);
        try {
            await this.sendCorruptedFirmwareUpdateReport(command.reportNumber, fragment);
        }
        catch {
            // ignore
        }
    }
    handleEntryControlNotification(command) {
        if (!this._deviceConfig?.compat?.disableStrictEntryControlDataValidation) {
            if (this.recentEntryControlNotificationSequenceNumbers.includes(command.sequenceNumber)) {
                this.driver.controllerLog.logNode(this.id, `Received duplicate Entry Control Notification (sequence number ${command.sequenceNumber}), ignoring...`, "warn");
                return;
            }
            // Keep track of the last 5 sequence numbers
            this.recentEntryControlNotificationSequenceNumbers.unshift(command.sequenceNumber);
            if (this.recentEntryControlNotificationSequenceNumbers.length > 5) {
                this.recentEntryControlNotificationSequenceNumbers.pop();
            }
        }
        // Notify listeners
        this.emit("notification", this, core_1.CommandClasses["Entry Control"], {
            ...(0, shared_1.pick)(command, ["eventType", "dataType", "eventData"]),
            eventTypeLabel: cc_1.entryControlEventTypeLabels[command.eventType],
            dataTypeLabel: (0, shared_1.getEnumMemberName)(cc_1.EntryControlDataTypes, command.dataType),
        });
    }
    handlePowerlevelTestNodeReport(command) {
        // Notify listeners
        this.emit("notification", this, core_1.CommandClasses.Powerlevel, (0, shared_1.pick)(command, ["testNodeId", "status", "acknowledgedFrames"]));
    }
    /**
     * @internal
     * Deserializes the information of this node from a cache.
     */
    async deserialize() {
        if (!this.driver.networkCache)
            return;
        // Restore the device config
        await this.loadDeviceConfig();
        // Remove the Basic CC if it should be hidden
        // TODO: Do this as part of loadDeviceConfig
        const compat = this._deviceConfig?.compat;
        if (!compat?.disableBasicMapping && !compat?.treatBasicSetAsEvent) {
            for (const endpoint of this.getAllEndpoints()) {
                endpoint.hideBasicCCInFavorOfActuatorCCs();
            }
        }
        // Mark already-interviewed nodes as potentially ready
        if (this.interviewStage === _Types_1.InterviewStage.Complete) {
            this.readyMachine.send("RESTART_FROM_CACHE");
        }
    }
    /**
     * @internal
     * Sends the node a WakeUpCCNoMoreInformation so it can go back to sleep
     */
    async sendNoMoreInformation() {
        // Don't send the node back to sleep if it should be kept awake
        if (this.keepAwake)
            return false;
        // Avoid calling this method more than once
        if (this.isSendingNoMoreInformation)
            return false;
        this.isSendingNoMoreInformation = true;
        let msgSent = false;
        if (this.status === _Types_1.NodeStatus.Awake &&
            this.interviewStage === _Types_1.InterviewStage.Complete) {
            this.driver.controllerLog.logNode(this.id, {
                message: "Sending node back to sleep...",
                direction: "outbound",
            });
            try {
                // it is important that we catch errors in this call
                // otherwise, this method will not work anymore because
                // isSendingNoMoreInformation is stuck on `true`
                await this.commandClasses["Wake Up"].sendNoMoreInformation();
                msgSent = true;
            }
            catch {
                /* ignore */
            }
            finally {
                this.markAsAsleep();
            }
        }
        this.isSendingNoMoreInformation = false;
        return msgSent;
    }
    /**
     * Instructs the node to send powerlevel test frames to the other node using the given powerlevel. Returns how many frames were acknowledged during the test.
     *
     * **Note:** Depending on the number of test frames, this may take a while
     */
    async testPowerlevel(testNodeId, powerlevel, healthCheckTestFrameCount, onProgress) {
        const api = this.commandClasses.Powerlevel;
        // Keep sleeping nodes awake
        const wasKeptAwake = this.keepAwake;
        if (this.canSleep)
            this.keepAwake = true;
        const result = (value) => {
            // And undo the change when we're done
            this.keepAwake = wasKeptAwake;
            return value;
        };
        // Start the process
        await api.startNodeTest(testNodeId, powerlevel, healthCheckTestFrameCount);
        // Each frame will take a few ms to be sent, let's assume 5 per second
        // to estimate how long the test will take
        const expectedDurationMs = Math.round((healthCheckTestFrameCount / 5) * 1000);
        // Poll the status of the test regularly
        const pollFrequencyMs = expectedDurationMs >= 60000
            ? 10000
            : expectedDurationMs >= 10000
                ? 5000
                : 1000;
        // Track how often we failed to get a response from the node, so we can abort if the connection is too bad
        let continuousErrors = 0;
        // Also track how many times in a row there was no progress, which also indicates a bad connection
        let previousProgress = 0;
        while (true) {
            // The node might send an unsolicited update when it finishes the test
            const report = await this.driver
                .waitForCommand((cc) => cc.nodeId === this.id &&
                cc instanceof PowerlevelCC_1.PowerlevelCCTestNodeReport, pollFrequencyMs)
                .catch(() => undefined);
            const status = report
                ? (0, shared_1.pick)(report, ["status", "acknowledgedFrames"])
                : // If it didn't come in the wait time, poll for an update
                    await api.getNodeTestStatus().catch(() => undefined);
            // Safeguard against infinite loop:
            // If we didn't get a result, or there was no progress, try again next iteration
            if (!status ||
                (status.status === cc_1.PowerlevelTestStatus["In Progress"] &&
                    status.acknowledgedFrames === previousProgress)) {
                if (continuousErrors > 5)
                    return result(0);
                continuousErrors++;
                continue;
            }
            else {
                previousProgress = status.acknowledgedFrames;
                continuousErrors = 0;
            }
            if (status.status === cc_1.PowerlevelTestStatus.Failed) {
                return result(0);
            }
            else if (status.status === cc_1.PowerlevelTestStatus.Success) {
                return result(status.acknowledgedFrames);
            }
            else if (onProgress) {
                // Notify the caller of the test progress
                onProgress(status.acknowledgedFrames, healthCheckTestFrameCount);
            }
        }
    }
    /**
     * Checks the health of connection between the controller and this node and returns the results.
     */
    async checkLifelineHealth(rounds = 5, onProgress) {
        if (rounds > 10 || rounds < 1) {
            throw new core_1.ZWaveError("The number of health check rounds must be between 1 and 10!", core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        // No. of pings per round
        const start = Date.now();
        /** Computes a health rating from a health check result */
        const computeRating = (result) => {
            const failedPings = Math.max(result.failedPingsController ?? 0, result.failedPingsNode);
            const numNeighbors = result.numNeighbors;
            const minPowerlevel = result.minPowerlevel ?? cc_1.Powerlevel["-6 dBm"];
            const snrMargin = result.snrMargin ?? 17;
            const latency = result.latency;
            if (failedPings === 10)
                return 0;
            if (failedPings > 2)
                return 1;
            if (failedPings === 2 || latency > 1000)
                return 2;
            if (failedPings === 1 || latency > 500)
                return 3;
            if (latency > 250)
                return 4;
            if (latency > 100)
                return 5;
            if (minPowerlevel < cc_1.Powerlevel["-6 dBm"] || snrMargin < 17) {
                // Lower powerlevel reductions (= higher power) have lower numeric values
                return numNeighbors > 2 ? 7 : 6;
            }
            if (numNeighbors <= 2)
                return 8;
            if (latency > 50)
                return 9;
            return 10;
        };
        this.driver.controllerLog.logNode(this.id, `Starting lifeline health check (${rounds} round${rounds !== 1 ? "s" : ""})...`);
        if (this.canSleep && this.status !== _Types_1.NodeStatus.Awake) {
            // Wait for node to wake up to avoid incorrectly long delays in the first health check round
            this.driver.controllerLog.logNode(this.id, `waiting for node to wake up...`);
            await this.waitForWakeup();
        }
        const results = [];
        for (let round = 1; round <= rounds; round++) {
            // Determine the number of repeating neighbors
            const numNeighbors = (await this.driver.controller.getNodeNeighbors(this.nodeId, true)).length;
            // Ping the node 10x, measuring the RSSI
            let txReport;
            let routeChanges;
            let rssi;
            let channel;
            let snrMargin;
            let failedPingsNode = 0;
            let latency = 0;
            const pingAPI = this.commandClasses["No Operation"].withOptions({
                onTXReport: (report) => {
                    txReport = report;
                },
            });
            for (let i = 1; i <= HealthCheck_1.healthCheckTestFrameCount; i++) {
                const start = Date.now();
                const pingResult = await pingAPI.send().then(() => true, () => false);
                const rtt = Date.now() - start;
                latency = Math.max(latency, txReport ? txReport.txTicks * 10 : rtt);
                if (!pingResult) {
                    failedPingsNode++;
                }
                else if (txReport) {
                    routeChanges ?? (routeChanges = 0);
                    if (txReport.routingAttempts > 1) {
                        routeChanges++;
                    }
                    rssi = txReport.ackRSSI;
                    channel = txReport.ackChannelNo;
                }
            }
            // If possible, compute the SNR margin from the test results
            if (rssi != undefined &&
                rssi < core_1.RssiError.NoSignalDetected &&
                channel != undefined) {
                const backgroundRSSI = await this.driver.controller.getBackgroundRSSI();
                if (`rssiChannel${channel}` in backgroundRSSI) {
                    const bgRSSI = backgroundRSSI[`rssiChannel${channel}`];
                    if ((0, core_1.isRssiError)(bgRSSI)) {
                        if (bgRSSI === core_1.RssiError.ReceiverSaturated) {
                            // RSSI is too high to measure, so there can't be any margin left
                            snrMargin = 0;
                        }
                        else if (bgRSSI === core_1.RssiError.NoSignalDetected) {
                            // It is very quiet, assume -128 dBm
                            snrMargin = rssi + 128;
                        }
                        else {
                            snrMargin = undefined;
                        }
                    }
                    else {
                        snrMargin = rssi - bgRSSI;
                    }
                }
            }
            const ret = {
                latency,
                failedPingsNode,
                numNeighbors,
                routeChanges,
                snrMargin,
                rating: 0,
            };
            // Now instruct the node to ping the controller, figuring out the minimum powerlevel
            if (this.supportsCC(core_1.CommandClasses.Powerlevel)) {
                // Do a binary search and find the highest reduction in powerlevel for which there are no errors
                let failedPingsController = 0;
                const executor = async (powerlevel) => {
                    this.driver.controllerLog.logNode(this.id, `Sending ${HealthCheck_1.healthCheckTestFrameCount} pings to controller at ${(0, shared_1.getEnumMemberName)(cc_1.Powerlevel, powerlevel)}...`);
                    const result = await this.testPowerlevel(this.driver.controller.ownNodeId, powerlevel, HealthCheck_1.healthCheckTestFrameCount);
                    failedPingsController = HealthCheck_1.healthCheckTestFrameCount - result;
                    this.driver.controllerLog.logNode(this.id, `At ${(0, shared_1.getEnumMemberName)(cc_1.Powerlevel, powerlevel)}, ${result}/${HealthCheck_1.healthCheckTestFrameCount} pings were acknowledged...`);
                    return failedPingsController === 0;
                };
                try {
                    const powerlevel = await (0, shared_1.discreteLinearSearch)(cc_1.Powerlevel["Normal Power"], // minimum reduction
                    cc_1.Powerlevel["-9 dBm"], // maximum reduction
                    executor);
                    if (powerlevel == undefined) {
                        // There were still failures at normal power, report it
                        ret.minPowerlevel = cc_1.Powerlevel["Normal Power"];
                        ret.failedPingsController = failedPingsController;
                    }
                    else {
                        ret.minPowerlevel = powerlevel;
                    }
                }
                catch (e) {
                    if ((0, core_1.isZWaveError)(e) &&
                        e.code === core_1.ZWaveErrorCodes.Controller_CallbackNOK) {
                        // The node is dead, treat this as a failure
                        ret.minPowerlevel = cc_1.Powerlevel["Normal Power"];
                        ret.failedPingsController = HealthCheck_1.healthCheckTestFrameCount;
                    }
                    else {
                        throw e;
                    }
                }
            }
            ret.rating = computeRating(ret);
            results.push(ret);
            onProgress?.(round, rounds, ret.rating);
        }
        const duration = Date.now() - start;
        const rating = Math.min(...results.map((r) => r.rating));
        const summary = { results, rating };
        this.driver.controllerLog.logNode(this.id, `Lifeline health check complete in ${duration} ms
${(0, HealthCheck_1.formatLifelineHealthCheckSummary)(summary)}`);
        return summary;
    }
    /**
     * Checks the health of connection between this node and the target node and returns the results.
     */
    async checkRouteHealth(targetNodeId, rounds = 5, onProgress) {
        if (rounds > 10 || rounds < 1) {
            throw new core_1.ZWaveError("The number of health check rounds must be between 1 and 10!", core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const otherNode = this.driver.controller.nodes.getOrThrow(targetNodeId);
        if (otherNode.canSleep) {
            throw new core_1.ZWaveError("Nodes which can sleep are not a valid target for a route health check!", core_1.ZWaveErrorCodes.CC_NotSupported);
        }
        else if (this.canSleep &&
            !this.supportsCC(core_1.CommandClasses.Powerlevel)) {
            throw new core_1.ZWaveError("Route health checks require that nodes which can sleep support Powerlevel CC!", core_1.ZWaveErrorCodes.CC_NotSupported);
        }
        else if (!this.supportsCC(core_1.CommandClasses.Powerlevel) &&
            !otherNode.supportsCC(core_1.CommandClasses.Powerlevel)) {
            throw new core_1.ZWaveError("For a route health check, at least one of the nodes must support Powerlevel CC!", core_1.ZWaveErrorCodes.CC_NotSupported);
        }
        // No. of pings per round
        const healthCheckTestFrameCount = 10;
        const start = Date.now();
        /** Computes a health rating from a health check result */
        const computeRating = (result) => {
            const failedPings = Math.max(result.failedPingsToSource ?? 0, result.failedPingsToTarget ?? 0);
            const numNeighbors = result.numNeighbors;
            const minPowerlevel = Math.max(result.minPowerlevelSource ?? cc_1.Powerlevel["-6 dBm"], result.minPowerlevelTarget ?? cc_1.Powerlevel["-6 dBm"]);
            if (failedPings === 10)
                return 0;
            if (failedPings > 2)
                return 1;
            if (failedPings === 2)
                return 2;
            if (failedPings === 1)
                return 3;
            if (minPowerlevel < cc_1.Powerlevel["-6 dBm"]) {
                // Lower powerlevel reductions (= higher power) have lower numeric values
                return numNeighbors > 2 ? 7 : 6;
            }
            if (numNeighbors <= 2)
                return 8;
            return 10;
        };
        this.driver.controllerLog.logNode(this.id, `Starting route health check to node ${targetNodeId} (${rounds} round${rounds !== 1 ? "s" : ""})...`);
        const results = [];
        for (let round = 1; round <= rounds; round++) {
            // Determine the minimum number of repeating neighbors between the
            // source and target node
            const numNeighbors = Math.min((await this.driver.controller.getNodeNeighbors(this.nodeId, true)).length, (await this.driver.controller.getNodeNeighbors(targetNodeId, true)).length);
            let failedPings = 0;
            let failedPingsToSource;
            let minPowerlevelSource;
            let failedPingsToTarget;
            let minPowerlevelTarget;
            const executor = (node, otherNode) => async (powerlevel) => {
                this.driver.controllerLog.logNode(node.id, `Sending ${healthCheckTestFrameCount} pings to node ${otherNode.id} at ${(0, shared_1.getEnumMemberName)(cc_1.Powerlevel, powerlevel)}...`);
                const result = await node.testPowerlevel(otherNode.id, powerlevel, healthCheckTestFrameCount);
                failedPings = healthCheckTestFrameCount - result;
                this.driver.controllerLog.logNode(node.id, `At ${(0, shared_1.getEnumMemberName)(cc_1.Powerlevel, powerlevel)}, ${result}/${healthCheckTestFrameCount} pings were acknowledged by node ${otherNode.id}...`);
                return failedPings === 0;
            };
            // Now instruct this node to ping the other one, figuring out the minimum powerlevel
            if (this.supportsCC(core_1.CommandClasses.Powerlevel)) {
                try {
                    // We have to start with the maximum powerlevel and work our way down
                    // Otherwise some nodes get stuck trying to complete the check at a bad powerlevel
                    // causing the following measurements to fail.
                    const powerlevel = await (0, shared_1.discreteLinearSearch)(cc_1.Powerlevel["Normal Power"], // minimum reduction
                    cc_1.Powerlevel["-9 dBm"], // maximum reduction
                    executor(this, otherNode));
                    if (powerlevel == undefined) {
                        // There were still failures at normal power, report it
                        minPowerlevelSource = cc_1.Powerlevel["Normal Power"];
                        failedPingsToTarget = failedPings;
                    }
                    else {
                        minPowerlevelSource = powerlevel;
                        failedPingsToTarget = 0;
                    }
                }
                catch (e) {
                    if ((0, core_1.isZWaveError)(e) &&
                        e.code === core_1.ZWaveErrorCodes.Controller_CallbackNOK) {
                        // The node is dead, treat this as a failure
                        minPowerlevelSource = cc_1.Powerlevel["Normal Power"];
                        failedPingsToTarget = healthCheckTestFrameCount;
                    }
                    else {
                        throw e;
                    }
                }
            }
            // And do the same with the other node - unless the current node is a sleeping node, then this doesn't make sense
            if (!this.canSleep &&
                otherNode.supportsCC(core_1.CommandClasses.Powerlevel)) {
                try {
                    const powerlevel = await (0, shared_1.discreteLinearSearch)(cc_1.Powerlevel["Normal Power"], // minimum reduction
                    cc_1.Powerlevel["-9 dBm"], // maximum reduction
                    executor(otherNode, this));
                    if (powerlevel == undefined) {
                        // There were still failures at normal power, report it
                        minPowerlevelTarget = cc_1.Powerlevel["Normal Power"];
                        failedPingsToSource = failedPings;
                    }
                    else {
                        minPowerlevelTarget = powerlevel;
                        failedPingsToSource = 0;
                    }
                }
                catch (e) {
                    if ((0, core_1.isZWaveError)(e) &&
                        e.code === core_1.ZWaveErrorCodes.Controller_CallbackNOK) {
                        // The node is dead, treat this as a failure
                        minPowerlevelTarget = cc_1.Powerlevel["Normal Power"];
                        failedPingsToSource = healthCheckTestFrameCount;
                    }
                    else {
                        throw e;
                    }
                }
            }
            const ret = {
                numNeighbors,
                failedPingsToSource,
                failedPingsToTarget,
                minPowerlevelSource,
                minPowerlevelTarget,
                rating: 0,
            };
            ret.rating = computeRating(ret);
            results.push(ret);
            onProgress?.(round, rounds, ret.rating);
        }
        const duration = Date.now() - start;
        const rating = Math.min(...results.map((r) => r.rating));
        const summary = { results, rating };
        this.driver.controllerLog.logNode(this.id, `Route health check to node ${otherNode.id} complete in ${duration} ms
${(0, HealthCheck_1.formatRouteHealthCheckSummary)(this.id, otherNode.id, summary)}`);
        return summary;
    }
    /**
     * Updates the average RTT of this node
     * @internal
     */
    updateRTT(sentMessage) {
        if (sentMessage.rtt) {
            const rttMs = sentMessage.rtt / 1e6;
            this.updateStatistics((current) => ({
                ...current,
                rtt: current.rtt != undefined
                    ? (0, math_1.roundTo)(current.rtt * 0.75 + rttMs * 0.25, 1)
                    : (0, math_1.roundTo)(rttMs, 1),
            }));
        }
    }
    /**
     * Updates route/transmission statistics for this node
     * @internal
     */
    updateRouteStatistics(txReport) {
        this.updateStatistics((current) => {
            const ret = { ...current };
            // Update ACK RSSI
            if (txReport.ackRSSI != undefined) {
                ret.rssi =
                    ret.rssi == undefined || (0, core_1.isRssiError)(txReport.ackRSSI)
                        ? txReport.ackRSSI
                        : Math.round(ret.rssi * 0.75 + txReport.ackRSSI * 0.25);
            }
            // Update the LWR's statistics
            const newStats = {
                protocolDataRate: txReport.routeSpeed,
                repeaters: (txReport.repeaterNodeIds ?? []),
                rssi: txReport.ackRSSI ?? ret.lwr?.rssi ?? core_1.RssiError.NotAvailable,
            };
            if (txReport.ackRepeaterRSSI != undefined) {
                newStats.repeaterRSSI = txReport.ackRepeaterRSSI;
            }
            if (txReport.failedRouteLastFunctionalNodeId &&
                txReport.failedRouteFirstNonFunctionalNodeId) {
                newStats.routeFailedBetween = [
                    txReport.failedRouteLastFunctionalNodeId,
                    txReport.failedRouteFirstNonFunctionalNodeId,
                ];
            }
            if (ret.lwr && !(0, NodeStatistics_1.routeStatisticsEquals)(ret.lwr, newStats)) {
                // The old LWR becomes the NLWR
                ret.nlwr = ret.lwr;
            }
            ret.lwr = newStats;
            return ret;
        });
    }
    /**
     * Sets the current date, time and timezone (or a subset of those) on the node using one or more of the respective CCs.
     * Returns whether the operation was successful.
     */
    async setDateAndTime(now = new Date()) {
        // There are multiple ways to communicate the current time to a node:
        // 1. Time Parameters CC
        // 2. Clock CC
        // 3. Time CC, but only in response to requests from the node
        const timeParametersAPI = this.commandClasses["Time Parameters"];
        const timeAPI = this.commandClasses.Time;
        const clockAPI = this.commandClasses.Clock;
        const scheduleEntryLockAPI = this.commandClasses["Schedule Entry Lock"];
        if (timeParametersAPI.isSupported() &&
            timeParametersAPI.supportsCommand(cc_1.TimeParametersCommand.Set)) {
            try {
                const result = await timeParametersAPI.set(now);
                if ((0, core_1.supervisedCommandFailed)(result))
                    return false;
            }
            catch {
                return false;
            }
        }
        else if (clockAPI.isSupported() &&
            clockAPI.supportsCommand(cc_1.ClockCommand.Set)) {
            try {
                // Get desired time in local time
                const hours = now.getHours();
                const minutes = now.getMinutes();
                // Sunday is 0 in JS, but 7 in Z-Wave
                let weekday = now.getDay();
                if (weekday === 0)
                    weekday = 7;
                const result = await clockAPI.set(hours, minutes, weekday);
                if ((0, core_1.supervisedCommandFailed)(result))
                    return false;
            }
            catch {
                return false;
            }
        }
        else {
            // No way to set the time
            return false;
        }
        // We might also have to change the timezone. That is done with the Time CC.
        // Or in really strange cases using the Schedule Entry Lock CC
        const timezone = (0, core_1.getDSTInfo)(now);
        if (timeAPI.isSupported() &&
            timeAPI.supportsCommand(cc_1.TimeCommand.TimeOffsetSet)) {
            try {
                const result = await timeAPI.setTimezone(timezone);
                if ((0, core_1.supervisedCommandFailed)(result))
                    return false;
            }
            catch {
                return false;
            }
        }
        else if (scheduleEntryLockAPI.isSupported() &&
            scheduleEntryLockAPI.supportsCommand(cc_1.ScheduleEntryLockCommand.TimeOffsetSet)) {
            try {
                const result = await scheduleEntryLockAPI.setTimezone(timezone);
                if ((0, core_1.supervisedCommandFailed)(result))
                    return false;
            }
            catch {
                return false;
            }
        }
        return true;
    }
};
ZWaveNode = __decorate([
    (0, shared_1.Mixin)([events_1.EventEmitter, NodeStatistics_1.NodeStatisticsHost])
], ZWaveNode);
exports.ZWaveNode = ZWaveNode;
//# sourceMappingURL=Node.js.map