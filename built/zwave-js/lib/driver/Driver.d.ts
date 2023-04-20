/// <reference types="node" />
/// <reference types="node" />
import { CommandClass, ICommandClassContainer } from "@zwave-js/cc";
import { ConfigManager } from "@zwave-js/config";
import { CommandClasses, ICommandClass, LogConfig, SendCommandOptions, SendCommandReturnType, SendMessageOptions } from "@zwave-js/core";
import type { ZWaveApplicationHost } from "@zwave-js/host";
import { BootloaderChunk, FunctionType, Message, ZWaveSerialPortImplementation } from "@zwave-js/serial";
import { DeepPartial, TypedEventEmitter } from "@zwave-js/shared";
import * as util from "util";
import { ZWaveController } from "../controller/Controller";
import type { Endpoint } from "../node/Endpoint";
import type { ZWaveNode } from "../node/Node";
import { SendDataBridgeRequest, SendDataMulticastBridgeRequest } from "../serialapi/transport/SendDataBridgeMessages";
import { SendDataMulticastRequest, SendDataRequest } from "../serialapi/transport/SendDataMessages";
import { SendDataMessage } from "../serialapi/transport/SendDataShared";
import { AppInfo } from "../telemetry/statistics";
import { Transaction } from "./Transaction";
import type { EditableZWaveOptions, ZWaveOptions } from "./ZWaveOptions";
export declare const libVersion: string;
export declare const libName: string;
/**
 * Function signature for a message handler. The return type signals if the
 * message was handled (`true`) or further handlers should be called (`false`)
 */
export type RequestHandler<T extends Message = Message> = (msg: T) => boolean | Promise<boolean>;
interface AwaitedThing<T> {
    handler: (thing: T) => void;
    timeout?: NodeJS.Timeout;
    predicate: (msg: T) => boolean;
}
export type AwaitedBootloaderChunkEntry = AwaitedThing<BootloaderChunk>;
export interface DriverEventCallbacks {
    "driver ready": () => void;
    "bootloader ready": () => void;
    "all nodes ready": () => void;
    error: (err: Error) => void;
}
export type DriverEvents = Extract<keyof DriverEventCallbacks, string>;
/**
 * The driver is the core of this library. It controls the serial interface,
 * handles transmission and receipt of messages and manages the network cache.
 * Any action you want to perform on the Z-Wave network must go through a driver
 * instance or its associated nodes.
 */
