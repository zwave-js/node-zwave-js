/// <reference types="node" />
import { FirmwareUpdateCapabilities, Powerlevel, SetValueAPIOptions, ZWavePlusNodeType, ZWavePlusRoleType } from "@zwave-js/cc";
import type { DeviceConfig } from "@zwave-js/config";
import { CommandClasses, DataRate, Firmware, FLiRS, IZWaveNode, Maybe, NodeType, NodeUpdatePayload, ProtocolVersion, SecurityClass, SecurityClassOwner, SendCommandOptions, TranslatedValueID, ValueDB, ValueID, ValueMetadata } from "@zwave-js/core";
import { TypedEventEmitter } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import type { StatisticsEventCallbacksWithSelf } from "../driver/Statistics";
import { DeviceClass } from "./DeviceClass";
import { Endpoint } from "./Endpoint";
import { NodeStatistics, NodeStatisticsHost } from "./NodeStatistics";
import type { LifelineHealthCheckSummary, RefreshInfoOptions, RouteHealthCheckSummary, ZWaveNodeEventCallbacks } from "./_Types";
import { InterviewStage, NodeStatus } from "./_Types";
export interface ZWaveNode extends TypedEventEmitter<ZWaveNodeEventCallbacks & StatisticsEventCallbacksWithSelf<ZWaveNode, NodeStatistics>>, NodeStatisticsHost {
}
/**
 * A ZWaveNode represents a node in a Z-Wave network. It is also an instance
 * of its root endpoint (index 0)
 */
