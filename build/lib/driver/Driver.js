"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const SerialPort = require("serialport");
const Message_1 = require("../message/Message");
const defer_promise_1 = require("../util/defer-promise");
const logger_1 = require("../util/logger");
class Driver extends events_1.EventEmitter {
    // TODO: add a way to subscribe to nodes
    constructor(port, options) {
        super();
        this.port = port;
        this.options = options;
        // register some cleanup handlers in case the program doesn't get closed cleanly
        process.on("exit", () => this.destroy());
        process.on("SIGINT", () => this.destroy());
        process.on("uncaughtException", () => this.destroy());
    }
    start() {
        return new Promise((resolve, reject) => {
            logger_1.log(`starting driver...`, "debug");
            this.serial = new SerialPort(this.port, {
                autoOpen: false,
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: "none",
            });
            this.serial
                .on("open", () => {
                logger_1.log("serial port opened", "debug");
                resolve();
                this.reset();
                this.serialport_onOpen();
            })
                .on("data", this.serialport_onData.bind(this))
                .on("error", err => {
                logger_1.log("serial port errored: " + err, "error");
                reject(err); // this has no effect if the promise is already resolved
                this.serialport_onError(err);
            });
            this.serial.open();
        });
    }
    reset() {
        // TODO: sent NAK to re-sync communication
        // clear buffers
        this.receiveBuffer = Buffer.from([]);
        this.sendQueue = [];
        // clear the currently pending request
        if (this.currentTransaction != null && this.currentTransaction.promise != null) {
            this.currentTransaction.promise.reject("The driver was reset");
        }
        this.currentTransaction = null;
    }
    /**
     * Terminates the driver instance and closes the underlying serial connection.
     * Must be called under any circumstances.
     */
    destroy() {
        // the serialport must be closed in any case
        if (this.serial != null) {
            this.serial.close();
            delete this.serial;
        }
    }
    serialport_onOpen() {
        // TODO: do we need this?
    }
    serialport_onError(err) {
        this.emit("error", err);
    }
    serialport_onData(data) {
        logger_1.log(`received data: ${data.toString("hex")}`, "debug");
        // append the new data to our receive buffer
        this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
        logger_1.log(`receiveBuffer: ${this.receiveBuffer.toString("hex")}`, "debug");
        while (true) {
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
                        // TODO: handle invalid data
                        throw new Error("invalid data");
                    }
                }
                this.receiveBuffer = skipBytes(this.receiveBuffer, 1);
            }
            // nothing to do yet, wait for the next data
            const msgComplete = Message_1.Message.isComplete(this.receiveBuffer);
            logger_1.log(`message complete: ${msgComplete}`, "debug");
            if (!msgComplete)
                return;
            // parse a message - first find the correct constructor
            // tslint:disable-next-line:variable-name
            const MessageConstructor = Message_1.Message.getConstructor(this.receiveBuffer);
            const msg = new MessageConstructor();
            const readBytes = msg.deserialize(this.receiveBuffer);
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
    }
    handleResponse(msg) {
        // TODO: find a nice way to serialize the messages
        logger_1.log(`handling response for message ${JSON.stringify(msg, null, 4)}`, "debug");
        // if we have a pending request, check if that is waiting for this message
        if (this.currentTransaction != null &&
            this.currentTransaction.originalMessage != null &&
            this.currentTransaction.originalMessage.expectedResponse === msg.functionType) {
            if (!this.currentTransaction.ackPending) {
                this.currentTransaction.promise.resolve(msg);
                this.currentTransaction = null;
            }
            else {
                // wait for the ack, it might be received out of order
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
        logger_1.log("ACK received", "debug");
        // if we have a pending request waiting for the ACK, ACK it
        if (this.currentTransaction != null &&
            this.currentTransaction.ackPending) {
            this.currentTransaction.ackPending = false;
            if (this.currentTransaction.response != null) {
                // if the response has been received prior to this, resolve the request
                this.currentTransaction.promise.resolve(this.currentTransaction.response);
                this.currentTransaction = null;
                return;
            }
        }
        // TODO: what to do with this ACK?
    }
    handleNAK() {
        // TODO: what to do with this NAK?
        logger_1.log("NAK received", "debug");
    }
    handleCAN() {
        // TODO: what to do with this CAN?
        logger_1.log("CAN received", "debug");
    }
    /** Sends a message to the Z-Wave stick */
    sendMessage(msg) {
        const promise = defer_promise_1.createDeferredPromise();
        const transaction = {
            ackPending: true,
            originalMessage: msg,
            promise,
            response: null,
        };
        this.send(transaction);
        return promise;
    }
    /**
     * Queues a message for sending
     * @param message The message to send
     * @param highPriority Whether the message should be prioritized
     */
    send(data, priority = "normal") {
        if (typeof data === "number") {
            // ACK, CAN, NAK
            logger_1.log(`sending ${Message_1.MessageHeaders[data]}`, "debug");
            this.doSend(data);
            return;
        }
        switch (priority) {
            case "immediate": {
                // TODO: check if that's okay
                // Send high-prio messages immediately
                logger_1.log(`sending high priority message ${data.toString()} immediately`, "debug");
                this.doSend(data);
                break;
            }
            case "normal": {
                // Put the message in the queue
                this.sendQueue.push(data);
                logger_1.log(`added message to the send queue with normal priority, new length = ${this.sendQueue.length}`, "debug");
                break;
            }
            case "high": {
                // Put the message in the queue (in first position)
                // TODO: do we need this in ZWave?
                this.sendQueue.unshift(data);
                logger_1.log(`added message to the send queue with high priority, new length = ${this.sendQueue.length}`, "debug");
                break;
            }
        }
        // start working it off now (maybe)
        this.workOffSendQueue();
    }
    workOffSendQueue() {
        // we are still waiting for the current transaction to finish
        if (this.currentTransaction != null) {
            logger_1.log(`workOffSendQueue > skipping because a transaction is pending`, "debug");
            return;
        }
        const nextMsg = this.sendQueue.shift();
        if (!(nextMsg instanceof Message_1.Message)) {
            // this is a pending request
            this.currentTransaction = nextMsg;
        }
        logger_1.log(`workOffSendQueue > sending next message... remaining queue length = ${this.sendQueue.length}`, "debug");
        this.doSend(nextMsg);
        // to avoid any deadlocks we didn't think of, re-call this later
        setTimeout(() => this.workOffSendQueue(), 1000);
    }
    doSend(data) {
        if (typeof data === "number") {
            // 1-byte-responses
            this.serial.write([data]);
        }
        else {
            // TODO: queue for retransmission
            const msg = data instanceof Message_1.Message ?
                data :
                data.originalMessage;
            this.serial.write(msg.serialize());
        }
        // TODO: find out if we need to drain
    }
}
exports.Driver = Driver;
/** Skips the first n bytes of a buffer and returns the rest */
function skipBytes(buf, n) {
    return Buffer.from(buf.slice(n, 0));
}
