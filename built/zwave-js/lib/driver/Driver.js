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
exports.Driver = exports.libName = exports.libVersion = void 0;
const jsonl_db_1 = require("@alcalzone/jsonl-db");
const Sentry = __importStar(require("@sentry/node"));
const cc_1 = require("@zwave-js/cc");
const config_1 = require("@zwave-js/config");
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
const async_1 = require("alcalzone-shared/async");
const deferred_promise_1 = require("alcalzone-shared/deferred-promise");
const typeguards_1 = require("alcalzone-shared/typeguards");
const crypto_1 = require("crypto");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const serialport_1 = require("serialport");
const url_1 = require("url");
const util = __importStar(require("util"));
const xstate_1 = require("xstate");
const Controller_1 = require("../controller/Controller");
const Inclusion_1 = require("../controller/Inclusion");
const Driver_1 = require("../log/Driver");
const _Types_1 = require("../node/_Types");
const ApplicationCommandRequest_1 = require("../serialapi/application/ApplicationCommandRequest");
const ApplicationUpdateRequest_1 = require("../serialapi/application/ApplicationUpdateRequest");
const BridgeApplicationCommandRequest_1 = require("../serialapi/application/BridgeApplicationCommandRequest");
const GetControllerVersionMessages_1 = require("../serialapi/capability/GetControllerVersionMessages");
const SoftResetRequest_1 = require("../serialapi/misc/SoftResetRequest");
const SendDataBridgeMessages_1 = require("../serialapi/transport/SendDataBridgeMessages");
const SendDataMessages_1 = require("../serialapi/transport/SendDataMessages");
const SendDataShared_1 = require("../serialapi/transport/SendDataShared");
const deviceConfig_1 = require("../telemetry/deviceConfig");
const sentry_1 = require("../telemetry/sentry");
const statistics_1 = require("../telemetry/statistics");
const Bootloader_1 = require("./Bootloader");
const MessageGenerators_1 = require("./MessageGenerators");
const NetworkCache_1 = require("./NetworkCache");
const SendThreadMachine_1 = require("./SendThreadMachine");
const ThrottlePresets_1 = require("./ThrottlePresets");
const Transaction_1 = require("./Transaction");
const TransportServiceMachine_1 = require("./TransportServiceMachine");
const UpdateConfig_1 = require("./UpdateConfig");
const UserAgent_1 = require("./UserAgent");
const packageJsonPath = require.resolve("zwave-js/package.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require(packageJsonPath);
const libraryRootDir = path_1.default.dirname(packageJsonPath);
exports.libVersion = packageJson.version;
exports.libName = packageJson.name;
// This is made with cfonts:
const libNameString = `
███████╗ ██╗    ██╗  █████╗  ██╗   ██╗ ███████╗             ██╗ ███████╗
╚══███╔╝ ██║    ██║ ██╔══██╗ ██║   ██║ ██╔════╝             ██║ ██╔════╝
  ███╔╝  ██║ █╗ ██║ ███████║ ██║   ██║ █████╗   █████╗      ██║ ███████╗
 ███╔╝   ██║███╗██║ ██╔══██║ ╚██╗ ██╔╝ ██╔══╝   ╚════╝ ██   ██║ ╚════██║
███████╗ ╚███╔███╔╝ ██║  ██║  ╚████╔╝  ███████╗        ╚█████╔╝ ███████║
╚══════╝  ╚══╝╚══╝  ╚═╝  ╚═╝   ╚═══╝   ╚══════╝         ╚════╝  ╚══════╝
`;
const defaultOptions = {
    timeouts: {
        ack: 1000,
        byte: 150,
        response: 10000,
        report: 1000,
        nonce: 5000,
        sendDataCallback: 65000,
        refreshValue: 5000,
        refreshValueAfterTransition: 1000,
        serialAPIStarted: 5000,
    },
    attempts: {
        openSerialPort: 10,
        controller: 3,
        sendData: 3,
        nodeInterview: 5,
    },
    preserveUnknownValues: false,
    disableOptimisticValueUpdate: false,
    // By default enable soft reset unless the env variable is set
    enableSoftReset: !process.env.ZWAVEJS_DISABLE_SOFT_RESET,
    interview: {
        queryAllUserCodes: false,
    },
    storage: {
        driver: fs_extra_1.default,
        cacheDir: path_1.default.resolve(libraryRootDir, "cache"),
        lockDir: process.env.ZWAVEJS_LOCK_DIRECTORY,
        throttle: "normal",
    },
    preferences: {
        scales: {
            temperature: "Celsius",
        },
    },
};
/** Ensures that the options are valid */
function checkOptions(options) {
    if (options.timeouts.ack < 1) {
        throw new core_1.ZWaveError(`The ACK timeout must be positive!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
    }
    if (options.timeouts.byte < 1) {
        throw new core_1.ZWaveError(`The BYTE timeout must be positive!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
    }
    if (options.timeouts.response < 500 || options.timeouts.response > 20000) {
        throw new core_1.ZWaveError(`The Response timeout must be between 500 and 20000 milliseconds!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
    }
    if (options.timeouts.report < 500 || options.timeouts.report > 10000) {
        throw new core_1.ZWaveError(`The Report timeout must be between 500 and 10000 milliseconds!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
    }
    if (options.timeouts.nonce < 3000 || options.timeouts.nonce > 20000) {
        throw new core_1.ZWaveError(`The Nonce timeout must be between 3000 and 20000 milliseconds!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
    }
    if (options.timeouts.sendDataCallback < 10000) {
        throw new core_1.ZWaveError(`The Send Data Callback timeout must be at least 10000 milliseconds!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
    }
    if (options.timeouts.serialAPIStarted < 1000 ||
        options.timeouts.serialAPIStarted > 30000) {
        throw new core_1.ZWaveError(`The Serial API started timeout must be between 1000 and 30000 milliseconds!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
    }
    if (options.securityKeys != undefined) {
        const keys = Object.entries(options.securityKeys);
        for (let i = 0; i < keys.length; i++) {
            const [secClass, key] = keys[i];
            if (key.length !== 16) {
                throw new core_1.ZWaveError(`The security key for class ${secClass} must be a buffer with length 16!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
            }
            if (keys.findIndex(([, k]) => k.equals(key)) !== i) {
                throw new core_1.ZWaveError(`The security key for class ${secClass} was used multiple times!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
            }
        }
    }
    if (options.attempts.controller < 1 || options.attempts.controller > 3) {
        throw new core_1.ZWaveError(`The Controller attempts must be between 1 and 3!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
    }
    if (options.attempts.sendData < 1 ||
        options.attempts.sendData > SendDataMessages_1.MAX_SEND_ATTEMPTS) {
        throw new core_1.ZWaveError(`The SendData attempts must be between 1 and ${SendDataMessages_1.MAX_SEND_ATTEMPTS}!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
    }
    if (options.attempts.nodeInterview < 1 ||
        options.attempts.nodeInterview > 10) {
        throw new core_1.ZWaveError(`The Node interview attempts must be between 1 and 10!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
    }
    if (options.inclusionUserCallbacks) {
        if (!(0, typeguards_1.isObject)(options.inclusionUserCallbacks)) {
            throw new core_1.ZWaveError(`The inclusionUserCallbacks must be an object!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
        }
        else if (typeof options.inclusionUserCallbacks.grantSecurityClasses !==
            "function" ||
            typeof options.inclusionUserCallbacks.validateDSKAndEnterPIN !==
                "function" ||
            typeof options.inclusionUserCallbacks.abort !== "function") {
            throw new core_1.ZWaveError(`The inclusionUserCallbacks must contain the following functions: grantSecurityClasses, validateDSKAndEnterPIN, abort!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
        }
    }
}
/**
 * The driver is the core of this library. It controls the serial interface,
 * handles transmission and receipt of messages and manages the network cache.
 * Any action you want to perform on the Z-Wave network must go through a driver
 * instance or its associated nodes.
 */
class Driver extends shared_1.TypedEventEmitter {
    constructor(port, options) {
        super();
        this.port = port;
        /** A map of handlers for all sorts of requests */
        this.requestHandlers = new Map();
        /** A map of awaited messages */
        this.awaitedMessages = [];
        /** A map of awaited commands */
        this.awaitedCommands = [];
        /** A map of awaited chunks from the bootloader */
        this.awaitedBootloaderChunks = [];
        /** A map of Node ID -> ongoing sessions */
        this.nodeSessions = new Map();
        this._wasStarted = false;
        this._isOpen = false;
        this._controllerInterviewed = false;
        this._nodesReady = new Set();
        this._nodesReadyEventEmitted = false;
        this.autoRefreshNodeValueTimers = new Map();
        this.retryNodeInterviewTimeouts = new Map();
        this._statisticsEnabled = false;
        this.userAgentComponents = new Map();
        this._userAgent = `node-zwave-js/${exports.libVersion}`;
        /** This is called when a node emits a `"notification"` event */
        this.onNodeNotification = (node, ccId, ccArgs) => {
            let prefix;
            let details;
            if (ccId === core_1.CommandClasses.Notification) {
                const msg = {
                    type: ccArgs.label,
                    event: ccArgs.eventLabel,
                };
                if (ccArgs.parameters) {
                    if (Buffer.isBuffer(ccArgs.parameters)) {
                        msg.parameters = (0, shared_1.buffer2hex)(ccArgs.parameters);
                    }
                    else if (ccArgs.parameters instanceof core_1.Duration) {
                        msg.duration = ccArgs.parameters.toString();
                    }
                    else if ((0, typeguards_1.isObject)(ccArgs.parameters)) {
                        Object.assign(msg, ccArgs.parameters);
                    }
                }
                prefix = "[Notification]";
                details = (0, core_1.messageRecordToLines)(msg);
            }
            else if (ccId === core_1.CommandClasses["Entry Control"]) {
                prefix = "[Notification] Entry Control";
                details = (0, core_1.messageRecordToLines)({
                    "event type": ccArgs.eventTypeLabel,
                    "data type": ccArgs.dataTypeLabel,
                });
            }
            else if (ccId === core_1.CommandClasses["Multilevel Switch"]) {
                prefix = "[Notification] Multilevel Switch";
                details = (0, core_1.messageRecordToLines)({
                    "event type": ccArgs.eventTypeLabel,
                    direction: ccArgs.direction,
                });
            } /*if (ccId === CommandClasses.Powerlevel)*/
            else {
                // Don't bother logging this
                return;
            }
            this.controllerLog.logNode(node.id, {
                message: [prefix, ...details.map((d) => `  ${d}`)].join("\n"),
            });
        };
        this.isSoftResetting = false;
        this.partialCCSessions = new Map();
        /**
         * Returns the next callback ID. Callback IDs are used to correlate requests
         * to the controller/nodes with its response
         */
        this.getNextCallbackId = (0, shared_1.createWrappingCounter)(0xff);
        /**
         * Returns the next session ID for Supervision CC
         */
        this.getNextSupervisionSessionId = (0, shared_1.createWrappingCounter)(core_1.MAX_SUPERVISION_SESSION_ID, true);
        /**
         * Returns the next session ID for Transport Service CC
         */
        this.getNextTransportServiceSessionId = (0, shared_1.createWrappingCounter)(core_1.MAX_TRANSPORT_SERVICE_SESSION_ID, true);
        this.lastSaveToCache = 0;
        this.saveToCacheInterval = 150;
        this.isSavingToCache = false;
        this.sendNodeToSleepTimers = new Map();
        this._enteringBootloader = false;
        this.lastBackgroundRSSITimestamp = 0;
        // Ensure the given serial port is valid
        if (typeof port !== "string" &&
            !(0, serial_1.isZWaveSerialPortImplementation)(port)) {
            throw new core_1.ZWaveError(`The port must be a string or a valid custom serial port implementation!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
        }
        // merge given options with defaults
        this.options = (0, shared_1.mergeDeep)(options, defaultOptions);
        // And make sure they contain valid values
        checkOptions(this.options);
        if (options?.userAgent) {
            if (!(0, typeguards_1.isObject)(options.userAgent)) {
                throw new core_1.ZWaveError(`The userAgent property must be an object!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
            }
            this.updateUserAgent(options.userAgent);
        }
        // Initialize logging
        this._logContainer = new core_1.ZWaveLogContainer(this.options.logConfig);
        this._driverLog = new Driver_1.DriverLogger(this, this._logContainer);
        this._controllerLog = new core_1.ControllerLogger(this._logContainer);
        // Initialize the cache
        this.cacheDir = this.options.storage.cacheDir;
        // Initialize config manager
        this.configManager = new config_1.ConfigManager({
            logContainer: this._logContainer,
            deviceConfigPriorityDir: this.options.storage.deviceConfigPriorityDir,
        });
        // And initialize but don't start the send thread machine
        const sendThreadMachine = (0, SendThreadMachine_1.createSendThreadMachine)({
            sendData: this.writeSerial.bind(this),
            createSendDataAbort: () => new SendDataMessages_1.SendDataAbort(this),
            notifyUnsolicited: (msg) => {
                void this.handleUnsolicitedMessage(msg);
            },
            notifyRetry: (command, lastError, message, attempts, maxAttempts, delay) => {
                if (command === "SendData") {
                    this.controllerLog.logNode(message.getNodeId() ?? 255, `did not respond after ${attempts}/${maxAttempts} attempts. Scheduling next try in ${delay} ms.`, "warn");
                }
                else {
                    // Translate the error into a better one
                    let errorReason;
                    switch (lastError) {
                        case "response timeout":
                            errorReason = "No response from controller";
                            this._controller?.incrementStatistics("timeoutResponse");
                            break;
                        case "callback timeout":
                            errorReason = "No callback from controller";
                            this._controller?.incrementStatistics("timeoutCallback");
                            break;
                        case "response NOK":
                            errorReason =
                                "The controller response indicated failure";
                            break;
                        case "callback NOK":
                            errorReason =
                                "The controller callback indicated failure";
                            break;
                        case "ACK timeout":
                            this._controller?.incrementStatistics("timeoutACK");
                        // fall through
                        case "CAN":
                        case "NAK":
                        default:
                            errorReason =
                                "Failed to execute controller command";
                            break;
                    }
                    this.controllerLog.print(`${errorReason} after ${attempts}/${maxAttempts} attempts. Scheduling next try in ${delay} ms.`, "warn");
                }
            },
            timestamp: core_1.highResTimestamp,
            rejectTransaction: (transaction, error) => {
                // If a node failed to respond in time, it might be sleeping
                if (this.isMissingNodeACK(transaction, error)) {
                    if (this.handleMissingNodeACK(transaction))
                        return;
                }
                // If the transaction was already started, we need to throw the error into the message generator
                // so it correctly gets ended. Otherwise just reject the result promise
                if (transaction.parts.self) {
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    transaction.parts.self.throw(error).catch(() => { });
                }
                else {
                    transaction.promise.reject(error);
                }
            },
            resolveTransaction: (transaction, result) => {
                // If the transaction was already started, we need to end the message generator early by throwing
                // the result. Otherwise just resolve the result promise
                if (transaction.parts.self) {
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    transaction.parts.self.throw(result).catch(() => { });
                }
                else {
                    transaction.promise.resolve(result);
                }
            },
            logOutgoingMessage: (msg) => {
                this.driverLog.logMessage(msg, {
                    direction: "outbound",
                });
                if (process.env.NODE_ENV !== "test") {
                    // Enrich error data in case something goes wrong
                    Sentry.addBreadcrumb({
                        category: "message",
                        timestamp: Date.now() / 1000,
                        type: "debug",
                        data: {
                            direction: "outbound",
                            msgType: msg.type,
                            functionType: msg.functionType,
                            name: msg.constructor.name,
                            nodeId: msg.getNodeId(),
                            ...msg.toLogEntry(),
                        },
                    });
                }
            },
            log: this.driverLog.print.bind(this.driverLog),
            logQueue: this.driverLog.sendQueue.bind(this.driverLog),
        }, (0, shared_1.pick)(this.options, ["timeouts", "attempts"]));
        this.sendThread = (0, xstate_1.interpret)(sendThreadMachine);
        this._sendThreadIdle = false;
        this.sendThread.onTransition((state) => {
            if (state.changed) {
                this.sendThreadIdle = state.matches("idle");
            }
        });
        // For debugging
        // this.sendThread.onTransition((state) => {
        // 	if (state.changed)
        // 		this.driverLog.print(
        // 			`send thread state: ${state.toStrings().join("->")}`,
        // 			"verbose",
        // 		);
        // });
        // this.sendThread.onEvent((evt) => {
        // 	if (evt.type === "forward") {
        // 		this.driverLog.print(
        // 			// @ts-ignore
        // 			`forwarding event: ${evt.payload.type} from ${evt.from} to ${evt.to}`,
        // 			"verbose",
        // 		);
        // 	} else {
        // 		this.driverLog.print(
        // 			`send thread event: ${evt.type}`,
        // 			"verbose",
        // 		);
        // 	}
        // });
    }
    /** Whether the Send Thread is currently idle */
    get sendThreadIdle() {
        return this._sendThreadIdle;
    }
    set sendThreadIdle(value) {
        if (this._sendThreadIdle !== value) {
            this._sendThreadIdle = value;
            this.handleSendThreadIdleChange(value);
        }
    }
    ensureNodeSessions(nodeId) {
        if (!this.nodeSessions.has(nodeId)) {
            this.nodeSessions.set(nodeId, {
                transportService: new Map(),
                supervision: new Map(),
            });
        }
        return this.nodeSessions.get(nodeId);
    }
    /** @internal */
    get valueDB() {
        return this._valueDB;
    }
    /** @internal */
    get metadataDB() {
        return this._metadataDB;
    }
    /** @internal */
    get networkCache() {
        if (this._networkCache == undefined) {
            throw new core_1.ZWaveError("The network cache was not yet initialized!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._networkCache;
    }
    get configVersion() {
        return (this.configManager?.configVersion ??
            packageJson?.dependencies?.["@zwave-js/config"] ??
            exports.libVersion);
    }
    /** @internal */
    get driverLog() {
        return this._driverLog;
    }
    /** @internal */
    get controllerLog() {
        return this._controllerLog;
    }
    /** Encapsulates information about the Z-Wave controller and provides access to its nodes */
    get controller() {
        if (this._controller == undefined) {
            throw new core_1.ZWaveError("The controller is not yet ready!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._controller;
    }
    /** @internal */
    get bootloader() {
        if (this._bootloader == undefined) {
            throw new core_1.ZWaveError("The controller is not in bootloader mode!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._bootloader;
    }
    isInBootloader() {
        return this._bootloader != undefined;
    }
    /** @internal */
    get securityManager() {
        return this._securityManager;
    }
    /** @internal */
    get securityManager2() {
        return this._securityManager2;
    }
    /** @internal This is needed for the ZWaveHost interface */
    get homeId() {
        return this.controller.homeId;
    }
    /** @internal This is needed for the ZWaveHost interface */
    get ownNodeId() {
        return this.controller.ownNodeId;
    }
    /** @internal This is needed for the ZWaveHost interface */
    get nodes() {
        return this.controller.nodes;
    }
    getNodeUnsafe(msg) {
        const nodeId = msg.getNodeId();
        if (nodeId != undefined)
            return this.controller.nodes.get(nodeId);
    }
    tryGetEndpoint(cc) {
        if (cc.isSinglecast()) {
            return this.controller.nodes
                .get(cc.nodeId)
                ?.getEndpoint(cc.endpointIndex);
        }
    }
    /** @internal This is needed for the ZWaveHost interface */
    getValueDB(nodeId) {
        const node = this.controller.nodes.getOrThrow(nodeId);
        return node.valueDB;
    }
    /** @internal This is needed for the ZWaveHost interface */
    tryGetValueDB(nodeId) {
        const node = this.controller.nodes.get(nodeId);
        return node?.valueDB;
    }
    /** @internal This is needed for the ZWaveHost interface */
    getDeviceConfig(nodeId) {
        return this.controller.nodes.get(nodeId)?.deviceConfig;
    }
    /** @internal This is needed for the ZWaveHost interface */
    getHighestSecurityClass(nodeId) {
        const node = this.controller.nodes.getOrThrow(nodeId);
        return node.getHighestSecurityClass();
    }
    /** @internal This is needed for the ZWaveHost interface */
    hasSecurityClass(nodeId, securityClass) {
        const node = this.controller.nodes.getOrThrow(nodeId);
        return node.hasSecurityClass(securityClass);
    }
    /** @internal This is needed for the ZWaveHost interface */
    setSecurityClass(nodeId, securityClass, granted) {
        const node = this.controller.nodes.getOrThrow(nodeId);
        node.setSecurityClass(securityClass, granted);
    }
    /** @internal This is needed for the ZWaveHost interface */
    isControllerNode(nodeId) {
        return nodeId === this.ownNodeId;
    }
    /** Updates the logging configuration without having to restart the driver. */
    updateLogConfig(config) {
        this._logContainer.updateConfiguration(config);
    }
    /** Returns the current logging configuration. */
    getLogConfig() {
        return this._logContainer.getConfiguration();
    }
    /** Updates the preferred sensor scales to use for node queries */
    setPreferredScales(scales) {
        this.options.preferences.scales = (0, shared_1.mergeDeep)(defaultOptions.preferences.scales, scales);
    }
    /** Enumerates all existing serial ports */
    static async enumerateSerialPorts() {
        const ports = await serialport_1.SerialPort.list();
        return ports.map((port) => port.path);
    }
    /** Updates a subset of the driver options on the fly */
    updateOptions(options) {
        // This code is called from user code, so we need to make sure no options were passed
        // which we are not able to update on the fly
        const safeOptions = (0, shared_1.pick)(options, [
            "disableOptimisticValueUpdate",
            "emitValueUpdateAfterSetValue",
            "inclusionUserCallbacks",
            "interview",
            "preferences",
            "preserveUnknownValues",
        ]);
        // Create a new deep-merged copy of the options so we can check them for validity
        // without affecting our own options
        const newOptions = (0, shared_1.mergeDeep)((0, shared_1.cloneDeep)(this.options), safeOptions, true);
        checkOptions(newOptions);
        if (options.userAgent && !(0, typeguards_1.isObject)(options.userAgent)) {
            throw new core_1.ZWaveError(`The userAgent property must be an object!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
        }
        // All good, update the options
        this.options = newOptions;
        if (options.logConfig) {
            this.updateLogConfig(options.logConfig);
        }
        if (options.userAgent) {
            this.updateUserAgent(options.userAgent);
        }
    }
    /** Start the driver */
    async start() {
        // avoid starting twice
        if (this.wasDestroyed) {
            throw new core_1.ZWaveError("The driver was destroyed. Create a new instance and start that one.", core_1.ZWaveErrorCodes.Driver_Destroyed);
        }
        if (this._wasStarted)
            return Promise.resolve();
        this._wasStarted = true;
        // Enforce that an error handler is attached, except for testing with a mocked serialport
        if (!this.options.testingHooks &&
            this.listenerCount("error") === 0) {
            throw new core_1.ZWaveError(`Before starting the driver, a handler for the "error" event must be attached.`, core_1.ZWaveErrorCodes.Driver_NoErrorHandler);
        }
        const spOpenPromise = (0, deferred_promise_1.createDeferredPromise)();
        // Log which version is running
        this.driverLog.print(libNameString, "info");
        this.driverLog.print(`version ${exports.libVersion}`, "info");
        this.driverLog.print("", "info");
        this.driverLog.print("starting driver...");
        this.sendThread.start();
        // Open the serial port
        if (typeof this.port === "string") {
            if (this.port.startsWith("tcp://")) {
                const url = new url_1.URL(this.port);
                this.driverLog.print(`opening serial port ${this.port}`);
                this.serial = new serial_1.ZWaveSocket({
                    host: url.hostname,
                    port: parseInt(url.port),
                }, this._logContainer);
            }
            else {
                this.driverLog.print(`opening serial port ${this.port}`);
                this.serial = new serial_1.ZWaveSerialPort(this.port, this._logContainer, this.options.testingHooks?.serialPortBinding);
            }
        }
        else {
            this.driverLog.print("opening serial port using the provided custom implementation");
            this.serial = new serial_1.ZWaveSerialPortBase(this.port, this._logContainer);
        }
        this.serial
            .on("data", this.serialport_onData.bind(this))
            .on("bootloaderData", this.serialport_onBootloaderData.bind(this))
            .on("error", (err) => {
            if (this.isSoftResetting && !this.serial?.isOpen) {
                // A disconnection while soft resetting is to be expected
                return;
            }
            else if (!this._isOpen) {
                // tryOpenSerialport takes care of error handling
                return;
            }
            const message = `Serial port errored: ${err.message}`;
            this.driverLog.print(message, "error");
            const error = new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.Driver_Failed);
            this.emit("error", error);
            void this.destroy();
        });
        // If the port is already open, close it first
        if (this.serial.isOpen)
            await this.serial.close();
        // IMPORTANT: Test code expects the open promise to be created and returned synchronously
        // Everything async (including opening the serial port) must happen in the setImmediate callback
        // asynchronously open the serial port
        setImmediate(async () => {
            try {
                await this.openSerialport();
            }
            catch (e) {
                spOpenPromise.reject(e);
                void this.destroy();
                return;
            }
            this.driverLog.print("serial port opened");
            this._isOpen = true;
            spOpenPromise.resolve();
            if (typeof this.options.testingHooks?.onSerialPortOpen ===
                "function") {
                await this.options.testingHooks.onSerialPortOpen(this.serial);
            }
            // Perform initialization sequence
            await this.writeHeader(serial_1.MessageHeaders.NAK);
            // Per the specs, this should be followed by a soft-reset but we need to be able
            // to handle sticks that don't support the soft reset command. Therefore we do it
            // after opening the value DBs
            if (!this.options.testingHooks?.skipBootloaderCheck) {
                // After an incomplete firmware upgrade, we might be stuck in the bootloader
                // Therefore wait a short amount of time to see if the serialport detects bootloader mode.
                // If we are, the bootloader will reply with its menu.
                await (0, async_1.wait)(1000);
                if (this._bootloader) {
                    this.driverLog.print("Controller is in bootloader, attempting to recover...", "warn");
                    await this.leaveBootloaderInternal();
                    // Wait a short time again. If we're in bootloader mode again, we're stuck
                    await (0, async_1.wait)(1000);
                    if (this._bootloader) {
                        if (this.options.allowBootloaderOnly) {
                            this.driverLog.print("Failed to recover from bootloader. Staying in bootloader mode as requested.", "warn");
                            // Needed for the OTW feature to be available
                            this._controller = new Controller_1.ZWaveController(this, true);
                            this.emit("bootloader ready");
                        }
                        else {
                            const message = "Failed to recover from bootloader. Please flash a new firmware to continue...";
                            this.driverLog.print(message, "error");
                            this.emit("error", new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.Driver_Failed));
                            void this.destroy();
                        }
                        return;
                    }
                }
            }
            // Try to create the cache directory. This can fail, in which case we should expose a good error message
            try {
                await this.options.storage.driver.ensureDir(this.cacheDir);
            }
            catch (e) {
                let message;
                if (/\.yarn[/\\]cache[/\\]zwave-js/i.test((0, shared_1.getErrorMessage)(e, true))) {
                    message = `Failed to create the cache directory. When using Yarn PnP, you need to change the location with the "storage.cacheDir" driver option.`;
                }
                else {
                    message = `Failed to create the cache directory. Please make sure that it is writable or change the location with the "storage.cacheDir" driver option.`;
                }
                this.driverLog.print(message, "error");
                this.emit("error", new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.Driver_Failed));
                void this.destroy();
                return;
            }
            // Load the necessary configuration
            if (this.options.testingHooks?.loadConfiguration !== false) {
                this.driverLog.print("loading configuration...");
                try {
                    await this.configManager.loadAll();
                }
                catch (e) {
                    const message = `Failed to load the configuration: ${(0, shared_1.getErrorMessage)(e)}`;
                    this.driverLog.print(message, "error");
                    this.emit("error", new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.Driver_Failed));
                    void this.destroy();
                    return;
                }
            }
            this.driverLog.print("beginning interview...");
            try {
                await this.initializeControllerAndNodes();
            }
            catch (e) {
                let message;
                if ((0, core_1.isZWaveError)(e) &&
                    e.code === core_1.ZWaveErrorCodes.Controller_MessageDropped) {
                    message = `Failed to initialize the driver, no response from the controller. Are you sure this is a Z-Wave controller?`;
                }
                else {
                    message = `Failed to initialize the driver: ${(0, shared_1.getErrorMessage)(e, true)}`;
                }
                this.driverLog.print(message, "error");
                this.emit("error", new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.Driver_Failed));
                void this.destroy();
                return;
            }
        });
        return spOpenPromise;
    }
    async openSerialport() {
        let lastError;
        // After a reset, the serial port may need a few seconds until we can open it - try a few times
        for (let attempt = 1; attempt <= this.options.attempts.openSerialPort; attempt++) {
            try {
                await this.serial.open();
                return;
            }
            catch (e) {
                lastError = e;
            }
            if (attempt < this.options.attempts.openSerialPort) {
                await (0, async_1.wait)(1000);
            }
        }
        const message = `Failed to open the serial port: ${(0, shared_1.getErrorMessage)(lastError)}`;
        this.driverLog.print(message, "error");
        throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.Driver_Failed);
    }
    /** Indicates whether all nodes are ready, i.e. the "all nodes ready" event has been emitted */
    get allNodesReady() {
        return this._nodesReadyEventEmitted;
    }
    getJsonlDBOptions() {
        const options = {
            ignoreReadErrors: true,
            ...ThrottlePresets_1.throttlePresets[this.options.storage.throttle],
        };
        if (this.options.storage.lockDir) {
            options.lockfile = {
                directory: this.options.storage.lockDir,
            };
        }
        return options;
    }
    async initNetworkCache(homeId) {
        const options = this.getJsonlDBOptions();
        const networkCacheFile = path_1.default.join(this.cacheDir, `${homeId.toString(16)}.jsonl`);
        this._networkCache = new jsonl_db_1.JsonlDB(networkCacheFile, {
            ...options,
            serializer: (key, value) => (0, NetworkCache_1.serializeNetworkCacheValue)(this, key, value),
            reviver: (key, value) => (0, NetworkCache_1.deserializeNetworkCacheValue)(this, key, value),
        });
        await this._networkCache.open();
        if (process.env.NO_CACHE === "true") {
            // Since the network cache is append-only, we need to
            // clear it if the cache should be ignored
            this._networkCache.clear();
        }
    }
    async initValueDBs(homeId) {
        const options = this.getJsonlDBOptions();
        const valueDBFile = path_1.default.join(this.cacheDir, `${homeId.toString(16)}.values.jsonl`);
        this._valueDB = new jsonl_db_1.JsonlDB(valueDBFile, {
            ...options,
            enableTimestamps: true,
            reviver: (key, value) => (0, core_1.deserializeCacheValue)(value),
            serializer: (key, value) => (0, core_1.serializeCacheValue)(value),
        });
        await this._valueDB.open();
        const metadataDBFile = path_1.default.join(this.cacheDir, `${homeId.toString(16)}.metadata.jsonl`);
        this._metadataDB = new jsonl_db_1.JsonlDB(metadataDBFile, options);
        await this._metadataDB.open();
        if (process.env.NO_CACHE === "true") {
            // Since value/metadata DBs are append-only, we need to
            // clear them if the cache should be ignored
            this._valueDB.clear();
            this._metadataDB.clear();
        }
    }
    async performCacheMigration() {
        if (!this._controller ||
            !this.controller.homeId ||
            !this._networkCache ||
            !this._valueDB) {
            return;
        }
        // In v9, the network cache was switched from a json file to use a Jsonl-DB
        // Therefore the legacy cache file must be migrated to the new format
        if (this._networkCache.size === 0) {
            // version the cache format, so migrations in the future are easier
            this._networkCache.set("cacheFormat", 1);
            try {
                await (0, NetworkCache_1.migrateLegacyNetworkCache)(this, this.controller.homeId, this._networkCache, this._valueDB, this.options.storage.driver, this.cacheDir);
                // Go through the value DB and remove all keys referencing commandClass -1, which used to be a
                // hacky way to store non-CC specific values
                for (const key of this._valueDB.keys()) {
                    if (-1 === key.indexOf(`,"commandClass":-1,`)) {
                        continue;
                    }
                    this._valueDB.delete(key);
                }
            }
            catch (e) {
                const message = `Migrating the legacy cache file to jsonl failed: ${(0, shared_1.getErrorMessage)(e, true)}`;
                this.driverLog.print(message, "error");
            }
        }
    }
    /**
     * Initializes the variables for controller and nodes,
     * adds event handlers and starts the interview process.
     */
    async initializeControllerAndNodes() {
        if (this._controller == undefined) {
            this._controller = new Controller_1.ZWaveController(this);
            this._controller
                .on("node added", this.onNodeAdded.bind(this))
                .on("node removed", this.onNodeRemoved.bind(this));
        }
        if (!this.options.testingHooks?.skipControllerIdentification) {
            // Determine controller IDs to open the Value DBs
            // We need to do this first because some older controllers, especially the UZB1 and
            // some 500-series sticks in virtualized environments don't respond after a soft reset
            // No need to initialize databases if skipInterview is true, because it is only used in some
            // Driver unit tests that don't need access to them
            // Identify the controller and determine if it supports soft reset
            await this.controller.identify();
            await this.initNetworkCache(this.controller.homeId);
            if (this.options.enableSoftReset && !this.maySoftReset()) {
                this.driverLog.print(`Soft reset is enabled through config, but this stick does not support it.`, "warn");
                this.options.enableSoftReset = false;
            }
            if (this.options.enableSoftReset) {
                try {
                    await this.softResetInternal(false);
                }
                catch (e) {
                    if ((0, core_1.isZWaveError)(e) &&
                        e.code === core_1.ZWaveErrorCodes.Driver_Failed) {
                        // Remember that soft reset is not supported by this stick
                        this.driverLog.print("Soft reset seems not to be supported by this stick, disabling it.", "warn");
                        this.controller.supportsSoftReset = false;
                        // Then fail the driver
                        await this.destroy();
                        return;
                    }
                }
            }
            // There are situations where a controller claims it has the ID 0,
            // which isn't valid. In this case try again after having soft-reset the stick
            if (this.controller.ownNodeId === 0 &&
                this.options.enableSoftReset) {
                this.driverLog.print(`Controller identification returned invalid node ID 0 - trying again...`, "warn");
                // We might end up with a different home ID, so close the cache before re-identifying the controller
                await this._networkCache?.close();
                await this.controller.identify();
                await this.initNetworkCache(this.controller.homeId);
            }
            if (this.controller.ownNodeId === 0) {
                this.driverLog.print(`Controller identification returned invalid node ID 0`, "error");
                await this.destroy();
                return;
            }
            // now that we know the home ID, we can open the databases
            await this.initValueDBs(this.controller.homeId);
            await this.performCacheMigration();
            // Interview the controller.
            await this._controller.interview(async () => {
                // Try to restore the network information from the cache
                if (process.env.NO_CACHE !== "true") {
                    await this.restoreNetworkStructureFromCache();
                }
            });
            // Auto-enable smart start inclusion
            this._controller.autoProvisionSmartStart();
        }
        // Set up the S0 security manager. We can only do that after the controller
        // interview because we need to know the controller node id.
        const S0Key = this.options.securityKeys?.S0_Legacy;
        if (S0Key) {
            this.driverLog.print("Network key for S0 configured, enabling S0 security manager...");
            this._securityManager = new core_1.SecurityManager({
                networkKey: S0Key,
                ownNodeId: this._controller.ownNodeId,
                nonceTimeout: this.options.timeouts.nonce,
            });
        }
        else {
            this.driverLog.print("No network key for S0 configured, communication with secure (S0) devices won't work!", "warn");
        }
        // The S2 security manager could be initialized earlier, but we do it here for consistency
        if (this.options.securityKeys &&
            // Only set it up if we have security keys for at least one S2 security class
            Object.keys(this.options.securityKeys).some((key) => key.startsWith("S2_") &&
                key in core_1.SecurityClass &&
                (0, core_1.securityClassIsS2)(core_1.SecurityClass[key]))) {
            this.driverLog.print("At least one network key for S2 configured, enabling S2 security manager...");
            this._securityManager2 = new core_1.SecurityManager2();
            // Set up all keys
            for (const secClass of [
                "S2_Unauthenticated",
                "S2_Authenticated",
                "S2_AccessControl",
                "S0_Legacy",
            ]) {
                const key = this.options.securityKeys[secClass];
                if (key) {
                    this._securityManager2.setKey(core_1.SecurityClass[secClass], key);
                }
            }
        }
        else {
            this.driverLog.print("No network key for S2 configured, communication with secure (S2) devices won't work!", "warn");
        }
        // in any case we need to emit the driver ready event here
        this._controllerInterviewed = true;
        this.driverLog.print("driver ready");
        this.emit("driver ready");
        // Add event handlers for the nodes
        for (const node of this._controller.nodes.values()) {
            this.addNodeEventHandlers(node);
        }
        // Before interviewing nodes reset our knowledge about their ready state
        this._nodesReady.clear();
        this._nodesReadyEventEmitted = false;
        if (!this.options.testingHooks?.skipNodeInterview) {
            // Now interview all nodes
            // First complete the controller interview
            const controllerNode = this._controller.nodes.get(this._controller.ownNodeId);
            await this.interviewNodeInternal(controllerNode);
            // Then do all the nodes in parallel
            for (const node of this._controller.nodes.values()) {
                if (node.id === this._controller.ownNodeId) {
                    // The controller is always alive
                    node.markAsAlive();
                    continue;
                }
                else if (node.canSleep) {
                    // A node that can sleep should be assumed to be sleeping after resuming from cache
                    node.markAsAsleep();
                }
                void (async () => {
                    // Continue the interview if necessary. If that is not necessary, at least
                    // determine the node's status
                    if (node.interviewStage < _Types_1.InterviewStage.Complete) {
                        // don't await the interview, because it may take a very long time
                        // if a node is asleep
                        await this.interviewNodeInternal(node);
                    }
                    else if (node.isListening || node.isFrequentListening) {
                        // Ping non-sleeping nodes to determine their status
                        await node.ping();
                    }
                    // Previous versions of zwave-js didn't configure the SUC return route. Make sure each node has one
                    // and remember that we did. If the node is not responsive - tough luck, try again next time
                    if (!node.hasSUCReturnRoute &&
                        node.status !== _Types_1.NodeStatus.Dead) {
                        node.hasSUCReturnRoute =
                            await this.controller.assignSUCReturnRoute(node.id);
                    }
                })();
            }
        }
    }
    /**
     * @internal
     * Starts or resumes the interview of a Z-Wave node. It is advised to NOT
     * await this method as it can take a very long time (minutes to hours)!
     *
     * WARNING: Do not call this method from application code. To refresh the information
     * for a specific node, use `node.refreshInfo()` instead
     */
    async interviewNodeInternal(node) {
        if (node.interviewStage === _Types_1.InterviewStage.Complete) {
            return;
        }
        // Avoid having multiple restart timeouts active
        if (this.retryNodeInterviewTimeouts.has(node.id)) {
            clearTimeout(this.retryNodeInterviewTimeouts.get(node.id));
            this.retryNodeInterviewTimeouts.delete(node.id);
        }
        // Drop all pending messages that come from a previous interview attempt
        this.rejectTransactions((t) => t.message.getNodeId() === node.id &&
            (t.priority === core_1.MessagePriority.NodeQuery ||
                t.tag === "interview"), "The interview was restarted", core_1.ZWaveErrorCodes.Controller_InterviewRestarted);
        const maxInterviewAttempts = this.options.attempts.nodeInterview;
        try {
            if (!(await node.interviewInternal())) {
                // Find out if we may retry the interview
                if (node.status === _Types_1.NodeStatus.Dead) {
                    this.controllerLog.logNode(node.id, `Interview attempt (${node.interviewAttempts}/${maxInterviewAttempts}) failed, node is dead.`, "warn");
                    node.emit("interview failed", node, {
                        errorMessage: "The node is dead",
                        isFinal: true,
                    });
                }
                else if (node.interviewAttempts < maxInterviewAttempts) {
                    // This is most likely because the node is unable to handle our load of requests now. Give it some time
                    const retryTimeout = Math.min(30000, node.interviewAttempts * 5000);
                    this.controllerLog.logNode(node.id, `Interview attempt ${node.interviewAttempts}/${maxInterviewAttempts} failed, retrying in ${retryTimeout} ms...`, "warn");
                    node.emit("interview failed", node, {
                        errorMessage: `Attempt ${node.interviewAttempts}/${maxInterviewAttempts} failed`,
                        isFinal: false,
                        attempt: node.interviewAttempts,
                        maxAttempts: maxInterviewAttempts,
                    });
                    // Schedule the retry and remember the timeout instance
                    this.retryNodeInterviewTimeouts.set(node.id, setTimeout(() => {
                        this.retryNodeInterviewTimeouts.delete(node.id);
                        void this.interviewNodeInternal(node);
                    }, retryTimeout).unref());
                }
                else {
                    this.controllerLog.logNode(node.id, `Failed all interview attempts, giving up.`, "warn");
                    node.emit("interview failed", node, {
                        errorMessage: `Maximum interview attempts reached`,
                        isFinal: true,
                        attempt: maxInterviewAttempts,
                        maxAttempts: maxInterviewAttempts,
                    });
                }
            }
            else if (node.manufacturerId != undefined &&
                node.productType != undefined &&
                node.productId != undefined &&
                node.firmwareVersion != undefined &&
                !node.deviceConfig &&
                process.env.NODE_ENV !== "test") {
                // The interview succeeded, but we don't have a device config for this node.
                // Report it, so we can add a config file
                void (0, deviceConfig_1.reportMissingDeviceConfig)(this, node).catch(
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                () => { });
            }
        }
        catch (e) {
            if ((0, core_1.isZWaveError)(e)) {
                if (e.code === core_1.ZWaveErrorCodes.Driver_NotReady ||
                    e.code === core_1.ZWaveErrorCodes.Controller_NodeRemoved) {
                    // This only happens when a node is removed during the interview - we don't log this
                    return;
                }
                else if (e.code === core_1.ZWaveErrorCodes.Controller_InterviewRestarted) {
                    // The interview was restarted by a user - we don't log this
                    return;
                }
                this.controllerLog.logNode(node.id, `Error during node interview: ${e.message}`, "error");
            }
            else {
                throw e;
            }
        }
    }
    /** Adds the necessary event handlers for a node instance */
    addNodeEventHandlers(node) {
        node.on("wake up", this.onNodeWakeUp.bind(this))
            .on("sleep", this.onNodeSleep.bind(this))
            .on("alive", this.onNodeAlive.bind(this))
            .on("dead", this.onNodeDead.bind(this))
            .on("interview completed", this.onNodeInterviewCompleted.bind(this))
            .on("ready", this.onNodeReady.bind(this))
            .on("firmware update finished", this.onNodeFirmwareUpdated.bind(this))
            .on("notification", this.onNodeNotification.bind(this));
    }
    /** Removes a node's event handlers that were added with addNodeEventHandlers */
    removeNodeEventHandlers(node) {
        node.removeAllListeners("wake up")
            .removeAllListeners("sleep")
            .removeAllListeners("alive")
            .removeAllListeners("dead")
            .removeAllListeners("interview completed")
            .removeAllListeners("ready")
            .removeAllListeners("firmware update finished")
            .removeAllListeners("notification");
    }
    /** Is called when a node wakes up */
    onNodeWakeUp(node, oldStatus) {
        this.controllerLog.logNode(node.id, `The node is ${oldStatus === _Types_1.NodeStatus.Unknown ? "" : "now "}awake.`);
        // Make sure to handle the pending messages as quickly as possible
        if (oldStatus === _Types_1.NodeStatus.Asleep) {
            this.sendThread.send({
                type: "reduce",
                reducer: ({ message }) => {
                    // Ignore messages that are not for this node
                    if (message.getNodeId() !== node.id)
                        return { type: "keep" };
                    // Resolve pings, so we don't need to send them (we know the node is awake)
                    if ((0, cc_1.messageIsPing)(message))
                        return { type: "resolve", message: undefined };
                    // Re-queue all other transactions for this node, so they get added in front of the others
                    return { type: "requeue" };
                },
            });
        }
    }
    /** Is called when a node goes to sleep */
    onNodeSleep(node, oldStatus) {
        this.controllerLog.logNode(node.id, `The node is ${oldStatus === _Types_1.NodeStatus.Unknown ? "" : "now "}asleep.`);
        // Move all its pending messages to the WakeupQueue
        // This clears the current transaction and continues sending the next messages
        this.moveMessagesToWakeupQueue(node.id);
    }
    /** Is called when a previously dead node starts communicating again */
    onNodeAlive(node, oldStatus) {
        this.controllerLog.logNode(node.id, `The node is ${oldStatus === _Types_1.NodeStatus.Unknown ? "" : "now "}alive.`);
        if (oldStatus === _Types_1.NodeStatus.Dead &&
            node.interviewStage !== _Types_1.InterviewStage.Complete) {
            void this.interviewNodeInternal(node);
        }
    }
    /** Is called when a node is marked as dead */
    onNodeDead(node, oldStatus) {
        this.controllerLog.logNode(node.id, `The node is ${oldStatus === _Types_1.NodeStatus.Unknown ? "" : "now "}dead.`);
        // This could mean that we need to ignore it in the all nodes ready check,
        // so perform the check again
        this.checkAllNodesReady();
    }
    /** Is called when a node is ready to be used */
    onNodeReady(node) {
        this._nodesReady.add(node.id);
        this.controllerLog.logNode(node.id, "The node is ready to be used");
        // Regularly check if values of non-sleeping nodes need to be refreshed per the specs
        // For sleeping nodes this is done on wakeup
        if (this.autoRefreshNodeValueTimers.has(node.id)) {
            clearInterval(this.autoRefreshNodeValueTimers.get(node.id));
            this.autoRefreshNodeValueTimers.delete(node.id);
        }
        if (!node.canSleep) {
            // Randomize the interval so we don't get a flood of queries for all listening nodes
            const intervalMinutes = 50 + Math.random() * 20;
            this.autoRefreshNodeValueTimers.set(node.id, setInterval(() => {
                void node.autoRefreshValues().catch(() => {
                    // ignore errors
                });
            }, core_1.timespan.minutes(intervalMinutes)).unref());
        }
        this.checkAllNodesReady();
    }
    /** Checks if all nodes are ready and emits the "all nodes ready" event if they are */
    checkAllNodesReady() {
        // Only emit "all nodes ready" once
        if (this._nodesReadyEventEmitted)
            return;
        for (const [id, node] of this.controller.nodes) {
            // Ignore dead nodes or the all nodes ready event will never be emitted without physical user interaction
            if (node.status === _Types_1.NodeStatus.Dead)
                continue;
            if (!this._nodesReady.has(id))
                return;
        }
        // All nodes are ready
        this.controllerLog.print("All nodes are ready to be used");
        this.emit("all nodes ready");
        this._nodesReadyEventEmitted = true;
        // We know we have all data, this is the time to send statistics (when enabled)
        void this.compileAndSendStatistics().catch(() => {
            /* ignore */
        });
    }
    /**
     * Enables error reporting via Sentry. This is turned off by default, because it registers a
     * global `unhandledRejection` event handler, which has an influence how the application will
     * behave in case of an unhandled rejection.
     */
    enableErrorReporting() {
        // Init sentry, unless we're running a a test or some custom-built userland or PR test versions
        if (process.env.NODE_ENV !== "test" &&
            !/\-[a-f0-9]{7,}$/.test(exports.libVersion) &&
            !/\-pr\-\d+\-$/.test(exports.libVersion)) {
            void (0, sentry_1.initSentry)(libraryRootDir, exports.libName, exports.libVersion).catch(() => {
                /* ignore */
            });
        }
    }
    /** Whether reporting usage statistics is currently enabled */
    get statisticsEnabled() {
        return this._statisticsEnabled;
    }
    /**
     * Updates individual components of the user agent. Versions for individual applications can be added or removed.
     * @param components An object with application/module/component names and their versions. Set a version to `null` or `undefined` explicitly to remove it from the user agent.
     */
    updateUserAgent(components) {
        this.userAgentComponents = (0, UserAgent_1.mergeUserAgent)(this.userAgentComponents, components);
        this._userAgent = this.getEffectiveUserAgentString(this.userAgentComponents);
    }
    /**
     * Returns the effective user agent string for the given components.
     * The driver name and version is automatically prepended and the statisticsAppInfo data is automatically appended if no components were given.
     */
    getEffectiveUserAgentString(components) {
        const effectiveComponents = new Map([
            [exports.libName, exports.libVersion],
            ...components,
        ]);
        if (effectiveComponents.size === 1 &&
            this.statisticsAppInfo &&
            this.statisticsAppInfo.applicationName !== "node-zwave-js") {
            effectiveComponents.set(this.statisticsAppInfo.applicationName, this.statisticsAppInfo.applicationVersion);
        }
        return (0, UserAgent_1.userAgentComponentsToString)(effectiveComponents);
    }
    /** Returns the user agent string used for service requests */
    get userAgent() {
        return this._userAgent;
    }
    /** Returns the user agent string combined with the additional components (if given) */
    getUserAgentStringWithComponents(components) {
        if (!components || Object.keys(components).length === 0) {
            return this._userAgent;
        }
        const merged = (0, UserAgent_1.mergeUserAgent)(this.userAgentComponents, components, false);
        return this.getEffectiveUserAgentString(merged);
    }
    /**
     * Enable sending usage statistics. Although this does not include any sensitive information, we expect that you
     * inform your users before enabling statistics.
     */
    enableStatistics(appInfo) {
        if (this._statisticsEnabled)
            return;
        if (!(0, typeguards_1.isObject)(appInfo) ||
            typeof appInfo.applicationName !== "string" ||
            typeof appInfo.applicationVersion !== "string") {
            throw new core_1.ZWaveError(`The application statistics must be an object with two string properties "applicationName" and "applicationVersion"!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
        }
        else if (appInfo.applicationName.length > 100) {
            throw new core_1.ZWaveError(`The applicationName for statistics must be maximum 100 characters long!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
        }
        else if (appInfo.applicationVersion.length > 100) {
            throw new core_1.ZWaveError(`The applicationVersion for statistics must be maximum 100 characters long!`, core_1.ZWaveErrorCodes.Driver_InvalidOptions);
        }
        this._statisticsEnabled = true;
        this.statisticsAppInfo = appInfo;
        // If we're already ready, send statistics
        if (this._nodesReadyEventEmitted) {
            void this.compileAndSendStatistics().catch(() => {
                /* ignore */
            });
        }
    }
    /**
     * Disable sending usage statistics
     */
    disableStatistics() {
        this._statisticsEnabled = false;
        this.statisticsAppInfo = undefined;
        if (this.statisticsTimeout) {
            clearTimeout(this.statisticsTimeout);
            this.statisticsTimeout = undefined;
        }
    }
    /** @internal */
    // eslint-disable-next-line @typescript-eslint/require-await
    async getUUID() {
        // To anonymously identify a network, we create a unique ID and use it to salt the Home ID
        if (!this._valueDB.has("uuid")) {
            this._valueDB.set("uuid", (0, crypto_1.randomBytes)(32).toString("hex"));
        }
        const ret = this._valueDB.get("uuid");
        return ret;
    }
    async compileAndSendStatistics() {
        // Don't send anything if statistics are not enabled
        if (!this.statisticsEnabled || !this.statisticsAppInfo)
            return;
        if (this.statisticsTimeout) {
            clearTimeout(this.statisticsTimeout);
            this.statisticsTimeout = undefined;
        }
        let success = false;
        try {
            const statistics = await (0, statistics_1.compileStatistics)(this, {
                driverVersion: exports.libVersion,
                ...this.statisticsAppInfo,
                nodeVersion: process.versions.node,
                os: process.platform,
                arch: process.arch,
            });
            success = await (0, statistics_1.sendStatistics)(statistics);
        }
        catch {
            // Didn't work - try again in a few hours
            success = false;
        }
        finally {
            if (typeof success === "number") {
                this.driverLog.print(`Sending usage statistics was rate limited - next attempt scheduled in ${success} seconds.`, "verbose");
                // Wait at most 6 hours to try again
                const retryMs = Math.max(core_1.timespan.minutes(1), Math.min(success * 1000, core_1.timespan.hours(6)));
                this.statisticsTimeout = setTimeout(() => {
                    void this.compileAndSendStatistics();
                }, retryMs).unref();
            }
            else {
                this.driverLog.print(success
                    ? `Usage statistics sent - next transmission scheduled in 23 hours.`
                    : `Failed to send usage statistics - next transmission scheduled in 6 hours.`, "verbose");
                this.statisticsTimeout = setTimeout(() => {
                    void this.compileAndSendStatistics();
                }, core_1.timespan.hours(success ? 23 : 6)).unref();
            }
        }
    }
    /** Is called when a node interview is completed */
    onNodeInterviewCompleted(node) {
        this.debounceSendNodeToSleep(node);
    }
    /** This is called when a new node has been added to the network */
    onNodeAdded(node) {
        this.addNodeEventHandlers(node);
        if (this.options.interview?.disableOnNodeAdded)
            return;
        if (this.options.testingHooks?.skipNodeInterview)
            return;
        // Interview the node
        // don't await the interview, because it may take a very long time
        // if a node is asleep
        void this.interviewNodeInternal(node);
    }
    /** This is called when a node was removed from the network */
    onNodeRemoved(node, replaced) {
        // Remove all listeners and timers
        this.removeNodeEventHandlers(node);
        if (this.sendNodeToSleepTimers.has(node.id)) {
            clearTimeout(this.sendNodeToSleepTimers.get(node.id));
            this.sendNodeToSleepTimers.delete(node.id);
        }
        if (this.retryNodeInterviewTimeouts.has(node.id)) {
            clearTimeout(this.retryNodeInterviewTimeouts.get(node.id));
            this.retryNodeInterviewTimeouts.delete(node.id);
        }
        if (this.autoRefreshNodeValueTimers.has(node.id)) {
            clearTimeout(this.autoRefreshNodeValueTimers.get(node.id));
            this.autoRefreshNodeValueTimers.delete(node.id);
        }
        // purge node values from the DB
        node.valueDB.clear();
        this.cachePurge(NetworkCache_1.cacheKeys.node(node.id)._baseKey);
        // Remove the node from all security manager instances
        this.securityManager?.deleteAllNoncesForReceiver(node.id);
        this.securityManager2?.deleteNonce(node.id);
        this.rejectAllTransactionsForNode(node.id, "The node was removed from the network", core_1.ZWaveErrorCodes.Controller_NodeRemoved);
        if (!replaced) {
            // Asynchronously remove the node from all possible associations, ignore potential errors
            // but only if the node is not getting replaced, because the removal will interfere with
            // bootstrapping the new node
            this.controller
                .removeNodeFromAllAssociations(node.id)
                .catch((err) => {
                this.driverLog.print(`Failed to remove node ${node.id} from all associations: ${err.message}`, "error");
            });
        }
        // And clean up all remaining resources used by the node
        node.destroy();
        // If this was a failed node it could mean that all nodes are now ready
        this.checkAllNodesReady();
    }
    /**
     * Returns the time in seconds to actually wait after a firmware upgrade, depending on what the device said.
     * This number will always be a bit greater than the advertised duration, because devices have been found to take longer to actually reboot.
     */
    getConservativeWaitTimeAfterFirmwareUpdate(advertisedWaitTime) {
        // Wait the specified time plus a bit, so the device is actually ready to use
        if (!advertisedWaitTime) {
            // Wait at least 5 seconds
            return 5;
        }
        else if (advertisedWaitTime < 20) {
            return advertisedWaitTime + 5;
        }
        else if (advertisedWaitTime < 60) {
            return advertisedWaitTime + 10;
        }
        else {
            return advertisedWaitTime + 30;
        }
    }
    /** This is called when the firmware on one of a node's firmware targets was updated */
    async onNodeFirmwareUpdated(node, _status, _waitTime, result) {
        const { success, reInterview } = result;
        // Nothing to do for non-successful updates
        if (!success)
            return;
        // TODO: Add support for delayed activation
        // Reset nonces etc. to prevent false-positive duplicates after the update
        this.securityManager?.deleteAllNoncesForReceiver(node.id);
        this.securityManager2?.deleteNonce(node.id);
        // waitTime should always be defined, but just to be sure
        const waitTime = result.waitTime ?? 5;
        if (reInterview) {
            this.controllerLog.logNode(node.id, `Firmware updated, scheduling interview in ${waitTime} seconds...`);
            // We reuse the retryNodeInterviewTimeouts here because they serve a similar purpose
            this.retryNodeInterviewTimeouts.set(node.id, setTimeout(() => {
                this.retryNodeInterviewTimeouts.delete(node.id);
                void node.refreshInfo({
                    // After a firmware update, we need to refresh the node info
                    waitForWakeup: false,
                });
            }, waitTime * 1000).unref());
        }
        else {
            this.controllerLog.logNode(node.id, `Firmware updated. No restart or re-interview required. Refreshing version information in ${waitTime} seconds...`);
            await (0, async_1.wait)(waitTime * 1000, true);
            try {
                const versionAPI = node.commandClasses.Version;
                await versionAPI.get();
                if (versionAPI.supportsCommand(cc_1.VersionCommand.CapabilitiesGet)) {
                    await versionAPI.getCapabilities();
                }
                if (versionAPI.supportsCommand(cc_1.VersionCommand.ZWaveSoftwareGet)) {
                    await versionAPI.getZWaveSoftware();
                }
            }
            catch {
                // ignore
            }
        }
    }
    /** Checks if there are any pending messages for the given node */
    hasPendingMessages(node) {
        // First check if there are messages in the queue
        if (this.hasPendingTransactions((t) => t.message.getNodeId() === node.id)) {
            return true;
        }
        // Then check if there are scheduled polls
        return node.scheduledPolls.size > 0;
    }
    /** Checks if there are any pending transactions that match the given predicate */
    hasPendingTransactions(predicate) {
        const { queue, activeTransactions } = this.sendThread.state.context;
        if (!!queue.find((t) => predicate(t)))
            return true;
        for (const { transaction } of activeTransactions.values()) {
            if (predicate(transaction))
                return true;
        }
        return false;
    }
    /**
     * Retrieves the maximum version of a command class the given endpoint supports.
     * Returns 0 when the CC is not supported. Also returns 0 when the node was not found.
     * Falls back to querying the root endpoint if an endpoint was not found on the node
     *
     * @param cc The command class whose version should be retrieved
     * @param nodeId The node for which the CC version should be retrieved
     * @param endpointIndex The endpoint in question
     */
    getSupportedCCVersionForEndpoint(cc, nodeId, endpointIndex = 0) {
        if (!this._controller?.nodes.has(nodeId)) {
            return 0;
        }
        const node = this.controller.nodes.get(nodeId);
        const endpoint = node.getEndpoint(endpointIndex);
        if (endpoint)
            return endpoint.getCCVersion(cc);
        // We sometimes receive messages from an endpoint, but can't find that endpoint.
        // In that case fall back to the root endpoint to determine the supported version.
        return node.getCCVersion(cc);
    }
    /**
     * Retrieves the maximum version of a command class that can be used to communicate with a node.
     * Returns the highest implemented version if the node's CC version is unknown.
     * Throws if the CC is not implemented in this library yet.
     *
     * @param cc The command class whose version should be retrieved
     * @param nodeId The node for which the CC version should be retrieved
     * @param endpointIndex The endpoint for which the CC version should be retrieved
     */
    getSafeCCVersionForNode(cc, nodeId, endpointIndex = 0) {
        const supportedVersion = this.getSupportedCCVersionForEndpoint(cc, nodeId, endpointIndex);
        if (supportedVersion === 0) {
            // Unknown, use the highest implemented version
            const implementedVersion = (0, cc_1.getImplementedVersion)(cc);
            if (implementedVersion !== 0 &&
                implementedVersion !== Number.POSITIVE_INFINITY) {
                return implementedVersion;
            }
        }
        else {
            // For supported versions find the maximum version supported by both the
            // node and this library
            const implementedVersion = (0, cc_1.getImplementedVersion)(cc);
            if (implementedVersion !== 0 &&
                implementedVersion !== Number.POSITIVE_INFINITY) {
                return Math.min(supportedVersion, implementedVersion);
            }
        }
        throw new core_1.ZWaveError("Cannot retrieve the version of a CC that is not implemented", core_1.ZWaveErrorCodes.CC_NotSupported);
    }
    /**
     * Determines whether a CC must be secure for a given node and endpoint.
     *
     * @param ccId The command class in question
     * @param nodeId The node for which the CC security should be determined
     * @param endpointIndex The endpoint for which the CC security should be determined
     */
    isCCSecure(ccId, nodeId, endpointIndex = 0) {
        // This is obvious
        if (ccId === core_1.CommandClasses.Security ||
            ccId === core_1.CommandClasses["Security 2"]) {
            return true;
        }
        const node = this.controller.nodes.get(nodeId);
        // Node is unknown, don't use secure communication
        if (!node)
            return false;
        const endpoint = node.getEndpoint(endpointIndex);
        const securityClass = node.getHighestSecurityClass();
        // Node is not secure, don't use secure communication
        if (securityClass === undefined || securityClass === core_1.SecurityClass.None)
            return false;
        // Special case for Basic CC, which we sometimes hide:
        // A securely included node MAY support the Basic Command Class at the highest security level but it
        // MUST NOT support the Basic Command Class at any lower security level or non-securely.
        const isBasicCC = ccId === core_1.CommandClasses.Basic;
        // Security S2 specs also mandate that all non-securely supported CCs MUST also be supported securely
        // so we can just shortcut if the node is using S2
        if ((0, core_1.securityClassIsS2)(securityClass)) {
            // Use secure communication if the CC is supported. This avoids silly things like S2-encapsulated pings
            return (!!this.securityManager2 &&
                (isBasicCC || (endpoint ?? node).supportsCC(ccId)));
        }
        // Security S0 can be a little more complicated, with secure and non-secure endpoints
        if (securityClass === core_1.SecurityClass.S0_Legacy) {
            // Therefore actually check if the CC is marked as secure
            return (!!this.securityManager &&
                (isBasicCC || (endpoint ?? node).isCCSecure(ccId)));
        }
        // We shouldn't be here
        return false;
    }
    /** @internal Required for ZWaveApplicationHost */
    schedulePoll(nodeId, valueId, options) {
        const node = this.controller.nodes.getOrThrow(nodeId);
        return node.schedulePoll(valueId, options);
    }
    maySoftReset() {
        // If we've previously determined a stick not to support soft reset, don't bother trying again
        const supportsSoftReset = this._networkCache.get(NetworkCache_1.cacheKeys.controller.supportsSoftReset);
        if (supportsSoftReset === false)
            return false;
        // Blacklist some sticks that are known to not support soft reset
        const { manufacturerId, productType, productId } = this.controller;
        // Z-Wave.me UZB1
        if (manufacturerId === 0x0115 &&
            productType === 0x0000 &&
            productId === 0x0000) {
            return false;
        }
        // Z-Wave.me UZB
        if (manufacturerId === 0x0115 &&
            productType === 0x0400 &&
            productId === 0x0001) {
            return false;
        }
        // Vision Gen5 USB Stick
        if (manufacturerId === 0x0109 &&
            productType === 0x1001 &&
            productId === 0x0201
        // firmware version 15.1 (GH#3730)
        ) {
            return false;
        }
        return true;
    }
    /**
     * Soft-resets the controller if the feature is enabled
     */
    async trySoftReset() {
        if (this.options.enableSoftReset && this.maySoftReset()) {
            await this.softReset();
        }
        else {
            const message = `The soft reset feature is not enabled, skipping API call.`;
            this.controllerLog.print(message, "warn");
        }
    }
    /**
     * Instruct the controller to soft-reset.
     *
     * **Warning:** USB modules will reconnect, meaning that they might get a new address.
     *
     * **Warning:** This call will throw if soft-reset is not enabled.
     */
    async softReset() {
        if (!this.options.enableSoftReset) {
            const message = `The soft reset feature has been disabled with a config option or the ZWAVEJS_DISABLE_SOFT_RESET environment variable.`;
            this.controllerLog.print(message, "error");
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.Driver_FeatureDisabled);
        }
        if (this._controller?.isAnyOTAFirmwareUpdateInProgress()) {
            const message = `Failed to soft reset controller: A firmware update is in progress on this network.`;
            this.controllerLog.print(message, "error");
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy);
        }
        return this.softResetInternal(true);
    }
    async softResetInternal(destroyOnError) {
        this.controllerLog.print("Performing soft reset...");
        try {
            this.isSoftResetting = true;
            await this.sendMessage(new SoftResetRequest_1.SoftResetRequest(this), {
                supportCheck: false,
                pauseSendThread: true,
            });
        }
        catch (e) {
            this.controllerLog.print(`Soft reset failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
        }
        // Make sure we're able to communicate with the controller again
        if (!(await this.ensureSerialAPI())) {
            if (destroyOnError) {
                await this.destroy();
            }
            else {
                throw new core_1.ZWaveError("The Serial API did not respond after soft-reset", core_1.ZWaveErrorCodes.Driver_Failed);
            }
        }
        this.isSoftResetting = false;
        // This is a bit hacky, but what the heck...
        if (!this._enteringBootloader) {
            // Resume sending
            this.unpauseSendThread();
            // Soft-resetting disables any ongoing inclusion, so we need to reset
            // the state that is tracked in the controller
            this._controller?.setInclusionState(Inclusion_1.InclusionState.Idle);
        }
    }
    /** @internal */
    async softResetAndRestart(restartLogMessage, restartReason) {
        this.controllerLog.print("Performing soft reset...");
        try {
            this.isSoftResetting = true;
            await this.sendMessage(new SoftResetRequest_1.SoftResetRequest(this), {
                supportCheck: false,
                pauseSendThread: true,
            });
        }
        catch (e) {
            this.controllerLog.print(`Soft reset failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
        }
        this.isSoftResetting = false;
        this.controllerLog.print(restartLogMessage);
        await this.destroy();
        // Let the async calling context finish before emitting the error
        process.nextTick(() => {
            this.emit("error", new core_1.ZWaveError(restartReason, core_1.ZWaveErrorCodes.Driver_Failed));
        });
    }
    async ensureSerialAPI() {
        // Wait 1.5 seconds after reset to ensure that the module is ready for communication again
        // Z-Wave 700 sticks are relatively fast, so we also wait for the Serial API started command
        // to bail early
        this.controllerLog.print("Waiting for the controller to reconnect...");
        let waitResult = await this.waitForMessage((msg) => msg.functionType === serial_1.FunctionType.SerialAPIStarted, 1500).catch(() => false);
        if (waitResult) {
            // Serial API did start, maybe do something with the information?
            this.controllerLog.print("reconnected and restarted");
            return true;
        }
        // If the controller disconnected the serial port during the soft reset, we need to re-open it
        if (!this.serial.isOpen) {
            this.controllerLog.print("Re-opening serial port...");
            try {
                await this.openSerialport();
            }
            catch {
                return false;
            }
        }
        // Wait the configured amount of time for the Serial API started command to be received
        this.controllerLog.print("Waiting for the Serial API to start...");
        waitResult = await this.waitForMessage((msg) => {
            return msg.functionType === serial_1.FunctionType.SerialAPIStarted;
        }, this.options.timeouts.serialAPIStarted).catch(() => false);
        if (waitResult) {
            // Serial API did start, maybe do something with the information?
            this.controllerLog.print("Serial API started");
            return true;
        }
        this.controllerLog.print("Did not receive notification that Serial API has started, checking if it responds...");
        // We don't need to use any specific command here. However we're going to use this one in the interview
        // anyways, so we might aswell use it here too
        const pollController = async () => {
            try {
                // And resume sending - this requires us to unpause the send thread
                this.unpauseSendThread();
                await this.sendMessage(new GetControllerVersionMessages_1.GetControllerVersionRequest(this), {
                    supportCheck: false,
                });
                this.pauseSendThread();
                this.controllerLog.print("Serial API responded");
                return true;
            }
            catch {
                return false;
            }
        };
        // Poll the controller with increasing backoff delay
        if (await pollController())
            return true;
        for (const backoff of [2, 5, 10, 15]) {
            this.controllerLog.print(`Serial API did not respond, trying again in ${backoff} seconds...`);
            await (0, async_1.wait)(backoff * 1000);
            if (await pollController())
                return true;
        }
        this.controllerLog.print("Serial API did not respond, giving up", "error");
        return false;
    }
    /**
     * Performs a hard reset on the controller. This wipes out all configuration!
     *
     * The returned Promise resolves when the hard reset has been performed.
     * It does not wait for the initialization process which is started afterwards.
     */
    async hardReset() {
        this.ensureReady(true);
        if (this.controller.isAnyOTAFirmwareUpdateInProgress()) {
            const message = `Failed to hard reset controller: A firmware update is in progress on this network.`;
            this.controllerLog.print(message, "error");
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy);
        }
        // Update the controller NIF prior to hard resetting
        await this.controller.setControllerNIF();
        await this.controller.hardReset();
        // Clean up
        this.rejectTransactions(() => true, `The controller was hard-reset`);
        this.sendNodeToSleepTimers.forEach((timeout) => clearTimeout(timeout));
        this.sendNodeToSleepTimers.clear();
        this.retryNodeInterviewTimeouts.forEach((timeout) => clearTimeout(timeout));
        this.retryNodeInterviewTimeouts.clear();
        this.autoRefreshNodeValueTimers.forEach((timeout) => clearTimeout(timeout));
        this.autoRefreshNodeValueTimers.clear();
        if (this.pollBackgroundRSSITimer) {
            clearTimeout(this.pollBackgroundRSSITimer);
            this.pollBackgroundRSSITimer = undefined;
        }
        this._controllerInterviewed = false;
        void this.initializeControllerAndNodes();
    }
    /**
     * Instructs the Z-Wave API to shut down in order to safely remove the power.
     * This will destroy the driver instance if it succeeds.
     */
    async shutdown() {
        this.ensureReady(true);
        // Not a good idea to abort firmware updates this way
        if (this.controller.isAnyOTAFirmwareUpdateInProgress()) {
            const message = `Failed to shut down controller: A firmware update is in progress on this network.`;
            this.controllerLog.print(message, "error");
            throw new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.FirmwareUpdateCC_NetworkBusy);
        }
        const result = await this.controller.shutdown();
        try {
            if (result)
                await this.destroy();
        }
        finally {
            return result;
        }
    }
    get wasDestroyed() {
        return !!this._destroyPromise;
    }
    /**
     * Ensures that the driver is ready to communicate (serial port open and not destroyed).
     * If desired, also checks that the controller interview has been completed.
     */
    ensureReady(includingController = false) {
        if (!this._wasStarted || !this._isOpen || this.wasDestroyed) {
            throw new core_1.ZWaveError("The driver is not ready or has been destroyed", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        if (includingController && !this._controllerInterviewed) {
            throw new core_1.ZWaveError("The controller is not ready yet", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        if (this._bootloader) {
            throw new core_1.ZWaveError("Cannot do this while in bootloader mode", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
    }
    /** Indicates whether the driver is ready, i.e. the "driver ready" event was emitted */
    get ready() {
        return (this._wasStarted &&
            this._isOpen &&
            !this.wasDestroyed &&
            this._controllerInterviewed);
    }
    /**
     * Terminates the driver instance and closes the underlying serial connection.
     * Must be called under any circumstances.
     */
    async destroy() {
        // Ensure this is only called once and all subsequent calls block
        if (this._destroyPromise)
            return this._destroyPromise;
        this._destroyPromise = (0, deferred_promise_1.createDeferredPromise)();
        this.driverLog.print("destroying driver instance...");
        // First stop the send thread machine and close the serial port, so nothing happens anymore
        if (this.sendThread.initialized)
            this.sendThread.stop();
        if (this.serial != undefined) {
            // Avoid spewing errors if the port was in the middle of receiving something
            this.serial.removeAllListeners();
            if (this.serial.isOpen)
                await this.serial.close();
            this.serial = undefined;
        }
        // Attempt to close the value DBs and network cache
        try {
            await this._valueDB?.close();
        }
        catch (e) {
            this.driverLog.print(`Closing the value DB failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
        }
        try {
            await this._metadataDB?.close();
        }
        catch (e) {
            this.driverLog.print(`Closing the metadata DB failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
        }
        try {
            await this._networkCache?.close();
        }
        catch (e) {
            this.driverLog.print(`Closing the network cache failed: ${(0, shared_1.getErrorMessage)(e)}`, "error");
        }
        // Remove all timeouts
        for (const timeout of [
            this.saveToCacheTimer,
            ...this.sendNodeToSleepTimers.values(),
            ...this.retryNodeInterviewTimeouts.values(),
            ...this.autoRefreshNodeValueTimers.values(),
            this.statisticsTimeout,
            this.pollBackgroundRSSITimer,
            ...this.awaitedCommands.map((c) => c.timeout),
            ...this.awaitedMessages.map((m) => m.timeout),
            ...this.awaitedBootloaderChunks.map((b) => b.timeout),
        ]) {
            if (timeout)
                clearTimeout(timeout);
        }
        // Destroy all nodes and the controller
        if (this._controller) {
            this._controller.nodes.forEach((n) => n.destroy());
            this._controller.nodes.clear();
            this._controller.removeAllListeners();
            this._controller = undefined;
        }
        this.driverLog.print(`driver instance destroyed`);
        // destroy loggers as the very last thing
        this._logContainer.destroy();
        this._destroyPromise.resolve();
    }
    /**
     * Is called when the serial port has received a single-byte message or a complete message buffer
     */
    async serialport_onData(data) {
        if (typeof data === "number") {
            switch (data) {
                // single-byte messages - just forward them to the send thread
                case serial_1.MessageHeaders.ACK: {
                    this.sendThread.send("ACK");
                    return;
                }
                case serial_1.MessageHeaders.NAK: {
                    this.sendThread.send("NAK");
                    this._controller?.incrementStatistics("NAK");
                    return;
                }
                case serial_1.MessageHeaders.CAN: {
                    this.sendThread.send("CAN");
                    this._controller?.incrementStatistics("CAN");
                    return;
                }
            }
        }
        let msg;
        try {
            // Parse the message while remembering potential decoding errors in embedded CCs
            // This way we can log the invalid CC contents
            msg = serial_1.Message.from(this, {
                data,
                sdkVersion: this._controller?.sdkVersion,
            });
            // Ensure there are no errors
            if ((0, cc_1.isCommandClassContainer)(msg))
                (0, cc_1.assertValidCCs)(msg);
            // And update statistics
            if (!!this._controller) {
                if ((0, cc_1.isCommandClassContainer)(msg)) {
                    this.getNodeUnsafe(msg)?.incrementStatistics("commandsRX");
                }
                else {
                    this._controller.incrementStatistics("messagesRX");
                }
            }
            // all good, send ACK
            await this.writeHeader(serial_1.MessageHeaders.ACK);
        }
        catch (e) {
            try {
                if (await this.handleSecurityS2DecodeError(e, msg)) {
                    // TODO
                }
                else {
                    const response = this.handleDecodeError(e, data, msg);
                    if (response)
                        await this.writeHeader(response);
                    if (!!this._controller) {
                        if ((0, cc_1.isCommandClassContainer)(msg)) {
                            this.getNodeUnsafe(msg)?.incrementStatistics("commandsDroppedRX");
                            // Figure out if the command was received with supervision encapsulation
                            const supervisionSessionId = cc_1.SupervisionCC.getSessionId(msg.command);
                            if (supervisionSessionId !== undefined &&
                                msg.command instanceof cc_1.InvalidCC) {
                                // If it was, we need to notify the sender that we couldn't decode the command
                                const node = this.getNodeUnsafe(msg);
                                if (node) {
                                    const endpoint = node.getEndpoint(msg.command.endpointIndex) ?? node;
                                    await endpoint
                                        .createAPI(core_1.CommandClasses.Supervision, false)
                                        .sendReport({
                                        sessionId: supervisionSessionId,
                                        moreUpdatesFollow: false,
                                        status: core_1.SupervisionStatus.NoSupport,
                                        requestWakeUpOnDemand: this.shouldRequestWakeupOnDemand(node),
                                        encapsulationFlags: msg.command.encapsulationFlags,
                                    });
                                }
                                return;
                            }
                        }
                        else {
                            this._controller.incrementStatistics("messagesDroppedRX");
                        }
                    }
                }
            }
            catch (ee) {
                if (ee instanceof Error) {
                    if (/serial port is not open/.test(ee.message)) {
                        this.emit("error", ee);
                        void this.destroy();
                        return;
                    }
                    // Print something, so we know what is wrong
                    this._driverLog.print(ee.stack ?? ee.message, "error");
                }
            }
            // Don't keep handling the message
            msg = undefined;
        }
        // If the message could be decoded, forward it to the send thread
        if (msg) {
            let wasMessageLogged = false;
            if ((0, cc_1.isCommandClassContainer)(msg)) {
                // SecurityCCCommandEncapsulationNonceGet is two commands in one, but
                // we're not set up to handle things like this. Reply to the nonce get
                // and handle the encapsulation part normally
                if (msg.command instanceof
                    cc_1.SecurityCCCommandEncapsulationNonceGet) {
                    void this.getNodeUnsafe(msg)?.handleSecurityNonceGet();
                }
                // Transport Service commands must be handled before assembling partial CCs
                if ((0, cc_1.isTransportServiceEncapsulation)(msg.command)) {
                    // Log Transport Service commands before doing anything else
                    this.driverLog.logMessage(msg, {
                        secondaryTags: ["partial"],
                        direction: "inbound",
                    });
                    wasMessageLogged = true;
                    void this.handleTransportServiceCommand(msg.command).catch(() => {
                        // Don't care about errors in incoming transport service commands
                    });
                }
                // Assemble partial CCs on the driver level. Only forward complete messages to the send thread machine
                if (!this.assemblePartialCCs(msg))
                    return;
                // Make sure we are allowed to handle this command
                if (this.shouldDiscardCC(msg.command)) {
                    if (!wasMessageLogged) {
                        this.driverLog.logMessage(msg, {
                            direction: "inbound",
                            secondaryTags: ["discarded"],
                        });
                    }
                    return;
                }
                // When we have a complete CC, save its values
                try {
                    this.persistCCValues(msg.command);
                }
                catch (e) {
                    // Indicate invalid payloads with a special CC type
                    if ((0, core_1.isZWaveError)(e) &&
                        e.code === core_1.ZWaveErrorCodes.PacketFormat_InvalidPayload) {
                        this.driverLog.print(`dropping CC with invalid values${typeof e.context === "string"
                            ? ` (Reason: ${e.context})`
                            : ""}`, "warn");
                        // TODO: We may need to do the S2 MOS dance here - or we can deal with it when the next valid CC arrives
                        return;
                    }
                    else {
                        throw e;
                    }
                }
                // Transport Service CC can be eliminated from the encapsulation stack, since it is always the outermost CC
                if ((0, cc_1.isTransportServiceEncapsulation)(msg.command)) {
                    msg.command = msg.command.encapsulated;
                    // Now we do want to log the command again, so we can see what was inside
                    wasMessageLogged = false;
                }
            }
            try {
                if (!wasMessageLogged) {
                    this.driverLog.logMessage(msg, {
                        direction: "inbound",
                    });
                }
                if (process.env.NODE_ENV !== "test") {
                    // Enrich error data in case something goes wrong
                    Sentry.addBreadcrumb({
                        category: "message",
                        timestamp: Date.now() / 1000,
                        type: "debug",
                        data: {
                            direction: "inbound",
                            msgType: msg.type,
                            functionType: msg.functionType,
                            name: msg.constructor.name,
                            nodeId: msg.getNodeId(),
                            ...msg.toLogEntry(),
                        },
                    });
                }
            }
            catch (e) {
                // We shouldn't throw just because logging a message fails
                this.driverLog.print(`Logging a message failed: ${(0, shared_1.getErrorMessage)(e)}`);
            }
            this.sendThread.send({ type: "message", message: msg });
        }
    }
    /** Handles a decoding error and returns the desired reply to the stick */
    handleDecodeError(e, data, msg) {
        if ((0, core_1.isZWaveError)(e)) {
            switch (e.code) {
                case core_1.ZWaveErrorCodes.PacketFormat_Invalid:
                case core_1.ZWaveErrorCodes.PacketFormat_Checksum:
                case core_1.ZWaveErrorCodes.PacketFormat_Truncated:
                    this.driverLog.print(`Dropping message because it contains invalid data`, "warn");
                    return serial_1.MessageHeaders.NAK;
                case core_1.ZWaveErrorCodes.Deserialization_NotImplemented:
                case core_1.ZWaveErrorCodes.CC_NotImplemented:
                    this.driverLog.print(`Dropping message because it could not be deserialized: ${e.message}`, "warn");
                    return serial_1.MessageHeaders.ACK;
                case core_1.ZWaveErrorCodes.Driver_NotReady:
                    this.driverLog.print(`Dropping message because the driver is not ready to handle it yet.`, "warn");
                    return serial_1.MessageHeaders.ACK;
                case core_1.ZWaveErrorCodes.PacketFormat_InvalidPayload:
                    if (msg) {
                        this.driverLog.print(`Dropping message with invalid payload`, "warn");
                        try {
                            this.driverLog.logMessage(msg, {
                                direction: "inbound",
                            });
                        }
                        catch (e) {
                            // We shouldn't throw just because logging a message fails
                            this.driverLog.print(`Logging a message failed: ${(0, shared_1.getErrorMessage)(e)}`);
                        }
                    }
                    else {
                        this.driverLog.print(`Dropping message with invalid payload${typeof e.context === "string"
                            ? ` (Reason: ${e.context})`
                            : ""}:
0x${data.toString("hex")}`, "warn");
                    }
                    return serial_1.MessageHeaders.ACK;
                case core_1.ZWaveErrorCodes.Driver_NoSecurity:
                case core_1.ZWaveErrorCodes.Security2CC_NotInitialized:
                    this.driverLog.print(`Dropping message because network keys are not set or the driver is not yet ready to receive secure messages.`, "warn");
                    return serial_1.MessageHeaders.ACK;
            }
        }
        else {
            if (/database is not open/.test(e.message)) {
                // The JSONL-DB is not open yet
                this.driverLog.print(`Dropping message because the driver is not ready to handle it yet.`, "warn");
                return serial_1.MessageHeaders.ACK;
            }
        }
        // Pass all other errors through
        throw e;
    }
    mustReplyWithSecurityS2MOS(msg) {
        // We're looking for a singlecast S2-encapsulated request
        if (msg.frameType !== "singlecast")
            return false;
        const encapS2 = msg.command.getEncapsulatingCC(core_1.CommandClasses["Security 2"], cc_1.Security2Command.MessageEncapsulation);
        if (!encapS2)
            return false;
        // With the MGRP extension present
        const node = this.getNodeUnsafe(msg);
        const groupId = encapS2.getMulticastGroupId();
        if (node &&
            groupId != undefined &&
            // but where we don't have an MPAN stored
            this.securityManager2?.getPeerMPAN(msg.command.nodeId, groupId).type !== core_1.MPANState.MPAN) {
            return true;
        }
        return false;
    }
    async handleSecurityS2DecodeError(e, msg) {
        if (!(0, core_1.isZWaveError)(e))
            return false;
        if ((e.code === core_1.ZWaveErrorCodes.Security2CC_NoSPAN ||
            e.code === core_1.ZWaveErrorCodes.Security2CC_CannotDecode) &&
            (0, cc_1.isCommandClassContainer)(msg)) {
            // Decoding the command failed because no SPAN has been established with the other node
            const nodeId = msg.getNodeId();
            // If the node isn't known, ignore this error
            const node = this._controller?.nodes.get(nodeId);
            if (!node)
                return false;
            // Before we can send anything, ACK the command
            await this.writeHeader(serial_1.MessageHeaders.ACK);
            this.driverLog.logMessage(msg, { direction: "inbound" });
            node.incrementStatistics("commandsDroppedRX");
            // We might receive this before the node has been interviewed. If that case, we need to mark Security S2 as
            // supported or we won't ever be able to communicate with the node
            if (node.interviewStage < _Types_1.InterviewStage.NodeInfo) {
                node.addCC(core_1.CommandClasses["Security 2"], {
                    isSupported: true,
                    version: 1,
                });
            }
            // Ensure that we're not flooding the queue with unnecessary NonceReports
            const isS2NonceReport = (t) => t.message.getNodeId() === nodeId &&
                (0, cc_1.isCommandClassContainer)(t.message) &&
                t.message.command instanceof cc_1.Security2CCNonceReport;
            const message = e.code === core_1.ZWaveErrorCodes.Security2CC_CannotDecode
                ? "Message authentication failed"
                : "No SPAN is established yet";
            if (this.controller.bootstrappingS2NodeId === nodeId) {
                // The node is currently being bootstrapped.
                if (this.securityManager2?.tempKeys.has(nodeId)) {
                    // The DSK has been verified, so we should be able to decode this command.
                    // If this is the first attempt, we need to request a nonce first
                    if (this.securityManager2.getSPANState(nodeId).type ===
                        core_1.SPANState.None) {
                        this.controllerLog.logNode(nodeId, {
                            message: `${message}, cannot decode command. Requesting a nonce...`,
                            level: "verbose",
                            direction: "outbound",
                        });
                        // Send the node our nonce
                        node.commandClasses["Security 2"]
                            .sendNonce()
                            .catch(() => {
                            // Ignore errors
                        });
                    }
                    else {
                        // Us repeatedly not being able to decode the command means we need to abort the bootstrapping process
                        // because the PIN is wrong
                        this.controllerLog.logNode(nodeId, {
                            message: `${message}, cannot decode command. Aborting the S2 bootstrapping process...`,
                            level: "error",
                            direction: "inbound",
                        });
                        this.controller.cancelSecureBootstrapS2(cc_1.KEXFailType.BootstrappingCanceled);
                    }
                }
                else {
                    this.controllerLog.logNode(nodeId, {
                        message: `Ignoring KEXSet because the DSK has not been verified yet`,
                        level: "verbose",
                        direction: "inbound",
                    });
                }
            }
            else if (!this.hasPendingTransactions(isS2NonceReport)) {
                this.controllerLog.logNode(nodeId, {
                    message: `${message}, cannot decode command. Requesting a nonce...`,
                    level: "verbose",
                    direction: "outbound",
                });
                // Send the node our nonce, and use the chance to re-sync the MPAN if necessary
                const s2MulticastOutOfSync = (msg instanceof ApplicationCommandRequest_1.ApplicationCommandRequest ||
                    msg instanceof BridgeApplicationCommandRequest_1.BridgeApplicationCommandRequest) &&
                    this.mustReplyWithSecurityS2MOS(msg);
                node.commandClasses["Security 2"]
                    .withOptions({ s2MulticastOutOfSync })
                    .sendNonce()
                    .catch(() => {
                    // Ignore errors
                });
            }
            else {
                this.controllerLog.logNode(nodeId, {
                    message: `${message}, cannot decode command.`,
                    level: "verbose",
                    direction: "none",
                });
            }
            return true;
        }
        else if (e.code === core_1.ZWaveErrorCodes.Security2CC_CannotDecodeMulticast &&
            (0, cc_1.isCommandClassContainer)(msg)) {
            // Decoding the command failed because the MPAN used by the other node
            // is not known to us yet
            const nodeId = msg.getNodeId();
            // If the node isn't known, ignore this error
            const node = this._controller?.nodes.get(nodeId);
            if (!node)
                return false;
            // Before we can send anything, ACK the command
            await this.writeHeader(serial_1.MessageHeaders.ACK);
            this.driverLog.logMessage(msg, { direction: "inbound" });
            node.incrementStatistics("commandsDroppedRX");
            this.controllerLog.logNode(nodeId, {
                message: `Cannot decode S2 multicast command, since MPAN is not known yet. Will attempt re-sync after the next singlecast.`,
                level: "verbose",
            });
            return true;
        }
        return false;
    }
    /** Checks if a transaction failed because a node didn't respond in time */
    isMissingNodeACK(transaction, e) {
        return (
        // If the node does not acknowledge our request, it is either asleep or dead
        e.code === core_1.ZWaveErrorCodes.Controller_CallbackNOK &&
            (transaction.message instanceof SendDataMessages_1.SendDataRequest ||
                transaction.message instanceof SendDataBridgeMessages_1.SendDataBridgeRequest));
    }
    /**
     * @internal
     * Handles the case that a node failed to respond in time.
     * Returns `true` if the transaction failure was handled, `false` if it needs to be rejected.
     */
    handleMissingNodeACK(transaction) {
        const node = this.getNodeUnsafe(transaction.message);
        if (!node)
            return false; // This should never happen, but whatever
        const messagePart1 = (0, SendDataShared_1.isSendData)(transaction.message)
            ? `The node did not respond after ${transaction.message.maxSendAttempts} attempts`
            : `The node did not respond`;
        if (!transaction.changeNodeStatusOnTimeout) {
            // The sender of this transaction doesn't want it to change the status of the node
            return false;
        }
        else if (node.canSleep) {
            this.controllerLog.logNode(node.id, `${messagePart1}. It is probably asleep, moving its messages to the wakeup queue.`, "warn");
            // Mark the node as asleep
            // The handler for the asleep status will move the messages to the wakeup queue
            node.markAsAsleep();
            return this.mayMoveToWakeupQueue(transaction);
        }
        else {
            const errorMsg = `${messagePart1}, it is presumed dead`;
            this.controllerLog.logNode(node.id, errorMsg, "warn");
            node.markAsDead();
            this.rejectAllTransactionsForNode(node.id, errorMsg);
            // The above call will reject the transaction, no need to do it again
            return false;
        }
    }
    shouldRequestWakeupOnDemand(node) {
        return (!!node.supportsWakeUpOnDemand &&
            node.status === _Types_1.NodeStatus.Asleep &&
            this.hasPendingTransactions((t) => t.requestWakeUpOnDemand &&
                t.message.getNodeId() === node.id));
    }
    getPartialCCSession(command, createIfMissing) {
        const sessionId = command.getPartialCCSessionId();
        if (sessionId) {
            // This CC belongs to a partial session
            const partialSessionKey = JSON.stringify({
                nodeId: command.nodeId,
                ccId: command.ccId,
                ccCommand: command.ccCommand,
                ...sessionId,
            });
            if (createIfMissing &&
                !this.partialCCSessions.has(partialSessionKey)) {
                this.partialCCSessions.set(partialSessionKey, []);
            }
            return {
                partialSessionKey,
                session: this.partialCCSessions.get(partialSessionKey),
            };
        }
    }
    /**
     * Assembles partial CCs of in a message body. Returns `true` when the message is complete and can be handled further.
     * If the message expects another partial one, this returns `false`.
     */
    assemblePartialCCs(msg) {
        let command = msg.command;
        // We search for the every CC that provides us with a session ID
        // There might be newly-completed CCs that contain a partial CC,
        // so investigate the entire CC encapsulation stack.
        while (true) {
            const { partialSessionKey, session } = this.getPartialCCSession(command, true) ?? {};
            if (session) {
                // This CC belongs to a partial session
                if (command.expectMoreMessages(session)) {
                    // this is not the final one, store it
                    session.push(command);
                    if (!(0, cc_1.isTransportServiceEncapsulation)(msg.command)) {
                        // and don't handle the command now
                        this.driverLog.logMessage(msg, {
                            secondaryTags: ["partial"],
                            direction: "inbound",
                        });
                    }
                    return false;
                }
                else {
                    // this is the final one, merge the previous responses
                    this.partialCCSessions.delete(partialSessionKey);
                    try {
                        command.mergePartialCCs(this, session);
                        // Ensure there are no errors
                        (0, cc_1.assertValidCCs)(msg);
                    }
                    catch (e) {
                        if ((0, core_1.isZWaveError)(e)) {
                            switch (e.code) {
                                case core_1.ZWaveErrorCodes.Deserialization_NotImplemented:
                                case core_1.ZWaveErrorCodes.CC_NotImplemented:
                                    this.driverLog.print(`Dropping message because it could not be deserialized: ${e.message}`, "warn");
                                    // Don't continue handling this message
                                    return false;
                                case core_1.ZWaveErrorCodes.PacketFormat_InvalidPayload:
                                    this.driverLog.print(`Could not assemble partial CCs because the payload is invalid. Dropping them.`, "warn");
                                    // Don't continue handling this message
                                    return false;
                                case core_1.ZWaveErrorCodes.Driver_NotReady:
                                    this.driverLog.print(`Could not assemble partial CCs because the driver is not ready yet. Dropping them`, "warn");
                                    // Don't continue handling this message
                                    return false;
                            }
                        }
                        throw e;
                    }
                    // Assembling this CC was successful - but it might contain another partial CC
                }
            }
            else {
                // No partial CC, just continue
            }
            // If this is an encapsulating CC, we need to look one level deeper
            if ((0, cc_1.isEncapsulatingCommandClass)(command)) {
                command = command.encapsulated;
            }
            else {
                break;
            }
        }
        return true;
    }
    /** Is called when a Transport Service command is received */
    async handleTransportServiceCommand(command) {
        const nodeSessions = this.ensureNodeSessions(command.nodeId);
        // If this command belongs to an existing session, just forward it to the state machine
        const transportSession = nodeSessions.transportService.get(command.sessionId);
        if (command instanceof cc_1.TransportServiceCCFirstSegment) {
            // This is the first message in a sequence. Create or re-initialize the session
            // We don't delete finished sessions when the last message is received in order to be able to
            // handle when the SegmentComplete message gets lost. As soon as the node initializes a new session,
            // we do know that the previous one is finished.
            if (transportSession) {
                transportSession.interpreter.stop();
            }
            nodeSessions.transportService.clear();
            this.controllerLog.logNode(command.nodeId, {
                message: `Beginning Transport Service RX session #${command.sessionId}...`,
                level: "debug",
                direction: "inbound",
            });
            const RXStateMachine = (0, TransportServiceMachine_1.createTransportServiceRXMachine)({
                requestMissingSegment: async (index) => {
                    this.controllerLog.logNode(command.nodeId, {
                        message: `Transport Service RX session #${command.sessionId}: Segment ${index} missing - requesting it...`,
                        level: "debug",
                        direction: "outbound",
                    });
                    const cc = new cc_1.TransportServiceCCSegmentRequest(this, {
                        nodeId: command.nodeId,
                        sessionId: command.sessionId,
                        datagramOffset: index * transportSession.fragmentSize,
                    });
                    await this.sendCommand(cc, {
                        maxSendAttempts: 1,
                        priority: core_1.MessagePriority.Nonce,
                    });
                },
                sendSegmentsComplete: async () => {
                    this.controllerLog.logNode(command.nodeId, {
                        message: `Transport Service RX session #${command.sessionId} complete`,
                        level: "debug",
                        direction: "outbound",
                    });
                    const cc = new cc_1.TransportServiceCCSegmentComplete(this, {
                        nodeId: command.nodeId,
                        sessionId: command.sessionId,
                    });
                    await this.sendCommand(cc, {
                        maxSendAttempts: 1,
                        priority: core_1.MessagePriority.Nonce,
                    });
                },
            }, {
                // TODO: Figure out how to know which timeout is the correct one. For now use the larger one
                missingSegmentTimeout: cc_1.TransportServiceTimeouts.requestMissingSegmentR2,
                numSegments: Math.ceil(command.datagramSize / command.partialDatagram.length),
            });
            const interpreter = (0, xstate_1.interpret)(RXStateMachine).start();
            nodeSessions.transportService.set(command.sessionId, {
                fragmentSize: command.partialDatagram.length,
                interpreter,
            });
            interpreter.onTransition((state) => {
                if (state.changed && state.value === "failure") {
                    this.controllerLog.logNode(command.nodeId, {
                        message: `Transport Service RX session #${command.sessionId} failed`,
                        level: "error",
                        direction: "none",
                    });
                    // TODO: Update statistics
                    interpreter.stop();
                    nodeSessions.transportService.delete(command.sessionId);
                }
            });
        }
        else {
            // This is a subsequent message in a sequence. Just forward it to the state machine if there is one
            if (transportSession) {
                transportSession.interpreter.send({
                    type: "segment",
                    index: Math.floor(command.datagramOffset / transportSession.fragmentSize),
                });
            }
            else {
                // This belongs to a session we don't know... tell the sending node to try again
                const cc = new cc_1.TransportServiceCCSegmentWait(this, {
                    nodeId: command.nodeId,
                    pendingSegments: 0,
                });
                await this.sendCommand(cc, {
                    maxSendAttempts: 1,
                    priority: core_1.MessagePriority.Nonce,
                });
            }
        }
    }
    /**
     * Is called when a message is received that does not belong to any ongoing transactions
     * @param msg The decoded message
     */
    async handleUnsolicitedMessage(msg) {
        if (msg.type === serial_1.MessageType.Request) {
            // This is a request we might have registered handlers for
            try {
                await this.handleRequest(msg);
            }
            catch (e) {
                if ((0, core_1.isZWaveError)(e) &&
                    e.code === core_1.ZWaveErrorCodes.Driver_NotReady) {
                    this.driverLog.print(`Cannot handle message because the driver is not ready to handle it yet.`, "warn");
                }
                else {
                    throw e;
                }
            }
        }
        else {
            this.driverLog.transactionResponse(msg, undefined, "unexpected");
            this.driverLog.print("unexpected response, discarding...", "warn");
        }
    }
    /**
     * Registers a handler for messages that are not handled by the driver as part of a message exchange.
     * The handler function needs to return a boolean indicating if the message has been handled.
     * Registered handlers are called in sequence until a handler returns `true`.
     *
     * @param fnType The function type to register the handler for
     * @param handler The request handler callback
     * @param oneTime Whether the handler should be removed after its first successful invocation
     */
    registerRequestHandler(fnType, handler, oneTime = false) {
        const handlers = this.requestHandlers.has(fnType)
            ? this.requestHandlers.get(fnType)
            : [];
        const entry = { invoke: handler, oneTime };
        handlers.push(entry);
        this.driverLog.print(`added${oneTime ? " one-time" : ""} request handler for ${serial_1.FunctionType[fnType]} (${(0, shared_1.num2hex)(fnType)})...
${handlers.length} registered`);
        this.requestHandlers.set(fnType, handlers);
    }
    /**
     * Unregisters a message handler that has been added with `registerRequestHandler`
     * @param fnType The function type to unregister the handler for
     * @param handler The previously registered request handler callback
     */
    unregisterRequestHandler(fnType, handler) {
        const handlers = this.requestHandlers.has(fnType)
            ? this.requestHandlers.get(fnType)
            : [];
        for (let i = 0, entry = handlers[i]; i < handlers.length; i++) {
            // remove the handler if it was found
            if (entry.invoke === handler) {
                handlers.splice(i, 1);
                break;
            }
        }
        this.driverLog.print(`removed request handler for ${serial_1.FunctionType[fnType]} (${fnType})...
${handlers.length} left`);
        this.requestHandlers.set(fnType, handlers);
    }
    /**
     * Checks whether a CC may be handled or should be ignored.
     * This method expects `cc` to be unwrapped.
     */
    shouldDiscardCC(cc) {
        // For Command Classes supported securely, a controlling node MUST discard
        // the command from a supporting node if not received at the highest common
        // security level between the controlling node and the sending S2 node.
        const node = this.controller.nodes.get(cc.nodeId);
        if (!node) {
            // Node does not exist, don't accept the CC
            this.controllerLog.logNode(cc.nodeId, `is unknown - discarding received command...`, "warn");
            return true;
        }
        switch (node.getHighestSecurityClass()) {
            case core_1.SecurityClass.None:
            case core_1.SecurityClass.Temporary:
                return false;
        }
        let isSecure = false;
        let requiresSecurity = false;
        while (true) {
            if ((0, cc_1.isEncapsulatingCommandClass)(cc)) {
                if (cc.ccId === core_1.CommandClasses.Security ||
                    cc.ccId === core_1.CommandClasses["Security 2"]) {
                    isSecure = true;
                }
                cc = cc.encapsulated;
            }
            else if ((0, cc_1.isMultiEncapsulatingCommandClass)(cc)) {
                requiresSecurity = cc.encapsulated.some((cmd) => node.isCCSecure(cmd.ccId));
                break;
            }
            else {
                requiresSecurity =
                    node.isCCSecure(cc.ccId) &&
                        cc.ccId !== core_1.CommandClasses.Security &&
                        cc.ccId !== core_1.CommandClasses["Security 2"];
                break;
            }
        }
        if (requiresSecurity && !isSecure) {
            // none found, don't accept the CC
            this.controllerLog.logNode(cc.nodeId, `command must be encrypted but was received without Security encapsulation - discarding it...`, "warn");
            return true;
        }
        return false;
    }
    /**
     * Is called when a Request-type message was received
     */
    async handleRequest(msg) {
        let handlers;
        if ((0, serial_1.isNodeQuery)(msg) || (0, cc_1.isCommandClassContainer)(msg)) {
            const node = this.getNodeUnsafe(msg);
            if (node) {
                // We have received an unsolicited message from a dead node, bring it back to life
                if (node.status === _Types_1.NodeStatus.Dead) {
                    node.markAsAlive();
                }
            }
        }
        // Check if we have a dynamic handler waiting for this message
        for (const entry of this.awaitedMessages) {
            if (entry.predicate(msg)) {
                // We do
                entry.handler(msg);
                return;
            }
        }
        // It could also be that this is the node's response for a CC that we sent, but where the ACK is delayed
        if ((0, cc_1.isCommandClassContainer)(msg)) {
            const { activeTransactions } = this.sendThread.state.context;
            const pendingMessages = [...activeTransactions.values()]
                .map((t) => t.transaction.getCurrentMessage())
                .filter((m) => !!m);
            const msgExpectingUpdate = pendingMessages.find((sentMsg) => {
                return (sentMsg.expectsNodeUpdate() &&
                    sentMsg.isExpectedNodeUpdate(msg));
            });
            if (msgExpectingUpdate) {
                // Found a message that is still in progress but expects this message in response.
                // Remember the message there.
                this.controllerLog.logNode(msg.getNodeId(), {
                    message: `received expected response prematurely, remembering it...`,
                    level: "verbose",
                    direction: "inbound",
                });
                msgExpectingUpdate.prematureNodeUpdate = msg;
                return;
            }
        }
        if ((0, cc_1.isCommandClassContainer)(msg)) {
            // For further actions, we are only interested in the innermost CC
            this.unwrapCommands(msg);
        }
        // Otherwise go through the static handlers
        if (msg instanceof ApplicationCommandRequest_1.ApplicationCommandRequest ||
            msg instanceof BridgeApplicationCommandRequest_1.BridgeApplicationCommandRequest) {
            // we handle ApplicationCommandRequests differently because they are handled by the nodes directly
            const nodeId = msg.command.nodeId;
            // cannot handle ApplicationCommandRequests without a controller
            if (this._controller == undefined) {
                this.driverLog.print(`  the controller is not ready yet, discarding...`, "warn");
                return;
            }
            else if (!this.controller.nodes.has(nodeId)) {
                this.driverLog.print(`  the node is unknown or not initialized yet, discarding...`, "warn");
                return;
            }
            const node = this.controller.nodes.get(nodeId);
            const nodeSessions = this.nodeSessions.get(nodeId);
            // Check if we need to handle the command ourselves
            if (msg.command.ccId === core_1.CommandClasses["Device Reset Locally"] &&
                msg.command instanceof cc_1.DeviceResetLocallyCCNotification) {
                this.controllerLog.logNode(msg.command.nodeId, {
                    message: `The node was reset locally, removing it`,
                    direction: "inbound",
                });
                try {
                    await this.controller.removeFailedNode(msg.command.nodeId);
                }
                catch (e) {
                    this.controllerLog.logNode(msg.command.nodeId, {
                        message: `removing the node failed: ${(0, shared_1.getErrorMessage)(e)}`,
                        level: "error",
                    });
                }
            }
            else if (msg.command.ccId === core_1.CommandClasses.Supervision &&
                msg.command instanceof cc_1.SupervisionCCReport &&
                nodeSessions?.supervision.has(msg.command.sessionId)) {
                // Supervision commands are handled here
                this.controllerLog.logNode(msg.command.nodeId, {
                    message: `Received update for a Supervision session`,
                    direction: "inbound",
                });
                // Call the update handler
                nodeSessions.supervision.get(msg.command.sessionId)({
                    status: msg.command.status,
                    remainingDuration: msg.command.duration,
                });
                // If this was a final report, remove the handler
                if (!msg.command.moreUpdatesFollow) {
                    nodeSessions.supervision.delete(msg.command.sessionId);
                }
            }
            else {
                // Figure out if the command was received with supervision encapsulation and we need to respond accordingly
                const supervisionSessionId = cc_1.SupervisionCC.getSessionId(msg.command);
                // Figure out if this is an S2 multicast followup for a group that is out of sync
                const s2MulticastOutOfSync = this.mustReplyWithSecurityS2MOS(msg);
                const encapsulationFlags = msg.command.encapsulationFlags;
                let reply;
                if (supervisionSessionId != undefined) {
                    // The command was supervised, and we must respond with a Supervision Report
                    const endpoint = node.getEndpoint(msg.command.endpointIndex) ?? node;
                    reply = (success) => endpoint
                        .createAPI(core_1.CommandClasses.Supervision, false)
                        .withOptions({ s2MulticastOutOfSync })
                        .sendReport({
                        sessionId: supervisionSessionId,
                        moreUpdatesFollow: false,
                        status: success
                            ? core_1.SupervisionStatus.Success
                            : core_1.SupervisionStatus.Fail,
                        requestWakeUpOnDemand: this.shouldRequestWakeupOnDemand(node),
                        encapsulationFlags,
                    });
                }
                else {
                    // Unsupervised, reply is a no-op
                    reply = () => Promise.resolve();
                }
                // DO NOT force-add support for the Supervision CC here. Some devices only support Supervision when sending,
                // so we need to trust the information we already have.
                // In the case where the command was unsupervised and we need to send a MOS, do it as soon as possible
                if (supervisionSessionId == undefined && s2MulticastOutOfSync) {
                    // If the command was NOT received using Supervision,
                    // we need to respond with an MOS nonce. Otherwise we'll set the flag
                    // on the Supervision Report
                    node.commandClasses["Security 2"].sendMOS().catch(() => {
                        // Ignore errors
                    });
                }
                // check if someone is waiting for this command
                for (const entry of this.awaitedCommands) {
                    if (entry.predicate(msg.command)) {
                        // there is!
                        entry.handler(msg.command);
                        // and possibly reply to a supervised command
                        await reply(true);
                        return;
                    }
                }
                // No one is waiting, dispatch the command to the node itself
                try {
                    await node.handleCommand(msg.command);
                    await reply(true);
                }
                catch (e) {
                    await reply(false);
                    // We only caught the error to be able to respond to supervised requests.
                    // Re-Throw so it can be handled accordingly
                    throw e;
                }
            }
            return;
        }
        else if (msg instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequest) {
            // Make sure we're ready to handle this command
            this.ensureReady(true);
            return this.controller.handleApplicationUpdateRequest(msg);
        }
        else {
            // TODO: This deserves a nicer formatting
            this.driverLog.print(`handling request ${serial_1.FunctionType[msg.functionType]} (${msg.functionType})`);
            handlers = this.requestHandlers.get(msg.functionType);
        }
        if (handlers != undefined && handlers.length > 0) {
            this.driverLog.print(`  ${handlers.length} handler${handlers.length !== 1 ? "s" : ""} registered!`);
            // loop through all handlers and find the first one that returns true to indicate that it handled the message
            for (let i = 0; i < handlers.length; i++) {
                this.driverLog.print(`  invoking handler #${i}`);
                // Invoke the handler and remember its result
                const handler = handlers[i];
                let handlerResult = handler.invoke(msg);
                if (handlerResult instanceof Promise) {
                    handlerResult = await handlerResult;
                }
                if (handlerResult) {
                    this.driverLog.print(`    the message was handled`);
                    if (handler.oneTime) {
                        this.driverLog.print("  one-time handler was successfully called, removing it...");
                        handlers.splice(i, 1);
                    }
                    // don't invoke any more handlers
                    break;
                }
            }
        }
        else {
            this.driverLog.print("  no handlers registered!", "warn");
        }
    }
    encapsulateCommands(cmd, options = {}) {
        // The encapsulation order (from outside to inside) is as follows:
        // 5. Any one of the following combinations:
        //   a. Security (S0 or S2) followed by transport service
        //   b. Transport Service
        //   c. Security (S0 or S2)
        //   d. CRC16
        // b and d are mutually exclusive, security is not
        // 4. Multi Channel
        // 3. Supervision
        // 2. Multi Command
        // 1. Encapsulated Command Class (payload), e.g. Basic Set
        // TODO: 2.
        // 3.
        if (cc_1.SupervisionCC.requiresEncapsulation(cmd)) {
            cmd = cc_1.SupervisionCC.encapsulate(this, cmd);
        }
        // 4.
        if (cc_1.MultiChannelCC.requiresEncapsulation(cmd)) {
            cmd = cc_1.MultiChannelCC.encapsulate(this, cmd);
        }
        // 5.
        if (cc_1.CRC16CC.requiresEncapsulation(cmd)) {
            cmd = cc_1.CRC16CC.encapsulate(this, cmd);
        }
        else {
            // The command must be S2-encapsulated, if ...
            let maybeS2 = false;
            const node = cmd.getNode(this);
            if (node?.supportsCC(core_1.CommandClasses["Security 2"])) {
                // ... the node supports S2 and has a valid security class
                const nodeSecClass = node.getHighestSecurityClass();
                maybeS2 =
                    (0, core_1.securityClassIsS2)(nodeSecClass) ||
                        !!this.securityManager2?.tempKeys.has(node.id);
            }
            else if (options.s2MulticastGroupId != undefined) {
                // ... or we're dealing with S2 multicast
                maybeS2 = true;
            }
            if (maybeS2 && cc_1.Security2CC.requiresEncapsulation(cmd)) {
                cmd = cc_1.Security2CC.encapsulate(this, cmd, {
                    multicastOutOfSync: !!options.s2MulticastOutOfSync,
                    multicastGroupId: options.s2MulticastGroupId,
                });
            }
            // This check will return false for S2-encapsulated commands
            if (cc_1.SecurityCC.requiresEncapsulation(cmd)) {
                cmd = cc_1.SecurityCC.encapsulate(this, cmd);
            }
        }
        return cmd;
    }
    unwrapCommands(msg) {
        // Unwrap encapsulating CCs until we get to the core
        while ((0, cc_1.isEncapsulatingCommandClass)(msg.command) ||
            (0, cc_1.isMultiEncapsulatingCommandClass)(msg.command)) {
            const unwrapped = msg.command.encapsulated;
            if ((0, typeguards_1.isArray)(unwrapped)) {
                // Multi Command CC cannot be further unwrapped
                return;
            }
            // Copy the encapsulation flags and add the current encapsulation
            unwrapped.encapsulationFlags = msg.command.encapsulationFlags;
            switch (msg.command.ccId) {
                case core_1.CommandClasses.Supervision:
                    unwrapped.toggleEncapsulationFlag(core_1.EncapsulationFlags.Supervision, true);
                    break;
                case core_1.CommandClasses["Security 2"]:
                case core_1.CommandClasses.Security:
                    unwrapped.toggleEncapsulationFlag(core_1.EncapsulationFlags.Security, true);
                    break;
                case core_1.CommandClasses["CRC-16 Encapsulation"]:
                    unwrapped.toggleEncapsulationFlag(core_1.EncapsulationFlags.CRC16, true);
                    break;
            }
            msg.command = unwrapped;
        }
    }
    /** Persists the values contained in a Command Class in the corresponding nodes's value DB */
    persistCCValues(cc) {
        cc.persistValues(this);
        if ((0, cc_1.isEncapsulatingCommandClass)(cc)) {
            this.persistCCValues(cc.encapsulated);
        }
        else if ((0, cc_1.isMultiEncapsulatingCommandClass)(cc)) {
            for (const encapsulated of cc.encapsulated) {
                this.persistCCValues(encapsulated);
            }
        }
    }
    /**
     * Gets called whenever any Serial API command succeeded or a SendData command had a negative callback.
     */
    handleSerialAPICommandResult(msg, options, result) {
        // Update statistics
        const node = this.getNodeUnsafe(msg);
        let success = true;
        if ((0, SendDataShared_1.isSendData)(msg) || (0, serial_1.isNodeQuery)(msg)) {
            // This shouldn't happen, but just in case
            if (!node)
                return;
            // If this is a transmit report, use it to update statistics
            if ((0, SendDataShared_1.isTransmitReport)(result)) {
                if (!result.isOK()) {
                    success = false;
                    node.incrementStatistics("commandsDroppedTX");
                }
                else {
                    node.incrementStatistics("commandsTX");
                    node.updateRTT(msg);
                }
                // Notify listeners about the status report if one was received
                if ((0, SendDataShared_1.hasTXReport)(result)) {
                    options.onTXReport?.(result.txReport);
                    node.updateRouteStatistics(result.txReport);
                }
            }
            // Track and potentially update the status of the node when communication succeeds
            if (success) {
                if (node.canSleep) {
                    // Do not update the node status when we only responded to a nonce request
                    if (options.priority !== core_1.MessagePriority.Nonce &&
                        options.priority !== core_1.MessagePriority.Supervision) {
                        // If the node is not meant to be kept awake, try to send it back to sleep
                        if (!node.keepAwake) {
                            setImmediate(() => this.debounceSendNodeToSleep(node));
                        }
                        // The node must be awake because it answered
                        node.markAsAwake();
                    }
                }
                else if (node.status !== _Types_1.NodeStatus.Alive) {
                    // The node status was unknown or dead - in either case it must be alive because it answered
                    node.markAsAlive();
                }
            }
        }
        else {
            this._controller?.incrementStatistics("messagesTX");
        }
    }
    /**
     * Sends a message to the Z-Wave stick.
     * @param msg The message to send
     * @param options (optional) Options regarding the message transmission
     */
    async sendMessage(msg, options = {}) {
        this.ensureReady();
        let node;
        // Don't send messages to dead nodes
        if ((0, serial_1.isNodeQuery)(msg) || (0, cc_1.isCommandClassContainer)(msg)) {
            node = this.getNodeUnsafe(msg);
            if (!(0, cc_1.messageIsPing)(msg) && node?.status === _Types_1.NodeStatus.Dead) {
                // Instead of throwing immediately, try to ping the node first - if it responds, continue
                if (!(await node.ping())) {
                    throw new core_1.ZWaveError(`The message cannot be sent because node ${node.id} is dead`, core_1.ZWaveErrorCodes.Controller_MessageDropped);
                }
            }
        }
        if (options.priority == undefined)
            options.priority = (0, serial_1.getDefaultPriority)(msg);
        if (options.priority == undefined) {
            const className = msg.constructor.name;
            const msgTypeName = serial_1.FunctionType[msg.functionType];
            throw new core_1.ZWaveError(`No default priority has been defined for ${className} (${msgTypeName}), so you have to provide one for your message`, core_1.ZWaveErrorCodes.Driver_NoPriority);
        }
        if (options.supportCheck == undefined)
            options.supportCheck = true;
        if (options.supportCheck &&
            this._controller != undefined &&
            !this._controller.isFunctionSupported(msg.functionType)) {
            throw new core_1.ZWaveError(`Your hardware does not support the ${serial_1.FunctionType[msg.functionType]} function`, core_1.ZWaveErrorCodes.Driver_NotSupported);
        }
        // When sending a message to a node that is known to be sleeping,
        // the priority must be WakeUp, so the message gets deprioritized
        // in comparison with messages to awake nodes.
        // However there are a few exceptions...
        if (!!node &&
            // Pings can be used to check if a node is really asleep, so they should be sent regardless
            !(0, cc_1.messageIsPing)(msg) &&
            // Nodes that can sleep and support the Wake Up CC should have their messages queued for wakeup
            node.canSleep &&
            (node.supportsCC(core_1.CommandClasses["Wake Up"]) ||
                // If we don't know the Wake Up support yet, also change the priority or RequestNodeInfoRequests will get stuck
                // in front of the queue
                node.interviewStage < _Types_1.InterviewStage.NodeInfo) &&
            // If we move multicasts to the wakeup queue, it is unlikely
            // that there is ever a points where all targets are awake
            !(msg instanceof SendDataMessages_1.SendDataMulticastRequest) &&
            !(msg instanceof SendDataBridgeMessages_1.SendDataMulticastBridgeRequest) &&
            // Nonces and responses to Supervision Get have to be sent immediately
            options.priority !== core_1.MessagePriority.Nonce &&
            options.priority !== core_1.MessagePriority.Supervision) {
            if (options.priority === core_1.MessagePriority.NodeQuery) {
                // Remember that this transaction was part of an interview
                options.tag = "interview";
            }
            options.priority = core_1.MessagePriority.WakeUp;
        }
        // Create the transaction
        const { generator, resultPromise } = (0, MessageGenerators_1.createMessageGenerator)(this, msg, (msg, _result) => {
            this.handleSerialAPICommandResult(msg, options, _result);
        });
        const transaction = new Transaction_1.Transaction(this, {
            message: msg,
            priority: options.priority,
            parts: generator,
            promise: resultPromise,
        });
        // Configure its options
        if (options.changeNodeStatusOnMissingACK != undefined) {
            transaction.changeNodeStatusOnTimeout =
                options.changeNodeStatusOnMissingACK;
        }
        if (options.pauseSendThread === true) {
            transaction.pauseSendThread = true;
        }
        transaction.requestWakeUpOnDemand = !!options.requestWakeUpOnDemand;
        transaction.tag = options.tag;
        // And queue it
        this.sendThread.send({ type: "add", transaction });
        // If the transaction should expire, start the timeout
        let expirationTimeout;
        if (options.expire) {
            expirationTimeout = setTimeout(() => {
                this.sendThread.send({
                    type: "reduce",
                    reducer: (t) => {
                        if (t === transaction)
                            return {
                                type: "reject",
                                message: `The message has expired`,
                                code: core_1.ZWaveErrorCodes.Controller_MessageExpired,
                            };
                        return { type: "keep" };
                    },
                });
            }, options.expire).unref();
        }
        try {
            const result = (await resultPromise);
            // If this was a successful non-nonce message to a sleeping node, make sure it goes to sleep again
            let maybeSendToSleep;
            if ((0, SendDataShared_1.isSendData)(msg)) {
                // For SendData messages, make sure the message is not a nonce
                maybeSendToSleep =
                    options.priority !== core_1.MessagePriority.Nonce &&
                        options.priority !== core_1.MessagePriority.Supervision &&
                        // And that the result is either a response from the node
                        // or a transmit report indicating success
                        result &&
                        (result.functionType ===
                            serial_1.FunctionType.BridgeApplicationCommand ||
                            result.functionType ===
                                serial_1.FunctionType.ApplicationCommand ||
                            ((0, SendDataShared_1.isSendDataTransmitReport)(result) && result.isOK()));
            }
            else {
                // For other messages to the node, just check for successful completion. If the callback is not OK,
                // we might not be able to communicate with the node. Sending another message is not a good idea.
                maybeSendToSleep =
                    (0, serial_1.isNodeQuery)(msg) &&
                        result &&
                        (0, serial_1.isSuccessIndicator)(result) &&
                        result.isOK();
            }
            if (maybeSendToSleep && node && node.canSleep && !node.keepAwake) {
                setImmediate(() => this.debounceSendNodeToSleep(node));
            }
            return result;
        }
        catch (e) {
            if ((0, core_1.isZWaveError)(e)) {
                if (
                // If a controller command failed (that is not SendData), pass the response/callback through
                (e.code === core_1.ZWaveErrorCodes.Controller_ResponseNOK ||
                    e.code === core_1.ZWaveErrorCodes.Controller_CallbackNOK) &&
                    e.context instanceof serial_1.Message &&
                    // We need to check the function type here because context can be the transmit reports
                    e.context.functionType !== serial_1.FunctionType.SendData &&
                    e.context.functionType !== serial_1.FunctionType.SendDataMulticast &&
                    e.context.functionType !== serial_1.FunctionType.SendDataBridge &&
                    e.context.functionType !==
                        serial_1.FunctionType.SendDataMulticastBridge) {
                    this._controller?.incrementStatistics("messagesDroppedTX");
                    return e.context;
                }
                else if (e.code === core_1.ZWaveErrorCodes.Controller_NodeTimeout) {
                    // If the node failed to respond in time, remember this for the statistics
                    node?.incrementStatistics("timeoutResponse");
                }
                // Enrich errors with the transaction's stack instead of the internal stack
                if (!e.transactionSource) {
                    throw new core_1.ZWaveError(e.message, e.code, e.context, transaction.stack);
                }
            }
            throw e;
        }
        finally {
            // The transaction was handled, so it can no longer expire
            if (expirationTimeout)
                clearTimeout(expirationTimeout);
        }
    }
    /** Wraps a CC in the correct SendData message to use for sending */
    createSendDataMessage(command, options = {}) {
        // Automatically encapsulate commands before sending
        if (options.autoEncapsulate !== false) {
            command = this.encapsulateCommands(command, options);
        }
        let msg;
        if (command.isSinglecast() || command.isBroadcast()) {
            if (this.controller.isFunctionSupported(serial_1.FunctionType.SendDataBridge)) {
                // Prioritize Bridge commands when they are supported
                msg = new SendDataBridgeMessages_1.SendDataBridgeRequest(this, {
                    command,
                    maxSendAttempts: this.options.attempts.sendData,
                });
            }
            else {
                msg = new SendDataMessages_1.SendDataRequest(this, {
                    command,
                    maxSendAttempts: this.options.attempts.sendData,
                });
            }
        }
        else if (command.isMulticast()) {
            if (this.controller.isFunctionSupported(serial_1.FunctionType.SendDataMulticastBridge)) {
                // Prioritize Bridge commands when they are supported
                msg = new SendDataBridgeMessages_1.SendDataMulticastBridgeRequest(this, {
                    command,
                    maxSendAttempts: this.options.attempts.sendData,
                });
            }
            else {
                msg = new SendDataMessages_1.SendDataMulticastRequest(this, {
                    command,
                    maxSendAttempts: this.options.attempts.sendData,
                });
            }
        }
        else {
            throw new core_1.ZWaveError(`A CC must either be singlecast or multicast`, core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        // Specify the number of send attempts for the request
        if (options.maxSendAttempts != undefined) {
            msg.maxSendAttempts = options.maxSendAttempts;
        }
        // Specify transmit options for the request
        if (options.transmitOptions != undefined) {
            msg.transmitOptions = options.transmitOptions;
            if (!(options.transmitOptions & core_1.TransmitOptions.ACK)) {
                // If no ACK is requested, set the callback ID to zero, because we won't get a controller callback
                msg.callbackId = 0;
            }
        }
        return msg;
    }
    /**
     * Sends a command to a Z-Wave node. If the node returns a command in response, that command will be the return value.
     * If the command expects no response **or** the response times out, nothing will be returned
     * @param command The command to send. It will be encapsulated in a SendData[Multicast]Request.
     * @param options (optional) Options regarding the message transmission
     */
    async sendCommandInternal(command, options = {}) {
        const msg = this.createSendDataMessage(command, options);
        try {
            const resp = await this.sendMessage(msg, options);
            // And unwrap the response if there was any
            if ((0, cc_1.isCommandClassContainer)(resp)) {
                this.unwrapCommands(resp);
                return resp.command;
            }
        }
        catch (e) {
            // A timeout always has to be expected. In this case return nothing.
            if ((0, core_1.isZWaveError)(e) &&
                e.code === core_1.ZWaveErrorCodes.Controller_NodeTimeout) {
                if (command.isSinglecast()) {
                    this.controllerLog.logNode(command.nodeId, e.message, "warn");
                }
            }
            else {
                // We don't want to swallow any other errors
                throw e;
            }
        }
    }
    /**
     * Sends a supervised command to a Z-Wave node. When status updates are requested, the passed callback will be executed for every non-final update.
     * @param command The command to send
     * @param options (optional) Options regarding the message transmission
     */
    async sendSupervisedCommand(command, options = {
        requestStatusUpdates: false,
    }) {
        // Create the encapsulating CC so we have a session ID
        command = cc_1.SupervisionCC.encapsulate(this, command, options.requestStatusUpdates);
        const resp = await this.sendCommandInternal(command, options);
        if (!resp)
            return;
        // If future updates are expected, listen for them
        if (options.requestStatusUpdates && resp.moreUpdatesFollow) {
            this.ensureNodeSessions(command.nodeId).supervision.set(command.sessionId, options.onUpdate);
        }
        // In any case, return the status
        if (resp.status === core_1.SupervisionStatus.Working) {
            return {
                status: resp.status,
                remainingDuration: resp.duration,
            };
        }
        else {
            return {
                status: resp.status,
            };
        }
    }
    /**
     * Sends a command to a Z-Wave node. The return value depends on several factors:
     * * If the node returns a command in response, that command will be the return value.
     * * If the command is a SET-type command and Supervision CC can and should be used, a {@link SupervisionResult} will be returned.
     * * If the command expects no response **or** the response times out, nothing will be returned.
     *
     * @param command The command to send. It will be encapsulated in a SendData[Multicast]Request.
     * @param options (optional) Options regarding the message transmission
     */
    async sendCommand(command, options) {
        if (options?.encapsulationFlags != undefined) {
            command.encapsulationFlags = options.encapsulationFlags;
        }
        // For S2 multicast, the Security encapsulation flag does not get set automatically by the CC constructor
        if (options?.s2MulticastGroupId != undefined) {
            command.toggleEncapsulationFlag(core_1.EncapsulationFlags.Security, true);
        }
        // Only use supervision if...
        if (
        // ... not disabled
        options?.useSupervision !== false &&
            // ... and it is legal for the command
            cc_1.SupervisionCC.mayUseSupervision(this, command)) {
            const result = await this.sendSupervisedCommand(command, options);
            if (result?.status !== core_1.SupervisionStatus.NoSupport) {
                // @ts-expect-error TS doesn't know we've narrowed the return type to match
                return result;
            }
            // The node should support supervision but it doesn't for this command. Remember this
            cc_1.SupervisionCC.setCCSupportedWithSupervision(this, command.getEndpoint(this), command.ccId, false);
            // And retry the command without supervision
        }
        // Fall back to non-supervised commands
        // @ts-expect-error TS doesn't know we've narrowed the return type to match
        return this.sendCommandInternal(command, options);
    }
    /**
     * Sends a low-level message like ACK, NAK or CAN immediately
     * @param header The low-level message to send
     */
    writeHeader(header) {
        // ACK, CAN, NAK
        return this.writeSerial(Buffer.from([header]));
    }
    /** Sends a raw datagram to the serialport (if that is open) */
    async writeSerial(data) {
        return this.serial?.writeAsync(data);
    }
    /**
     * Waits until an unsolicited serial message is received or a timeout has elapsed. Returns the received message.
     *
     * **Note:** To wait for a certain CommandClass, better use {@link waitForCommand}.
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     * @param predicate A predicate function to test all incoming messages
     */
    waitForMessage(predicate, timeout) {
        return new Promise((resolve, reject) => {
            const promise = (0, deferred_promise_1.createDeferredPromise)();
            const entry = {
                predicate,
                handler: (msg) => promise.resolve(msg),
                timeout: undefined,
            };
            this.awaitedMessages.push(entry);
            const removeEntry = () => {
                if (entry.timeout)
                    clearTimeout(entry.timeout);
                const index = this.awaitedMessages.indexOf(entry);
                if (index !== -1)
                    this.awaitedMessages.splice(index, 1);
            };
            // When the timeout elapses, remove the wait entry and reject the returned Promise
            entry.timeout = setTimeout(() => {
                removeEntry();
                reject(new core_1.ZWaveError(`Received no matching message within the provided timeout!`, core_1.ZWaveErrorCodes.Controller_Timeout));
            }, timeout);
            // When the promise is resolved, remove the wait entry and resolve the returned Promise
            void promise.then((cc) => {
                removeEntry();
                resolve(cc);
            });
        });
    }
    /**
     * Waits until a CommandClass is received or a timeout has elapsed. Returns the received command.
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     * @param predicate A predicate function to test all incoming command classes
     */
    waitForCommand(predicate, timeout) {
        return new Promise((resolve, reject) => {
            const promise = (0, deferred_promise_1.createDeferredPromise)();
            const entry = {
                predicate,
                handler: (cc) => promise.resolve(cc),
                timeout: undefined,
            };
            this.awaitedCommands.push(entry);
            const removeEntry = () => {
                if (entry.timeout)
                    clearTimeout(entry.timeout);
                const index = this.awaitedCommands.indexOf(entry);
                if (index !== -1)
                    this.awaitedCommands.splice(index, 1);
            };
            // When the timeout elapses, remove the wait entry and reject the returned Promise
            entry.timeout = setTimeout(() => {
                removeEntry();
                reject(new core_1.ZWaveError(`Received no matching command within the provided timeout!`, core_1.ZWaveErrorCodes.Controller_NodeTimeout));
            }, timeout);
            // When the promise is resolved, remove the wait entry and resolve the returned Promise
            void promise.then((cc) => {
                removeEntry();
                resolve(cc);
            });
        });
    }
    /**
     * Calls the given handler function every time a CommandClass is received that matches the given predicate.
     * @param predicate A predicate function to test all incoming command classes
     */
    registerCommandHandler(predicate, handler) {
        const entry = {
            predicate,
            handler: (cc) => handler(cc),
            timeout: undefined,
        };
        this.awaitedCommands.push(entry);
        const removeEntry = () => {
            if (entry.timeout)
                clearTimeout(entry.timeout);
            const index = this.awaitedCommands.indexOf(entry);
            if (index !== -1)
                this.awaitedCommands.splice(index, 1);
        };
        return {
            unregister: removeEntry,
        };
    }
    /** Checks if a message is allowed to go into the wakeup queue */
    mayMoveToWakeupQueue(transaction) {
        const msg = transaction.message;
        switch (true) {
            // Pings, nonces and Supervision Reports will block the send queue until wakeup, so they must be dropped
            case (0, cc_1.messageIsPing)(msg):
            case transaction.priority === core_1.MessagePriority.Nonce:
            case transaction.priority === core_1.MessagePriority.Supervision:
            // We also don't want to immediately send the node to sleep when it wakes up
            case (0, cc_1.isCommandClassContainer)(msg) &&
                msg.command instanceof cc_1.WakeUpCCNoMoreInformation:
            // compat queries because they will be recreated when the node wakes up
            case transaction.tag === "compat":
                return false;
        }
        return true;
    }
    /** Moves all messages for a given node into the wakeup queue */
    moveMessagesToWakeupQueue(nodeId) {
        const reject = {
            type: "reject",
            message: `The node is asleep`,
            code: core_1.ZWaveErrorCodes.Controller_MessageDropped,
        };
        const requeue = {
            type: "requeue",
            priority: core_1.MessagePriority.WakeUp,
        };
        const requeueAndTagAsInterview = {
            ...requeue,
            tag: "interview",
        };
        const reducer = (transaction, _source) => {
            const msg = transaction.message;
            if (msg.getNodeId() !== nodeId)
                return { type: "keep" };
            // Drop all messages that are not allowed in the wakeup queue
            // For all other messages, change the priority to wakeup
            return this.mayMoveToWakeupQueue(transaction)
                ? transaction.priority === core_1.MessagePriority.NodeQuery
                    ? requeueAndTagAsInterview
                    : requeue
                : reject;
        };
        // Apply the reducer to the send thread
        this.sendThread.send({ type: "reduce", reducer });
    }
    /**
     * @internal
     * Rejects all pending transactions that match a predicate and removes them from the send queue
     */
    rejectTransactions(predicate, errorMsg = `The message has been removed from the queue`, errorCode = core_1.ZWaveErrorCodes.Controller_MessageDropped) {
        const reducer = (transaction) => {
            if (predicate(transaction)) {
                return {
                    type: "reject",
                    message: errorMsg,
                    code: errorCode,
                };
            }
            else {
                return { type: "keep" };
            }
        };
        // Apply the reducer to the send thread
        this.sendThread.send({ type: "reduce", reducer });
    }
    /**
     * @internal
     * Rejects all pending transactions for a node and removes them from the send queue
     */
    rejectAllTransactionsForNode(nodeId, errorMsg = `The node is dead`, errorCode = core_1.ZWaveErrorCodes.Controller_MessageDropped) {
        this.rejectTransactions((t) => t.message.getNodeId() === nodeId, errorMsg, errorCode);
    }
    /**
     * @internal
     * Pauses the send thread, avoiding commands to be sent to the controller
     */
    pauseSendThread() {
        this.sendThread.send({ type: "pause" });
    }
    /**
     * @internal
     * Unpauses the send thread, allowing commands to be sent to the controller again
     */
    unpauseSendThread() {
        this.sendThread.send({ type: "unpause" });
    }
    /** Re-sorts the send queue */
    sortSendQueue() {
        this.sendThread.send("sortQueue");
    }
    /**
     * @internal
     * Helper function to read and convert potentially existing values from the network cache
     */
    cacheGet(cacheKey, options) {
        let ret = this.networkCache.get(cacheKey);
        if (ret !== undefined && typeof options?.reviver === "function") {
            try {
                ret = options.reviver(ret);
            }
            catch {
                // ignore, invalid entry
            }
        }
        return ret;
    }
    /**
     * @internal
     * Helper function to convert values and write them to the network cache
     */
    cacheSet(cacheKey, value, options) {
        if (value !== undefined && typeof options?.serializer === "function") {
            value = options.serializer(value);
        }
        if (value === undefined) {
            this.networkCache.delete(cacheKey);
        }
        else {
            this.networkCache.set(cacheKey, value);
        }
    }
    cachePurge(prefix) {
        for (const key of this.networkCache.keys()) {
            if (key.startsWith(prefix)) {
                this.networkCache.delete(key);
            }
        }
    }
    /**
     * Restores a previously stored Z-Wave network state from cache to speed up the startup process
     */
    async restoreNetworkStructureFromCache() {
        if (!this._controller ||
            !this.controller.homeId ||
            !this._networkCache) {
            return;
        }
        if (this._networkCache.size <= 1) {
            // If the size is 0 or 1, the cache is empty, so we cannot restore it
            return;
        }
        try {
            this.driverLog.print(`Cache file for homeId ${(0, shared_1.num2hex)(this.controller.homeId)} found, attempting to restore the network from cache...`);
            await this.controller.deserialize();
            this.driverLog.print(`Restoring the network from cache was successful!`);
        }
        catch (e) {
            const message = `Restoring the network from cache failed: ${(0, shared_1.getErrorMessage)(e, true)}`;
            this.emit("error", new core_1.ZWaveError(message, core_1.ZWaveErrorCodes.Driver_InvalidCache));
            this.driverLog.print(message, "error");
        }
    }
    /**
     * @internal
     * Marks a node for a later sleep command. Every call refreshes the period until the node actually goes to sleep
     */
    debounceSendNodeToSleep(node) {
        // TODO: This should be a single command to the send thread
        // Delete old timers if any exist
        if (this.sendNodeToSleepTimers.has(node.id)) {
            clearTimeout(this.sendNodeToSleepTimers.get(node.id));
        }
        // Sends a node to sleep if it has no more messages.
        const sendNodeToSleep = (node) => {
            this.sendNodeToSleepTimers.delete(node.id);
            if (!this.hasPendingMessages(node)) {
                void node.sendNoMoreInformation().catch(() => {
                    /* ignore errors */
                });
            }
        };
        // If a sleeping node has no messages pending (and supports the Wake Up CC), we may send it back to sleep
        if (node.supportsCC(core_1.CommandClasses["Wake Up"]) &&
            !this.hasPendingMessages(node)) {
            const wakeUpInterval = node.getValue(cc_1.WakeUpCCValues.wakeUpInterval.id);
            // GH#2179: when a device only wakes up manually, don't send it back to sleep
            // Best case, the user wanted to interact with it.
            // Worst case, the device won't ACK this and cause a delay
            if (wakeUpInterval !== 0) {
                this.sendNodeToSleepTimers.set(node.id, setTimeout(() => sendNodeToSleep(node), 1000).unref());
            }
        }
    }
    /** Computes the maximum net CC payload size for the given CC or SendDataRequest */
    computeNetCCPayloadSize(commandOrMsg) {
        // Recreate the correct encapsulation structure
        let msg;
        if ((0, SendDataShared_1.isSendDataSinglecast)(commandOrMsg)) {
            msg = commandOrMsg;
        }
        else {
            const SendDataConstructor = this.getSendDataSinglecastConstructor();
            msg = new SendDataConstructor(this, { command: commandOrMsg });
        }
        msg.command = this.encapsulateCommands(msg.command);
        return msg.command.getMaxPayloadLength(msg.getMaxPayloadLength());
    }
    /** Determines time in milliseconds to wait for a report from a node */
    getReportTimeout(msg) {
        const node = this.getNodeUnsafe(msg);
        // If the node has a compat flag to override the timeout, use that,
        // otherwise use the driver option
        return (node?.deviceConfig?.compat?.reportTimeout ??
            this.options.timeouts.report);
    }
    /** Returns the preferred constructor to use for singlecast SendData commands */
    getSendDataSinglecastConstructor() {
        return this._controller?.isFunctionSupported(serial_1.FunctionType.SendDataBridge)
            ? SendDataBridgeMessages_1.SendDataBridgeRequest
            : SendDataMessages_1.SendDataRequest;
    }
    /** Returns the preferred constructor to use for multicast SendData commands */
    getSendDataMulticastConstructor() {
        return this._controller?.isFunctionSupported(serial_1.FunctionType.SendDataMulticastBridge)
            ? SendDataBridgeMessages_1.SendDataMulticastBridgeRequest
            : SendDataMessages_1.SendDataMulticastRequest;
    }
    // This does not all need to be printed to the console
    [util.inspect.custom]() {
        return "[Driver]";
    }
    /**
     * Checks whether there is a compatible update for the currently installed config package.
     * Returns the new version if there is an update, `undefined` otherwise.
     */
    async checkForConfigUpdates(silent = false) {
        this.ensureReady();
        try {
            if (!silent)
                this.driverLog.print("Checking for configuration updates...");
            const ret = await (0, UpdateConfig_1.checkForConfigUpdates)(this.configVersion);
            if (ret) {
                if (!silent)
                    this.driverLog.print(`Configuration update available: ${ret}`);
            }
            else {
                if (!silent)
                    this.driverLog.print("No configuration update available...");
            }
            return ret;
        }
        catch (e) {
            this.driverLog.print((0, shared_1.getErrorMessage)(e), "error");
        }
    }
    /**
     * Installs an update for the embedded configuration DB if there is a compatible one.
     * Returns `true` when an update was installed, `false` otherwise.
     *
     * **Note:** Bugfixes and changes to device configuration generally require a restart or re-interview to take effect.
     */
    async installConfigUpdate() {
        this.ensureReady();
        const newVersion = await this.checkForConfigUpdates(true);
        if (!newVersion)
            return false;
        try {
            this.driverLog.print(`Installing version ${newVersion} of configuration DB...`);
            // We have 3 variants of this.
            const extConfigDir = (0, config_1.externalConfigDir)();
            if (this.configManager.useExternalConfig && extConfigDir) {
                // 1. external config dir, leave node_modules alone
                await (0, UpdateConfig_1.installConfigUpdateInDocker)(newVersion, {
                    cacheDir: this.options.storage.cacheDir,
                    configDir: extConfigDir,
                });
            }
            else if ((0, shared_1.isDocker)()) {
                // 2. Docker, but no external config dir, extract into node_modules
                await (0, UpdateConfig_1.installConfigUpdateInDocker)(newVersion);
            }
            else {
                // 3. normal environment, use npm/yarn to install a new version of @zwave-js/config
                await (0, UpdateConfig_1.installConfigUpdate)(newVersion);
            }
        }
        catch (e) {
            this.driverLog.print((0, shared_1.getErrorMessage)(e), "error");
            return false;
        }
        this.driverLog.print(`Configuration DB updated to version ${newVersion}, activating...`);
        // Reload the config files
        await this.configManager.loadAll();
        // Now try to apply them to all known devices
        if (this._controller) {
            for (const node of this._controller.nodes.values()) {
                if (node.ready)
                    await node["loadDeviceConfig"]();
            }
        }
        return true;
    }
    /** @internal */
    async enterBootloader() {
        this.controllerLog.print("Entering bootloader...");
        this._enteringBootloader = true;
        try {
            // await this.controller.toggleRF(false);
            // Avoid re-transmissions etc. communicating with the bootloader
            this.rejectTransactions((_t) => true, "The controller is entering bootloader mode.");
            await this.trySoftReset();
            this.pauseSendThread();
            // Again, just to be very sure
            this.rejectTransactions((_t) => true, "The controller is entering bootloader mode.");
            // It would be nicer to not hardcode the command here, but since we're switching stream parsers
            // mid-command - thus ignoring the ACK, we can't really use the existing communication machinery
            const promise = this.writeSerial(Buffer.from("01030027db", "hex"));
            this.serial.mode = serial_1.ZWaveSerialMode.Bootloader;
            await promise;
            // Wait if the menu shows up
            this._enterBootloaderPromise = (0, deferred_promise_1.createDeferredPromise)();
            const success = await Promise.race([
                this._enterBootloaderPromise.then(() => true),
                (0, async_1.wait)(5000, true).then(() => false),
            ]);
            if (success) {
                this.controllerLog.print("Entered bootloader");
            }
            else {
                throw new core_1.ZWaveError("Failed to enter bootloader", core_1.ZWaveErrorCodes.Controller_Timeout);
            }
        }
        finally {
            this._enteringBootloader = false;
        }
    }
    leaveBootloaderInternal() {
        const promise = this.bootloader.runApplication();
        // Reset the known serial mode. We might end up in serial or bootloader mode afterwards.
        this.serial.mode = undefined;
        this._bootloader = undefined;
        return promise;
    }
    /**
     * @internal
     * Leaves the bootloader and destroys the driver instance if desired
     */
    async leaveBootloader(destroy = false) {
        this.controllerLog.print("Leaving bootloader...");
        await this.leaveBootloaderInternal();
        // TODO: do we need to wait here?
        if (destroy) {
            const restartReason = "Restarting driver after OTW update...";
            this.controllerLog.print(restartReason);
            await this.destroy();
            // Let the async calling context finish before emitting the error
            process.nextTick(() => {
                this.emit("error", new core_1.ZWaveError(restartReason, core_1.ZWaveErrorCodes.Driver_Failed));
            });
        }
        else {
            this.unpauseSendThread();
            await this.ensureSerialAPI();
        }
    }
    serialport_onBootloaderData(data) {
        switch (data.type) {
            case serial_1.BootloaderChunkType.Message: {
                this.controllerLog.print(`[BOOTLOADER] ${data.message}`, "verbose");
                break;
            }
            case serial_1.BootloaderChunkType.FlowControl: {
                if (data.command === serial_1.XModemMessageHeaders.C) {
                    this.controllerLog.print(`[BOOTLOADER] awaiting input...`, "verbose");
                }
                break;
            }
        }
        // Check if there is a handler waiting for this chunk
        for (const entry of this.awaitedBootloaderChunks) {
            if (entry.predicate(data)) {
                // there is!
                entry.handler(data);
                return;
            }
        }
        if (!this._bootloader && data.type === serial_1.BootloaderChunkType.Menu) {
            // We just entered the bootloader
            this.controllerLog.print(`[BOOTLOADER] version ${data.version}`, "verbose");
            this._bootloader = new Bootloader_1.Bootloader(this.writeSerial.bind(this), data.version, data.options);
            if (this._enterBootloaderPromise) {
                this._enterBootloaderPromise.resolve();
                this._enterBootloaderPromise = undefined;
            }
        }
    }
    /**
     * Waits until a specific chunk is received from the bootloader or a timeout has elapsed. Returns the received chunk.
     * @param timeout The number of milliseconds to wait. If the timeout elapses, the returned promise will be rejected
     * @param predicate A predicate function to test all incoming chunks
     */
    waitForBootloaderChunk(predicate, timeout) {
        return new Promise((resolve, reject) => {
            const promise = (0, deferred_promise_1.createDeferredPromise)();
            const entry = {
                predicate,
                handler: (chunk) => promise.resolve(chunk),
                timeout: undefined,
            };
            this.awaitedBootloaderChunks.push(entry);
            const removeEntry = () => {
                if (entry.timeout)
                    clearTimeout(entry.timeout);
                const index = this.awaitedBootloaderChunks.indexOf(entry);
                if (index !== -1)
                    this.awaitedBootloaderChunks.splice(index, 1);
            };
            // When the timeout elapses, remove the wait entry and reject the returned Promise
            entry.timeout = setTimeout(() => {
                removeEntry();
                reject(new core_1.ZWaveError(`Received no matching chunk within the provided timeout!`, core_1.ZWaveErrorCodes.Controller_Timeout));
            }, timeout);
            // When the promise is resolved, remove the wait entry and resolve the returned Promise
            void promise.then((chunk) => {
                removeEntry();
                resolve(chunk);
            });
        });
    }
    handleSendThreadIdleChange(idle) {
        if (!this.ready)
            return;
        if (this.controller.isFunctionSupported(serial_1.FunctionType.GetBackgroundRSSI)) {
            // When the send thread stays idle for 5 seconds, poll the background RSSI, but at most every 30s
            if (idle) {
                const timeout = Math.max(
                // Wait at least 5s
                5000, 
                // and up to 30s if we recently queried the RSSI
                30000 - (Date.now() - this.lastBackgroundRSSITimestamp));
                this.pollBackgroundRSSITimer = setTimeout(async () => {
                    // Due to the timeout, the driver might have been destroyed in the meantime
                    if (!this.ready)
                        return;
                    this.lastBackgroundRSSITimestamp = Date.now();
                    try {
                        await this.controller.getBackgroundRSSI();
                    }
                    catch {
                        // ignore errors
                    }
                }, timeout).unref();
            }
            else {
                clearTimeout(this.pollBackgroundRSSITimer);
                this.pollBackgroundRSSITimer = undefined;
            }
        }
    }
}
exports.Driver = Driver;
//# sourceMappingURL=Driver.js.map