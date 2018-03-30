import { EventEmitter } from "events";
import * as SerialPort from "serialport";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { FunctionType, Message, MessageHeaders, MessageType } from "../message/Message";
import { createDeferredPromise, DeferredPromise } from "../util/defer-promise";
import { log } from "../util/logger";
import { entries } from "../util/object-polyfill";
import { stringify } from "../util/strings";
import { ZWaveController } from "./Controller";

interface PendingRequest {
	originalMessage: Message;
	ackPending: boolean;
	response: Message;
	promise: DeferredPromise<Message | void>;
	// TODO: add a way to expire these
	// TODO: add a way to resend these
}

export interface ZWaveOptions {
	timeouts: {
		/** how long to wait for an ACK */
		ack: number,
		/** not sure */
		byte: number,
	};
}
export type DeepPartial<T> = {[P in keyof T]: Partial<T[P]>};

const defaultOptions: ZWaveOptions = {
	timeouts: {
		ack: 1000,
		byte: 150,
	},
};
function applyDefaultOptions(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
	target = target || {};
	for (const [key, value] of entries(source)) {
		if (!(key in target)) {
			target[key] = value;
		} else {
			if (typeof value === "object") {
				// merge objects
				target[key] = applyDefaultOptions(target[key], value);
			} else if (typeof target[key] !== "undefined") {
				// don't override single keys
				target[key] = value;
			}
		}
	}
	return target;
}

export class Driver extends EventEmitter {

	/** The serial port instance */
	private serial: SerialPort;
	/** A buffer of received but unprocessed data */
	private receiveBuffer: Buffer;
	/** The currently pending request */
	private currentTransaction: PendingRequest;
	private sendQueue: (PendingRequest | Message)[];
	// TODO: add a way to subscribe to nodes

	private _controller: ZWaveController;
	public get controller(): ZWaveController {
		return this._controller;
	}

	constructor(
		private port: string,
		/** @internal */
		public options?: DeepPartial<ZWaveOptions>,
	) {
		super();

		// merge given options with defaults
		this.options = applyDefaultOptions(this.options, defaultOptions) as ZWaveOptions;

		// register some cleanup handlers in case the program doesn't get closed cleanly
		process.on("exit", this._cleanupHandler);
		process.on("SIGINT", this._cleanupHandler);
		process.on("uncaughtException", this._cleanupHandler);
	}

