"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deferred_promise_1 = require("alcalzone-shared/deferred-promise");
const objects_1 = require("alcalzone-shared/objects");
const sorted_list_1 = require("alcalzone-shared/sorted-list");
const events_1 = require("events");
const fs = require("fs-extra");
const path = require("path");
const SerialPort = require("serialport");
const CommandClass_1 = require("../commandclass/CommandClass");
const ICommandClassContainer_1 = require("../commandclass/ICommandClassContainer");
const WakeUpCC_1 = require("../commandclass/WakeUpCC");
const ApplicationCommandRequest_1 = require("../controller/ApplicationCommandRequest");
const ApplicationUpdateRequest_1 = require("../controller/ApplicationUpdateRequest");
const Controller_1 = require("../controller/Controller");
const SendDataMessages_1 = require("../controller/SendDataMessages");
const ZWaveError_1 = require("../error/ZWaveError");
const Constants_1 = require("../message/Constants");
const Message_1 = require("../message/Message");
const Node_1 = require("../node/Node");
const logger_1 = require("../util/logger");
const strings_1 = require("../util/strings");
const Transaction_1 = require("./Transaction");
const defaultOptions = {
    timeouts: {
        ack: 1000,
        byte: 150,
    },
    skipInterview: false,
};
function applyDefaultOptions(target, source) {
    target = target || {};
    for (const [key, value] of objects_1.entries(source)) {
        if (!(key in target)) {
            target[key] = value;
        }
        else {
            if (typeof value === "object") {
                // merge objects
                target[key] = applyDefaultOptions(target[key], value);
            }
            else if (typeof target[key] === "undefined") {
                // don't override single keys
                target[key] = value;
            }
        }
    }
    return target;
}
function isMessageSupportCheck(val) {
    return val === "loud"
        || val === "silent"
        || val === "none";
}
// TODO: Interface the emitted events
class Driver extends events_1.EventEmitter {
    constructor(port, 
    /** @internal */
    options) {
        super();
        this.port = port;
        this.options = options;
        this.sendQueue = new sorted_list_1.SortedList();
        /** A map of handlers for all sorts of requests */
        this.requestHandlers = new Map();
        /** A map of handlers specifically for send data requests */
        this.sendDataRequestHandlers = new Map();
        this.cacheDir = path.resolve(__dirname, "../../..", "cache");
        this._wasStarted = false;
        this._isOpen = false;
        this._controllerInterviewed = false;
        this._wasDestroyed = false;
        this._cleanupHandler = () => this.destroy();
        this.lastSaveToCache = 0;
        this.saveToCacheInterval = 50;
        // merge given options with defaults
        this.options = applyDefaultOptions(this.options, defaultOptions);
        // register some cleanup handlers in case the program doesn't get closed cleanly
        process.on("exit", this._cleanupHandler);
        process.on("SIGINT", this._cleanupHandler);
        process.on("uncaughtException", this._cleanupHandler);
    }
    get controller() {
        return this._controller;
    }
    /** Start the driver */
    start() {
        // avoid starting twice
        if (this._wasDestroyed) {
            return Promise.reject(new ZWaveError_1.ZWaveError("The driver was destroyed. Create a new instance and start that one.", ZWaveError_1.ZWaveErrorCodes.Driver_Destroyed));
        }
        if (this._wasStarted)
            return;
        this._wasStarted = true;
        return new Promise((resolve, reject) => {
            logger_1.log("driver", `starting driver...`, "debug");
            this.serial = new SerialPort(this.port, {
                autoOpen: false,
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: "none",
            });
            this.serial
                // wotan-disable-next-line async-function-assignability
                .on("open", async () => {
                logger_1.log("driver", "serial port opened", "debug");
                this._isOpen = true;
                this.resetIO();
                resolve();
                setImmediate(() => void this.initializeControllerAndNodes());
            })
                .on("data", this.serialport_onData.bind(this))
                .on("error", err => {
                logger_1.log("driver", "serial port errored: " + err, "error");
                if (this._isOpen) {
                    this.serialport_onError(err);
                }
                else {
                    reject(err);
                    this.destroy();
                }
            });
            this.serial.open();
        });
    }
    async initializeControllerAndNodes() {
        if (this._controller == null)
            this._controller = new Controller_1.ZWaveController(this);
        if (!this.options.skipInterview) {
            // Interview the controller
            await this._controller.interview();
        }
        // in any case we need to emit the driver ready event here
        this._controllerInterviewed = true;
        logger_1.log("driver", "driver ready", "debug");
        this.emit("driver ready");
        // Try to restore the network information from the cache
        if (process.env.NO_CACHE !== "true")
            await this.restoreNetworkFromCache();
        // Add event handlers for the nodes
        for (const node of this._controller.nodes.values()) {
            this.addNodeEventHandlers(node);
        }
        if (!this.options.skipInterview) {
            // Now interview all nodes
            for (const node of this._controller.nodes.values()) {
                if (node.interviewStage === Node_1.InterviewStage.Complete) {
                    node.interviewStage = Node_1.InterviewStage.RestartFromCache;
                }
                // TODO: retry on failure or something...
                // don't await the interview, because it may take a very long time
                // if a node is asleep
                void node.interview().catch(e => {
                    if (e instanceof ZWaveError_1.ZWaveError) {
                        logger_1.log("controller", "node interview failed: " + e, "error");
                    }
                    else {
                        throw e;
                    }
                });
            }
        }
    }
    addNodeEventHandlers(node) {
        node
            .on("wake up", this.node_wakeUp.bind(this))
            .on("sleep", this.node_sleep.bind(this))
            .on("interview completed", this.node_interviewCompleted.bind(this));
    }
    node_wakeUp(node) {
        logger_1.log("driver", `${node.logPrefix}The node is now awake.`, "debug");
        // Make sure to handle the pending messages as quickly as possible
        this.sortSendQueue();
        setImmediate(() => this.workOffSendQueue());
    }
    node_sleep(node) {
        // TODO: Do we need this
    }
    node_interviewCompleted(node) {
        if (!this.hasPendingMessages(node) && node.supportsCC(CommandClass_1.CommandClasses["Wake Up"])) {
            node.sendNoMoreInformation();
        }
    }
    hasPendingMessages(node) {
        return !!this.sendQueue.find(t => t.message.getNodeId() === node.id);
    }
    /**
     * Finds the version of a given CC the given node supports. Returns 0 when the CC is not supported.
     */
    getSupportedCCVersionForNode(nodeId, cc) {
        if (this.controller == null || !this.controller.nodes.has(nodeId))
            return 0;
        return this.controller.nodes.get(nodeId).getCCVersion(cc);
    }
    getSafeCCVersionForNode(nodeId, cc) {
        const supportedVersion = this.getSupportedCCVersionForNode(nodeId, cc);
        if (supportedVersion === 0) {
            // For unsupported CCs use version 1, no matter what
            return 1;
        }
        else {
            // For supported versions find the maximum version supported by both the
            // node and this library
            const implementedVersion = CommandClass_1.getImplementedVersion(cc);
            if (implementedVersion !== 0 && implementedVersion !== Number.POSITIVE_INFINITY) {
                return Math.min(supportedVersion, implementedVersion);
            }
        }
    }
    /**
     * Performs a hard reset on the controller. This wipes out all configuration!
     */
    async hardReset() {
        this.ensureReady(true);
        await this._controller.hardReset();
        this._controllerInterviewed = false;
        void this.initializeControllerAndNodes();
    }
    /** Resets the IO layer */
    resetIO() {
        this.ensureReady();
        logger_1.log("driver", "resetting driver instance...", "debug");
        // re-sync communication
        this.send(Constants_1.MessageHeaders.NAK);
        // clear buffers
        this.receiveBuffer = Buffer.from([]);
        this.sendQueue.clear();
        // clear the currently pending request
        if (this.currentTransaction != null && this.currentTransaction.promise != null) {
            this.currentTransaction.promise.reject(new ZWaveError_1.ZWaveError("The driver was reset", ZWaveError_1.ZWaveErrorCodes.Driver_Reset));
        }
        this.currentTransaction = null;
    }
    ensureReady(includingController = false) {
        if (!this._wasStarted
            || !this._isOpen
            || this._wasDestroyed) {
            throw new ZWaveError_1.ZWaveError("The driver is not ready or has been destroyed", ZWaveError_1.ZWaveErrorCodes.Driver_NotReady);
        }
        if (includingController && !this._controllerInterviewed) {
            throw new ZWaveError_1.ZWaveError("The controller is not ready yet", ZWaveError_1.ZWaveErrorCodes.Driver_NotReady);
        }
    }
    /**
     * Terminates the driver instance and closes the underlying serial connection.
     * Must be called under any circumstances.
     */
    destroy() {
        logger_1.log("driver", "destroying driver instance...", "debug");
        this._wasDestroyed = true;
        process.removeListener("exit", this._cleanupHandler);
        process.removeListener("SIGINT", this._cleanupHandler);
        process.removeListener("uncaughtException", this._cleanupHandler);
        // the serialport must be closed in any case
        if (this.serial != null) {
            this.serial.close();
            delete this.serial;
        }
    }
    serialport_onError(err) {
        this.emit("error", err);
    }
    onInvalidData(data, message) {
        this.emit("error", new ZWaveError_1.ZWaveError(message, ZWaveError_1.ZWaveErrorCodes.Driver_InvalidDataReceived));
        this.resetIO();
    }
    serialport_onData(data) {
        logger_1.log("io", `received data: 0x${data.toString("hex")}`, "debug");
        // append the new data to our receive buffer
        this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
        logger_1.log("io", `receiveBuffer: 0x${this.receiveBuffer.toString("hex")}`, "debug");
        while (this.receiveBuffer.length > 0) { // TODO: add a way to interrupt
            if (this.receiveBuffer[0] !== Constants_1.MessageHeaders.SOF) {
                switch (this.receiveBuffer[0]) {
                    // single-byte messages - we have a handler for each one
                    case Constants_1.MessageHeaders.ACK: {
                        this.handleACK();
                        break;
                    }
                    case Constants_1.MessageHeaders.NAK: {
                        this.handleNAK();
                        break;
                    }
                    case Constants_1.MessageHeaders.CAN: {
                        this.handleCAN();
                        break;
                    }
                    default: {
                        const message = `The receive buffer starts with unexpected data: 0x${data.toString("hex")}`;
                        this.onInvalidData(this.receiveBuffer, message);
                        return;
                    }
                }
                this.receiveBuffer = skipBytes(this.receiveBuffer, 1);
                continue;
            }
            // nothing to do yet, wait for the next data
            const msgComplete = Message_1.Message.isComplete(this.receiveBuffer);
            if (!msgComplete) {
                logger_1.log("io", `the receive buffer contains an incomplete message, waiting for the next chunk...`, "debug");
                return;
            }
            // tslint:disable-next-line:variable-name
            const MessageConstructor = Message_1.Message.getConstructor(this.receiveBuffer);
            const msg = new MessageConstructor(this);
            let readBytes;
            try {
                readBytes = msg.deserialize(this.receiveBuffer);
            }
            catch (e) {
                if (e instanceof ZWaveError_1.ZWaveError) {
                    if (e.code === ZWaveError_1.ZWaveErrorCodes.PacketFormat_Invalid
                        || e.code === ZWaveError_1.ZWaveErrorCodes.PacketFormat_Checksum) {
                        this.onInvalidData(this.receiveBuffer, e.toString());
                        return;
                    }
                }
                // pass it through;
                throw e;
            }
            // and cut the read bytes from our buffer
            this.receiveBuffer = Buffer.from(this.receiveBuffer.slice(readBytes));
            // all good, send ACK
            this.send(Constants_1.MessageHeaders.ACK);
            // and handle the response
            this.handleMessage(msg);
            break;
        }
        logger_1.log("io", `the receive buffer is empty, waiting for the next chunk...`, "debug");
    }
    handleMessage(msg) {
        // TODO: find a nice way to serialize the messages
        // log("driver", `handling response ${stringify(msg)}`, "debug");
        logger_1.log("io", `handling response (${Constants_1.FunctionType[msg.functionType]}${Constants_1.MessageType[msg.type]})`, "debug");
        if (msg instanceof SendDataMessages_1.SendDataRequest || msg instanceof SendDataMessages_1.SendDataResponse) {
            logger_1.log("io", `  ${strings_1.stringify(msg)}`, "debug");
        }
        if (ICommandClassContainer_1.isCommandClassContainer(msg)) {
            logger_1.log("io", `  ${strings_1.stringify(msg.command)}`, "debug");
        }
        // if we have a pending request, check if that is waiting for this message
        if (this.currentTransaction != null) {
            switch (this.currentTransaction.message.testResponse(msg)) {
                case "intermediate":
                    // no need to process intermediate responses, as they only tell us things are good
                    logger_1.log("io", `  received intermediate response to current transaction`, "debug");
                    return;
                case "fatal_controller":
                    // The message was not sent
                    if (this.mayRetryCurrentTransaction()) {
                        // The Z-Wave specs define 500ms as the waiting period for SendData messages
                        const timeout = this.retryCurrentTransaction(500);
                        logger_1.log("io", `  the message for the current transaction could not be sent, scheduling attempt (${this.currentTransaction.sendAttempts}/${this.currentTransaction.maxSendAttempts}) in ${timeout} ms...`, "warn");
                    }
                    else {
                        logger_1.log("io", `  the message for the current transaction could not be sent after ${this.currentTransaction.maxSendAttempts} attempts, dropping the transaction`, "warn");
                        if (this.currentTransaction.promise != null) {
                            const errorMsg = `The message could not be sent`;
                            this.rejectCurrentTransaction(new ZWaveError_1.ZWaveError(errorMsg, ZWaveError_1.ZWaveErrorCodes.Controller_MessageDropped));
                        }
                    }
                    return;
                case "fatal_node":
                    // The node did not respond
                    const node = this.currentTransaction.message.getNodeUnsafe();
                    if (node && node.supportsCC(CommandClass_1.CommandClasses["Wake Up"])) {
                        logger_1.log("driver", `  ${node.logPrefix}The node did not respond because it is asleep, moving its messages to the wakeup queue`, "debug");
                        // The node is asleep
                        WakeUpCC_1.WakeUpCC.setAwake(this, node, false);
                        // Move all its pending messages to the WakeupQueue
                        // This clears the current transaction
                        this.moveMessagesToWakeupQueue(node.id);
                        // And continue with the next messages
                        setImmediate(() => this.workOffSendQueue());
                    }
                    else if (this.mayRetryCurrentTransaction()) {
                        // The Z-Wave specs define 500ms as the waiting period for SendData messages
                        const timeout = this.retryCurrentTransaction(500);
                        logger_1.log("io", `  ${node.logPrefix}The node did not respond to the current transaction, scheduling attempt (${this.currentTransaction.sendAttempts}/${this.currentTransaction.maxSendAttempts}) in ${timeout} ms...`, "warn");
                    }
                    else {
                        logger_1.log("io", `  ${node.logPrefix}The node did not respond to the current transaction after ${this.currentTransaction.maxSendAttempts} attempts, dropping it`, "warn");
                        if (this.currentTransaction.promise != null) {
                            const errorMsg = msg instanceof SendDataMessages_1.SendDataRequest
                                ? `The node did not respond (${SendDataMessages_1.TransmitStatus[msg.transmitStatus]})`
                                : `The node did not respond`;
                            this.rejectCurrentTransaction(new ZWaveError_1.ZWaveError(errorMsg, ZWaveError_1.ZWaveErrorCodes.Controller_MessageDropped));
                        }
                    }
                    return;
                case "final":
                    // this is the expected response!
                    logger_1.log("io", `  received expected response to current transaction`, "debug");
                    this.currentTransaction.response = msg;
                    if (!this.currentTransaction.ackPending) {
                        logger_1.log("io", `  ACK already received, resolving transaction`, "debug");
                        logger_1.log("driver", `  transaction complete`, "debug");
                        this.resolveCurrentTransaction();
                    }
                    else {
                        // wait for the ack, it might be received out of order
                        logger_1.log("io", `  no ACK received yet, remembering response`, "debug");
                    }
                    // if the response was expected, don't check any more handlers
                    return;
                default: // unexpected, nothing to do here => check registered handlers
                    break;
            }
        }
        if (msg.type === Constants_1.MessageType.Request) {
            // This is a request we might have registered handlers for
            this.handleRequest(msg);
        }
        else {
            logger_1.log("driver", `  unexpected response, discarding...`, "debug");
        }
    }
    /**
     * Registers a handler for all kinds of request messages
     * @param fnType The function type to register the handler for
     * @param handler The request handler callback
     * @param oneTime Whether the handler should be removed after its first successful invocation
     */
    registerRequestHandler(fnType, handler, oneTime = false) {
        if (fnType === Constants_1.FunctionType.SendData) {
            throw new Error("Cannot register a generic request handler for SendData requests. " +
                "Use `registerSendDataRequestHandler()` instead!");
        }
        const handlers = this.requestHandlers.has(fnType) ? this.requestHandlers.get(fnType) : [];
        const entry = { invoke: handler, oneTime };
        handlers.push(entry);
        logger_1.log("driver", `added${oneTime ? " one-time" : ""} request handler for ${Constants_1.FunctionType[fnType]} (${fnType})... ${handlers.length} registered`, "debug");
        this.requestHandlers.set(fnType, handlers);
    }
    /**
     * Unregisters a handler for all kinds of request messages
     * @param fnType The function type to unregister the handler for
     * @param handler The previously registered request handler callback
     */
    unregisterRequestHandler(fnType, handler) {
        if (fnType === Constants_1.FunctionType.SendData) {
            throw new Error("Cannot unregister a generic request handler for SendData requests. " +
                "Use `unregisterSendDataRequestHandler()` instead!");
        }
        const handlers = this.requestHandlers.has(fnType) ? this.requestHandlers.get(fnType) : [];
        for (let i = 0, entry = handlers[i]; i < handlers.length; i++) {
            // remove the handler if it was found
            if (entry.invoke === handler) {
                handlers.splice(i, 1);
                break;
            }
        }
        logger_1.log("driver", `removed request handler for ${Constants_1.FunctionType[fnType]} (${fnType})... ${handlers.length} left`, "debug");
        this.requestHandlers.set(fnType, handlers);
    }
    /**
     * Registers a handler for SendData request messages
     * @param cc The command class to register the handler for
     * @param handler The request handler callback
     */
    registerSendDataRequestHandler(cc, handler, oneTime = false) {
        const handlers = this.sendDataRequestHandlers.has(cc) ? this.sendDataRequestHandlers.get(cc) : [];
        const entry = { invoke: handler, oneTime };
        handlers.push(entry);
        logger_1.log("driver", `added${oneTime ? " one-time" : ""} send data request handler for ${CommandClass_1.CommandClasses[cc]} (${cc})... ${handlers.length} registered`, "debug");
        this.sendDataRequestHandlers.set(cc, handlers);
    }
    /**
     * Unregisters a handler for SendData request messages
     * @param cc The command class to unregister the handler for
     * @param handler The previously registered request handler callback
     */
    unregisterSendDataRequestHandler(cc, handler) {
        const handlers = this.sendDataRequestHandlers.has(cc) ? this.sendDataRequestHandlers.get(cc) : [];
        for (let i = 0, entry = handlers[i]; i < handlers.length; i++) {
            // remove the handler if it was found
            if (entry.invoke === handler) {
                handlers.splice(i, 1);
                break;
            }
        }
        logger_1.log("driver", `removed send data request handler for ${CommandClass_1.CommandClasses[cc]} (${cc})... ${handlers.length} left`, "debug");
        this.sendDataRequestHandlers.set(cc, handlers);
    }
    handleRequest(msg) {
        let handlers;
        // TODO: find a nice way to observe the different stages of a response.
        // for example a SendDataRequest with a VersionCC gets 3 responses:
        // 1. SendDataResponse with info if the data was sent
        // 2. SendDataRequest with info if the node responded
        // 3. ApplicationCommandRequest with the actual response
        if (msg instanceof ApplicationCommandRequest_1.ApplicationCommandRequest) {
            // we handle ApplicationCommandRequests differently because they are handled by the nodes directly
            const cc = msg.command.command;
            const nodeId = msg.command.nodeId;
            logger_1.log("driver", `handling application command request ${CommandClass_1.CommandClasses[cc]} (${strings_1.num2hex(cc)}) for node ${nodeId}`, "debug");
            // cannot handle ApplicationCommandRequests without a controller
            if (this.controller == null) {
                logger_1.log("driver", `  the controller is not ready yet, discarding...`, "debug");
                return;
            }
            else if (!this.controller.nodes.has(nodeId)) {
                logger_1.log("driver", `  the node is unknown or not initialized yet, discarding...`, "debug");
                return;
            }
            // dispatch the command to the node itself
            const node = this.controller.nodes.get(nodeId);
            node.handleCommand(msg.command);
            return;
        }
        else if (msg instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequest) {
            if (msg.updateType === ApplicationUpdateRequest_1.ApplicationUpdateTypes.NodeInfo_Received) {
                const node = msg.getNodeUnsafe();
                if (node) {
                    logger_1.log("driver", `Node info for node ${node.id} updated`, "debug");
                    node.updateNodeInfo(msg.nodeInformation);
                    return;
                }
            }
        }
        else if (msg instanceof SendDataMessages_1.SendDataRequest && msg.command != null) {
            // TODO: Find out if this actually happens
            // we handle SendDataRequests differently because their handlers are organized by the command class
            const cc = msg.command.command;
            logger_1.log("driver", `handling send data request ${CommandClass_1.CommandClasses[cc]} (${strings_1.num2hex(cc)}) for node ${msg.command.nodeId}`, "debug");
            handlers = this.sendDataRequestHandlers.get(cc);
        }
        else {
            logger_1.log("driver", `handling request ${Constants_1.FunctionType[msg.functionType]} (${msg.functionType})`, "debug");
            handlers = this.requestHandlers.get(msg.functionType);
        }
        logger_1.log("driver", `  ${strings_1.stringify(msg)}`, "debug");
        if (handlers != null && handlers.length > 0) {
            logger_1.log("driver", `  ${handlers.length} handler${handlers.length !== 1 ? "s" : ""} registered!`, "debug");
            // loop through all handlers and find the first one that returns true to indicate that it handled the message
            for (let i = 0; i < handlers.length; i++) {
                logger_1.log("driver", `  invoking handler #${i}`, "debug");
                const handler = handlers[i];
                if (handler.invoke(msg)) {
                    logger_1.log("driver", `  message was handled`, "debug");
                    if (handler.oneTime) {
                        logger_1.log("driver", "  one-time handler was successfully called, removing it...", "debug");
                        handlers.splice(i, 1);
                    }
                    // don't invoke any more handlers
                    break;
                }
            }
        }
        else {
            logger_1.log("driver", "  no handlers registered!", "warn");
        }
    }
    handleACK() {
        // if we have a pending request waiting for the ACK, ACK it
        const trnsact = this.currentTransaction;
        if (trnsact != null &&
            trnsact.ackPending) {
            logger_1.log("io", "ACK received for current transaction", "debug");
            trnsact.ackPending = false;
            if (trnsact.message.expectedResponse == null
                || trnsact.response != null) {
                logger_1.log("io", "transaction finished, resolving...", "debug");
                logger_1.log("driver", `transaction complete`, "debug");
                // if the response has been received prior to this, resolve the request
                // if no response was expected, also resolve the request
                this.resolveCurrentTransaction(false);
            }
            return;
        }
        // TODO: what to do with this ACK?
        logger_1.log("io", "ACK received but I don't know what it belongs to...", "debug");
    }
    handleNAK() {
        // TODO: what to do with this NAK?
        logger_1.log("io", "NAK received. TODO: handle it", "warn");
    }
    handleCAN() {
        if (this.currentTransaction != null) {
            if (this.mayRetryCurrentTransaction()) {
                const timeout = this.retryCurrentTransaction();
                logger_1.log("io", `CAN received - scheduling transmission attempt (${this.currentTransaction.sendAttempts}/${this.currentTransaction.maxSendAttempts}) in ${timeout} ms...`, "warn");
            }
            else {
                logger_1.log("io", `CAN received - maximum transmission attempts for the current transaction reached, dropping it...`, "warn");
                this.rejectCurrentTransaction(new ZWaveError_1.ZWaveError(`The message was dropped by the controller after ${this.currentTransaction.maxSendAttempts} attempts`, ZWaveError_1.ZWaveErrorCodes.Controller_MessageDropped), false /* don't resume queue, that happens automatically */);
            }
        }
        // else: TODO: what to do with this CAN?
    }
    mayRetryCurrentTransaction() {
        return this.currentTransaction.sendAttempts < this.currentTransaction.maxSendAttempts;
    }
    /** Retries the current transaction and returns the calculated timeout */
    retryCurrentTransaction(timeout) {
        // If no timeout was given, fallback to the default timeout as defined in the Z-Wave specs
        if (!timeout) {
            timeout = 100 + 1000 * (this.currentTransaction.sendAttempts - 1);
        }
        this.currentTransaction.sendAttempts++;
        setTimeout(() => this.retransmit(), timeout);
        return timeout;
    }
    /**
     * Resolves the current transaction with the given value
     * and resumes the queue handling
     */
    resolveCurrentTransaction(resumeQueue = true) {
        const node = this.currentTransaction.message.getNodeUnsafe();
        logger_1.log("io", `resolving current transaction with ${strings_1.stringify(this.currentTransaction.response)}`, "debug");
        this.currentTransaction.promise.resolve(this.currentTransaction.response);
        this.currentTransaction = null;
        // If a sleeping node has no messages pending, send it back to sleep
        if (node && node.supportsCC(CommandClass_1.CommandClasses["Wake Up"]) && !this.hasPendingMessages(node)) {
            node.sendNoMoreInformation();
        }
        // Resume the send queue
        if (resumeQueue) {
            logger_1.log("io", `resuming send queue`, "debug");
            setImmediate(() => this.workOffSendQueue());
        }
    }
    /**
     * Rejects the current transaction with the given value
     * and resumes the queue handling
     */
    rejectCurrentTransaction(reason, resumeQueue = true) {
        logger_1.log("io", `rejecting current transaction because "${reason.message}"`, "debug");
        if (this.currentTransaction.promise != null)
            this.currentTransaction.promise.reject(reason);
        this.currentTransaction = null;
        // and see if there are messages pending
        if (resumeQueue) {
            logger_1.log("io", `resuming send queue`, "debug");
            setImmediate(() => this.workOffSendQueue());
        }
    }
    // tslint:enable:unified-signatures
    async sendMessage(msg, priorityOrCheck, supportCheck) {
        // sort out the arguments
        if (isMessageSupportCheck(priorityOrCheck)) {
            supportCheck = priorityOrCheck;
            priorityOrCheck = undefined;
        }
        // now priorityOrCheck is either undefined or a MessagePriority
        const priority = priorityOrCheck != null
            ? priorityOrCheck
            : Message_1.getDefaultPriority(msg);
        if (supportCheck == null)
            supportCheck = "loud";
        this.ensureReady();
        if (priority == null) {
            const className = msg.constructor.name;
            const msgTypeName = Constants_1.FunctionType[msg.functionType];
            throw new ZWaveError_1.ZWaveError(`No default priority has been defined for ${className} (${msgTypeName}), so you have to provide one for your message`, ZWaveError_1.ZWaveErrorCodes.Driver_NoPriority);
        }
        if (supportCheck !== "none"
            && this.controller != null
            && !this.controller.isFunctionSupported(msg.functionType)) {
            if (supportCheck === "loud") {
                throw new ZWaveError_1.ZWaveError(`Your hardware does not support the ${Constants_1.FunctionType[msg.functionType]} function`, ZWaveError_1.ZWaveErrorCodes.Driver_NotSupported);
            }
            else {
                return undefined;
            }
        }
        logger_1.log("driver", `sending message ${strings_1.stringify(msg)} with priority ${Constants_1.MessagePriority[priority]} (${priority})`, "debug");
        // create the transaction and enqueue it
        const promise = deferred_promise_1.createDeferredPromise();
        const transaction = new Transaction_1.Transaction(this, msg, promise, priority);
        this.sendQueue.add(transaction);
        logger_1.log("io", `added message to the send queue, new length = ${this.sendQueue.length}`, "debug");
        // start sending now (maybe)
        setImmediate(() => this.workOffSendQueue());
        return promise;
    }
    // wotan-enable no-misused-generics
    /**
     * Sends a low-level message like ACK, NAK or CAN immediately
     * @param message The low-level message to send
     */
    send(header) {
        // ACK, CAN, NAK
        logger_1.log("io", `sending ${Constants_1.MessageHeaders[header]}`, "debug");
        this.doSend(Buffer.from([header]));
        return;
    }
    workOffSendQueue() {
        if (this.sendQueueTimer != null) {
            clearTimeout(this.sendQueueTimer);
            delete this.sendQueueTimer;
        }
        // is there something to send?
        if (this.sendQueue.length === 0) {
            logger_1.log("io", `workOffSendQueue > queue is empty`, "debug");
            return;
        }
        // we are still waiting for the current transaction to finish
        if (this.currentTransaction != null) {
            logger_1.log("io", `workOffSendQueue > skipping because a transaction is pending`, "debug");
            return;
        }
        // Before doing anything else, check if this message is for a node that's currently asleep
        // The automated sorting ensures there's no message for a non-sleeping node after that
        const targetNode = this.sendQueue.peekStart().message.getNodeUnsafe();
        if (!targetNode || targetNode.isAwake()) {
            // get the next transaction
            this.currentTransaction = this.sendQueue.shift();
            const msg = this.currentTransaction.message;
            logger_1.log("io", `workOffSendQueue > sending next message (${Constants_1.FunctionType[msg.functionType]})...`, "debug");
            // for messages containing a CC, i.e. a SendDataRequest, set the CC version as high as possible
            if (ICommandClassContainer_1.isCommandClassContainer(msg)) {
                const cc = msg.command.command;
                msg.command.version = this.getSafeCCVersionForNode(msg.command.nodeId, cc);
                logger_1.log("io", `  CC = ${CommandClass_1.CommandClasses[cc]} (${strings_1.num2hex(cc)}) => using version ${msg.command.version}`, "debug");
            }
            const data = msg.serialize();
            logger_1.log("io", `  data = 0x${data.toString("hex")}`, "debug");
            logger_1.log("io", `  remaining queue length = ${this.sendQueue.length}`, "debug");
            // Mark the transaction as being sent
            this.currentTransaction.sendAttempts = 1;
            this.doSend(data);
            // to avoid any deadlocks we didn't think of, re-call this later
            this.sendQueueTimer = setTimeout(() => this.workOffSendQueue(), 1000);
        }
        else {
            logger_1.log("io", `workOffSendQueue > The remaining messages are for sleeping nodes, not sending anything!`, "debug");
        }
    }
    retransmit() {
        if (this.currentTransaction == null)
            return;
        const msg = this.currentTransaction.message;
        logger_1.log("io", `retransmit > resending message (${Constants_1.FunctionType[msg.functionType]})...`, "debug");
        const data = msg.serialize();
        logger_1.log("io", `  data = 0x${data.toString("hex")}`, "debug");
        this.doSend(data);
    }
    doSend(data) {
        this.serial.write(data);
    }
    /** Moves all messages for a given node into the wakeup queue */
    moveMessagesToWakeupQueue(nodeId) {
        for (const transaction of this.sendQueue) {
            const msg = transaction.message;
            const targetNodeId = msg.getNodeId();
            if (targetNodeId === nodeId) {
                // Change the priority to WakeUp
                transaction.priority = Constants_1.MessagePriority.WakeUp;
            }
        }
        // Changing the priority has an effect on the order, so re-sort the send queue
        this.sortSendQueue();
        // Don't forget the current transaction
        if (this.currentTransaction && this.currentTransaction.message.getNodeId() === nodeId) {
            // Change the priority to WakeUp and re-add it to the queue
            this.currentTransaction.priority = Constants_1.MessagePriority.WakeUp;
            this.sendQueue.add(this.currentTransaction);
            // Reset send attempts - we might have already used all of them
            this.currentTransaction.sendAttempts = 0;
            // "reset" the current transaction to none
            this.currentTransaction = null;
        }
    }
    sortSendQueue() {
        const items = [...this.sendQueue];
        this.sendQueue.clear();
        this.sendQueue.add(...items);
    }
    /**
     * Saves the current configuration and collected data about the controller and all nodes to a cache file.
     * For performance reasons, these calls may be throttled
     */
    async saveNetworkToCache() {
        // Ensure this method isn't being executed too often
        if (Date.now() - this.lastSaveToCache < this.saveToCacheInterval) {
            // Schedule a save in a couple of ms to collect changes
            if (!this.saveToCacheTimer) {
                this.saveToCacheTimer = setTimeout(() => void this.saveNetworkToCache(), this.saveToCacheInterval);
            }
            return;
        }
        else {
            this.saveToCacheTimer = undefined;
        }
        this.lastSaveToCache = Date.now();
        const cacheFile = path.join(this.cacheDir, this.controller.homeId.toString(16) + ".json");
        const serializedObj = this.controller.serialize();
        await fs.ensureDir(this.cacheDir);
        await fs.writeJSON(cacheFile, serializedObj, { spaces: 4 });
    }
    /**
     * Restores a previously stored zwave network state from cache to speed up the startup process
     */
    async restoreNetworkFromCache() {
        if (!this.controller.homeId)
            return;
        const cacheFile = path.join(this.cacheDir, this.controller.homeId.toString(16) + ".json");
        if (!await fs.pathExists(cacheFile))
            return;
        try {
            logger_1.log("driver", `Cache file for homeId ${strings_1.num2hex(this.controller.homeId)} found, attempting to restore the network from cache`, "debug");
            const cacheObj = await fs.readJSON(cacheFile);
            this.controller.deserialize(cacheObj);
            logger_1.log("driver", `  Restoring the network from cache was successful!`, "error");
        }
        catch (e) {
            logger_1.log("driver", `  restoring the network from cache failed: ${e}`, "error");
        }
    }
}
exports.Driver = Driver;
/** Skips the first n bytes of a buffer and returns the rest */
function skipBytes(buf, n) {
    return Buffer.from(buf.slice(n));
}
