"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const SerialPort = require("serialport");
const ApplicationCommandRequest_1 = require("../commandclass/ApplicationCommandRequest");
const CommandClass_1 = require("../commandclass/CommandClass");
const ICommandClassContainer_1 = require("../commandclass/ICommandClassContainer");
const SendDataMessages_1 = require("../commandclass/SendDataMessages");
const Controller_1 = require("../controller/Controller");
const ZWaveError_1 = require("../error/ZWaveError");
const Constants_1 = require("../message/Constants");
const Message_1 = require("../message/Message");
const defer_promise_1 = require("../util/defer-promise");
const logger_1 = require("../util/logger");
const object_polyfill_1 = require("../util/object-polyfill");
const sorted_list_1 = require("../util/sorted-list");
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
    for (const [key, value] of object_polyfill_1.entries(source)) {
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
        this._wasStarted = false;
        this._isOpen = false;
        this._controllerInterviewed = false;
        this._wasDestroyed = false;
        this._cleanupHandler = () => this.destroy();
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
                .on("open", () => __awaiter(this, void 0, void 0, function* () {
                logger_1.log("driver", "serial port opened", "debug");
                this._isOpen = true;
                this.resetIO();
                resolve();
                setImmediate(() => this.initializeControllerAndNodes());
            }))
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
    initializeControllerAndNodes() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._controller == null)
                this._controller = new Controller_1.ZWaveController(this);
            if (!this.options.skipInterview) {
                // Interview the controller
                yield this._controller.interview();
            }
            // in any case we need to emit the driver ready event here
            this._controllerInterviewed = true;
            logger_1.log("driver", "driver ready", "debug");
            this.emit("driver ready");
            if (!this.options.skipInterview) {
                // Now interview all nodes
                // don't await them, so the beginInterview method returns
                for (const node of this._controller.nodes.values()) {
                    // TODO: retry on failure or something...
                    node.interview().catch(e => logger_1.log("controller", "node interview failed: " + e, "error"));
                }
            }
        });
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
    hardReset() {
        return __awaiter(this, void 0, void 0, function* () {
            this.ensureReady(true);
            yield this._controller.hardReset();
            this._controllerInterviewed = false;
            this.initializeControllerAndNodes();
        });
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
    onInvalidData(data) {
        this.emit("error", new ZWaveError_1.ZWaveError(`The receive buffer contains invalid data (0x${data.toString("hex")}), resetting...`, ZWaveError_1.ZWaveErrorCodes.Driver_InvalidDataReceived));
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
                        this.onInvalidData(this.receiveBuffer);
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
            const msg = new MessageConstructor();
            let readBytes;
            try {
                readBytes = msg.deserialize(this.receiveBuffer);
            }
            catch (e) {
                if (e instanceof ZWaveError_1.ZWaveError) {
                    if (e.code === ZWaveError_1.ZWaveErrorCodes.PacketFormat_Invalid
                        || e.code === ZWaveError_1.ZWaveErrorCodes.PacketFormat_Checksum) {
                        this.onInvalidData(this.receiveBuffer);
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
        logger_1.log("driver", `handling response ${strings_1.stringify(msg)}`, "debug");
        // First do special handling for failed SendData requests
        if (msg.functionType === Constants_1.FunctionType.SendData) {
            if (this.handleSendDataMessageWithPotentialFailure(msg)) {
                // if the message was handled in the handler method, don't continue handling it
                return;
            }
        }
        // if we have a pending request, check if that is waiting for this message
        if (this.currentTransaction != null) {
            if (this.currentTransaction.isExpectedResponse(msg)) { // the message was final, so it resolves the transaction
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
     * Checks a send data message for failure and tries to handle it
     * @param msg The received send data message
     * @returns true if the message was handled
     */
    handleSendDataMessageWithPotentialFailure(msg) {
        if (msg instanceof SendDataMessages_1.SendDataResponse) {
            if (!msg.wasSent) {
                // The message was not sent
                logger_1.log("io", `  a send data request could not be sent, dropping the transaction`, "debug");
                if (this.currentTransaction != null
                    && this.currentTransaction.promise != null) {
                    this.rejectCurrentTransaction(new ZWaveError_1.ZWaveError(`The message could not be sent (code ${msg.errorCode})`, ZWaveError_1.ZWaveErrorCodes.Controller_MessageDropped));
                }
            }
            // a SendDataResponse should not undergo further processing
            return true;
        }
        else if (msg instanceof SendDataMessages_1.SendDataRequest) {
            // no error, so we don't handle it here
            if (!msg.isFailed())
                return false;
            // The message was sent but an error happened during transmission
            // TODO: implement retransmission!
            logger_1.log("io", `  The node did not respond to a send data request, dropping the transaction`, "debug");
            if (this.currentTransaction != null
                && this.currentTransaction.promise != null) {
                this.rejectCurrentTransaction(new ZWaveError_1.ZWaveError(`The node did not respond (${SendDataMessages_1.TransmitStatus[msg.transmitStatus]})`, ZWaveError_1.ZWaveErrorCodes.Controller_MessageDropped));
            }
            return true;
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
        else if (msg instanceof SendDataMessages_1.SendDataRequest && msg.command != null) {
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
            for (let i = 0; i <= handlers.length; i++) {
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
        // TODO: what to do with this CAN?
        logger_1.log("io", "CAN received - dropping current transaction. TODO: handle retransmission", "warn");
        if (this.currentTransaction != null
            && this.currentTransaction.promise != null) {
            logger_1.log("io", "  the dropped message is " + strings_1.stringify(this.currentTransaction.message), "warn");
            this.rejectCurrentTransaction(new ZWaveError_1.ZWaveError("The message was dropped by the controller", ZWaveError_1.ZWaveErrorCodes.Controller_MessageDropped), false /* don't resume queue, that happens automatically */);
        }
    }
    /**
     * Resolves the current transaction with the given value
     * and resumes the queue handling
     */
    resolveCurrentTransaction(resumeQueue = true) {
        logger_1.log("io", `resolving current transaction with ${this.currentTransaction.response}`, "debug");
        this.currentTransaction.promise.resolve(this.currentTransaction.response);
        this.currentTransaction = null;
        // and see if there are messages pending
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
        this.currentTransaction.promise.reject(reason);
        this.currentTransaction = null;
        // and see if there are messages pending
        if (resumeQueue) {
            logger_1.log("io", `resuming send queue`, "debug");
            setImmediate(() => this.workOffSendQueue());
        }
    }
    // tslint:enable:unified-signatures
    sendMessage(msg, priorityOrCheck, supportCheck) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const promise = defer_promise_1.createDeferredPromise();
            const transaction = new Transaction_1.Transaction(this, msg, promise, priority);
            this.sendQueue.add(transaction);
            logger_1.log("io", `added message to the send queue, new length = ${this.sendQueue.length}`, "debug");
            // start sending now (maybe)
            setImmediate(() => this.workOffSendQueue());
            return promise;
        });
    }
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
        // get the next transaction
        const next = this.sendQueue.shift();
        this.currentTransaction = next;
        const msg = next.message;
        logger_1.log("io", `workOffSendQueue > sending next message (${Constants_1.FunctionType[next.message.functionType]})...`, "debug");
        // for messages containing a CC, i.e. a SendDataRequest, set the CC version as high as possible
        if (ICommandClassContainer_1.isCommandClassContainer(msg)) {
            const cc = msg.command.command;
            msg.command.version = this.getSafeCCVersionForNode(msg.command.nodeId, cc);
            logger_1.log("io", `  CC = ${CommandClass_1.CommandClasses[cc]} (${strings_1.num2hex(cc)}) => using version ${msg.command.version}`, "debug");
        }
        const data = next.message.serialize();
        logger_1.log("io", `  data = 0x${data.toString("hex")}`, "debug");
        logger_1.log("io", `  remaining queue length = ${this.sendQueue.length}`, "debug");
        this.doSend(next.message.serialize());
        // to avoid any deadlocks we didn't think of, re-call this later
        this.sendQueueTimer = setTimeout(() => this.workOffSendQueue(), 1000);
    }
    doSend(data) {
        this.serial.write(data);
    }
}
exports.Driver = Driver;
/** Skips the first n bytes of a buffer and returns the rest */
function skipBytes(buf, n) {
    return Buffer.from(buf.slice(n, 0));
}
