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
const ZWaveError_1 = require("../error/ZWaveError");
const Message_1 = require("../message/Message");
const comparable_1 = require("../util/comparable");
const defer_promise_1 = require("../util/defer-promise");
const logger_1 = require("../util/logger");
const object_polyfill_1 = require("../util/object-polyfill");
const sorted_list_1 = require("../util/sorted-list");
const strings_1 = require("../util/strings");
const Controller_1 = require("./Controller");
/** Returns a timestamp with nano-second precision */
function highResTimestamp() {
    const [s, ns] = process.hrtime();
    return s * 1e9 + ns;
}
class Transaction {
    constructor(message, promise, priority, timestamp = highResTimestamp(), ackPending = true, response) {
        this.message = message;
        this.promise = promise;
        this.priority = priority;
        this.timestamp = timestamp;
        this.ackPending = ackPending;
        this.response = response;
    }
    compareTo(other) {
        // first sort by priority
        if (this.priority < other.priority)
            return -1;
        else if (this.priority > other.priority)
            return 1;
        // for equal priority, sort by the timestamp
        return comparable_1.compareNumberOrString(other.timestamp, this.timestamp);
        // TODO: do we need to sort by the message itself?
    }
}
const defaultOptions = {
    timeouts: {
        ack: 1000,
        byte: 150,
    },
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
            else if (typeof target[key] !== "undefined") {
                // don't override single keys
                target[key] = value;
            }
        }
    }
    return target;
}
class Driver extends events_1.EventEmitter {
    constructor(port, 
    /** @internal */
    options) {
        super();
        this.port = port;
        this.options = options;
        this.sendQueue = new sorted_list_1.SortedList();
        this._wasStarted = false;
        this._isOpen = false;
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
                .on("open", () => {
                logger_1.log("driver", "serial port opened", "debug");
                this._isOpen = true;
                resolve();
                this.reset();
                setImmediate(() => this.beginInterview());
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
    beginInterview() {
        return __awaiter(this, void 0, void 0, function* () {
            // Interview the controller
            this._controller = new Controller_1.ZWaveController();
            yield this._controller.interview(this);
            logger_1.log("driver", "driver ready", "debug");
            this.emit("driver ready");
            // Now query all nodes
            for (const node of this._controller.nodes.values()) {
                node.query();
            }
        });
    }
    reset() {
        this.ensureReady();
        logger_1.log("driver", "resetting driver instance...", "debug");
        // re-sync communication
        this.send(Message_1.MessageHeaders.NAK);
        // clear buffers
        this.receiveBuffer = Buffer.from([]);
        this.sendQueue.clear();
        // clear the currently pending request
        if (this.currentTransaction != null && this.currentTransaction.promise != null) {
            this.currentTransaction.promise.reject("The driver was reset");
        }
        this.currentTransaction = null;
    }
    ensureReady() {
        if (this._wasStarted && this._isOpen && !this._wasDestroyed)
            return;
        throw new ZWaveError_1.ZWaveError("The driver is not ready or has been destroyed", ZWaveError_1.ZWaveErrorCodes.Driver_NotReady);
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
    onInvalidData() {
        this.emit("error", new ZWaveError_1.ZWaveError("The receive buffer contains invalid data, resetting...", ZWaveError_1.ZWaveErrorCodes.Driver_InvalidDataReceived));
        this.reset();
    }
    serialport_onData(data) {
        logger_1.log("io", `received data: 0x${data.toString("hex")}`, "debug");
        // append the new data to our receive buffer
        this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
        logger_1.log("io", `receiveBuffer: 0x${this.receiveBuffer.toString("hex")}`, "debug");
        while (this.receiveBuffer.length > 0) {
            if (this.receiveBuffer[0] !== Message_1.MessageHeaders.SOF) {
                switch (this.receiveBuffer[0]) {
                    // single-byte messages - we have a handler for each one
                    case Message_1.MessageHeaders.ACK: {
                        this.handleACK();
                        break;
                    }
                    case Message_1.MessageHeaders.NAK: {
                        this.handleNAK();
                        break;
                    }
                    case Message_1.MessageHeaders.CAN: {
                        this.handleCAN();
                        break;
                    }
                    default: {
                        this.onInvalidData();
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
            // parse a message - first find the correct constructor
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
                        this.onInvalidData();
                        return;
                    }
                }
                // pass it through;
                throw e;
            }
            // and cut the read bytes from our buffer
            this.receiveBuffer = Buffer.from(this.receiveBuffer.slice(readBytes));
            // all good, send ACK
            this.send(Message_1.MessageHeaders.ACK);
            if (msg.type === Message_1.MessageType.Response) {
                this.handleResponse(msg);
            }
            else if (msg.type === Message_1.MessageType.Request) {
                this.handleRequest(msg);
            }
            break;
        }
        logger_1.log("io", `the receive buffer is empty, waiting for the next chunk...`, "debug");
    }
    handleResponse(msg) {
        // TODO: find a nice way to serialize the messages
        logger_1.log("driver", `handling response ${strings_1.stringify(msg)}`, "debug");
        // if we have a pending request, check if that is waiting for this message
        if (this.currentTransaction != null &&
            this.currentTransaction.message != null &&
            this.currentTransaction.message.expectedResponse === msg.functionType) {
            if (!this.currentTransaction.ackPending) {
                logger_1.log("io", `ACK already received, resolving transaction`, "debug");
                logger_1.log("driver", `transaction complete`, "debug");
                this.currentTransaction.promise.resolve(msg);
                this.currentTransaction = null;
                // and see if there are messages pending
                setImmediate(() => this.workOffSendQueue());
            }
            else {
                // wait for the ack, it might be received out of order
                logger_1.log("io", `no ACK received yet, remembering response`, "debug");
                this.currentTransaction.response = msg;
            }
            return;
        }
        // TODO: what to do with this message?
    }
    handleRequest(msg) {
        logger_1.log("TODO: implement request handler for messages", "warn");
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
                trnsact.promise.resolve(trnsact.response);
                delete this.currentTransaction;
                // and see if there are messages pending
                setImmediate(() => this.workOffSendQueue());
            }
            return;
        }
        // TODO: what to do with this ACK?
        logger_1.log("io", "ACK received but I don't know what it belongs to...", "debug");
    }
    handleNAK() {
        // TODO: what to do with this NAK?
        logger_1.log("io", "NAK received", "debug");
    }
    handleCAN() {
        // TODO: what to do with this CAN?
        logger_1.log("io", "CAN received", "debug");
    }
    /**
     * Sends a message with default priority to the Z-Wave stick
     * @param msg The message to send
     * @param supportCheck How to check for the support of the message to send. If the message is not supported:
     * * "loud" means the call will throw
     * * "silent" means the call will resolve with `undefined`
     * * "none" means the message will be sent anyways. This is useful if the capabilities haven't been determined yet.
     * @param priority The priority of the message to send. If none is given, the defined default priority of the message
     * class will be used.
     */
    sendMessage(msg, supportCheck = "loud", priority = Message_1.getDefaultPriority(msg)) {
        return __awaiter(this, void 0, void 0, function* () {
            this.ensureReady();
            if (priority == null) {
                throw new ZWaveError_1.ZWaveError(`No default priority has been defined for ${msg.constructor.name}, so you have to provide one for your message`, ZWaveError_1.ZWaveErrorCodes.Driver_NoPriority);
            }
            if (supportCheck !== "none"
                && this.controller != null
                && !this.controller.isFunctionSupported(msg.functionType)) {
                if (supportCheck === "loud") {
                    throw new ZWaveError_1.ZWaveError(`Your hardware does not support the ${Message_1.FunctionType[msg.functionType]} function`, ZWaveError_1.ZWaveErrorCodes.Driver_NotSupported);
                }
                else {
                    return undefined;
                }
            }
            logger_1.log("driver", `sending message ${strings_1.stringify(msg)} with priority ${Message_1.MessagePriority[priority]} (${priority})`, "debug");
            // create the transaction and enqueue it
            const promise = defer_promise_1.createDeferredPromise();
            const transaction = new Transaction(msg, promise, priority);
            logger_1.log("io", `added message to the send queue, new length = ${this.sendQueue.length}`, "debug");
            this.sendQueue.add(transaction);
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
        logger_1.log("io", `sending ${Message_1.MessageHeaders[header]}`, "debug");
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
        logger_1.log("io", `workOffSendQueue > sending next message... remaining queue length = ${this.sendQueue.length}`, "debug");
        this.currentTransaction = next;
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