export declare class Driver extends TypedEventEmitter<DriverEventCallbacks> implements ZWaveApplicationHost {
    private port;
    constructor(port: string | ZWaveSerialPortImplementation, options?: DeepPartial<ZWaveOptions>);
    /** The serial port instance */
    private serial;
    /** An instance of the Send Thread state machine */
    private sendThread;
    private _sendThreadIdle;
    /** Whether the Send Thread is currently idle */
    get sendThreadIdle(): boolean;
    private set sendThreadIdle(value);
    /** A map of handlers for all sorts of requests */
    private requestHandlers;
    /** A map of awaited messages */
    private awaitedMessages;
    /** A map of awaited commands */
    private awaitedCommands;
    /** A map of awaited chunks from the bootloader */
    private awaitedBootloaderChunks;
    /** A map of Node ID -> ongoing sessions */
    private nodeSessions;
    private ensureNodeSessions;
    readonly cacheDir: string;
    private _valueDB;
    private _metadataDB;
    private _networkCache;
    readonly configManager: ConfigManager;
    get configVersion(): string;
    private _logContainer;
    private _driverLog;
    private _controllerLog;
    private _controller;
    /** Encapsulates information about the Z-Wave controller and provides access to its nodes */
    get controller(): ZWaveController;
    /** While in bootloader mode, this encapsulates information about the bootloader and its state */
    private _bootloader;
    isInBootloader(): boolean;
    private _securityManager;
    private _securityManager2;
    getNodeUnsafe(msg: Message): ZWaveNode | undefined;
    tryGetEndpoint(cc: CommandClass): Endpoint | undefined;
    /** Updates the logging configuration without having to restart the driver. */
    updateLogConfig(config: DeepPartial<LogConfig>): void;
    /** Returns the current logging configuration. */
    getLogConfig(): LogConfig;
    /** Updates the preferred sensor scales to use for node queries */
    setPreferredScales(scales: ZWaveOptions["preferences"]["scales"]): void;
    /** Enumerates all existing serial ports */
    static enumerateSerialPorts(): Promise<string[]>;
    /** Updates a subset of the driver options on the fly */
    updateOptions(options: DeepPartial<EditableZWaveOptions>): void;
    private _wasStarted;
    private _isOpen;
    /** Start the driver */
    start(): Promise<void>;
    private _controllerInterviewed;
    private _nodesReady;
    private _nodesReadyEventEmitted;
    private openSerialport;
    /** Indicates whether all nodes are ready, i.e. the "all nodes ready" event has been emitted */
    get allNodesReady(): boolean;
    private getJsonlDBOptions;
    private initNetworkCache;
    private initValueDBs;
    private performCacheMigration;
    /**
     * Initializes the variables for controller and nodes,
     * adds event handlers and starts the interview process.
     */
    private initializeControllerAndNodes;
    private autoRefreshNodeValueTimers;
    private retryNodeInterviewTimeouts;
    /** Adds the necessary event handlers for a node instance */
    private addNodeEventHandlers;
    /** Removes a node's event handlers that were added with addNodeEventHandlers */
    private removeNodeEventHandlers;
    /** Is called when a node wakes up */
    private onNodeWakeUp;
    /** Is called when a node goes to sleep */
    private onNodeSleep;
    /** Is called when a previously dead node starts communicating again */
    private onNodeAlive;
    /** Is called when a node is marked as dead */
    private onNodeDead;
    /** Is called when a node is ready to be used */
    private onNodeReady;
    /** Checks if all nodes are ready and emits the "all nodes ready" event if they are */
    private checkAllNodesReady;
    /**
     * Enables error reporting via Sentry. This is turned off by default, because it registers a
     * global `unhandledRejection` event handler, which has an influence how the application will
     * behave in case of an unhandled rejection.
     */
    enableErrorReporting(): void;
    private _statisticsEnabled;
    /** Whether reporting usage statistics is currently enabled */
    get statisticsEnabled(): boolean;
    private statisticsAppInfo;
    private userAgentComponents;
    /**
     * Updates individual components of the user agent. Versions for individual applications can be added or removed.
     * @param components An object with application/module/component names and their versions. Set a version to `null` or `undefined` explicitly to remove it from the user agent.
     */
    updateUserAgent(components: Record<string, string | null | undefined>): void;
    /**
     * Returns the effective user agent string for the given components.
     * The driver name and version is automatically prepended and the statisticsAppInfo data is automatically appended if no components were given.
     */
    private getEffectiveUserAgentString;
    private _userAgent;
    /** Returns the user agent string used for service requests */
    get userAgent(): string;
    /** Returns the user agent string combined with the additional components (if given) */
    getUserAgentStringWithComponents(components?: Record<string, string | null | undefined>): string;
    /**
     * Enable sending usage statistics. Although this does not include any sensitive information, we expect that you
     * inform your users before enabling statistics.
     */
    enableStatistics(appInfo: Pick<AppInfo, "applicationName" | "applicationVersion">): void;
    /**
     * Disable sending usage statistics
     */
    disableStatistics(): void;
    private statisticsTimeout;
    private compileAndSendStatistics;
    /** Is called when a node interview is completed */
    private onNodeInterviewCompleted;
    /** This is called when a new node has been added to the network */
    private onNodeAdded;
    /** This is called when a node was removed from the network */
    private onNodeRemoved;
    /**
     * Returns the time in seconds to actually wait after a firmware upgrade, depending on what the device said.
     * This number will always be a bit greater than the advertised duration, because devices have been found to take longer to actually reboot.
     */
    getConservativeWaitTimeAfterFirmwareUpdate(advertisedWaitTime: number | undefined): number;
    /** This is called when the firmware on one of a node's firmware targets was updated */
    private onNodeFirmwareUpdated;
    /** This is called when a node emits a `"notification"` event */
    private onNodeNotification;
    /** Checks if there are any pending messages for the given node */
    private hasPendingMessages;
    /** Checks if there are any pending transactions that match the given predicate */
    hasPendingTransactions(predicate: (t: Transaction) => boolean): boolean;
    /**
     * Retrieves the maximum version of a command class the given endpoint supports.
     * Returns 0 when the CC is not supported. Also returns 0 when the node was not found.
     * Falls back to querying the root endpoint if an endpoint was not found on the node
     *
     * @param cc The command class whose version should be retrieved
     * @param nodeId The node for which the CC version should be retrieved
     * @param endpointIndex The endpoint in question
     */
    getSupportedCCVersionForEndpoint(cc: CommandClasses, nodeId: number, endpointIndex?: number): number;
    /**
     * Retrieves the maximum version of a command class that can be used to communicate with a node.
     * Returns the highest implemented version if the node's CC version is unknown.
     * Throws if the CC is not implemented in this library yet.
     *
     * @param cc The command class whose version should be retrieved
     * @param nodeId The node for which the CC version should be retrieved
     * @param endpointIndex The endpoint for which the CC version should be retrieved
     */
    getSafeCCVersionForNode(cc: CommandClasses, nodeId: number, endpointIndex?: number): number;
    /**
     * Determines whether a CC must be secure for a given node and endpoint.
     *
     * @param ccId The command class in question
     * @param nodeId The node for which the CC security should be determined
     * @param endpointIndex The endpoint for which the CC security should be determined
     */
    isCCSecure(ccId: CommandClasses, nodeId: number, endpointIndex?: number): boolean;
    private isSoftResetting;
    private maySoftReset;
    /**
     * Soft-resets the controller if the feature is enabled
     */
    trySoftReset(): Promise<void>;
    /**
     * Instruct the controller to soft-reset.
     *
     * **Warning:** USB modules will reconnect, meaning that they might get a new address.
     *
     * **Warning:** This call will throw if soft-reset is not enabled.
     */
    softReset(): Promise<void>;
    private softResetInternal;
    private ensureSerialAPI;
    /**
     * Performs a hard reset on the controller. This wipes out all configuration!
     *
     * The returned Promise resolves when the hard reset has been performed.
     * It does not wait for the initialization process which is started afterwards.
     */
    hardReset(): Promise<void>;
    /**
     * Instructs the Z-Wave API to shut down in order to safely remove the power.
     * This will destroy the driver instance if it succeeds.
     */
    shutdown(): Promise<boolean>;
    private _destroyPromise;
    private get wasDestroyed();
    /**
     * Ensures that the driver is ready to communicate (serial port open and not destroyed).
     * If desired, also checks that the controller interview has been completed.
     */
    private ensureReady;
    /** Indicates whether the driver is ready, i.e. the "driver ready" event was emitted */
    get ready(): boolean;
    /**
     * Terminates the driver instance and closes the underlying serial connection.
     * Must be called under any circumstances.
     */
    destroy(): Promise<void>;
    /**
     * Is called when the serial port has received a single-byte message or a complete message buffer
     */
    private serialport_onData;
    /** Handles a decoding error and returns the desired reply to the stick */
    private handleDecodeError;
    private mustReplyWithSecurityS2MOS;
    private handleSecurityS2DecodeError;
    /** Checks if a transaction failed because a node didn't respond in time */
    private isMissingNodeACK;
    private shouldRequestWakeupOnDemand;
    private partialCCSessions;
    private getPartialCCSession;
    /**
     * Assembles partial CCs of in a message body. Returns `true` when the message is complete and can be handled further.
     * If the message expects another partial one, this returns `false`.
     */
    private assemblePartialCCs;
    /** Is called when a Transport Service command is received */
    private handleTransportServiceCommand;
    /**
     * Is called when a message is received that does not belong to any ongoing transactions
     * @param msg The decoded message
     */
    private handleUnsolicitedMessage;
    /**
     * Registers a handler for messages that are not handled by the driver as part of a message exchange.
     * The handler function needs to return a boolean indicating if the message has been handled.
     * Registered handlers are called in sequence until a handler returns `true`.
     *
     * @param fnType The function type to register the handler for
     * @param handler The request handler callback
     * @param oneTime Whether the handler should be removed after its first successful invocation
     */
    registerRequestHandler<T extends Message>(fnType: FunctionType, handler: RequestHandler<T>, oneTime?: boolean): void;
    /**
     * Unregisters a message handler that has been added with `registerRequestHandler`
     * @param fnType The function type to unregister the handler for
     * @param handler The previously registered request handler callback
     */
    unregisterRequestHandler(fnType: FunctionType, handler: RequestHandler): void;
    /**
     * Checks whether a CC may be handled or should be ignored.
     * This method expects `cc` to be unwrapped.
     */
    private shouldDiscardCC;
    /**
     * Is called when a Request-type message was received
     */
    private handleRequest;
    /**
     * Returns the next callback ID. Callback IDs are used to correlate requests
     * to the controller/nodes with its response
     */
    readonly getNextCallbackId: () => number;
    /**
     * Returns the next session ID for Supervision CC
     */
    readonly getNextSupervisionSessionId: () => number;
    /**
     * Returns the next session ID for Transport Service CC
     */
    readonly getNextTransportServiceSessionId: () => number;
    private encapsulateCommands;
    unwrapCommands(msg: Message & ICommandClassContainer): void;
    /** Persists the values contained in a Command Class in the corresponding nodes's value DB */
    private persistCCValues;
    /**
     * Gets called whenever any Serial API command succeeded or a SendData command had a negative callback.
     */
    private handleSerialAPICommandResult;
    /**
     * Sends a message to the Z-Wave stick.
     * @param msg The message to send
     * @param options (optional) Options regarding the message transmission
     */
    sendMessage<TResponse extends Message = Message>(msg: Message, options?: SendMessageOptions): Promise<TResponse>;
    /** Wraps a CC in the correct SendData message to use for sending */
    createSendDataMessage(command: CommandClass, options?: Omit<SendCommandOptions, keyof SendMessageOptions>): SendDataMessage;
    /**
     * Sends a command to a Z-Wave node. If the node returns a command in response, that command will be the return value.
     * If the command expects no response **or** the response times out, nothing will be returned
     * @param command The command to send. It will be encapsulated in a SendData[Multicast]Request.
     * @param options (optional) Options regarding the message transmission
     */
    private sendCommandInternal;
    /**
     * Sends a supervised command to a Z-Wave node. When status updates are requested, the passed callback will be executed for every non-final update.
     * @param command The command to send
     * @param options (optional) Options regarding the message transmission
     */
    private sendSupervisedCommand;
    /**
     * Sends a command to a Z-Wave node. The return value depends on several factors:
     * * If the node returns a command in response, that command will be the return value.
     * * If the command is a SET-type command and Supervision CC can and should be used, a {@link SupervisionResult} will be returned.
     * * If the command expects no response **or** the response times out, nothing will be returned.
     *
     * @param command The command to send. It will be encapsulated in a SendData[Multicast]Request.
     * @param options (optional) Options regarding the message transmission
     */
    sendCommand<TResponse extends ICommandClass | undefined = undefined>(command: CommandClass, options?: SendCommandOptions): Promise<SendCommandReturnType<TResponse>>;
    /**
     * Sends a low-level message like ACK, NAK or CAN immediately
     * @param header The low-level message to send
     */
    private writeHeader;
    /** Sends a raw datagram to the serialport (if that is open) */
    private writeSerial;
    /**
     * Waits until an unsolicited serial message is received or a timeout has elapsed. Returns the received message.
     *
     * **Note:** To wait for a certain CommandClass, better use {@link waitForCommand}.
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     * @param predicate A predicate function to test all incoming messages
     */
    waitForMessage<T extends Message>(predicate: (msg: Message) => boolean, timeout: number): Promise<T>;
    /**
     * Waits until a CommandClass is received or a timeout has elapsed. Returns the received command.
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     * @param predicate A predicate function to test all incoming command classes
     */
    waitForCommand<T extends ICommandClass>(predicate: (cc: ICommandClass) => boolean, timeout: number): Promise<T>;
    /**
     * Calls the given handler function every time a CommandClass is received that matches the given predicate.
     * @param predicate A predicate function to test all incoming command classes
     */
    registerCommandHandler<T extends ICommandClass>(predicate: (cc: ICommandClass) => boolean, handler: (cc: T) => void): {
        unregister: () => void;
    };
    /** Checks if a message is allowed to go into the wakeup queue */
    private mayMoveToWakeupQueue;
    /** Moves all messages for a given node into the wakeup queue */
    private moveMessagesToWakeupQueue;
    /** Re-sorts the send queue */
    private sortSendQueue;
    private lastSaveToCache;
    private readonly saveToCacheInterval;
    private saveToCacheTimer;
    private isSavingToCache;
    private cachePurge;
    /**
     * Restores a previously stored Z-Wave network state from cache to speed up the startup process
     */
    restoreNetworkStructureFromCache(): Promise<void>;
    private sendNodeToSleepTimers;
    /** Computes the maximum net CC payload size for the given CC or SendDataRequest */
    computeNetCCPayloadSize(commandOrMsg: CommandClass | SendDataRequest | SendDataBridgeRequest): number;
    /** Determines time in milliseconds to wait for a report from a node */
    getReportTimeout(msg: Message): number;
    /** Returns the preferred constructor to use for singlecast SendData commands */
    getSendDataSinglecastConstructor(): typeof SendDataRequest | typeof SendDataBridgeRequest;
    /** Returns the preferred constructor to use for multicast SendData commands */
    getSendDataMulticastConstructor(): typeof SendDataMulticastRequest | typeof SendDataMulticastBridgeRequest;
    [util.inspect.custom](): string;
    /**
     * Checks whether there is a compatible update for the currently installed config package.
     * Returns the new version if there is an update, `undefined` otherwise.
     */
    checkForConfigUpdates(silent?: boolean): Promise<string | undefined>;
    /**
     * Installs an update for the embedded configuration DB if there is a compatible one.
     * Returns `true` when an update was installed, `false` otherwise.
     *
     * **Note:** Bugfixes and changes to device configuration generally require a restart or re-interview to take effect.
     */
    installConfigUpdate(): Promise<boolean>;
    private _enteringBootloader;
    private _enterBootloaderPromise;
    private leaveBootloaderInternal;
    private serialport_onBootloaderData;
    /**
     * Waits until a specific chunk is received from the bootloader or a timeout has elapsed. Returns the received chunk.
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     * @param predicate A predicate function to test all incoming chunks
     */
    waitForBootloaderChunk<T extends BootloaderChunk>(predicate: (chunk: BootloaderChunk) => boolean, timeout: number): Promise<T>;
    private pollBackgroundRSSITimer;
    private lastBackgroundRSSITimestamp;
    private handleSendThreadIdleChange;
}
export {};
//# sourceMappingURL=Driver.d.ts.map