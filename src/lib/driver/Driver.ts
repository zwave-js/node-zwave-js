import { EventEmitter } from "events";
import * as SerialPort from "serialport";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { Message, MessageHeaders, MessageType } from "../message/Message";
import { createDeferredPromise, DeferredPromise } from "../util/defer-promise";
import { log } from "../util/logger";
// TODO: expose debug namespaces

interface PendingRequest {
	originalMessage: Message;
	ackPending: boolean;
	response: Message;
	promise: DeferredPromise<Message>;
	// TODO: add a way to expire these
	// TODO: add a way to resend these
}

export type ZWaveOptions = Partial<{
	// none defined so far
	empty: never;
}>;

export class Driver extends EventEmitter {

	/** The serial port instance */
	private serial: SerialPort;
	/** A buffer of received but unprocessed data */
	private receiveBuffer: Buffer;
	/** The currently pending request */
	private currentTransaction: PendingRequest;
	private sendQueue: (PendingRequest | Message)[];
	// TODO: add a way to subscribe to nodes

	constructor(
		private port: string,
		private options?: ZWaveOptions,
	) {
		super();
		// register some cleanup handlers in case the program doesn't get closed cleanly
		process.on("exit", () => this.destroy());
		process.on("SIGINT", () => this.destroy());
		process.on("uncaughtException", () => this.destroy());
	}

	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			log(`starting driver...`, "debug");
			this.serial = new SerialPort(
				this.port,
				{
					autoOpen: false,
					baudRate: 115200,
					dataBits: 8,
					stopBits: 1,
					parity: "none",
				},
			);
			this.serial
				.on("open", () => {
					log("serial port opened", "debug");
					resolve();
					this.reset();
					this.serialport_onOpen();
				})
				.on("data", this.serialport_onData.bind(this))
				.on("error", err => {
					log("serial port errored: " + err, "error");
					reject(err); // this has no effect if the promise is already resolved
					this.serialport_onError(err);
				})
				;
			this.serial.open();
		});
	}

	private reset() {
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
	public destroy() {
		// the serialport must be closed in any case
		if (this.serial != null) {
			this.serial.close();
			delete this.serial;
		}
	}

	private serialport_onOpen() {
		// TODO: do we need this?
	}

	private serialport_onError(err: Error) {
		this.emit("error", err);
	}

	private serialport_onData(data: Buffer) {
		log(`received data: ${data.toString("hex")}`, "debug");
		// append the new data to our receive buffer
		this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
		log(`receiveBuffer: ${this.receiveBuffer.toString("hex")}`, "debug");

		while (true) { // TODO: add a way to interrupt

			if (this.receiveBuffer[0] !== MessageHeaders.SOF) {
				switch (this.receiveBuffer[0]) {
					// single-byte messages - we have a handler for each one
					case MessageHeaders.ACK: {
						this.handleACK();
						break;
					}
					case MessageHeaders.NAK: {
						this.handleNAK();
						break;
					}
					case MessageHeaders.CAN: {
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
			const msgComplete = Message.isComplete(this.receiveBuffer);
			log(`message complete: ${msgComplete}`, "debug");
			if (!msgComplete) return;

			// parse a message - first find the correct constructor
			// tslint:disable-next-line:variable-name
			const MessageConstructor = Message.getConstructor(this.receiveBuffer);
			const msg = new MessageConstructor();
			const readBytes = msg.deserialize(this.receiveBuffer);
			// and cut the read bytes from our buffer
			this.receiveBuffer = Buffer.from(this.receiveBuffer.slice(readBytes));

			// all good, send ACK
			this.send(MessageHeaders.ACK);

			if (msg.type === MessageType.Response) {
				this.handleResponse(msg);
			} else if (msg.type === MessageType.Request) {
				this.handleRequest(msg);
			}
			break;
		}

	}

	private handleResponse(msg: Message) {
		// TODO: find a nice way to serialize the messages
		log(`handling response for message ${JSON.stringify(msg, null, 4)}`, "debug");

		// if we have a pending request, check if that is waiting for this message
		if (
			this.currentTransaction != null &&
			this.currentTransaction.originalMessage != null &&
			this.currentTransaction.originalMessage.expectedResponse === msg.functionType
		) {
			if (!this.currentTransaction.ackPending) {
				this.currentTransaction.promise.resolve(msg);
				this.currentTransaction = null;
			} else {
				// wait for the ack, it might be received out of order
				this.currentTransaction.response = msg;
			}
			return;
		}

		// TODO: what to do with this message?
	}

	private handleRequest(msg: Message) {
		log("TODO: implement request handler for messages", "warn");
	}

	private handleACK() {
		log("ACK received", "debug");
		// if we have a pending request waiting for the ACK, ACK it
		if (
			this.currentTransaction != null &&
			this.currentTransaction.ackPending
		) {
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

	private handleNAK() {
		// TODO: what to do with this NAK?
		log("NAK received", "debug");
	}

	private handleCAN() {
		// TODO: what to do with this CAN?
		log("CAN received", "debug");
	}

	/** Sends a message to the Z-Wave stick */
	public sendMessage(msg: Message): Promise<Message> {
		const promise = createDeferredPromise<Message>();
		const transaction: PendingRequest = {
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
	private send(
		data: MessageHeaders | Message | PendingRequest,
		priority: "normal" | "high" | "immediate" = "normal",
	): void {

		if (typeof data === "number") {
			// ACK, CAN, NAK
			log(`sending ${MessageHeaders[data]}`, "debug");
			this.doSend(data);
			return;
		}

		switch (priority) {
			case "immediate": {
				// TODO: check if that's okay
				// Send high-prio messages immediately
				log(`sending high priority message ${data.toString()} immediately`, "debug");
				this.doSend(data);
				break;
			}
			case "normal": {
				// Put the message in the queue
				this.sendQueue.push(data);
				log(`added message to the send queue with normal priority, new length = ${this.sendQueue.length}`, "debug");
				break;
			}
			case "high": {
				// Put the message in the queue (in first position)
				// TODO: do we need this in ZWave?
				this.sendQueue.unshift(data);
				log(`added message to the send queue with high priority, new length = ${this.sendQueue.length}`, "debug");
				break;
			}
		}

		// start working it off now (maybe)
		this.workOffSendQueue();
	}

	private workOffSendQueue() {
		// we are still waiting for the current transaction to finish
		if (this.currentTransaction != null) {
			log(`workOffSendQueue > skipping because a transaction is pending`, "debug");
			return;
		}

		const nextMsg = this.sendQueue.shift();
		if (!(nextMsg instanceof Message)) {
			// this is a pending request
			this.currentTransaction = nextMsg;
		}

		log(`workOffSendQueue > sending next message... remaining queue length = ${this.sendQueue.length}`, "debug");
		this.doSend(nextMsg);

		// to avoid any deadlocks we didn't think of, re-call this later
		setTimeout(() => this.workOffSendQueue(), 1000);
	}

	private doSend(data: MessageHeaders | Message | PendingRequest) {
		if (typeof data === "number") {
			// 1-byte-responses
			this.serial.write([data]);
		} else {
			// TODO: queue for retransmission
			const msg = data instanceof Message ?
				data :
				data.originalMessage
				;
			this.serial.write(msg.serialize());
		}
		// TODO: find out if we need to drain
	}

}

/** Skips the first n bytes of a buffer and returns the rest */
function skipBytes(buf: Buffer, n: number): Buffer {
	return Buffer.from(buf.slice(n, 0));
}
