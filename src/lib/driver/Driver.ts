import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { entries } from "alcalzone-shared/objects";
import { SortedList } from "alcalzone-shared/sorted-list";
import { EventEmitter } from "events";
import fs from "fs-extra";
import path from "path";
import SerialPort from "serialport";
import {
	CommandClass,
	getImplementedVersion,
} from "../commandclass/CommandClass";
import { CommandClasses } from "../commandclass/CommandClasses";
import { isCommandClassContainer } from "../commandclass/ICommandClassContainer";
import {
	MultiChannelCC,
	MultiChannelCCCommandEncapsulation,
} from "../commandclass/MultiChannelCC";
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
import log from "../log";
import {
	FunctionType,
	MessageHeaders,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import { getDefaultPriority, Message } from "../message/Message";
import { InterviewStage, IZWaveNode, NodeStatus } from "../node/INode";
import { isNodeQuery } from "../node/INodeQuery";
import { ZWaveNode } from "../node/Node";
import { DeepPartial } from "../util/misc";
import { num2hex } from "../util/strings";
import { DriverEventCallbacks, DriverEvents, IDriver } from "./IDriver";
import { Transaction } from "./Transaction";

export interface ZWaveOptions {
	timeouts: {
		/** how long to wait for an ACK */
		ack: number;
		/** not sure */
		byte: number;
		/** How much time a node gets to process a request */
		report: number;
	};
	/**
	 * @internal
	 * Set this to true to skip the controller interview. Useful for testing purposes
	 */
	skipInterview?: boolean;
}

const defaultOptions: ZWaveOptions = {
	timeouts: {
		ack: 1000,
		byte: 150,
		report: 1000, // SDS11846: ReportTime timeout SHOULD be set to CommandTime + 1 second
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
	if (options.timeouts.report < 1) {
		throw new ZWaveError(
			`The Report timeout must be positive!`,
			ZWaveErrorCodes.Driver_InvalidOptions,
		);
	}
}

export type RequestHandler<T extends Message = Message> = (
	msg: T,
) => boolean | Promise<boolean>;
interface RequestHandlerEntry<T extends Message = Message> {
	invoke: RequestHandler<T>;
	oneTime: boolean;
}

export interface SendMessageOptions {
	/** The priority of the message to send. If none is given, the defined default priority of the message class will be used. */
	priority?: MessagePriority;
	/** If an exception should be thrown when the message to send is not supported. Setting this to false is is useful if the capabilities haven't been determined yet. Default: true */
	supportCheck?: boolean;
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

	/** Enumerates all existing serial ports */
	public static async enumerateSerialPorts(): Promise<string[]> {
		const ports = await SerialPort.list();
		return ports.map(port => port.comName);
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
			log.driver.print("starting driver...");
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
					log.driver.print("serial port opened");
					this._isOpen = true;
					this.resetIO();
					resolve();

					setImmediate(
						() => void this.initializeControllerAndNodes(),
					);
				})
				// wotan-disable-next-line async-function-assignability
				.on("data", this.serialport_onData.bind(this))
				.on("error", err => {
					log.driver.print("serial port errored: " + err, "error");
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
		if (this._controller == undefined) {
			this._controller = new ZWaveController(this);
			this._controller.on("node added", this.onNodeAdded.bind(this));
			// TODO: Add handler for removing nodes
		}
		if (!this.options.skipInterview) {
			// Interview the controller
			await this._controller.interview();
		}

		// in any case we need to emit the driver ready event here
		this._controllerInterviewed = true;
		log.driver.print("driver ready");
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
				log.controller.print("node interview failed: " + e, "error");
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

	private onNodeWakeUp(node: IZWaveNode): void {
		log.controller.logNode(node.id, "The node is now awake.");

		// It *should* not be necessary to restart the node interview here.
		// When a node that supports wakeup does not respond, pending promises
		// are not rejected.

		// Make sure to handle the pending messages as quickly as possible
		this.sortSendQueue();
		setImmediate(() => this.workOffSendQueue());
	}

	private onNodeSleep(node: ZWaveNode): void {
		log.controller.logNode(node.id, "The node is now asleep.");
	}

	private onNodeAlive(node: ZWaveNode): void {
		log.controller.logNode(node.id, "The node is now alive.");
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

	/** This is called when a new node has been added to the network */
	private onNodeAdded(node: ZWaveNode): void {
		this.addNodeEventHandlers(node);
		if (!this.options.skipInterview) {
			// Interview the node
			// don't await the interview, because it may take a very long time
			// if a node is asleep
			void this.interviewNode(node);
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
		log.driver.print("resetting driver instance...");

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
		log.driver.print("destroying driver instance...");
		this._wasDestroyed = true;

		try {
			// Attempt to save the network to cache
			await this.saveNetworkToCacheInternal();
		} catch (e) {
			log.driver.print(
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
	private async serialport_onData(data: Buffer): Promise<void> {
		// append the new data to our receive buffer
		this.receiveBuffer =
			this.receiveBuffer != undefined
				? Buffer.concat([this.receiveBuffer, data])
				: data;

		while (this.receiveBuffer.length > 0) {
			if (this.receiveBuffer[0] !== MessageHeaders.SOF) {
				switch (this.receiveBuffer[0]) {
					// single-byte messages - we have a handler for each one
					case MessageHeaders.ACK: {
						log.serial.ACK("inbound");
						this.handleACK();
						break;
					}
					case MessageHeaders.NAK: {
						log.serial.NAK("inbound");
						this.handleNAK();
						break;
					}
					case MessageHeaders.CAN: {
						log.serial.CAN("inbound");
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

			// Log the received chunk
			log.serial.data("inbound", data);
			// Log the current receive buffer
			const msgComplete = Message.isComplete(this.receiveBuffer);
			log.serial.receiveBuffer(this.receiveBuffer, msgComplete);
			// nothing to do yet, wait for the next data
			if (!msgComplete) return;

			let msg: Message | undefined;
			let bytesRead: number;
			try {
				msg = Message.from(this, this.receiveBuffer);
				bytesRead = msg.bytesRead;
			} catch (e) {
				let handled = false;
				if (e instanceof ZWaveError) {
					switch (e.code) {
						case ZWaveErrorCodes.PacketFormat_Invalid:
						case ZWaveErrorCodes.PacketFormat_Checksum:
							this.onInvalidData(
								this.receiveBuffer,
								e.toString(),
							);
							return;

						case ZWaveErrorCodes.Deserialization_NotImplemented:
						case ZWaveErrorCodes.CC_NotImplemented:
							log.driver.print(
								`Dropping message because it could not be deserialized: ${e.message}`,
								"warn",
							);
							handled = true;
							bytesRead = Message.getMessageLength(
								this.receiveBuffer,
							);
							break;

						case ZWaveErrorCodes.Driver_NotReady:
							log.driver.print(
								`Dropping message because the driver is not ready to handle it yet.`,
								"warn",
							);
							handled = true;
							bytesRead = Message.getMessageLength(
								this.receiveBuffer,
							);
							break;

						case ZWaveErrorCodes.PacketFormat_InvalidPayload:
							log.driver.print(
								`Message with invalid data received. Dropping it...`,
								"warn",
							);
							handled = true;
							bytesRead = Message.getMessageLength(
								this.receiveBuffer,
							);
							break;
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
			if (msg) await this.handleMessage(msg);
		}

		log.serial.message(
			`The receive buffer is empty, waiting for the next chunk...`,
		);
	}

	private async handleMessage(msg: Message): Promise<void> {
		// Before doing anything else, unwrap encapsulated commands
		if (
			isCommandClassContainer(msg) &&
			msg.command instanceof MultiChannelCCCommandEncapsulation
		) {
			log.driver.print("Unwrapping MultiChannel encapsulated command");
			msg.command = MultiChannelCC.unwrap(msg.command);
		}

		// if we have a pending request, check if that is waiting for this message
		if (this.currentTransaction != undefined) {
			const responseRole = this.currentTransaction.message.testResponse(
				msg,
			);
			switch (responseRole) {
				case "confirmation":
					log.driver.transactionResponse(msg, "confirmation");
					// When a node has received the message, it confirms the receipt with a SendDataRequest
					if (
						msg.type === MessageType.Request &&
						!this.currentTransaction.timeoutInstance
					) {
						// As per SDS11846, start a timeout for the response
						this.currentTransaction.computeRTT();
						const msRTT = this.currentTransaction.rtt / 1e6;

						log.driver.print(
							`ACK received from node for current transaction. RTT = ${msRTT.toFixed(
								2,
							)} ms`,
						);

						this.currentTransaction.timeoutInstance = setTimeout(
							() => {
								if (!this.currentTransaction) return;
								// TODO: Do we need more information here?
								log.driver.print(
									"The transaction timed out",
									"warn",
								);
								this.rejectCurrentTransaction(
									new ZWaveError(
										"The transaction timed out",
										ZWaveErrorCodes.Controller_MessageTimeout,
									),
								);
							},
							// The timeout SHOULD be RTT + 1s
							msRTT + this.options.timeouts.report,
						)
							// Unref'ing long running timers allows the process to exit mid-timeout
							.unref();
					}
					// no need to further process intermediate responses, as they only tell us things are good
					return;

				case "fatal_controller":
					log.driver.transactionResponse(msg, "fatal_controller");
					// The message was not sent
					if (this.mayRetryCurrentTransaction()) {
						// The Z-Wave specs define 500ms as the waiting period for SendData messages
						const timeout = this.retryCurrentTransaction(500);
						log.driver.print(
							`  the message for the current transaction could not be sent, scheduling attempt (${this.currentTransaction.sendAttempts}/${this.currentTransaction.maxSendAttempts}) in ${timeout} ms...`,
							"warn",
						);
					} else {
						log.driver.print(
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
					log.driver.transactionResponse(msg, "fatal_node");
					// The node did not respond
					const node = this.currentTransaction.message.getNodeUnsafe();
					if (!node) return; // This should never happen, but whatever
					if (node.supportsCC(CommandClasses["Wake Up"])) {
						log.controller.logNode(
							node.id,
							`The node did not respond because it is asleep, moving its messages to the wakeup queue`,
							"warn",
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
						log.controller.logNode(
							node.id,
							`The node did not respond to the current transaction, scheduling attempt (${this.currentTransaction.sendAttempts}/${this.currentTransaction.maxSendAttempts}) in ${timeout} ms...`,
							"warn",
						);
					} else {
						let errorMsg = `The node did not respond to the current transaction after ${this.currentTransaction.maxSendAttempts} attempts, it is presumed dead`;
						if (msg instanceof SendDataRequestTransmitReport) {
							errorMsg += ` (Status ${
								TransmitStatus[msg.transmitStatus]
							})`;
						}
						log.controller.logNode(node.id, `${errorMsg}`, "warn");

						node.status = NodeStatus.Dead;
						this.rejectAllTransactionsForNode(node.id, errorMsg);
						// And continue with the next messages
						setImmediate(() => this.workOffSendQueue());
					}
					return;

				case "partial":
					// This is a multi-step response and we just received a part of it, which is not the final one
					log.driver.transactionResponse(msg, "partial");
					this.currentTransaction.partialResponses.push(msg);
					return;

				case "final":
					// this is the expected response!
					log.driver.transactionResponse(msg, "final");
					this.currentTransaction.response = msg;
					if (this.currentTransaction.partialResponses.length > 0) {
						msg.mergePartialMessages(
							this.currentTransaction.partialResponses,
						);
					}
					if (!this.currentTransaction.ackPending) {
						log.driver.print(
							`ACK already received, resolving transaction`,
						);
						this.resolveCurrentTransaction();
					} else {
						// wait for the ack, it might be received out of order
						log.driver.print(
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
			await this.handleRequest(msg);
		} else {
			log.driver.transactionResponse(msg, "unexpected");
			log.driver.print("unexpected response, discarding...", "warn");
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
		log.driver.print(
			`added${oneTime ? " one-time" : ""} request handler for ${
				FunctionType[fnType]
			} (${num2hex(fnType)})...
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
		log.driver.print(
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

	private async handleRequest(msg: Message | SendDataRequest): Promise<void> {
		let handlers: RequestHandlerEntry[] | undefined;

		if (isNodeQuery(msg) || isCommandClassContainer(msg)) {
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
			log.driver.print(
				`handling application command request ${
					CommandClasses[ccId]
				} (${num2hex(ccId)}) for node ${nodeId}`,
			);
			// cannot handle ApplicationCommandRequests without a controller
			if (this._controller == undefined) {
				log.driver.print(
					`  the controller is not ready yet, discarding...`,
					"warn",
				);
				return;
			} else if (!this.controller.nodes.has(nodeId)) {
				log.driver.print(
					`  the node is unknown or not initialized yet, discarding...`,
					"warn",
				);
				return;
			}

			// dispatch the command to the node itself
			const node = this.controller.nodes.get(nodeId)!;
			await node.handleCommand(msg.command);

			return;
		} else if (msg instanceof ApplicationUpdateRequest) {
			if (msg instanceof ApplicationUpdateRequestNodeInfoReceived) {
				const node = msg.getNodeUnsafe();
				if (node) {
					log.controller.logNode(node.id, {
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
			log.driver.print(
				`handling request ${FunctionType[msg.functionType]} (${
					msg.functionType
				})`,
			);
			handlers = this.requestHandlers.get(msg.functionType);
		}

		if (handlers != undefined && handlers.length > 0) {
			log.driver.print(
				`  ${handlers.length} handler${
					handlers.length !== 1 ? "s" : ""
				} registered!`,
			);
			// loop through all handlers and find the first one that returns true to indicate that it handled the message
			for (let i = 0; i < handlers.length; i++) {
				log.driver.print(`  invoking handler #${i}`);
				// Invoke the handler and remember its result
				const handler = handlers[i];
				let handlerResult = handler.invoke(msg);
				if (handlerResult instanceof Promise) {
					handlerResult = await handlerResult;
				}
				if (handlerResult) {
					log.driver.print(`    the message was handled`);
					if (handler.oneTime) {
						log.driver.print(
							"  one-time handler was successfully called, removing it...",
						);
						handlers.splice(i, 1);
					}
					// don't invoke any more handlers
					break;
				}
			}
		} else {
			log.driver.print("  no handlers registered!", "warn");
		}
	}

	private handleACK(): void {
		// if we have a pending request waiting for the ACK, ACK it
		const trnsact = this.currentTransaction;
		if (trnsact != undefined && trnsact.ackPending) {
			trnsact.ackPending = false;
			log.driver.print(
				`ACK received from controller for current transaction`,
			);
			if (
				trnsact.message.expectedResponse == undefined ||
				trnsact.response != undefined
			) {
				log.driver.print("transaction finished, resolving...");
				// if the response has been received prior to this, resolve the request
				// if no response was expected, also resolve the request
				this.resolveCurrentTransaction(false);
			}
			return;
		}

		log.driver.print("Unexpected ACK received", "warn");
	}

	private handleNAK(): void {
		// TODO: what to do with this NAK?
	}

	private handleCAN(): void {
		if (this.currentTransaction != undefined) {
			if (this.mayRetryCurrentTransaction()) {
				const timeout = this.retryCurrentTransaction();
				log.driver.print(
					`CAN received - scheduling transmission attempt (${this.currentTransaction.sendAttempts}/${this.currentTransaction.maxSendAttempts}) in ${timeout} ms...`,
					"warn",
				);
			} else {
				log.driver.print(
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
		// Unref'ing long running timers allows the process to exit mid-timeout
		setTimeout(() => this.retransmit(), timeout).unref();
		return timeout;
	}

	/**
	 * Resolves the current transaction with the given value
	 * and resumes the queue handling
	 */
	private resolveCurrentTransaction(resumeQueue: boolean = true): void {
		const node = this.currentTransaction!.message.getNodeUnsafe();
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
			log.driver.print("resuming send queue");
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
		const { promise, timeoutInstance } = this.currentTransaction!;
		// Cancel any running timers
		if (timeoutInstance) clearTimeout(timeoutInstance);
		// and reject the current transaction
		promise.reject(reason);
		this.currentTransaction = undefined;
		// and see if there are messages pending
		if (resumeQueue) {
			log.driver.print("resuming send queue");
			setImmediate(() => this.workOffSendQueue());
		}
	}

	private lastCallbackId = 0xff;
	/**
	 * Returns the next callback ID. Callback IDs are used to correllate requests
	 * to the controller/nodes with its response
	 */
	public getNextCallbackId(): number {
		this.lastCallbackId = (this.lastCallbackId + 1) & 0xff;
		if (this.lastCallbackId < 1) this.lastCallbackId = 1;
		return this.lastCallbackId;
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

		// Automatically encapsulate commands that are supposed to target a specific endpoint
		if (
			isCommandClassContainer(msg) &&
			MultiChannelCC.requiresEncapsulation(msg.command)
		) {
			msg.command = MultiChannelCC.encapsulate(this, msg.command);
		}

		// create the transaction and enqueue it
		const promise = createDeferredPromise<TResponse>();
		const transaction = new Transaction(
			this,
			msg,
			promise,
			options.priority,
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
		log.serial[MessageHeaders[header] as "ACK" | "NAK" | "CAN"]("outbound");
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
			log.driver.print("The send queue is empty");
			return;
		} else {
			log.driver.sendQueue(this.sendQueue);
		}
		// we are still waiting for the current transaction to finish
		if (this.currentTransaction != undefined) {
			log.driver.print(
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
			log.driver.print(
				`workOffSendQueue > sending next message (${
					FunctionType[msg.functionType]
				})${targetNode ? ` to node ${targetNode.id}` : ""}...`,
			);
			// for messages containing a CC, i.e. a SendDataRequest, set the CC version as high as possible
			if (isCommandClassContainer(msg)) {
				const ccId = msg.command.ccId;
				msg.command.version = this.getSafeCCVersionForNode(
					msg.command.nodeId,
					ccId,
				);
				// TODO: This could be improved
				log.driver.print(
					`CC = ${CommandClasses[ccId]} (${num2hex(
						ccId,
					)}) => using version ${msg.command.version}`,
				);
			}
			// Actually send the message
			this.currentTransaction.markAsSent();
			const data = msg.serialize();
			log.serial.data("outbound", data);
			this.doSend(data);

			if (this.sendQueue.length > 0) {
				// to avoid any deadlocks we didn't think of, re-call this later
				// Unref'ing long running timers allows the process to exit mid-timeout
				this.sendQueueTimer = setTimeout(
					() => this.workOffSendQueue(),
					1000,
				).unref();
			}
		} else {
			log.driver.print(
				`The remaining ${this.sendQueue.length} messages are for sleeping nodes, not sending anything!`,
			);
		}
	}

	private retransmit(): void {
		if (!this.currentTransaction) return;
		log.driver.transaction(this.currentTransaction);
		const msg = this.currentTransaction.message;
		const data = msg.serialize();
		log.serial.data("outbound", data);
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
			log.driver.print(
				`Cache file for homeId ${num2hex(
					this.controller.homeId,
				)} found, attempting to restore the network from cache...`,
			);
			const cacheObj = await fs.readJSON(cacheFile);
			this.controller.deserialize(cacheObj);
			log.driver.print(
				`  Restoring the network from cache was successful!`,
			);
		} catch (e) {
			log.driver.print(
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