export declare class ZWaveNode extends Endpoint implements SecurityClassOwner, IZWaveNode {
    readonly id: number;
    constructor(id: number, driver: Driver, deviceClass?: DeviceClass, supportedCCs?: CommandClasses[], controlledCCs?: CommandClasses[], valueDB?: ValueDB);
    /**
     * Cleans up all resources used by this node
     */
    destroy(): void;
    /**
     * Enhances the raw event args of the ValueDB so it can be consumed better by applications
     */
    private translateValueEvent;
    private statusMachine;
    private _status;
    private onStatusChange;
    /**
     * Which status the node is believed to be in
     */
    get status(): NodeStatus;
    /** Returns a promise that resolves when the node wakes up the next time or immediately if the node is already awake. */
    waitForWakeup(): Promise<void>;
    private readyMachine;
    private _ready;
    private onReadyChange;
    /**
     * Whether the node is ready to be used
     */
    get ready(): boolean;
    /** Whether this node is always listening or not */
    get isListening(): boolean | undefined;
    private set isListening(value);
    /** Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't. */
    get isFrequentListening(): FLiRS | undefined;
    private set isFrequentListening(value);
    get canSleep(): boolean | undefined;
    /** Whether the node supports routing/forwarding messages. */
    get isRouting(): boolean | undefined;
    private set isRouting(value);
    get supportedDataRates(): readonly DataRate[] | undefined;
    private set supportedDataRates(value);
    get maxDataRate(): DataRate | undefined;
    /**
     * The device specific key (DSK) of this node in binary format.
     * This is only set if included with Security S2.
     */
    get dsk(): Buffer | undefined;
    /** Whether the node was granted at least one security class */
    get isSecure(): Maybe<boolean>;
    hasSecurityClass(securityClass: SecurityClass): Maybe<boolean>;
    setSecurityClass(securityClass: SecurityClass, granted: boolean): void;
    /** Returns the highest security class this node was granted or `undefined` if that information isn't known yet */
    getHighestSecurityClass(): SecurityClass | undefined;
    /** The Z-Wave protocol version this node implements */
    get protocolVersion(): ProtocolVersion | undefined;
    private set protocolVersion(value);
    /** Whether this node is a controller (can calculate routes) or an end node (relies on route info) */
    get nodeType(): NodeType | undefined;
    private set nodeType(value);
    /**
     * Whether this node supports security (S0 or S2).
     * **WARNING:** Nodes often report this incorrectly - do not blindly trust it.
     */
    get supportsSecurity(): boolean | undefined;
    private set supportsSecurity(value);
    /** Whether this node can issue wakeup beams to FLiRS nodes */
    get supportsBeaming(): boolean | undefined;
    private set supportsBeaming(value);
    get manufacturerId(): number | undefined;
    get productId(): number | undefined;
    get productType(): number | undefined;
    get firmwareVersion(): string | undefined;
    get sdkVersion(): string | undefined;
    get zwavePlusVersion(): number | undefined;
    get zwavePlusNodeType(): ZWavePlusNodeType | undefined;
    get zwavePlusRoleType(): ZWavePlusRoleType | undefined;
    get supportsWakeUpOnDemand(): boolean | undefined;
    /**
     * The user-defined name of this node. Uses the value reported by `Node Naming and Location CC` if it exists.
     *
     * **Note:** Setting this value only updates the name locally. To permanently change the name of the node, use
     * the `commandClasses` API.
     */
    get name(): string | undefined;
    set name(value: string | undefined);
    /**
     * The user-defined location of this node. Uses the value reported by `Node Naming and Location CC` if it exists.
     *
     * **Note:** Setting this value only updates the location locally. To permanently change the location of the node, use
     * the `commandClasses` API.
     */
    get location(): string | undefined;
    set location(value: string | undefined);
    /** Whether a SUC return route was configured for this node */
    get hasSUCReturnRoute(): boolean;
    set hasSUCReturnRoute(value: boolean);
    private _deviceConfig;
    /**
     * Contains additional information about this node, loaded from a config file
     */
    get deviceConfig(): DeviceConfig | undefined;
    get label(): string | undefined;
    get deviceDatabaseUrl(): string | undefined;
    private _valueDB;
    /**
     * Retrieves a stored value for a given value id.
     * This does not request an updated value from the node!
     */
    getValue<T = unknown>(valueId: ValueID): T | undefined;
    /**
     * Returns when the given value id was last updated by an update from the node.
     */
    getValueTimestamp(valueId: ValueID): number | undefined;
    /**
     * Retrieves metadata for a given value id.
     * This can be used to enhance the user interface of an application
     */
    getValueMetadata(valueId: ValueID): ValueMetadata;
    /** Returns a list of all value names that are defined on all endpoints of this node */
    getDefinedValueIDs(): TranslatedValueID[];
    /**
     * Updates a value for a given property of a given CommandClass on the node.
     * This will communicate with the node!
     */
    setValue(valueId: ValueID, value: unknown, options?: SetValueAPIOptions): Promise<boolean>;
    /**
     * Requests a value for a given property of a given CommandClass by polling the node.
     * **Warning:** Some value IDs share a command, so make sure not to blindly call this for every property
     */
    pollValue<T = unknown>(valueId: ValueID, sendCommandOptions?: SendCommandOptions): Promise<T | undefined>;
    get endpointCountIsDynamic(): boolean | undefined;
    get endpointsHaveIdenticalCapabilities(): boolean | undefined;
    get individualEndpointCount(): number | undefined;
    get aggregatedEndpointCount(): number | undefined;
    /** Returns the device class of an endpoint. Falls back to the node's device class if the information is not known. */
    private getEndpointDeviceClass;
    private getEndpointCCs;
    /**
     * Returns the current endpoint count of this node.
     *
     * If you want to enumerate the existing endpoints, use `getEndpointIndizes` instead.
     * Some devices are known to contradict themselves.
     */
    getEndpointCount(): number;
    /**
     * Returns indizes of all endpoints on the node.
     */
    getEndpointIndizes(): number[];
    /** Whether the Multi Channel CC has been interviewed and all endpoint information is known */
    private get isMultiChannelInterviewComplete();
    /** Cache for this node's endpoint instances */
    private _endpointInstances;
    /**
     * Returns an endpoint of this node with the given index. 0 returns the node itself.
     */
    getEndpoint(index: 0): Endpoint;
    getEndpoint(index: number): Endpoint | undefined;
    getEndpointOrThrow(index: number): Endpoint;
    /** Returns a list of all endpoints of this node, including the root endpoint (index 0) */
    getAllEndpoints(): Endpoint[];
    /**
     * This tells us which interview stage was last completed
     */
    get interviewStage(): InterviewStage;
    set interviewStage(value: InterviewStage);
    private _interviewAttempts;
    /** How many attempts to interview this node have already been made */
    get interviewAttempts(): number;
    private _hasEmittedNoS2NetworkKeyError;
    private _hasEmittedNoS0NetworkKeyError;
    /** Returns whether this node is the controller */
    get isControllerNode(): boolean;
    /**
     * Starts or resumes a deferred initial interview of this node.
     *
     * **WARNING:** This is only allowed when the initial interview was deferred using the
     * `interview.disableOnNodeAdded` option. Otherwise, this method will throw an error.
     *
     * **NOTE:** It is advised to NOT await this method as it can take a very long time (minutes to hours)!
     */
    interview(): Promise<void>;
    private _refreshInfoPending;
    /**
     * Resets all information about this node and forces a fresh interview.
     * **Note:** This does nothing for the controller node.
     *
     * **WARNING:** Take care NOT to call this method when the node is already being interviewed.
     * Otherwise the node information may become inconsistent.
     */
    refreshInfo(options?: RefreshInfoOptions): Promise<void>;
    /** Updates this node's interview stage and saves to cache when appropriate */
    private setInterviewStage;
    /** Step #1 of the node interview */
    protected queryProtocolInfo(): Promise<void>;
    /** Node interview: pings the node to see if it responds */
    ping(): Promise<boolean>;
    /**
     * Step #5 of the node interview
     * Request node info
     */
    protected interviewNodeInfo(): Promise<void>;
    requestNodeInfo(): Promise<NodeUpdatePayload>;
    /**
     * Loads the device configuration for this node from a config file
     */
    protected loadDeviceConfig(): Promise<void>;
    /** Step #? of the node interview */
    protected interviewCCs(): Promise<boolean>;
    /**
     * Rediscovers all capabilities of a single CC on this node and all endpoints.
     * This can be considered a more targeted variant of `refreshInfo`.
     *
     * WARNING: It is not recommended to await this method!
     */
    interviewCC(cc: CommandClasses): Promise<void>;
    /**
     * Refreshes all non-static values of a single CC from this node (all endpoints).
     * WARNING: It is not recommended to await this method!
     */
    refreshCCValues(cc: CommandClasses): Promise<void>;
    /**
     * Refreshes all non-static values from this node's actuator and sensor CCs.
     * WARNING: It is not recommended to await this method!
     */
    refreshValues(): Promise<void>;
    /**
     * Uses the `commandClasses` compat flag defined in the node's config file to
     * override the reported command classes.
     * @param endpointIndex If given, limits the application of the compat flag to the given endpoint.
     */
    private applyCommandClassesCompatFlag;
    /** Overwrites the reported configuration with information from a config file */
    protected overwriteConfig(): Promise<void>;
    private hasLoggedNoNetworkKey;
    /**
     * Is called when a nonce report is received that does not belong to any transaction.
     * The received nonce reports are stored as "free" nonces
     */
    private handleSecurityNonceReport;
    /**
     * Is called when a nonce report is received that does not belong to any transaction.
     */
    private handleSecurity2NonceReport;
    private busyPollingAfterHail;
    private handleHail;
    /** Stores information about a currently held down key */
    private centralSceneKeyHeldDownContext;
    private lastCentralSceneNotificationSequenceNumber;
    private centralSceneForcedKeyUp;
    /** Handles the receipt of a Central Scene notifification */
    private handleCentralSceneNotification;
    /** The timestamp of the last received wakeup notification */
    private lastWakeUp;
    /** Handles the receipt of a Wake Up notification */
    private handleWakeUpNotification;
    private compatDoWakeupQueries;
    /** Handles the receipt of a BasicCC Set or Report */
    private handleBasicCommand;
    /** Handles the receipt of a MultilevelCC Set or Report */
    private handleMultilevelSwitchCommand;
    private handleZWavePlusGet;
    /**
     * Allows automatically resetting notification values to idle if the node does not do it itself
     */
    private notificationIdleTimeouts;
    /** Schedules a notification value to be reset */
    private scheduleNotificationIdleReset;
    /** Removes a scheduled notification reset */
    private clearNotificationIdleReset;
    /**
     * Handles the receipt of a Notification Report
     */
    private handleNotificationReport;
    private handleKnownNotification;
    private busySettingClock;
    private handleClockReport;
    private handleTimeGet;
    private handleDateGet;
    private handleTimeOffsetGet;
    private _firmwareUpdateInProgress;
    /**
     * Returns whether a firmware update is in progress for this node.
     */
    isFirmwareUpdateInProgress(): boolean;
    private _abortFirmwareUpdate;
    /** Is used to remember fragment requests that came in before they were able to be handled */
    private _firmwareUpdatePrematureRequest;
    /**
     * Retrieves the firmware update capabilities of a node to decide which options to offer a user prior to the update.
     * This method uses cached information from the most recent interview.
     */
    getFirmwareUpdateCapabilitiesCached(): FirmwareUpdateCapabilities;
    /**
     * Retrieves the firmware update capabilities of a node to decide which options to offer a user prior to the update.
     * This communicates with the node to retrieve fresh information.
     */
    getFirmwareUpdateCapabilities(): Promise<FirmwareUpdateCapabilities>;
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
    beginFirmwareUpdate(data: Buffer, target?: number): Promise<void>;
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
    updateFirmware(updates: Firmware[]): Promise<boolean>;
    /** Prepares the firmware update of a single target by collecting the necessary information */
    private prepareFirmwareUpdateInternal;
    /** Kicks off a firmware update of a single target */
    private beginFirmwareUpdateInternal;
    /** Performs the firmware update of a single target */
    private doFirmwareUpdateInternal;
    /**
     * Aborts an active firmware update process
     */
    abortFirmwareUpdate(): Promise<void>;
    private sendCorruptedFirmwareUpdateReport;
    private hasPendingFirmwareUpdateFragment;
    private handleUnexpectedFirmwareUpdateGet;
    private recentEntryControlNotificationSequenceNumbers;
    private handleEntryControlNotification;
    private handlePowerlevelTestNodeReport;
    /**
     * Whether the node should be kept awake when there are no pending messages.
     */
    keepAwake: boolean;
    private isSendingNoMoreInformation;
    /**
     * Instructs the node to send powerlevel test frames to the other node using the given powerlevel. Returns how many frames were acknowledged during the test.
     *
     * **Note:** Depending on the number of test frames, this may take a while
     */
    testPowerlevel(testNodeId: number, powerlevel: Powerlevel, healthCheckTestFrameCount: number, onProgress?: (acknowledged: number, total: number) => void): Promise<number>;
    /**
     * Checks the health of connection between the controller and this node and returns the results.
     */
    checkLifelineHealth(rounds?: number, onProgress?: (round: number, totalRounds: number, lastRating: number) => void): Promise<LifelineHealthCheckSummary>;
    /**
     * Checks the health of connection between this node and the target node and returns the results.
     */
    checkRouteHealth(targetNodeId: number, rounds?: number, onProgress?: (round: number, totalRounds: number, lastRating: number) => void): Promise<RouteHealthCheckSummary>;
    /**
     * Sets the current date, time and timezone (or a subset of those) on the node using one or more of the respective CCs.
     * Returns whether the operation was successful.
     */
    setDateAndTime(now?: Date): Promise<boolean>;
}
//# sourceMappingURL=Node.d.ts.map