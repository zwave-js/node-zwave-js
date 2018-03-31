import { EventEmitter } from "events";
import * as SerialPort from "serialport";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { FunctionType, getDefaultPriority, Message, MessageHeaders, MessagePriority, MessageType, messageTypes } from "../message/Message";
import { Comparable, compareNumberOrString, CompareResult } from "../util/comparable";
import { createDeferredPromise, DeferredPromise } from "../util/defer-promise";
import { log } from "../util/logger";
import { entries } from "../util/object-polyfill";
import { SortedList } from "../util/sorted-list";
import { stringify } from "../util/strings";
import { ZWaveController } from "./Controller";

/** Returns a timestamp with nano-second precision */
function highResTimestamp(): number {
	const [s, ns] = process.hrtime();
	return s * 1e9 + ns;
}

class Transaction implements Comparable<Transaction> {

	constructor(
		message: Message,
		promise: DeferredPromise<Message | void>,
		priority: MessagePriority,
	);
	constructor(
		public readonly message: Message,
		public readonly promise: DeferredPromise<Message | void>,
		public readonly priority: MessagePriority,
		public timestamp: number = highResTimestamp(),
		public ackPending: boolean = true,
		public response?: Message,
	) {
	}

	public compareTo(other: Transaction): CompareResult {
		// first sort by priority
		if (this.priority < other.priority) return -1;
		else if (this.priority > other.priority) return 1;

		// for equal priority, sort by the timestamp
		return compareNumberOrString(other.timestamp, this.timestamp);

		// TODO: do we need to sort by the message itself?
	}

	// TODO: add a way to expire these
	// TODO: add a way to resend these
}

export interface ZWaveOptions {
	// TODO: this probably refers to the stick waiting for a response from the node:
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
	private currentTransaction: Transaction;
	private sendQueue = new SortedList<Transaction>();
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
		this.sendQueue.clear();
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
			this.currentTransaction.message != null &&
			this.currentTransaction.message.expectedResponse === msg.functionType
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
				trnsact.message.expectedResponse == null
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
	public async sendMessage<TResponse extends Message = Message>(
		msg: Message,
		supportCheck: "loud" | "silent" | "none" = "loud",
		priority: MessagePriority = getDefaultPriority(msg),
	): Promise<TResponse> {

		this.ensureReady();

		if (priority == null) {
			throw new ZWaveError(
				`No default priority has been defined for ${msg.constructor.name}, so you have to provide one for your message`,
				ZWaveErrorCodes.Driver_NoPriority,
			);
		}

		if (
			supportCheck !== "none"
			&& this.controller != null
			&& !this.controller.isFunctionSupported(msg.functionType)
		) {
			if (supportCheck === "loud") {
				throw new ZWaveError(
					`Your hardware does not support the ${FunctionType[msg.functionType]} function`,
					ZWaveErrorCodes.Driver_NotSupported,
				);
			} else {
				return undefined;
			}
		}

		log("driver", `sending message ${stringify(msg)} with priority ${MessagePriority[priority]} (${priority})`, "debug");
		// create the transaction and enqueue it
		const promise = createDeferredPromise<TResponse>();
		const transaction = new Transaction(
			msg,
			promise,
			priority,
		);

		log("io", `added message to the send queue, new length = ${this.sendQueue.length}`, "debug");
		this.sendQueue.add(transaction);
		// start sending now (maybe)
		setImmediate(() => this.workOffSendQueue());

		return promise;
	}

	/**
	 * Sends a low-level message like ACK, NAK or CAN immediately
	 * @param message The low-level message to send
	 */
	private send(header: MessageHeaders): void {
		// ACK, CAN, NAK
		log("io", `sending ${MessageHeaders[header]}`, "debug");
		this.doSend(Buffer.from([header]));
		return;
	}

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

		// get the next transaction
		const next = this.sendQueue.shift();
		log("io", `workOffSendQueue > sending next message... remaining queue length = ${this.sendQueue.length}`, "debug");
		this.currentTransaction = next;
		this.doSend(next.message.serialize());

		// to avoid any deadlocks we didn't think of, re-call this later
		this.sendQueueTimer = setTimeout(() => this.workOffSendQueue(), 1000);
	}

	private doSend(data: Buffer) {
		this.serial.write(data);
	}

}

/** Skips the first n bytes of a buffer and returns the rest */
function skipBytes(buf: Buffer, n: number): Buffer {
	return Buffer.from(buf.slice(n, 0));
}
