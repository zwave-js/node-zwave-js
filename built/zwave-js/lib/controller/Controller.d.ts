/// <reference types="node" />
import { KEXFailType, type AssociationAddress, type AssociationGroup } from "@zwave-js/cc";
import { NodeType, RFRegion, RSSI, ValueDB, ZWaveDataRate } from "@zwave-js/core";
import { FunctionType } from "@zwave-js/serial";
import { ReadonlyObjectKeyMap, ReadonlyThrowingMap, TypedEventEmitter } from "@zwave-js/shared";
import type { StatisticsEventCallbacks } from "../driver/Statistics";
import { ZWaveNode } from "../node/Node";
import { VirtualNode } from "../node/VirtualNode";
import { LifelineRoutes } from "../node/_Types";
import { SerialAPISetupCommand, SerialAPISetup_GetPowerlevelResponse } from "../serialapi/capability/SerialAPISetupMessages";
import { NVMId } from "../serialapi/nvm/GetNVMIdMessages";
import { ZWaveApiVersion, ZWaveLibraryTypes } from "../serialapi/_Types";
import { ControllerStatistics, ControllerStatisticsHost } from "./ControllerStatistics";
import { ZWaveFeature } from "./Features";
import { ExclusionOptions, FoundNode, InclusionOptions, InclusionResult, InclusionState, InclusionStrategy, PlannedProvisioningEntry, ReplaceNodeOptions, SmartStartProvisioningEntry } from "./Inclusion";
import type { UnknownZWaveChipType } from "./ZWaveChipTypes";
import { ControllerFirmwareUpdateProgress, ControllerFirmwareUpdateResult, FirmwareUpdateFileInfo, FirmwareUpdateInfo, GetFirmwareUpdatesOptions, HealNetworkOptions, HealNodeStatus, SDKVersion } from "./_Types";
interface ControllerEventCallbacks extends StatisticsEventCallbacks<ControllerStatistics> {
    "inclusion failed": () => void;
    "exclusion failed": () => void;
    "inclusion started": (secure: boolean, strategy: InclusionStrategy) => void;
    "exclusion started": () => void;
    "inclusion stopped": () => void;
    "exclusion stopped": () => void;
    "node found": (node: FoundNode) => void;
    "node added": (node: ZWaveNode, result: InclusionResult) => void;
    "node removed": (node: ZWaveNode, replaced: boolean) => void;
    "heal network progress": (progress: ReadonlyMap<number, HealNodeStatus>) => void;
    "heal network done": (result: ReadonlyMap<number, HealNodeStatus>) => void;
    "firmware update progress": (progress: ControllerFirmwareUpdateProgress) => void;
    "firmware update finished": (result: ControllerFirmwareUpdateResult) => void;
}
export type ControllerEvents = Extract<keyof ControllerEventCallbacks, string>;
export interface ZWaveController extends ControllerStatisticsHost {
}
export declare class ZWaveController extends TypedEventEmitter<ControllerEventCallbacks> {
    private readonly driver;
    private _type;
    get type(): ZWaveLibraryTypes | undefined;
    private _protocolVersion;
    get protocolVersion(): string | undefined;
    private _sdkVersion;
    get sdkVersion(): string | undefined;
    private _zwaveApiVersion;
    get zwaveApiVersion(): ZWaveApiVersion | undefined;
    private _zwaveChipType;
    get zwaveChipType(): string | UnknownZWaveChipType | undefined;
    private _homeId;
    /** A 32bit number identifying the current network */
    get homeId(): number | undefined;
    private _ownNodeId;
    /** The ID of the controller in the current network */
    get ownNodeId(): number | undefined;
    private _isPrimary;
    get isPrimary(): boolean | undefined;
    private _isUsingHomeIdFromOtherNetwork;
    get isUsingHomeIdFromOtherNetwork(): boolean | undefined;
    private _isSISPresent;
    get isSISPresent(): boolean | undefined;
    private _wasRealPrimary;
    get wasRealPrimary(): boolean | undefined;
    private _isSIS;
    get isSIS(): boolean | undefined;
    private _isSUC;
    get isSUC(): boolean | undefined;
    private _nodeType;
    get nodeType(): NodeType | undefined;
    /** Checks if the SDK version is greater than the given one */
    sdkVersionGt(version: SDKVersion): boolean | undefined;
    /** Checks if the SDK version is greater than or equal to the given one */
    sdkVersionGte(version: SDKVersion): boolean | undefined;
    /** Checks if the SDK version is lower than the given one */
    sdkVersionLt(version: SDKVersion): boolean | undefined;
    /** Checks if the SDK version is lower than or equal to the given one */
    sdkVersionLte(version: SDKVersion): boolean | undefined;
    private _manufacturerId;
    get manufacturerId(): number | undefined;
    private _productType;
    get productType(): number | undefined;
    private _productId;
    get productId(): number | undefined;
    private _firmwareVersion;
    get firmwareVersion(): string | undefined;
    private _supportedFunctionTypes;
    get supportedFunctionTypes(): readonly FunctionType[] | undefined;
    /** Checks if a given Z-Wave function type is supported by this controller */
    isFunctionSupported(functionType: FunctionType): boolean;
    private _supportedSerialAPISetupCommands;
    get supportedSerialAPISetupCommands(): readonly SerialAPISetupCommand[] | undefined;
    /** Checks if a given Serial API setup command is supported by this controller */
    isSerialAPISetupCommandSupported(command: SerialAPISetupCommand): boolean;
    /**
     * Tests if the controller supports a certain feature.
     * Returns `undefined` if this information isn't known yet.
     */
    supportsFeature(feature: ZWaveFeature): boolean | undefined;
    /** Throws if the controller does not support a certain feature */
    private assertFeature;
    private _sucNodeId;
    get sucNodeId(): number | undefined;
    private _supportsTimers;
    get supportsTimers(): boolean | undefined;
    /** Whether the controller is known to support soft reset */
    get supportsSoftReset(): boolean | undefined;
    private _rfRegion;
    /** Which RF region the controller is currently set to, or `undefined` if it could not be determined (yet). This value is cached and can be changed through {@link setRFRegion}. */
    get rfRegion(): RFRegion | undefined;
    private _nodes;
    /** A dictionary of the nodes connected to this controller */
    get nodes(): ReadonlyThrowingMap<number, ZWaveNode>;
    /** Returns the node with the given DSK */
    getNodeByDSK(dsk: Buffer | string): ZWaveNode | undefined;
    /** Returns the controller node's value DB */
    get valueDB(): ValueDB;
    private _healNetworkActive;
    /** Returns whether the network or a node is currently being healed. */
    get isHealNetworkActive(): boolean;
    private groupNodesBySecurityClass;
    /**
     * Returns a reference to the (virtual) broadcast node, which allows sending commands to all nodes.
     * @deprecated Use {@link getBroadcastNodes} instead, which automatically groups nodes by security class and ignores nodes that cannot be controlled via multicast/broadcast.
     */
    getBroadcastNode(): VirtualNode;
    /** Returns a reference to the (virtual) broadcast node, which allows sending commands to all insecure nodes. */
    getBroadcastNodeInsecure(): VirtualNode;
    /**
     * Creates the necessary virtual nodes to be able to send commands to all nodes in the network.
     * Nodes are grouped by security class automatically, and get ignored if they cannot be controlled via multicast/broadcast.
     */
    getBroadcastNodes(): VirtualNode[];
    /**
     * Creates a virtual node that can be used to send multicast commands to several nodes.
     * @deprecated Use {@link getMulticastGroups} instead, which automatically groups nodes by security class and ignores nodes that cannot be controlled via multicast.
     */
    getMulticastGroup(nodeIDs: number[]): VirtualNode;
    /**
     * Creates the necessary virtual nodes to be able to send commands to the given nodes.
     * Nodes are grouped by security class automatically, and get ignored if they cannot be controlled via multicast.
     */
    getMulticastGroups(nodeIDs: number[]): VirtualNode[];
    /**
     * Creates a virtual node that can be used to send multicast commands to several insecure nodes.
     * All nodes MUST be included insecurely.
     */
    getMulticastGroupInsecure(nodeIDs: number[]): VirtualNode;
    /**
     * Creates a virtual node that can be used to send multicast commands to several nodes using Security S2.
     * All nodes MUST be included using Security S2 and MUST have the same (highest) security class.
     */
    getMulticastGroupS2(nodeIDs: number[]): VirtualNode;
    private set provisioningList(value);
    /** Adds the given entry (DSK and security classes) to the controller's SmartStart provisioning list or replaces an existing entry */
    provisionSmartStartNode(entry: PlannedProvisioningEntry): void;
    /**
     * Removes the given DSK or node ID from the controller's SmartStart provisioning list.
     *
     * **Note:** If this entry corresponds to an included node, it will **NOT** be excluded
     */
    unprovisionSmartStartNode(dskOrNodeId: string | number): void;
    private getProvisioningEntryInternal;
    /**
     * Returns the entry for the given DSK or node ID from the controller's SmartStart provisioning list.
     */
    getProvisioningEntry(dskOrNodeId: string | number): Readonly<SmartStartProvisioningEntry> | undefined;
    /**
     * Returns all entries from the controller's SmartStart provisioning list.
     */
    getProvisioningEntries(): SmartStartProvisioningEntry[];
    /** Returns whether the SmartStart provisioning list contains active entries that have not been included yet */
    hasPlannedProvisioningEntries(): boolean;
    private createValueDBForNode;
    private _inclusionState;
    get inclusionState(): InclusionState;
    private _smartStartEnabled;
    private _includeController;
    private _exclusionOptions;
    private _inclusionOptions;
    private _nodePendingInclusion;
    private _nodePendingExclusion;
    private _nodePendingReplace;
    private _replaceFailedPromise;
    /**
     * Starts the inclusion process of new nodes.
     * Resolves to true when the process was started, and false if the inclusion was already active.
     *
     * @param options Defines the inclusion strategy to use.
     */
    beginInclusion(options?: InclusionOptions): Promise<boolean>;
    /**
     * Finishes an inclusion process. This must only be called after the ProtocolDone status is received.
     * Returns the ID of the newly added node.
     */
    private finishInclusion;
    /**
     * Stops an active inclusion process. Resolves to true when the controller leaves inclusion mode,
     * and false if the inclusion was not active.
     */
    stopInclusion(): Promise<boolean>;
    /**
     * Puts the controller into listening mode for Smart Start inclusion.
     * Whenever a node on the provisioning list announces itself, it will automatically be added.
     *
     * Resolves to `true` when the listening mode is started or was active, and `false` if it is scheduled for later activation.
     */
    private enableSmartStart;
    /**
     * Disables the listening mode for Smart Start inclusion.
     *
     * Resolves to `true` when the listening mode is stopped, and `false` if was not active.
     */
    private disableSmartStart;
    private pauseSmartStart;
    /**
     * Starts the exclusion process of new nodes.
     * Resolves to true when the process was started, and false if an inclusion or exclusion process was already active.
     *
     * @param options Influences the exclusion process and what happens with the Smart Start provisioning list.
     */
    beginExclusion(options?: ExclusionOptions): Promise<boolean>;
    /**
     * Starts the exclusion process of new nodes.
     * Resolves to true when the process was started, and false if an inclusion or exclusion process was already active.
     *
     * @param unprovision Whether the removed node should also be removed from the Smart Start provisioning list.
     * A value of `"inactive"` will keep the provisioning entry, but disable it.
     *
     * @deprecated Use the overload with {@link ExclusionOptions} instead.
     */
    beginExclusion(unprovision: boolean | "inactive"): Promise<boolean>;
    /**
     * Stops an active exclusion process. Resolves to true when the controller leaves exclusion mode,
     * and false if the inclusion was not active.
     */
    stopExclusion(): Promise<boolean>;
    /**
     * Handles bootstrapping the security keys for a node that was included by an inclusion controller
     */
    private proxyBootstrap;
    private secureBootstrapS0;
    private _bootstrappingS2NodeId;
    private cancelBootstrapS2Promise;
    cancelSecureBootstrapS2(reason: KEXFailType): void;
    private secureBootstrapS2;
    /** Ensures that the node knows where to reach the controller */
    private bootstrapLifelineAndWakeup;
    /**
     * Is called when an AddNode request is received from the controller.
     * Handles and controls the inclusion process.
     */
    private handleAddNodeStatusReport;
    /**
     * Is called when an ReplaceFailed request is received from the controller.
     * Handles and controls the replace process.
     */
    private handleReplaceNodeStatusReport;
    /**
     * Is called when a RemoveNode request is received from the controller.
     * Handles and controls the exclusion process.
     */
    private handleRemoveNodeStatusReport;
    private _healNetworkProgress;
    /**
     * Performs a healing process for all alive nodes in the network,
     * requesting updated neighbor lists and assigning fresh routes to
     * association targets.
     */
    beginHealingNetwork(options?: HealNetworkOptions): boolean;
    private healNetwork;
    /**
     * Stops an network healing process. Resolves false if the process was not active, true otherwise.
     */
    stopHealingNetwork(): boolean;
    /**
     * Performs a healing process for a single alive node in the network,
     * updating the neighbor list and assigning fresh routes to
     * association targets.
     *
     * Returns `true` if the process succeeded, `false` otherwise.
     */
    healNode(nodeId: number): Promise<boolean>;
    private healNodeInternal;
    /** Configures the given Node to be SUC/SIS or not */
    configureSUC(nodeId: number, enableSUC: boolean, enableSIS: boolean): Promise<boolean>;
    assignSUCReturnRoute(nodeId: number): Promise<boolean>;
    deleteSUCReturnRoute(nodeId: number): Promise<boolean>;
    assignReturnRoute(nodeId: number, destinationNodeId: number): Promise<boolean>;
    deleteReturnRoute(nodeId: number): Promise<boolean>;
    /**
     * Assigns a priority route between two end nodes. This route will always be used for the first transmission attempt.
     * @param nodeId The ID of the source node of the route
     * @param destinationNodeId The ID of the destination node of the route
     * @param repeaters The IDs of the nodes that should be used as repeaters, or an empty array for direct connection
     * @param routeSpeed The transmission speed to use for the route
     */
    assignPriorityReturnRoute(nodeId: number, destinationNodeId: number, repeaters: number[], routeSpeed: ZWaveDataRate): Promise<boolean>;
    /**
     * Assigns a priority route from an end node to the SUC. This route will always be used for the first transmission attempt.
     * @param nodeId The ID of the end node for which to assign the route
     * @param repeaters The IDs of the nodes that should be used as repeaters, or an empty array for direct connection
     * @param routeSpeed The transmission speed to use for the route
     */
    assignPrioritySUCReturnRoute(nodeId: number, repeaters: number[], routeSpeed: ZWaveDataRate): Promise<boolean>;
    private handleRouteAssignmentTransmitReport;
    /**
     * Sets the priority route which will always be used for the first transmission attempt from the controller to the given node.
     * @param destinationNodeId The ID of the node that should be reached via the priority route
     * @param repeaters The IDs of the nodes that should be used as repeaters, or an empty array for direct connection
     * @param routeSpeed The transmission speed to use for the route
     */
    setPriorityRoute(destinationNodeId: number, repeaters: number[], routeSpeed: ZWaveDataRate): Promise<boolean>;
    /**
     * Returns the priority route which is currently set for a node. If none is set, either the LWR or the NLWR is returned.
     * @param destinationNodeId The ID of the node for which the priority route should be returned
     */
    getPriorityRoute(destinationNodeId: number): Promise<{
        repeaters: number[];
        routeSpeed: ZWaveDataRate;
    } | undefined>;
    /**
     * Returns a dictionary of all association groups of this node or endpoint and their information.
     * If no endpoint is given, the associations of the root device (endpoint 0) are returned.
     * This only works AFTER the interview process
     */
    getAssociationGroups(source: AssociationAddress): ReadonlyMap<number, AssociationGroup>;
    /**
     * Returns all association groups that exist on a node and all its endpoints.
     * The returned map uses the endpoint index as keys and its values are maps of group IDs to their definition
     */
    getAllAssociationGroups(nodeId: number): ReadonlyMap<number, ReadonlyMap<number, AssociationGroup>>;
    /**
     * Returns all associations (Multi Channel or normal) that are configured on the root device or an endpoint of a node.
     * If no endpoint is given, the associations of the root device (endpoint 0) are returned.
     */
    getAssociations(source: AssociationAddress): ReadonlyMap<number, readonly AssociationAddress[]>;
    /**
     * Returns all associations (Multi Channel or normal) that are configured on a node and all its endpoints.
     * The returned map uses the source node+endpoint as keys and its values are a map of association group IDs to target node+endpoint.
     */
    getAllAssociations(nodeId: number): ReadonlyObjectKeyMap<AssociationAddress, ReadonlyMap<number, readonly AssociationAddress[]>>;
    /**
     * Checks if a given association is allowed.
     */
    isAssociationAllowed(source: AssociationAddress, group: number, destination: AssociationAddress): boolean;
    /**
     * Adds associations to a node or endpoint
     */
    addAssociations(source: AssociationAddress, group: number, destinations: AssociationAddress[]): Promise<void>;
    /**
     * Removes the given associations from a node or endpoint
     */
    removeAssociations(source: AssociationAddress, group: number, destinations: AssociationAddress[]): Promise<void>;
    /**
     * Removes a node from all other nodes' associations
     * WARNING: It is not recommended to await this method
     */
    removeNodeFromAllAssociations(nodeId: number): Promise<void>;
    /**
     * Tests if a node is marked as failed in the controller's memory
     * @param nodeId The id of the node in question
     */
    isFailedNode(nodeId: number): Promise<boolean>;
    /**
     * Removes a failed node from the controller's memory. If the process fails, this will throw an exception with the details why.
     * @param nodeId The id of the node to remove
     */
    removeFailedNode(nodeId: number): Promise<void>;
    /**
     * Replace a failed node from the controller's memory. If the process fails, this will throw an exception with the details why.
     * @param nodeId The id of the node to replace
     * @param options Defines the inclusion strategy to use for the replacement node
     */
    replaceFailedNode(nodeId: number, options?: ReplaceNodeOptions): Promise<boolean>;
    /** Configure the RF region at the Z-Wave API Module */
    setRFRegion(region: RFRegion): Promise<boolean>;
    /** Request the current RF region configured at the Z-Wave API Module */
    getRFRegion(): Promise<RFRegion>;
    /** Configure the Powerlevel setting of the Z-Wave API */
    setPowerlevel(powerlevel: number, measured0dBm: number): Promise<boolean>;
    /** Request the Powerlevel setting of the Z-Wave API */
    getPowerlevel(): Promise<Pick<SerialAPISetup_GetPowerlevelResponse, "powerlevel" | "measured0dBm">>;
    /**
     * Returns the known list of neighbors for a node
     */
    getNodeNeighbors(nodeId: number, onlyRepeaters?: boolean): Promise<readonly number[]>;
    /**
     * Returns the known routes the controller will use to communicate with the nodes.
     *
     * This information is dynamically built using TX status reports and may not be accurate at all times.
     * Also, it may not be available immediately after startup or at all if the controller doesn't support this feature.
     *
     * **Note:** To keep information returned by this method updated, use the information contained in each node's `"statistics"` event.
     */
    getKnownLifelineRoutes(): ReadonlyMap<number, LifelineRoutes>;
    /** Turns the Z-Wave radio on or off */
    toggleRF(enabled: boolean): Promise<boolean>;
    /**
     * **Z-Wave 500 series only**
     *
     * Initialize the Firmware Update functionality and determine if the firmware can be updated.
     */
    private firmwareUpdateNVMInit;
    /**
     * **Z-Wave 500 series only**
     *
     * Set the NEWIMAGE marker in the NVM (to the given value), which is used to signal that a new firmware image is present
     */
    private firmwareUpdateNVMSetNewImage;
    /**
     * **Z-Wave 500 series only**
     *
     * Return the value of the NEWIMAGE marker in the NVM, which is used to signal that a new firmware image is present
     */
    private firmwareUpdateNVMGetNewImage;
    /**
     * **Z-Wave 500 series only**
     *
     * Calculates the CRC-16 for the specified block of data in the NVM
     */
    private firmwareUpdateNVMUpdateCRC16;
    /**
     * **Z-Wave 500 series only**
     *
     * Writes the given data into the firmware update region of the NVM.
     */
    private firmwareUpdateNVMWrite;
    /**
     * **Z-Wave 500 series only**
     *
     * Checks if the firmware present in the NVM is valid
     */
    private firmwareUpdateNVMIsValidCRC16;
    /**
     * **Z-Wave 500 series only**
     *
     * Returns information of the controller's external NVM
     */
    getNVMId(): Promise<NVMId>;
    /**
     * **Z-Wave 500 series only**
     *
     * Reads a byte from the external NVM at the given offset
     */
    externalNVMReadByte(offset: number): Promise<number>;
    /**
     * **Z-Wave 500 series only**
     *
     * Writes a byte to the external NVM at the given offset
     * **WARNING:** This function can write in the full NVM address space and is not offset to start at the application area.
     * Take care not to accidentally overwrite the protocol NVM area!
     *
     * @returns `true` when writing succeeded, `false` otherwise
     */
    externalNVMWriteByte(offset: number, data: number): Promise<boolean>;
    /**
     * **Z-Wave 500 series only**
     *
     * Reads a buffer from the external NVM at the given offset
     */
    externalNVMReadBuffer(offset: number, length: number): Promise<Buffer>;
    /**
     * **Z-Wave 700 series only**
     *
     * Reads a buffer from the external NVM at the given offset
     */
    externalNVMReadBuffer700(offset: number, length: number): Promise<{
        buffer: Buffer;
        endOfFile: boolean;
    }>;
    /**
     * **Z-Wave 500 series only**
     *
     * Writes a buffer to the external NVM at the given offset
     * **WARNING:** This function can write in the full NVM address space and is not offset to start at the application area.
     * Take care not to accidentally overwrite the protocol NVM area!
     *
     * @returns `true` when writing succeeded, `false` otherwise
     */
    externalNVMWriteBuffer(offset: number, buffer: Buffer): Promise<boolean>;
    /**
     * **Z-Wave 700 series only**
     *
     * Writes a buffer to the external NVM at the given offset
     * **WARNING:** This function can write in the full NVM address space and is not offset to start at the application area.
     * Take care not to accidentally overwrite the protocol NVM area!
     */
    externalNVMWriteBuffer700(offset: number, buffer: Buffer): Promise<{
        endOfFile: boolean;
    }>;
    /**
     * **Z-Wave 700 series only**
     *
     * Opens the controller's external NVM for reading/writing and returns the NVM size
     */
    externalNVMOpen(): Promise<number>;
    /**
     * **Z-Wave 700 series only**
     *
     * Closes the controller's external NVM
     */
    externalNVMClose(): Promise<void>;
    /**
     * Creates a backup of the NVM and returns the raw data as a Buffer. The Z-Wave radio is turned off/on automatically.
     * @param onProgress Can be used to monitor the progress of the operation, which may take several seconds up to a few minutes depending on the NVM size
     * @returns The raw NVM buffer
     */
    backupNVMRaw(onProgress?: (bytesRead: number, total: number) => void): Promise<Buffer>;
    private backupNVMRaw500;
    private backupNVMRaw700;
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
    restoreNVM(nvmData: Buffer, convertProgress?: (bytesRead: number, total: number) => void, restoreProgress?: (bytesWritten: number, total: number) => void): Promise<void>;
    /**
     * Restores an NVM backup that was created with `backupNVMRaw`. The Z-Wave radio is turned off/on automatically.
     *
     * **WARNING:** The given buffer is NOT checked for compatibility with the current stick. To have Z-Wave JS do that, use the {@link restoreNVM} method instead.
     *
     * **WARNING:** A failure during this process may brick your controller. Use at your own risk!
     * @param nvmData The raw NVM backup to be restored
     * @param onProgress Can be used to monitor the progress of the operation, which may take several seconds up to a few minutes depending on the NVM size
     */
    restoreNVMRaw(nvmData: Buffer, onProgress?: (bytesWritten: number, total: number) => void): Promise<void>;
    private restoreNVMRaw500;
    private restoreNVMRaw700;
    /**
     * Request the most recent background RSSI levels detected by the controller.
     *
     * **Note:** This only returns useful values if something was transmitted recently.
     */
    getBackgroundRSSI(): Promise<{
        rssiChannel0: RSSI;
        rssiChannel1: RSSI;
        rssiChannel2?: RSSI;
    }>;
    /**
     *
     * Returns whether an OTA firmware update is in progress for any node.
     */
    isAnyOTAFirmwareUpdateInProgress(): boolean;
    /**
     * Retrieves the available firmware updates for the given node from the Z-Wave JS firmware update service.
     *
     * **Note:** Sleeping nodes need to be woken up for this to work. This method will throw when called for a sleeping node
     * which did not wake up within a minute.
     *
     * **Note:** This requires an API key to be set in the driver options, or passed .
     */
    getAvailableFirmwareUpdates(nodeId: number, options?: GetFirmwareUpdatesOptions): Promise<FirmwareUpdateInfo[]>;
    /**
     * Downloads the desired firmware update from the Z-Wave JS firmware update service and starts a firmware update for the given node.
     *
     * @deprecated Use {@link firmwareUpdateOTA} instead, which properly handles multi-target updates
     */
    beginOTAFirmwareUpdate(nodeId: number, update: FirmwareUpdateFileInfo): Promise<void>;
    /**
     * Downloads the desired firmware update(s) from the Z-Wave JS firmware update service and updates the firmware of the given node.
     *
     * The return value indicates whether the update was successful.
     * **WARNING:** This method will throw instead of returning `false` if invalid arguments are passed or downloading files or starting an update fails.
     */
    firmwareUpdateOTA(nodeId: number, updates: FirmwareUpdateFileInfo[]): Promise<boolean>;
    private _firmwareUpdateInProgress;
    /**
     * Returns whether a firmware update is in progress for the controller.
     */
    isFirmwareUpdateInProgress(): boolean;
    /**
     * Updates the firmware of the controller using the given firmware file.
     *
     * The return value indicates whether the update was successful.
     * **WARNING:** After a successful update, the Z-Wave driver will destroy itself so it can be restarted.
     *
     * **WARNING:** A failure during this process may put your controller in recovery mode, rendering it unusable until a correct firmware image is uploaded. Use at your own risk!
     */
    firmwareUpdateOTW(data: Buffer): Promise<boolean>;
    private firmwareUpdateOTW500;
    private firmwareUpdateOTW700;
}
export {};
//# sourceMappingURL=Controller.d.ts.map