	private _wasStarted: boolean = false;
	private _isOpen: boolean = false;
	/** Start the driver */
	public start(): Promise<void> {
		// avoid starting twice
		if (this._wasDestroyed) {
			return Promise.reject(
				new ZWaveError(
					"The driver was destroyed. Create a new instance and start that one.",
					ZWaveErrorCodes.Driver_Destroyed,
				),
			);
		}
		if (this._wasStarted) return;
		this._wasStarted = true;

		return new Promise((resolve, reject) => {
			log("driver", `starting driver...`, "debug");
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
					log("driver", "serial port opened", "debug");
					this._isOpen = true;
					resolve();
					this.reset();
					setImmediate(() => this.beginInterview());
				})
				.on("data", this.serialport_onData.bind(this))
				.on("error", err => {
					log("driver", "serial port errored: " + err, "error");
					if (this._isOpen) {
						this.serialport_onError(err);
					} else {
						reject(err);
						this.destroy();
					}
				})
				;
			this.serial.open();
		});
	}

	private async beginInterview() {
		// Interview the controller
		this._controller = new ZWaveController();
		await this._controller.interview(this);
		log("driver", "driver ready", "debug");
		this.emit("driver ready");

		// Now query all nodes
		for (const node of this._controller.nodes.values()) {
			node.query();
		}
	}

	private reset() {
		this.ensureReady();
		log("driver", "resetting driver instance...", "debug");

		// re-sync communication
		this.send(MessageHeaders.NAK);

		// clear buffers
		this.receiveBuffer = Buffer.from([]);
		this.sendQueue = [];
		// clear the currently pending request
		if (this.currentTransaction != null && this.currentTransaction.promise != null) {
			this.currentTransaction.promise.reject("The driver was reset");
		}
		this.currentTransaction = null;
	}

	private _wasDestroyed: boolean = false;
	private ensureReady(): void {
		if (this._wasStarted && this._isOpen && !this._wasDestroyed) return;
		throw new ZWaveError(
			"The driver is not ready or has been destroyed",
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	private _cleanupHandler = () => this.destroy();
	/**
	 * Terminates the driver instance and closes the underlying serial connection.
	 * Must be called under any circumstances.
	 */
	public destroy() {
		log("driver", "destroying driver instance...", "debug");
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

	private serialport_onError(err: Error) {
		this.emit("error", err);
	}

	private onInvalidData() {
		this.emit("error", new ZWaveError(
			"The receive buffer contains invalid data, resetting...",
			ZWaveErrorCodes.Driver_InvalidDataReceived,
		));
		this.reset();
	}

	private serialport_onData(data: Buffer) {
		log("io", `received data: 0x${data.toString("hex")}`, "debug");
		// append the new data to our receive buffer
		this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
		log("io", `receiveBuffer: 0x${this.receiveBuffer.toString("hex")}`, "debug");

		while (this.receiveBuffer.length > 0) { // TODO: add a way to interrupt

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
						this.onInvalidData();
						return;
					}
				}
				this.receiveBuffer = skipBytes(this.receiveBuffer, 1);
				continue;
			}

			// nothing to do yet, wait for the next data
			const msgComplete = Message.isComplete(this.receiveBuffer);
			if (!msgComplete) {
				log("io", `the receive buffer contains an incomplete message, waiting for the next chunk...`, "debug");
				return;
			}

			// parse a message - first find the correct constructor
			// tslint:disable-next-line:variable-name
			const MessageConstructor = Message.getConstructor(this.receiveBuffer);
			const msg = new MessageConstructor();
			let readBytes: number;
			try {
				readBytes = msg.deserialize(this.receiveBuffer);
			} catch (e) {
				if (e instanceof ZWaveError) {
					if (
						e.code === ZWaveErrorCodes.PacketFormat_Invalid
						|| e.code === ZWaveErrorCodes.PacketFormat_Checksum
					) {
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
			this.send(MessageHeaders.ACK);

			if (msg.type === MessageType.Response) {
				this.handleResponse(msg);
			} else if (msg.type === MessageType.Request) {
				this.handleRequest(msg);
			}
			break;
		}

		log("io", `the receive buffer is empty, waiting for the next chunk...`, "debug");

	}

	private handleResponse(msg: Message) {
		// TODO: find a nice way to serialize the messages
		log("driver", `handling response ${stringify(msg)}`, "debug");

		// if we have a pending request, check if that is waiting for this message
		if (
			this.currentTransaction != null &&
			this.currentTransaction.originalMessage != null &&
			this.currentTransaction.originalMessage.expectedResponse === msg.functionType
		) {
			if (!this.currentTransaction.ackPending) {
				log("io", `ACK already received, resolving transaction`, "debug");
				log("driver", `transaction complete`, "debug");
				this.currentTransaction.promise.resolve(msg);
				this.currentTransaction = null;
				// and see if there are messages pending
				setImmediate(() => this.workOffSendQueue());
			} else {
				// wait for the ack, it might be received out of order
				log("io", `no ACK received yet, remembering response`, "debug");
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
		// if we have a pending request waiting for the ACK, ACK it
		const trnsact = this.currentTransaction;
		if (
			trnsact != null &&
			trnsact.ackPending
		) {
			log("io", "ACK received for current transaction", "debug");
			trnsact.ackPending = false;
			if (
				trnsact.originalMessage.expectedResponse == null
				|| trnsact.response != null
			) {
				log("io", "transaction finished, resolving...", "debug");
				log("driver", `transaction complete`, "debug");
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
		log("io", "ACK received but I don't know what it belongs to...", "debug");
	}

	private handleNAK() {
		// TODO: what to do with this NAK?
		log("io", "NAK received", "debug");
	}

	private handleCAN() {
		// TODO: what to do with this CAN?
		log("io", "CAN received", "debug");
	}

	/** Sends a message to the Z-Wave stick */
	public async sendMessage<TResponse extends Message = Message>(msg: Message, supportCheck: "loud" | "silent" | "none" = "loud"): Promise<TResponse> {
		this.ensureReady();

		if (supportCheck !== "none" && this.controller != null && !this.controller.isFunctionSupported(msg.functionType)) {
			if (supportCheck === "loud") {
				throw new ZWaveError(
					`Your hardware does not support the ${FunctionType[msg.functionType]} function`,
					ZWaveErrorCodes.Driver_NotSupported,
				);
			} else {
				return undefined;
			}
		}

		log("driver", `sending message ${stringify(msg)}`, "debug");

		const promise = createDeferredPromise<TResponse>();
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
			log("io", `sending ${MessageHeaders[data]}`, "debug");
			this.doSend(data);
			return;
		}

		switch (priority) {
			case "immediate": {
				// TODO: check if that's okay
				// Send high-prio messages immediately
				log("io", `sending high priority message ${data.toString()} immediately`, "debug");
				this.doSend(data);
				break;
			}
			case "normal": {
				// Put the message in the queue
				this.sendQueue.push(data);
				log("io", `added message to the send queue with normal priority, new length = ${this.sendQueue.length}`, "debug");
				break;
			}
			case "high": {
				// Put the message in the queue (in first position)
				// TODO: do we need this in ZWave?
				this.sendQueue.unshift(data);
				log("io", `added message to the send queue with high priority, new length = ${this.sendQueue.length}`, "debug");
				break;
			}
		}

		// start working it off now (maybe)
		setImmediate(() => this.workOffSendQueue());
	}

	// TODO: assign different priorities
	// https://github.com/OpenZWave/open-zwave/blob/e8de6b196109e88af06455366ea8f647df0f7904/cpp/src/Driver.h#L587

	private sendQueueTimer: NodeJS.Timer;
	private workOffSendQueue() {
		if (this.sendQueueTimer != null) {
			clearTimeout(this.sendQueueTimer);
			delete this.sendQueueTimer;
		}

		// is there something to send?
		if (this.sendQueue.length === 0) {
			log("io", `workOffSendQueue > queue is empty`, "debug");
			return;
		}
		// we are still waiting for the current transaction to finish
		if (this.currentTransaction != null) {
			log("io", `workOffSendQueue > skipping because a transaction is pending`, "debug");
			return;
		}

		const nextMsg = this.sendQueue.shift();
		if (!(nextMsg instanceof Message)) {
			// this is a pending request
			log("io", `workOffSendQueue > setting current transaction`, "debug");
			this.currentTransaction = nextMsg;
		}

		log("io", `workOffSendQueue > sending next message... remaining queue length = ${this.sendQueue.length}`, "debug");
		this.doSend(nextMsg);

		// to avoid any deadlocks we didn't think of, re-call this later
		this.sendQueueTimer = setTimeout(() => this.workOffSendQueue(), 1000);
	}

	private doSend(data: MessageHeaders | Message | PendingRequest) {
		if (typeof data === "number") {
			// 1-byte-responses
			this.serial.write(Buffer.from([data]));
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
