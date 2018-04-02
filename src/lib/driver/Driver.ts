import { EventEmitter } from "events";
import * as SerialPort from "serialport";
import { ApplicationCommandRequest } from "../commandclass/ApplicationCommandRequest";
import { CommandClasses } from "../commandclass/CommandClass";
import { SendDataRequest } from "../commandclass/SendDataMessages";
import { ZWaveController } from "../controller/Controller";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { FunctionType, MessageHeaders, MessagePriority, MessageType } from "../message/Constants";
import { Constructable, getDefaultPriority, Message, messageTypes } from "../message/Message";
import { Comparable, compareNumberOrString, CompareResult } from "../util/comparable";
import { createDeferredPromise, DeferredPromise } from "../util/defer-promise";
import { log } from "../util/logger";
import { entries } from "../util/object-polyfill";
import { SortedList } from "../util/sorted-list";
import { num2hex, stringify } from "../util/strings";
import { Transaction } from "./Transaction";

export interface ZWaveOptions {
	// TODO: this probably refers to the stick waiting for a response from the node:
	timeouts: {
		/** how long to wait for an ACK */
		ack: number,
		/** not sure */
		byte: number,
	};
	/**
	 * @internal
	 * Set this to true to skip the controller interview. Useful for testing purposes
	 */
	skipInterview?: boolean;
}
export type DeepPartial<T> = { [P in keyof T]+?: DeepPartial<T[P]> };

const defaultOptions: ZWaveOptions = {
	timeouts: {
		ack: 1000,
		byte: 150,
	},
	skipInterview: false,
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
			} else if (typeof target[key] === "undefined") {
				// don't override single keys
				target[key] = value;
			}
		}
	}
	return target;
}

export type MessageSupportCheck = "loud" | "silent" | "none";
function isMessageSupportCheck(val: any): val is MessageSupportCheck {
	return val === "loud"
		|| val === "silent"
		|| val === "none"
		;
}

export type RequestHandler<T extends Message = Message> = (msg: T) => boolean;
interface RequestHandlerEntry<T extends Message = Message> {
	invoke: RequestHandler<T>;
	oneTime: boolean;
}

// TODO: Interface the emitted events

export class Driver extends EventEmitter {

