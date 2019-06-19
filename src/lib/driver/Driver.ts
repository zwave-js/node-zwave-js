import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { entries } from "alcalzone-shared/objects";
import { SortedList } from "alcalzone-shared/sorted-list";
import { EventEmitter } from "events";
import * as fs from "fs-extra";
import * as path from "path";
import * as SerialPort from "serialport";
import {
	CommandClass,
	getImplementedVersion,
} from "../commandclass/CommandClass";
import { CommandClasses } from "../commandclass/CommandClasses";
import { isCommandClassContainer } from "../commandclass/ICommandClassContainer";
import { NoOperationCC } from "../commandclass/NoOperationCC";
import { WakeUpCC } from "../commandclass/WakeUpCC";
import { ApplicationCommandRequest } from "../controller/ApplicationCommandRequest";
import {
	ApplicationUpdateRequest,
	ApplicationUpdateRequestNodeInfoReceived,
} from "../controller/ApplicationUpdateRequest";
import { ZWaveController } from "../controller/Controller";
import {
	SendDataRequest,
	SendDataRequestTransmitReport,
	TransmitStatus,
} from "../controller/SendDataMessages";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log2 from "../log";
import {
	FunctionType,
	MessageHeaders,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import { getDefaultPriority, Message } from "../message/Message";
import { isNodeQuery } from "../node/INodeQuery";
import { InterviewStage, NodeStatus, ZWaveNode } from "../node/Node";
import { log } from "../util/logger";
import { num2hex, stringify } from "../util/strings";
import { DriverEventCallbacks, DriverEvents, IDriver } from "./IDriver";
import { Transaction } from "./Transaction";

export interface ZWaveOptions {
	// TODO: this probably refers to the stick waiting for a response from the node:
	timeouts: {
		/** how long to wait for an ACK */
		ack: number;
		/** not sure */
		byte: number;
		/**
		 * How long to wait for a ConfigurationCCReport after sending a ConfigurationCCGet
		 * or an ACK after a ConfigurationCCSet.
		 */
		configurationGetSet: number;
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
		// TODO: This should be dependent on the network's current RTT
		configurationGetSet: 3000,
	},
	skipInterview: false,
};

function applyDefaultOptions(
	target: Record<string, any> | undefined,
	source: Record<string, any>,
): Record<string, any> {
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

function checkOptions(options: ZWaveOptions): void {
	if (options.timeouts.ack < 1) {
		throw new ZWaveError(
			`The ACK timeout must be positive!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (options.timeouts.byte < 1) {
		throw new ZWaveError(
			`The BYTE timeout must be positive!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
	if (options.timeouts.configurationGetSet < 1) {
		throw new ZWaveError(
			`The configuration get timeout must be positive!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
}

export type RequestHandler<T extends Message = Message> = (msg: T) => boolean;
interface RequestHandlerEntry<T extends Message = Message> {
	invoke: RequestHandler<T>;
	oneTime: boolean;
}

export interface SendMessageOptions {
	/** The priority of the message to send. If none is given, the defined default priority of the message class will be used. */
	priority?: MessagePriority;
	/** If an exception should be thrown when the message to send is not supported. Setting this to false is is useful if the capabilities haven't been determined yet. Default: true */
	supportCheck?: boolean;
	/** Setting timeout to a positive number causes the transaction to be rejected if no response is received before the timeout elapses */
	timeout?: number;
}

// Strongly type the event emitter events
export interface Driver {
	on<TEvent extends DriverEvents>(
		event: TEvent,
		callback: DriverEventCallbacks[TEvent],
	): this;
	once<TEvent extends DriverEvents>(
		event: TEvent,
		callback: DriverEventCallbacks[TEvent],
	): this;
	removeListener<TEvent extends DriverEvents>(
		event: TEvent,
		callback: DriverEventCallbacks[TEvent],
	): this;
	off<TEvent extends DriverEvents>(
		event: TEvent,
		callback: DriverEventCallbacks[TEvent],
	): this;
	removeAllListeners(event?: DriverEvents): this;
}

export class Driver extends EventEmitter implements IDriver {
	/** The serial port instance */
	private serial: SerialPort | undefined;
	/** A buffer of received but unprocessed data */
	private receiveBuffer: Buffer | undefined;
	/** The currently pending request */
	private currentTransaction: Transaction | undefined;
	private sendQueue = new SortedList<Transaction>();
	/** A map of handlers for all sorts of requests */
	private requestHandlers = new Map<FunctionType, RequestHandlerEntry[]>();
	// /** A map of handlers specifically for send data requests */
	// private sendDataRequestHandlers = new Map<
	// 	CommandClasses,
	// 	RequestHandlerEntry<SendDataRequest>[]
	// >();

	public readonly cacheDir = path.resolve(__dirname, "../../..", "cache");

	private _controller: ZWaveController | undefined;
	/** Encapsulates information about the Z-Wave controller and provides access to its nodes */
	public get controller(): ZWaveController {
		if (this._controller == undefined) {
			throw new ZWaveError(
				"The controller is not yet ready!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._controller;
	}

	public constructor(
		private port: string,
		/** @internal */
		options?: DeepPartial<ZWaveOptions>,
	) {
		super();

		// merge given options with defaults
		this.options = applyDefaultOptions(
			options,
			defaultOptions,
		) as ZWaveOptions;
		// And make sure they contain valid values
		checkOptions(this.options);

		// register some cleanup handlers in case the program doesn't get closed cleanly
		this._cleanupHandler = this._cleanupHandler.bind(this);
		process.on("exit", this._cleanupHandler);
		process.on("SIGINT", this._cleanupHandler);
		process.on("uncaughtException", this._cleanupHandler);
	}

	/** @internal */
	public options: ZWaveOptions;

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
		if (this._wasStarted) return Promise.resolve();
		this._wasStarted = true;

		return new Promise((resolve, reject) => {
			log2.driver.print("starting driver...");
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
					log2.driver.print("serial port opened");
					this._isOpen = true;
					this.resetIO();
					resolve();

					setImmediate(
						() => void this.initializeControllerAndNodes(),
					);
				})
				.on("data", this.serialport_onData.bind(this))
				.on("error", err => {
					log2.driver.print("serial port errored: " + err, "error");
					if (this._isOpen) {
						this.serialport_onError(err);
					} else {
						reject(err);
						this.destroy();
					}
				});
			this.serial.open();
		});
	}

	private _controllerInterviewed: boolean = false;
	private async initializeControllerAndNodes(): Promise<void> {
		if (this._controller == undefined)
			this._controller = new ZWaveController(this);
		if (!this.options.skipInterview) {
			// Interview the controller
			await this._controller.interview();
		}

		// in any case we need to emit the driver ready event here
		this._controllerInterviewed = true;
		log2.driver.print("driver ready");
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
			// First complete the controller interview
			const controllerNode = this._controller.nodes.get(
				this._controller.ownNodeId!,
			)!;
			await this.interviewNode(controllerNode);
			// Then do all the nodes in parallel
			for (const node of this._controller.nodes.values()) {
				if (node.id === this._controller.ownNodeId) continue;
				// don't await the interview, because it may take a very long time
				// if a node is asleep
				void this.interviewNode(node);
			}
		}
	}

	private async interviewNode(node: ZWaveNode): Promise<void> {
		if (node.interviewStage === InterviewStage.Complete) {
			node.interviewStage = InterviewStage.RestartFromCache;
		}

		try {
			await node.interview();
		} catch (e) {
			if (e instanceof ZWaveError) {
				log2.controller.print("node interview failed: " + e, "error");
			} else {
				throw e;
			}
		}
	}

	private addNodeEventHandlers(node: ZWaveNode): void {
		node.on("wake up", this.onNodeWakeUp.bind(this))
			.on("sleep", this.onNodeSleep.bind(this))
			.on("alive", this.onNodeAlive.bind(this))
			.on(
				"interview completed",
				this.onNodeInterviewCompleted.bind(this),
			);
	}

	private onNodeWakeUp(node: ZWaveNode): void {
		log2.controller.logNode(node, "The node is now awake.");

		// It *should* not be necessary to restart the node interview here.
		// When a node that supports wakeup does not respond, pending promises
		// are not rejected.

		// Make sure to handle the pending messages as quickly as possible
		this.sortSendQueue();
		setImmediate(() => this.workOffSendQueue());
	}

	private onNodeSleep(node: ZWaveNode): void {
		log2.controller.logNode(node, "The node is now asleep.");
	}

	private onNodeAlive(node: ZWaveNode): void {
		log2.controller.logNode(node, "The node is now alive.");
		if (node.interviewStage !== InterviewStage.Complete) {
			void this.interviewNode(node);
		}
	}

	private onNodeInterviewCompleted(node: ZWaveNode): void {
		if (
			!this.hasPendingMessages(node) &&
			node.supportsCC(CommandClasses["Wake Up"])
		) {
			node.sendNoMoreInformation();
		}
	}

	private hasPendingMessages(node: ZWaveNode): boolean {
		return !!this.sendQueue.find(t => t.message.getNodeId() === node.id);
	}

	/**
	 * Retrieves the maximum version of a command class the given node supports.
	 * Returns 0 when the CC is not supported. Also returns 0 when the node was not found.
	 *
	 * @param nodeId The node for which the CC version should be retrieved
	 * @param cc The command class whose version should be retrieved
	 */
	public getSupportedCCVersionForNode(
		nodeId: number,
		cc: CommandClasses,
	): number {
		if (this._controller == undefined || !this.controller.nodes.has(nodeId))
			return 0;
		return this.controller.nodes.get(nodeId)!.getCCVersion(cc);
	}

	/**
	 * Retrieves the maximum version of a command class that can be used to communicate with a node.
	 * Returns 1 if the node claims that it does not support a CC.
	 * Throws if the CC is not implemented in this library yet.
	 *
	 * @param nodeId The node for which the CC version should be retrieved
	 * @param cc The command class whose version should be retrieved
	 */
	public getSafeCCVersionForNode(nodeId: number, cc: CommandClasses): number {
		const supportedVersion = this.getSupportedCCVersionForNode(nodeId, cc);
		if (supportedVersion === 0) {
			// For unsupported CCs use version 1, no matter what
			return 1;
		} else {
			// For supported versions find the maximum version supported by both the
			// node and this library
			const implementedVersion = getImplementedVersion(cc);
			if (
				implementedVersion !== 0 &&
				implementedVersion !== Number.POSITIVE_INFINITY
			) {
				return Math.min(supportedVersion, implementedVersion);
			}
			throw new ZWaveError(
				"Cannot retrieve the version of a CC that is not implemented",
				ZWaveErrorCodes.CC_NotSupported,
			);
		}
	}

	/**
	 * Performs a hard reset on the controller. This wipes out all configuration!
	 *
	 * The returned Promise resolves when the hard reset has been performed.
	 * It does not wait for the initialization process which is started afterwards.
	 */
	public async hardReset(): Promise<void> {
		this.ensureReady(true);
		// Calling ensureReady with true ensures that _controller is defined
		await this._controller!.hardReset();

		this._controllerInterviewed = false;
		void this.initializeControllerAndNodes();
	}

	/** Resets the IO layer */
	private resetIO(): void {
		this.ensureReady();
		log2.driver.print("resetting driver instance...");

		// re-sync communication
		this.send(MessageHeaders.NAK);

		// clear buffers
		this.receiveBuffer = Buffer.from([]);
		this.sendQueue.clear();
		// clear the currently pending request
		if (this.currentTransaction) {
			this.currentTransaction.promise.reject(
				new ZWaveError(
					"The driver was reset",
					ZWaveErrorCodes.Driver_Reset,
				),
			);
		}
		this.currentTransaction = undefined;
	}

	private _wasDestroyed: boolean = false;
	private ensureReady(includingController: boolean = false): void {
		if (!this._wasStarted || !this._isOpen || this._wasDestroyed) {
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

	private _cleanupHandler = () => void this.destroy();
	/**
	 * Terminates the driver instance and closes the underlying serial connection.
	 * Must be called under any circumstances.
	 */
	public async destroy(): Promise<void> {
		log2.driver.print("destroying driver instance...");
		this._wasDestroyed = true;

		try {
			// Attempt to save the network to cache
			await this.saveNetworkToCacheInternal();
		} catch (e) {
			log2.driver.print(
				`Saving the network to cache failed: ${e.message}`,
				"error",
			);
		}

		process.removeListener("exit", this._cleanupHandler);
		process.removeListener("SIGINT", this._cleanupHandler);
		process.removeListener("uncaughtException", this._cleanupHandler);
		// the serialport must be closed in any case
		if (this.serial != undefined) {
			this.serial.close();
			this.serial = undefined;
		}
	}

	// eslint-disable-next-line @typescript-eslint/camelcase
	private serialport_onError(err: Error): void {
		this.emit("error", err);
	}

	private onInvalidData(data: Buffer, message: string): void {
		this.emit(
			"error",
			new ZWaveError(message, ZWaveErrorCodes.Driver_InvalidDataReceived),
		);
		this.resetIO();
	}

	// eslint-disable-next-line @typescript-eslint/camelcase
	private serialport_onData(data: Buffer): void {
		// FIXME: Data is logged multiple times here
		log2.serial.data("inbound", data);
		// append the new data to our receive buffer
		this.receiveBuffer =
			this.receiveBuffer != undefined
				? Buffer.concat([this.receiveBuffer, data])
				: data;
		log2.serial.receiveBuffer(this.receiveBuffer);

		while (this.receiveBuffer.length > 0) {
			if (this.receiveBuffer[0] !== MessageHeaders.SOF) {
				switch (this.receiveBuffer[0]) {
					// single-byte messages - we have a handler for each one
					case MessageHeaders.ACK: {
						log2.serial.ACK("inbound");
						this.handleACK();
						break;
					}
					case MessageHeaders.NAK: {
						log2.serial.NAK("inbound");
						this.handleNAK();
						break;
					}
					case MessageHeaders.CAN: {
						log2.serial.CAN("inbound");
						this.handleCAN();
						break;
					}
					default: {
						// TODO: Log this
						const message = `The receive buffer starts with unexpected data: 0x${data.toString(
							"hex",
						)}`;
						this.onInvalidData(this.receiveBuffer, message);
						return;
					}
				}
				this.receiveBuffer = skipBytes(this.receiveBuffer, 1);
				continue;
			}

			// nothing to do yet, wait for the next data
			const msgComplete = Message.isComplete(this.receiveBuffer);
			if (!msgComplete) {
				log2.serial.message(
					`the receive buffer contains an incomplete message, waiting for the next chunk...`,
				);
				return;
			}

			let msg: Message | undefined;
			let bytesRead: number;
			try {
				msg = Message.from(this, this.receiveBuffer);
				bytesRead = msg.bytesRead;
			} catch (e) {
				let handled = false;
				if (e instanceof ZWaveError) {
					if (
						e.code === ZWaveErrorCodes.PacketFormat_Invalid ||
						e.code === ZWaveErrorCodes.PacketFormat_Checksum
					) {
						this.onInvalidData(this.receiveBuffer, e.toString());
						return;
					} else if (
						e.code ===
						ZWaveErrorCodes.Deserialization_NotImplemented
					) {
						log2.driver.print(e.message, "error");
						return;
					} else if (
						e.code === ZWaveErrorCodes.PacketFormat_InvalidPayload
					) {
						log2.driver.print(
							`Message with invalid data received. Dropping it...`,
							"warn",
						);
						handled = true;
						bytesRead = Message.getMessageLength(
							this.receiveBuffer,
						);
					}
				}
				// pass it through;
				if (!handled) throw e;
			}
			// and cut the read bytes from our buffer
			this.receiveBuffer = Buffer.from(
				this.receiveBuffer.slice(bytesRead!),
			);

			// all good, send ACK
			this.send(MessageHeaders.ACK);
			// and handle the response (if it could be decoded)
			if (msg) this.handleMessage(msg);

			break;
		}

		log2.serial.message(
			`The receive buffer is empty, waiting for the next chunk...`,
		);
	}

	private handleMessage(msg: Message): void {
		// TODO: find a nice way to serialize the messages
		// log2.driver.print(`handling response ${stringify(msg)}`);
		// TODO: This is all driver level
		log(
			"io",
			`handling response (${FunctionType[msg.functionType]}${
				MessageType[msg.type]
			})`,
			"debug",
		);
		// TODO: Print this as part of the received messages
		// if (msg instanceof SendDataRequest || msg instanceof SendDataResponse) {
		// 	log("io", `  ${stringify(msg)}`, "debug");
		// }
		// if (isCommandClassContainer(msg)) {
		// 	log("io", `  ${stringify(msg.command)}`, "debug");
		// }

		// if we have a pending request, check if that is waiting for this message
		if (this.currentTransaction != undefined) {
			switch (this.currentTransaction.message.testResponse(msg)) {
				case "confirmation":
					// no need to process intermediate responses, as they only tell us things are good
					log2.driver.transactionResponse(msg, "confirmation");
					return;

				case "fatal_controller":
					log2.driver.transactionResponse(msg, "fatal_controller");
					// The message was not sent
					if (this.mayRetryCurrentTransaction()) {
						// The Z-Wave specs define 500ms as the waiting period for SendData messages
						const timeout = this.retryCurrentTransaction(500);
						log2.driver.print(
							`  the message for the current transaction could not be sent, scheduling attempt (${this.currentTransaction.sendAttempts}/${this.currentTransaction.maxSendAttempts}) in ${timeout} ms...`,
							"warn",
						);
					} else {
						log2.driver.print(
							`  the message for the current transaction could not be sent after ${this.currentTransaction.maxSendAttempts} attempts, dropping the transaction`,
							"warn",
						);
						const errorMsg = `The message could not be sent`;
						this.rejectCurrentTransaction(
							new ZWaveError(
								errorMsg,
								ZWaveErrorCodes.Controller_MessageDropped,
							),
						);
					}
					return;

				case "fatal_node":
					log2.driver.transactionResponse(msg, "fatal_node");
					// The node did not respond
					const node = this.currentTransaction.message.getNodeUnsafe();
					if (!node) return; // This should never happen, but whatever
					if (node.supportsCC(CommandClasses["Wake Up"])) {
						log2.driver.print(
							`  ${node.logPrefix}The node did not respond because it is asleep, moving its messages to the wakeup queue`,
						);
						// The node is asleep
						WakeUpCC.setAwake(node, false);
						// Move all its pending messages to the WakeupQueue
						// This clears the current transaction
						this.moveMessagesToWakeupQueue(node.id);
						// And continue with the next messages
						setImmediate(() => this.workOffSendQueue());
					} else if (this.mayRetryCurrentTransaction()) {
						// The Z-Wave specs define 500ms as the waiting period for SendData messages
						const timeout = this.retryCurrentTransaction(500);
						log2.driver.print(
							`  ${node.logPrefix}The node did not respond to the current transaction, scheduling attempt (${this.currentTransaction.sendAttempts}/${this.currentTransaction.maxSendAttempts}) in ${timeout} ms...`,
							"warn",
						);
					} else {
						let errorMsg = `The node did not respond to the current transaction after ${this.currentTransaction.maxSendAttempts} attempts, it is presumed dead`;
						if (msg instanceof SendDataRequestTransmitReport) {
							errorMsg += ` (Status ${
								TransmitStatus[msg.transmitStatus]
							})`;
						}
						log2.driver.print(
							`  ${node.logPrefix}${errorMsg}`,
							"warn",
						);

						node.status = NodeStatus.Dead;
						this.rejectAllTransactionsForNode(node.id, errorMsg);
						// And continue with the next messages
						setImmediate(() => this.workOffSendQueue());
					}
					return;

				case "partial":
					// This is a multi-step response and we just received a part of it, which is not the final one
					log2.driver.transactionResponse(msg, "partial");
					this.currentTransaction.partialResponses.push(msg);
					return;

				case "final":
					// this is the expected response!
					log2.driver.transactionResponse(msg, "final");
					this.currentTransaction.response = msg;
					if (this.currentTransaction.partialResponses.length > 0) {
						msg.mergePartialMessages(
							this.currentTransaction.partialResponses,
						);
					}
					if (!this.currentTransaction.ackPending) {
						log2.driver.print(
							`ACK already received, resolving transaction`,
						);
						this.resolveCurrentTransaction();
					} else {
						// wait for the ack, it might be received out of order
						log2.driver.print(
							`no ACK received yet, remembering response`,
						);
					}
					// if the response was expected, don't check any more handlers
					return;

				default:
					// unexpected, nothing to do here => check registered handlers
					break;
			}
		}

		if (msg.type === MessageType.Request) {
			// This is a request we might have registered handlers for
			this.handleRequest(msg);
		} else {
			log2.driver.transactionResponse(msg, "unexpected");
			// TODO: Combine these 2 logs
			log("driver", `  unexpected response, discarding...`, "debug");
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
	public registerRequestHandler(
		fnType: FunctionType,
		handler: RequestHandler,
		oneTime: boolean = false,
	): void {
		// if (fnType === FunctionType.SendData) {
		// 	throw new Error(
		// 		"Cannot register a generic request handler for SendData requests. " +
		// 			"Use `registerSendDataRequestHandler()` instead!",
		// 	);
		// }
		const handlers = this.requestHandlers.has(fnType)
			? this.requestHandlers.get(fnType)!
			: [];
		const entry: RequestHandlerEntry = { invoke: handler, oneTime };
		handlers.push(entry);
		log2.driver.print(
			`added${oneTime ? " one-time" : ""} request handler for ${
				FunctionType[fnType]
			} (${fnType})...
${handlers.length} registered`,
		);
		this.requestHandlers.set(fnType, handlers);
	}

	/**
	 * Unregisters a message handler that has been added with `registerRequestHandler`
	 * @param fnType The function type to unregister the handler for
	 * @param handler The previously registered request handler callback
	 */
	public unregisterRequestHandler(
		fnType: FunctionType,
		handler: RequestHandler,
	): void {
		// if (fnType === FunctionType.SendData) {
		// 	throw new Error(
		// 		"Cannot unregister a generic request handler for SendData requests. " +
		// 			"Use `unregisterSendDataRequestHandler()` instead!",
		// 	);
		// }
		const handlers = this.requestHandlers.has(fnType)
			? this.requestHandlers.get(fnType)!
			: [];
		for (let i = 0, entry = handlers[i]; i < handlers.length; i++) {
			// remove the handler if it was found
			if (entry.invoke === handler) {
				handlers.splice(i, 1);
				break;
			}
		}
		log2.driver.print(
			`removed request handler for ${FunctionType[fnType]} (${fnType})...
${handlers.length} left`,
		);
		this.requestHandlers.set(fnType, handlers);
	}

	// /**
	//  * Registers a handler for SendData request messages
	//  * @param cc The command class to register the handler for
	//  * @param handler The request handler callback
	//  */
	// public registerSendDataRequestHandler(
	// 	cc: CommandClasses,
	// 	handler: RequestHandler<SendDataRequest>,
	// 	oneTime: boolean = false,
	// ): void {
	// 	const handlers = this.sendDataRequestHandlers.has(cc)
	// 		? this.sendDataRequestHandlers.get(cc)!
	// 		: [];
	// 	const entry: RequestHandlerEntry = { invoke: handler, oneTime };
	// 	handlers.push(entry);
	// 	log(
	// 		"driver",
	// 		`added${oneTime ? " one-time" : ""} send data request handler for ${
	// 			CommandClasses[cc]
	// 		} (${cc})... ${handlers.length} registered`,
	// 		"debug",
	// 	);
	// 	this.sendDataRequestHandlers.set(cc, handlers);
	// }

	// /**
	//  * Unregisters a handler for SendData request messages
	//  * @param cc The command class to unregister the handler for
	//  * @param handler The previously registered request handler callback
	//  */
	// public unregisterSendDataRequestHandler(
	// 	cc: CommandClasses,
	// 	handler: RequestHandler<SendDataRequest>,
	// ): void {
	// 	const handlers = this.sendDataRequestHandlers.has(cc)
	// 		? this.sendDataRequestHandlers.get(cc)!
	// 		: [];
	// 	for (let i = 0, entry = handlers[i]; i < handlers.length; i++) {
	// 		// remove the handler if it was found
	// 		if (entry.invoke === handler) {
	// 			handlers.splice(i, 1);
	// 			break;
	// 		}
	// 	}
	// 	log(
	// 		"driver",
	// 		`removed send data request handler for ${
	// 			CommandClasses[cc]
	// 		} (${cc})... ${handlers.length} left`,
	// 		"debug",
	// 	);
	// 	this.sendDataRequestHandlers.set(cc, handlers);
	// }

	private handleRequest(msg: Message | SendDataRequest): void {
		let handlers: RequestHandlerEntry[] | undefined;

		if (isCommandClassContainer(msg)) {
			const node = msg.getNodeUnsafe();
			if (node && node.status === NodeStatus.Dead) {
				// We have received a message from a dead node, bring it back to life
				// We do not know if the node is actually awake, so mark it as unknown for now
				node.status = NodeStatus.Unknown;
			}
		}

		// TODO: find a nice way to observe the different stages of a response.
		// for example a SendDataRequest with a VersionCC gets 3 responses:
		// 1. SendDataResponse with info if the data was sent
		// 2. SendDataRequest with info if the node responded
		// 3. ApplicationCommandRequest with the actual response

		if (msg instanceof ApplicationCommandRequest) {
			// we handle ApplicationCommandRequests differently because they are handled by the nodes directly
			const ccId = msg.command.ccId;
			const nodeId = msg.command.nodeId;
			// TODO: This deserves a better formatting
			log(
				"driver",
				`handling application command request ${
					CommandClasses[ccId]
				} (${num2hex(ccId)}) for node ${nodeId}`,
				"debug",
			);
			// cannot handle ApplicationCommandRequests without a controller
			if (this._controller == undefined) {
				log2.driver.print(
					`  the controller is not ready yet, discarding...`,
					"warn",
				);
				return;
			} else if (!this.controller.nodes.has(nodeId)) {
				log2.driver.print(
					`  the node is unknown or not initialized yet, discarding...`,
					"warn",
				);
				return;
			}

			// dispatch the command to the node itself
			const node = this.controller.nodes.get(nodeId)!;
			node.handleCommand(msg.command);

			return;
		} else if (msg instanceof ApplicationUpdateRequest) {
			if (msg instanceof ApplicationUpdateRequestNodeInfoReceived) {
				const node = msg.getNodeUnsafe();
				if (node) {
					log2.controller.logNode(node, {
						message: "Received updated node info",
						direction: "inbound",
					});
					node.updateNodeInfo(msg.nodeInformation);
					return;
				}
			}
			// } else if (msg instanceof SendDataRequest && msg.command.ccId) {
			// 	// TODO: Find out if this actually happens
			// 	// we handle SendDataRequests differently because their handlers are organized by the command class
			// 	const ccId = msg.command.ccId;
			// 	log(
			// 		"driver",
			// 		`handling send data request ${CommandClasses[ccId]} (${num2hex(
			// 			ccId,
			// 		)}) for node ${msg.command.nodeId}`,
			// 		"debug",
			// 	);
			// 	handlers = this.sendDataRequestHandlers.get(ccId);
		} else {
			// TODO: This deserves a nicer formatting
			log(
				"driver",
				`handling request ${FunctionType[msg.functionType]} (${
					msg.functionType
				})`,
				"debug",
			);
			handlers = this.requestHandlers.get(msg.functionType);
		}

		if (handlers != undefined && handlers.length > 0) {
			log(
				"driver",
				`  ${handlers.length} handler${
					handlers.length !== 1 ? "s" : ""
				} registered!`,
				"debug",
			);
			// loop through all handlers and find the first one that returns true to indicate that it handled the message
			for (let i = 0; i < handlers.length; i++) {
				log2.driver.print(`  invoking handler #${i}`);
				const handler = handlers[i];
				if (handler.invoke(msg)) {
					log("driver", `    the message was handled`, "debug");
					if (handler.oneTime) {
						log(
							"driver",
							"  one-time handler was successfully called, removing it...",
							"debug",
						);
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

	private handleACK(): void {
		// if we have a pending request waiting for the ACK, ACK it
		const trnsact = this.currentTransaction;
		if (trnsact != undefined && trnsact.ackPending) {
			log2.driver.print("ACK received for current transaction");
			trnsact.ackPending = false;
			if (
				trnsact.message.expectedResponse == undefined ||
				trnsact.response != undefined
			) {
				log2.driver.print("transaction finished, resolving...");
				// if the response has been received prior to this, resolve the request
				// if no response was expected, also resolve the request
				this.resolveCurrentTransaction(false);
			}
			return;
		}

		// TODO: what to do with this ACK?
		log2.driver.print("Unexpected ACK received", "warn");
	}

	private handleNAK(): void {
		// TODO: what to do with this NAK?
	}

	private handleCAN(): void {
		if (this.currentTransaction != undefined) {
			if (this.mayRetryCurrentTransaction()) {
				const timeout = this.retryCurrentTransaction();
				log2.driver.print(
					`CAN received - scheduling transmission attempt (${this.currentTransaction.sendAttempts}/${this.currentTransaction.maxSendAttempts}) in ${timeout} ms...`,
					"warn",
				);
			} else {
				log2.driver.print(
					`CAN received - maximum transmission attempts for the current transaction reached, dropping it...`,
					"error",
				);

				this.rejectCurrentTransaction(
					new ZWaveError(
						`The message was dropped by the controller after ${this.currentTransaction.maxSendAttempts} attempts`,
						ZWaveErrorCodes.Controller_MessageDropped,
					),
					false /* don't resume queue, that happens automatically */,
				);
			}
		}
		// else: TODO: what to do with this CAN?
	}

	private mayRetryCurrentTransaction(): boolean {
		return (
			this.currentTransaction!.sendAttempts <
			this.currentTransaction!.maxSendAttempts
		);
	}

	/** Retries the current transaction and returns the calculated timeout */
	private retryCurrentTransaction(timeout?: number): number {
		// If no timeout was given, fallback to the default timeout as defined in the Z-Wave specs
		if (!timeout) {
			timeout = 100 + 1000 * (this.currentTransaction!.sendAttempts - 1);
		}
		this.currentTransaction!.sendAttempts++;
		setTimeout(() => this.retransmit(), timeout);
		return timeout;
	}

	/**
	 * Resolves the current transaction with the given value
	 * and resumes the queue handling
	 */
	private resolveCurrentTransaction(resumeQueue: boolean = true): void {
		const node = this.currentTransaction!.message.getNodeUnsafe();
		// TODO: this is driver level - is this necessary??
		log(
			"io",
			`resolving current transaction with ${stringify(
				this.currentTransaction!.response,
			)}`,
			"debug",
		);
		const { promise, response, timeoutInstance } = this.currentTransaction!;
		// Cancel any running timers
		if (timeoutInstance) clearTimeout(timeoutInstance);
		// and resolve the current transaction
		promise.resolve(response);
		this.currentTransaction = undefined;
		// If a sleeping node has no messages pending, send it back to sleep
		if (
			node &&
			node.supportsCC(CommandClasses["Wake Up"]) &&
			!this.hasPendingMessages(node)
		) {
			node.sendNoMoreInformation();
		}
		// Resume the send queue
		if (resumeQueue) {
			log2.driver.print("resuming send queue");
			setImmediate(() => this.workOffSendQueue());
		}
	}

	/**
	 * Rejects the current transaction with the given value
	 * and resumes the queue handling
	 */
	private rejectCurrentTransaction(
		reason: ZWaveError,
		resumeQueue: boolean = true,
	): void {
		log2.driver.print(
			`rejecting current transaction because "${reason.message}"`,
			"warn",
		);
		const { promise, timeoutInstance } = this.currentTransaction!;
		// Cancel any running timers
		if (timeoutInstance) clearTimeout(timeoutInstance);
		// and reject the current transaction
		promise.reject(reason);
		this.currentTransaction = undefined;
		// and see if there are messages pending
		if (resumeQueue) {
			log2.driver.print("resuming send queue");
			setImmediate(() => this.workOffSendQueue());
		}
	}

	// wotan-disable no-misused-generics
	/**
	 * Sends a message to the Z-Wave stick.
	 * @param msg The message to send
	 * @param options (optional) Options regarding the message transmission
	 */
	public async sendMessage<TResponse extends Message = Message>(
		msg: Message,
		options: SendMessageOptions = {},
	): Promise<TResponse> {
		this.ensureReady();

		// Don't send messages to dead nodes
		if (isNodeQuery(msg) || isCommandClassContainer(msg)) {
			const node = msg.getNodeUnsafe();
			if (node && node.status === NodeStatus.Dead) {
				throw new ZWaveError(
					"The message will not be sent because the node is presumed dead",
					ZWaveErrorCodes.Controller_MessageDropped,
				);
			}
		}

		if (options.priority == undefined)
			options.priority = getDefaultPriority(msg);
		if (options.priority == undefined) {
			const className = msg.constructor.name;
			const msgTypeName = FunctionType[msg.functionType];
			throw new ZWaveError(
				`No default priority has been defined for ${className} (${msgTypeName}), so you have to provide one for your message`,
				ZWaveErrorCodes.Driver_NoPriority,
			);
		}
		if (options.supportCheck == undefined) options.supportCheck = true;

		if (
			options.supportCheck &&
			this._controller != undefined &&
			!this._controller.isFunctionSupported(msg.functionType)
		) {
			throw new ZWaveError(
				`Your hardware does not support the ${
					FunctionType[msg.functionType]
				} function`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}

		// create the transaction and enqueue it
		const promise = createDeferredPromise<TResponse>();
		const transaction = new Transaction(
			this,
			msg,
			promise,
			options.priority,
			options.timeout,
		);

		this.sendQueue.add(transaction);
		// start sending now (maybe)
		setImmediate(() => this.workOffSendQueue());

		return promise;
	}
	// wotan-enable no-misused-generics

	/**
	 * Sends a command to a Z-Wave node.
	 * @param command The command to send. It will be encapsulated in a SendDataRequest.
	 * @param options (optional) Options regarding the message transmission
	 */
	// wotan-disable-next-line no-misused-generics
	public async sendCommand<TResponse extends CommandClass = CommandClass>(
		command: CommandClass,
		options: SendMessageOptions = {},
	): Promise<TResponse | undefined> {
		const msg = new SendDataRequest(this, {
			command,
		});
		const resp = await this.sendMessage(msg, options);
		if (isCommandClassContainer(resp)) {
			return resp.command as TResponse;
		}
	}

	/**
	 * Sends a low-level message like ACK, NAK or CAN immediately
	 * @param message The low-level message to send
	 */
	private send(header: MessageHeaders): void {
		// ACK, CAN, NAK
		log2.serial[MessageHeaders[header] as "ACK" | "NAK" | "CAN"](
			"outbound",
		);
		this.doSend(Buffer.from([header]));
		return;
	}

	private sendQueueTimer: NodeJS.Timer | undefined;
	private workOffSendQueue(): void {
		if (this.sendQueueTimer != undefined) {
			clearTimeout(this.sendQueueTimer);
			this.sendQueueTimer = undefined;
		}

		// is there something to send?
		if (this.sendQueue.length === 0) {
			log2.driver.print("The send queue is empty");
			return;
		} else {
			log2.driver.sendQueue(this.sendQueue);
		}
		// we are still waiting for the current transaction to finish
		if (this.currentTransaction != undefined) {
			log2.driver.print(
				`workOffSendQueue > skipping because a transaction is pending`,
			);
			return;
		}

		// Before doing anything else, check if this message is for a node that's currently asleep
		// The automated sorting ensures there's no message for a non-sleeping node after that
		const targetNode = this.sendQueue.peekStart()!.message.getNodeUnsafe();
		if (!targetNode || targetNode.isAwake()) {
			// get the next transaction
			this.currentTransaction = this.sendQueue.shift()!;
			const msg = this.currentTransaction.message;
			// TODO: This is driver level
			log(
				"io",
				`workOffSendQueue > sending next message (${
					FunctionType[msg.functionType]
				})${targetNode ? ` to node ${targetNode.id}` : ""}...`,
				"debug",
			);
			// for messages containing a CC, i.e. a SendDataRequest, set the CC version as high as possible
			if (isCommandClassContainer(msg)) {
				const ccId = msg.command.ccId;
				msg.command.version = this.getSafeCCVersionForNode(
					msg.command.nodeId,
					ccId,
				);
				// TODO: This is driver level
				// TODO: This could be improved
				log(
					"io",
					`  CC = ${CommandClasses[ccId]} (${num2hex(
						ccId,
					)}) => using version ${msg.command.version}`,
					"debug",
				);
			}
			const data = msg.serialize();
			// Mark the transaction as being sent
			this.currentTransaction.sendAttempts = 1;
			log2.serial.data("outbound", data);
			this.doSend(data);
			// If the transaction has a timeout configured, start it
			if (this.currentTransaction.timeout) {
				this.currentTransaction.timeoutInstance = setTimeout(() => {
					if (!this.currentTransaction) return;
					this.rejectCurrentTransaction(
						new ZWaveError(
							"The transaction timed out",
							ZWaveErrorCodes.Controller_MessageTimeout,
						),
					);
				}, this.currentTransaction.timeout);
			}

			if (this.sendQueue.length > 0) {
				// to avoid any deadlocks we didn't think of, re-call this later
				this.sendQueueTimer = setTimeout(
					() => this.workOffSendQueue(),
					1000,
				);
			}
		} else {
			log2.driver.print(
				`The remaining ${this.sendQueue.length} messages are for sleeping nodes, not sending anything!`,
			);
		}
	}

	private retransmit(): void {
		if (!this.currentTransaction) return;
		log2.driver.transaction(this.currentTransaction);
		const msg = this.currentTransaction.message;
		const data = msg.serialize();
		log2.serial.data("outbound", data);
		this.doSend(data);
	}

	private doSend(data: Buffer): void {
		if (this.serial) {
			this.serial.write(data);
		}
	}

	/** Moves all messages for a given node into the wakeup queue */
	private moveMessagesToWakeupQueue(nodeId: number): void {
		const pingsToRemove: Transaction[] = [];
		for (const transaction of this.sendQueue) {
			const msg = transaction.message;
			const targetNodeId = msg.getNodeId();
			if (targetNodeId === nodeId) {
				if (
					isCommandClassContainer(msg) &&
					msg.command instanceof NoOperationCC
				) {
					pingsToRemove.push(transaction);
				} else {
					// Change the priority to WakeUp
					transaction.priority = MessagePriority.WakeUp;
				}
			}
		}
		// Remove all pings that would clutter the send queue
		this.sendQueue.remove(...pingsToRemove);

		// Changing the priority has an effect on the order, so re-sort the send queue
		// This must be done anyways, as removing the items does not change the location of others
		this.sortSendQueue();

		// Don't forget the current transaction
		if (
			this.currentTransaction &&
			this.currentTransaction.message.getNodeId() === nodeId
		) {
			// Change the priority to WakeUp and re-add it to the queue
			this.currentTransaction.priority = MessagePriority.WakeUp;
			this.sendQueue.add(this.currentTransaction);
			// Reset send attempts - we might have already used all of them
			this.currentTransaction.sendAttempts = 0;
			// "reset" the current transaction to none
			this.currentTransaction = undefined;
		}
	}

	private rejectAllTransactionsForNode(
		nodeId: number,
		errorMsg: string = `The node is dead`,
	): void {
		const transactionsToRemove: Transaction[] = [];

		for (const transaction of this.sendQueue) {
			const msg = transaction.message;
			const targetNodeId = msg.getNodeId();
			if (targetNodeId === nodeId) {
				transactionsToRemove.push(transaction);
				transaction.promise.reject(
					new ZWaveError(
						errorMsg,
						ZWaveErrorCodes.Controller_MessageDropped,
					),
				);
			}
		}
		// Remove all transactions that belong to the node
		this.sendQueue.remove(...transactionsToRemove);

		// Don't forget the current transaction
		if (
			this.currentTransaction &&
			this.currentTransaction.message.getNodeId() === nodeId
		) {
			this.rejectCurrentTransaction(
				new ZWaveError(
					errorMsg,
					ZWaveErrorCodes.Controller_MessageDropped,
				),
			);
		}
	}

	private sortSendQueue(): void {
		const items = [...this.sendQueue];
		this.sendQueue.clear();
		this.sendQueue.add(...items);
	}

	private lastSaveToCache: number = 0;
	private readonly saveToCacheInterval: number = 50;
	private saveToCacheTimer: NodeJS.Timer | undefined;

	private async saveNetworkToCacheInternal(): Promise<void> {
		if (!this._controller || !this.controller.homeId) return;
		const cacheFile = path.join(
			this.cacheDir,
			this.controller.homeId.toString(16) + ".json",
		);
		const serializedObj = this.controller.serialize();
		await fs.ensureDir(this.cacheDir);
		await fs.writeJSON(cacheFile, serializedObj, { spaces: 4 });
	}

	/**
	 * Saves the current configuration and collected data about the controller and all nodes to a cache file.
	 * For performance reasons, these calls may be throttled.
	 */
	public async saveNetworkToCache(): Promise<void> {
		if (!this._controller || !this.controller.homeId) return;
		// Ensure this method isn't being executed too often
		if (Date.now() - this.lastSaveToCache < this.saveToCacheInterval) {
			// Schedule a save in a couple of ms to collect changes
			if (!this.saveToCacheTimer) {
				this.saveToCacheTimer = setTimeout(
					() => void this.saveNetworkToCache(),
					this.saveToCacheInterval,
				);
			}
			return;
		} else {
			this.saveToCacheTimer = undefined;
		}
		this.lastSaveToCache = Date.now();
		return this.saveNetworkToCacheInternal();
	}

	/**
	 * Restores a previously stored Z-Wave network state from cache to speed up the startup process
	 */
	public async restoreNetworkFromCache(): Promise<void> {
		if (!this._controller || !this.controller.homeId) return;

		const cacheFile = path.join(
			this.cacheDir,
			this.controller.homeId.toString(16) + ".json",
		);
		if (!(await fs.pathExists(cacheFile))) return;
		try {
			log2.driver.print(
				`Cache file for homeId ${num2hex(
					this.controller.homeId,
				)} found, attempting to restore the network from cache...`,
			);
			const cacheObj = await fs.readJSON(cacheFile);
			this.controller.deserialize(cacheObj);
			log2.driver.print(
				`  Restoring the network from cache was successful!`,
			);
		} catch (e) {
			log2.driver.print(
				`  restoring the network from cache failed: ${e}`,
				"error",
			);
		}
	}
}

/** Skips the first n bytes of a buffer and returns the rest */
function skipBytes(buf: Buffer, n: number): Buffer {
	return Buffer.from(buf.slice(n));
}