	/** The serial port instance */
	private serial: SerialPort;
	/** A buffer of received but unprocessed data */
	private receiveBuffer: Buffer;
	/** The currently pending request */
	private currentTransaction: Transaction;
	private sendQueue = new SortedList<Transaction>();
	/** A map of handlers for all sorts of requests */
	private requestHandlers = new Map<FunctionType, RequestHandlerEntry[]>();
	/** A map of handlers specifically for send data requests */
	private sendDataRequestHandlers = new Map<CommandClasses, RequestHandlerEntry<SendDataRequest>[]>();

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
				.on("open", async () => {
					log("driver", "serial port opened", "debug");
					this._isOpen = true;
					this.resetIO();
					resolve();

					setImmediate(() => this.initializeControllerAndNodes());
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

	private _controllerInterviewed: boolean = false;
	private async initializeControllerAndNodes() {

		if (this._controller == null) this._controller = new ZWaveController(this);
		if (!this.options.skipInterview) {
			// Interview the controller
			await this._controller.interview();
		}

		// in any case we need to emit the driver ready event here
		this._controllerInterviewed = true;
		log("driver", "driver ready", "debug");
		this.emit("driver ready");

		if (!this.options.skipInterview) {
			// Now interview all nodes
			// don't await them, so the beginInterview method returns
			for (const node of this._controller.nodes.values()) {
				// TODO: retry on failure or something...
				node.interview().catch(e => "node interview failed: " + e.message);
			}
		}
	}

	/**
	 * Performs a hard reset on the controller. This wipes out all configuration!
	 */
	public async hardReset() {
		this.ensureReady(true);
		await this._controller.hardReset();

		this._controllerInterviewed = false;
		this.initializeControllerAndNodes();
	}

	/** Resets the IO layer */
	private resetIO() {
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
	private ensureReady(includingController: boolean = false): void {
		if (
			!this._wasStarted
			|| !this._isOpen
			|| this._wasDestroyed
		) {
			throw new ZWaveError(
				"The driver is not ready or has been destroyed",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		if (includingController && !this._controllerInterviewed) {
			throw new ZWaveError(
				"The controller is not ready yet",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
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
		this.resetIO();
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
			// // tslint:disable-next-line:variable-name
			// let MessageConstructor: Constructable<Message>;
			// // We introduce special handling for the SendData requests
			// // as those are differentiated by the comman dclass
			// if (Message.is(MessageType.Request, FunctionType.SendData, this.receiveBuffer)) {
			// 	MessageConstructor = SendDataRequest.getConstructor(this.receiveBuffer);
			// } else {
			// 	MessageConstructor = Message.getConstructor(this.receiveBuffer);
			// }

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

	/**
	 * Registers a handler for all kinds of request messages
	 * @param fnType The function type to register the handler for
	 * @param handler The request handler callback
	 * @param oneTime Whether the handler should be removed after its first successful invocation
	 */
	public registerRequestHandler(fnType: FunctionType, handler: RequestHandler, oneTime: boolean = false): void {
		if (fnType === FunctionType.SendData) {
			throw new Error(
				"Cannot register a generic request handler for SendData requests. " +
				"Use `registerSendDataRequestHandler()` instead!",
			);
		}
		const handlers = this.requestHandlers.has(fnType) ? this.requestHandlers.get(fnType) : [];
		const entry: RequestHandlerEntry = { invoke: handler, oneTime };
		handlers.push(entry);
		log("driver", `added${oneTime ? "one-time" : ""} request handler for ${FunctionType[fnType]} (${fnType})... ${handlers.length} registered`, "debug");
		this.requestHandlers.set(fnType, handlers);
	}

	/**
	 * Unregisters a handler for all kinds of request messages
	 * @param fnType The function type to unregister the handler for
	 * @param handler The previously registered request handler callback
	 */
	public unregisterRequestHandler(fnType: FunctionType, handler: RequestHandler): void {
		if (fnType === FunctionType.SendData) {
			throw new Error(
				"Cannot unregister a generic request handler for SendData requests. " +
				"Use `unregisterSendDataRequestHandler()` instead!",
			);
		}
		const handlers = this.requestHandlers.has(fnType) ? this.requestHandlers.get(fnType) : [];
		for (let i = 0, entry = handlers[i]; i < handlers.length; i++) {
			// remove the handler if it was found
			if (entry.invoke === handler) {
				handlers.splice(i, 1);
				break;
			}
		}
		log("driver", `removed request handler for ${FunctionType[fnType]} (${fnType})... ${handlers.length} left`, "debug");
		this.requestHandlers.set(fnType, handlers);
	}

	/**
	 * Registers a handler for SendData request messages
	 * @param cc The command class to register the handler for
	 * @param handler The request handler callback
	 */
	public registerSendDataRequestHandler(cc: CommandClasses, handler: RequestHandler<SendDataRequest>, oneTime: boolean = false): void {
		const handlers = this.sendDataRequestHandlers.has(cc) ? this.sendDataRequestHandlers.get(cc) : [];
		const entry: RequestHandlerEntry = { invoke: handler, oneTime };
		handlers.push(entry);
		log("driver", `added${oneTime ? "one-time" : ""} send data request handler for ${CommandClasses[cc]} (${cc})... ${handlers.length} registered`, "debug");
		this.sendDataRequestHandlers.set(cc, handlers);
	}

	/**
	 * Unregisters a handler for SendData request messages
	 * @param cc The command class to unregister the handler for
	 * @param handler The previously registered request handler callback
	 */
	public unregisterSendDataRequestHandler(cc: CommandClasses, handler: RequestHandler<SendDataRequest>): void {
		const handlers = this.sendDataRequestHandlers.has(cc) ? this.sendDataRequestHandlers.get(cc) : [];
		for (let i = 0, entry = handlers[i]; i < handlers.length; i++) {
			// remove the handler if it was found
			if (entry.invoke === handler) {
				handlers.splice(i, 1);
				break;
			}
		}
		log("driver", `removed send data request handler for ${CommandClasses[cc]} (${cc})... ${handlers.length} left`, "debug");
		this.sendDataRequestHandlers.set(cc, handlers);
	}

	private handleRequest(msg: Message | SendDataRequest) {
		let handlers: RequestHandlerEntry[];

		if (msg instanceof ApplicationCommandRequest) {
			// we handle ApplicationCommandRequests differently because they are handled by the nodes directly
			const cc = msg.command.command;
			const nodeId = msg.command.nodeId;
			log("driver", `handling application command request ${CommandClasses[cc]} (${num2hex(cc)}) for node ${nodeId}`, "debug");
			// cannot handle ApplicationCommandRequests without a controller
			if (this.controller == null) {
				log("driver", `  the controller is not ready yet, discarding...`, "debug");
				return;
			} else if (!this.controller.nodes.has(nodeId)) {
				log("driver", `  the node is unknown or not initialized yet, discarding...`, "debug");
				return;
			}

			// dispatch the command to the node itself
			const node = this.controller.nodes.get(nodeId);
			node.handleCommand(msg.command);

			return;
		} else if (msg instanceof SendDataRequest) {
			// we handle SendDataRequests differently because their handlers are organized by the command class
			const cc = msg.command.command;
			log("driver", `handling send data request ${CommandClasses[cc]} (${num2hex(cc)}) for node ${msg.command.nodeId}`, "debug");
			handlers = this.sendDataRequestHandlers.get(cc);
		} else {
			log("driver", `handling request ${FunctionType[msg.functionType]} (${msg.functionType})`, "debug");
			handlers = this.requestHandlers.get(msg.functionType);
		}
		log("driver", `  ${stringify(msg)}`, "debug");

		if (handlers != null && handlers.length > 0) {
			log("driver", `  ${handlers.length} handler${handlers.length !== 1 ? "s" : ""} registered!`, "debug");
			// loop through all handlers and find the first one that returns true to indicate that it handled the message
			for (let i = 0; i <= handlers.length; i++) {
				log("driver", `  invoking handler #${i - 1}`, "debug");
				const handler = handlers[i];
				if (handler.invoke(msg)) {
					log("driver", `  message was handled`, "debug");
					if (handler.oneTime) {
						log("driver", "  one-time handler was successfully called, removing it...", "debug");
						handlers.splice(i, 1);
					}
					// don't invoke any more handlers
					break;
				}
			}
		} else {
			log("driver", "  no handlers registered!", "warn");
		}
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
		log("io", "NAK received. TODO: handle it", "warn");
	}

	private handleCAN() {
		// TODO: what to do with this CAN?
		log("io", "CAN received - dropping current transaction. TODO: handle retransmission", "warn");
		if (
			this.currentTransaction != null
			&& this.currentTransaction.promise != null
		) {
			log("io", "  the dropped message is " + stringify(this.currentTransaction.message), "warn");
			this.currentTransaction.promise.reject(new ZWaveError(
				"The message was dropped by the controller",
				ZWaveErrorCodes.Controller_MessageDropped,
			));
		}
	}

	// tslint:disable:unified-signatures
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
		priority?: MessagePriority,
	): Promise<TResponse>;

	public async sendMessage<TResponse extends Message = Message>(
		msg: Message,
		supportCheck?: MessageSupportCheck,
	): Promise<TResponse>;

	public async sendMessage<TResponse extends Message = Message>(
		msg: Message,
		priority: MessagePriority,
		supportCheck: MessageSupportCheck,
	): Promise<TResponse>;
	// tslint:enable:unified-signatures

	public async sendMessage<TResponse extends Message = Message>(
		msg: Message,
		priorityOrCheck?: MessagePriority | MessageSupportCheck,
		supportCheck?: MessageSupportCheck,
	): Promise<TResponse> {

		// sort out the arguments
		if (isMessageSupportCheck(priorityOrCheck)) {
			supportCheck = priorityOrCheck;
			priorityOrCheck = undefined;
		}
		// now priorityOrCheck is either undefined or a MessagePriority
		const priority: MessagePriority = priorityOrCheck != null
			? priorityOrCheck as MessagePriority
			: getDefaultPriority(msg);
		if (supportCheck == null) supportCheck = "loud";

		this.ensureReady();

		if (priority == null) {
			const className = msg.constructor.name;
			const msgTypeName = FunctionType[msg.functionType];
			throw new ZWaveError(
				`No default priority has been defined for ${className} (${msgTypeName}), so you have to provide one for your message`,
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

		this.sendQueue.add(transaction);
		log("io", `added message to the send queue, new length = ${this.sendQueue.length}`, "debug");
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
