import { wait } from "alcalzone-shared/async";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { entries } from "alcalzone-shared/objects";
import { SortedList } from "alcalzone-shared/sorted-list";
import { isArray } from "alcalzone-shared/typeguards";
import { EventEmitter } from "events";
import fsExtra from "fs-extra";
import path from "path";
import SerialPort from "serialport";
import { promisify } from "util";
import {
	CommandClass,
	getImplementedVersion,
} from "../commandclass/CommandClass";
import { CommandClasses } from "../commandclass/CommandClasses";
import { DeviceResetLocallyCCNotification } from "../commandclass/DeviceResetLocallyCC";
import { isEncapsulatingCommandClass } from "../commandclass/EncapsulatingCommandClass";
import {
	ICommandClassContainer,
	isCommandClassContainer,
} from "../commandclass/ICommandClassContainer";
import { MultiChannelCC } from "../commandclass/MultiChannelCC";
import { messageIsPing } from "../commandclass/NoOperationCC";
import {
	SupervisionCC,
	SupervisionCCGet,
	SupervisionCCReport,
	SupervisionResult,
	SupervisionStatus,
} from "../commandclass/SupervisionCC";
import { WakeUpCC } from "../commandclass/WakeUpCC";
import { loadDeviceIndex } from "../config/Devices";
import { loadIndicators } from "../config/Indicators";
import { loadManufacturers } from "../config/Manufacturers";
import { loadMeters } from "../config/Meters";
import { loadNotifications } from "../config/Notifications";
import { loadNamedScales } from "../config/Scales";
import { loadSensorTypes } from "../config/SensorTypes";
import { ApplicationCommandRequest } from "../controller/ApplicationCommandRequest";
import {
	ApplicationUpdateRequest,
	ApplicationUpdateRequestNodeInfoReceived,
} from "../controller/ApplicationUpdateRequest";
import { ZWaveController } from "../controller/Controller";
import {
	isSendReport,
	isTransmitReport,
	SendDataMulticastRequest,
	SendDataRequest,
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
import { DeepPartial, getEnumMemberName, skipBytes } from "../util/misc";
import { num2hex } from "../util/strings";
import { Duration } from "../values/Duration";
import { FileSystem } from "./FileSystem";
import { DriverEventCallbacks, DriverEvents, IDriver } from "./IDriver";
import { Transaction } from "./Transaction";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: libVersion } = require("../../../package.json");
// This is made with cfonts:
const libNameString = `
███████╗ ██╗    ██╗  █████╗  ██╗   ██╗ ███████╗             ██╗ ███████╗
╚══███╔╝ ██║    ██║ ██╔══██╗ ██║   ██║ ██╔════╝             ██║ ██╔════╝
  ███╔╝  ██║ █╗ ██║ ███████║ ██║   ██║ █████╗   █████╗      ██║ ███████╗
 ███╔╝   ██║███╗██║ ██╔══██║ ╚██╗ ██╔╝ ██╔══╝   ╚════╝ ██   ██║ ╚════██║
███████╗ ╚███╔███╔╝ ██║  ██║  ╚████╔╝  ███████╗        ╚█████╔╝ ███████║
╚══════╝  ╚══╝╚══╝  ╚═╝  ╚═╝   ╚═══╝   ╚══════╝         ╚════╝  ╚══════╝
`;

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
	/**
	 * How many attempts should be made for each node interview before giving up
	 */
	nodeInterviewAttempts: number;
	/**
	 * Allows you to replace the default file system driver used to store and read the cache
	 */
	fs: FileSystem;
	/** Allows you to specify a different cache directory */
	cacheDir: string;
}

const defaultOptions: ZWaveOptions = {
	timeouts: {
		ack: 1000,
		byte: 150,
		report: 1000,
	},
	skipInterview: false,
	nodeInterviewAttempts: 5,
	fs: fsExtra,
	cacheDir: path.resolve(__dirname, "../../..", "cache"),
};

/**
 * Merges the user-defined options with the default options
 */
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

/** Ensures that the options are valid */
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

/**
 * Function signature for a message handler. The return type signals if the
 * message was handled (`true`) or further handlers should be called (`false`)
 */
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

export type SupervisionUpdateHandler = (
	status: SupervisionStatus,
	remainingDuration?: Duration,
) => void;

export type SendSupervisedCommandOptions = SendMessageOptions &
	(
		| {
				requestStatusUpdates: false;
		  }
		| {
				requestStatusUpdates: true;
				onUpdate: SupervisionUpdateHandler;
		  }
	);

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

/**
 * The driver is the core of this library. It controls the serial interface,
 * handles transmission and receipt of messages and manages the network cache.
 * Any action you want to perform on the Z-Wave network must go through a driver
 * instance or its associated nodes.
 */
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
	/** A map of all current supervision sessions that may still receive updates */
	private supervisionSessions = new Map<number, SupervisionUpdateHandler>();

	public readonly cacheDir: string;

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
		this.cacheDir = this.options.cacheDir;

		// register some cleanup handlers in case the program doesn't get closed cleanly
		this._cleanupHandler = this._cleanupHandler.bind(this);
		process.on("exit", this._cleanupHandler);
		process.on("SIGINT", this._cleanupHandler);
		process.on("uncaughtException", this._cleanupHandler);
	}

	/** Enumerates all existing serial ports */
	public static async enumerateSerialPorts(): Promise<string[]> {
		const ports = await SerialPort.list();
		return ports.map(port => port.path);
	}

	/** @internal */
	public options: ZWaveOptions;

	private _wasStarted: boolean = false;
	private _isOpen: boolean = false;

	/** Start the driver */
	// wotan-disable async-function-assignability
	public async start(): Promise<void> {
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

		const spOpenPromise = createDeferredPromise();

		// Log which version is running
		log.driver.print(libNameString, "info");
		log.driver.print(`version ${libVersion}`, "info");
		log.driver.print("", "info");

		log.driver.print("starting driver...");
		// Open the serial port
		log.driver.print(`opening serial port ${this.port}`);
		this.serial = new SerialPort(this.port, {
			autoOpen: false,
			baudRate: 115200,
			dataBits: 8,
			stopBits: 1,
			parity: "none",
		});
		// If the port is already open, close it first. We will reopen it later
		if (this.serial.isOpen) {
			await promisify(this.serial.close.bind(this.serial))();
		}
		this.serial
			.on("open", async () => {
				log.driver.print("serial port opened");
				this._isOpen = true;
				spOpenPromise.resolve();

				this.send(MessageHeaders.NAK);
				await wait(1500);

				setImmediate(async () => {
					// Load the necessary configuration
					log.driver.print("loading configuration...");
					await loadManufacturers();
					await loadDeviceIndex();
					await loadNotifications();
					await loadNamedScales();
					await loadSensorTypes();
					await loadMeters();
					await loadIndicators();

					log.driver.print("beginning interview...");
					await this.initializeControllerAndNodes();
				});
			})
			.on("data", this.serialport_onData.bind(this))
			.on("error", err => {
				log.driver.print("serial port errored: " + err, "error");
				if (this._isOpen) {
					this.serialport_onError(err);
				} else {
					spOpenPromise.reject(err);
					this.destroy();
				}
			});
		this.serial.open();

		// IMPORTANT: Test code expects this to be created and returned synchronously
		// Everything async must happen in the setImmediate callback
		return spOpenPromise;
	}
	// wotan-enable async-function-assignability

	private _controllerInterviewed: boolean = false;
	private _nodesReady = new Set<number>();
	private _nodesReadyEventEmitted: boolean = false;
	/**
	 * Initializes the variables for controller and nodes,
	 * adds event handlers and starts the interview process.
	 */
	private async initializeControllerAndNodes(): Promise<void> {
		if (this._controller == undefined) {
			this._controller = new ZWaveController(this);
			this._controller
				.on("node added", this.onNodeAdded.bind(this))
				.on("node removed", this.onNodeRemoved.bind(this));
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
		// Before interviewing nodes reset our knowledge about their ready state
		this._nodesReady.clear();
		this._nodesReadyEventEmitted = false;

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

	private retryNodeInterviewTimeouts = new Map<number, NodeJS.Timeout>();
	/**
	 * Starts or resumes the interview of a Z-Wave node. It is advised to NOT
	 * await this method as it can take a very long time (minutes to hours)!
	 */
	private async interviewNode(node: ZWaveNode): Promise<void> {
		if (node.interviewStage === InterviewStage.Complete) {
			node.interviewStage = InterviewStage.RestartFromCache;
		}

		try {
			if (!(await node.interview())) {
				// Find out if we may retry the interview
				if (node.status === NodeStatus.Dead) {
					log.controller.logNode(
						node.id,
						`Interview attempt (${node.interviewAttempts} / ${this.options.nodeInterviewAttempts}) failed, node is dead.`,
						"warn",
					);
				} else if (
					node.interviewAttempts < this.options.nodeInterviewAttempts
				) {
					// This is most likely because the node is unable to handle our load of requests now. Give it some time
					const retryTimeout = Math.min(
						30000,
						node.interviewAttempts * 5000,
					);
					log.controller.logNode(
						node.id,
						`Interview attempt ${node.interviewAttempts}/${this.options.nodeInterviewAttempts} failed, retrying in ${retryTimeout} ms...`,
						"warn",
					);
					// Schedule the retry and remember the timeout instance
					this.retryNodeInterviewTimeouts.set(
						node.id,
						setTimeout(() => {
							this.retryNodeInterviewTimeouts.delete(node.id);
							this.interviewNode(node);
						}, retryTimeout).unref(),
					);
				} else {
					log.controller.logNode(
						node.id,
						`Failed all interview attempts, giving up.`,
						"warn",
					);
				}
			}
		} catch (e) {
			if (e instanceof ZWaveError) {
				log.controller.print("node interview failed: " + e, "error");
			} else {
				throw e;
			}
		}
	}

	/** Adds the necessary event handlers for a node instance */
	private addNodeEventHandlers(node: ZWaveNode): void {
		node.on("wake up", this.onNodeWakeUp.bind(this))
			.on("sleep", this.onNodeSleep.bind(this))
			.on("alive", this.onNodeAlive.bind(this))
			.on("dead", this.onNodeDead.bind(this))
			.on("interview completed", this.onNodeInterviewCompleted.bind(this))
			.on("ready", this.onNodeReady.bind(this));
	}

	/** Removes a node's event handlers that were added with addNodeEventHandlers */
	private removeNodeEventHandlers(node: ZWaveNode): void {
		node.removeAllListeners("wake up")
			.removeAllListeners("sleep")
			.removeAllListeners("alive")
			.removeAllListeners("dead")
			.removeAllListeners("interview completed")
			.removeAllListeners("ready");
	}

	/** Is called when a node wakes up */
	private onNodeWakeUp(node: IZWaveNode): void {
		log.controller.logNode(node.id, "The node is now awake.");

		// Start the timeouts after which the node is assumed asleep
		this.resetNodeAwakeTimeout(this.controller.nodes.get(node.id)!);

		// It *should* not be necessary to restart the node interview here.
		// When a node that supports wakeup does not respond, pending promises
		// are not rejected.

		// Make sure to handle the pending messages as quickly as possible
		this.sortSendQueue();
		setImmediate(() => this.workOffSendQueue());
	}

	/** Is called when a node goes to sleep */
	private onNodeSleep(node: ZWaveNode): void {
		log.controller.logNode(node.id, "The node is now asleep.");

		// Move all its pending messages to the WakeupQueue
		// This clears the current transaction
		this.moveMessagesToWakeupQueue(node.id);
		// And continue with the next messages
		setImmediate(() => this.workOffSendQueue());
	}

	/** Is called when a previously dead node starts communicating again */
	private onNodeAlive(node: ZWaveNode): void {
		log.controller.logNode(node.id, "The node is now alive.");
		if (node.interviewStage !== InterviewStage.Complete) {
			void this.interviewNode(node);
		}
	}

	/** Is called when a node is marked as dead */
	private onNodeDead(node: ZWaveNode): void {
		log.controller.logNode(node.id, "The node is now dead.");

		// This could mean that we need to ignore it in the all nodes ready check,
		// so perform the check again
		this.checkAllNodesReady();
	}

	/** Is called when a node is ready to be used */
	private onNodeReady(node: ZWaveNode): void {
		this._nodesReady.add(node.id);
		log.controller.logNode(node.id, "The node is ready to be used");

		this.checkAllNodesReady();
	}

	/** Checks if all nodes are ready and emits the "all nodes ready" event if they are */
	private async checkAllNodesReady(): Promise<void> {
		// Only emit "all nodes ready" once
		if (this._nodesReadyEventEmitted) return;

		for (const [id, node] of this.controller.nodes) {
			// Ignore dead nodes or the all nodes ready event will never be emitted without physical user interaction
			if (node.status === NodeStatus.Dead) continue;

			if (!this._nodesReady.has(id)) return;
		}
		// All nodes are ready
		log.controller.print("All nodes are ready to be used");
		this.emit("all nodes ready");
		this._nodesReadyEventEmitted = true;
	}

	/** Is called when a node interview is completed */
	private onNodeInterviewCompleted(node: ZWaveNode): void {
		this.debounceSendNodeToSleep(node);
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

	/** This is called when a node was removed from the network */
	private onNodeRemoved(node: ZWaveNode): void {
		this.removeNodeEventHandlers(node);
		this.rejectAllTransactionsForNode(
			node.id,
			"The node was removed from the network",
		);
		// Asynchronously remove the node from all possible associations, ignore potential errors
		this.controller.removeNodeFromAllAssocations(node.id).catch(err => {
			log.driver.print(
				`Failed to remove node ${node.id} from all associations: ${err.message}`,
				"error",
			);
		});

		// If this was a failed node it could mean that all nodes are now ready
		this.checkAllNodesReady();
	}

	/** Checks if there are any pending messages for the given node */
	private hasPendingMessages(node: ZWaveNode): boolean {
		return !!this.sendQueue.find(t => t.message.getNodeId() === node.id);
	}

	/**
	 * Retrieves the maximum version of a command class the given node supports.
	 * Returns 0 when the CC is not supported. Also returns 0 when the node was not found.
	 *
	 * @param cc The command class whose version should be retrieved
	 * @param nodeId The node for which the CC version should be retrieved
	 */
	public getSupportedCCVersionForEndpoint(
		cc: CommandClasses,
		nodeId: number,
		endpointIndex: number = 0,
	): number {
		if (
			this._controller == undefined ||
			!this.controller.nodes.has(nodeId)
		) {
			return 0;
		}
		const node = this.controller.nodes.get(nodeId)!;
		const endpoint = node.getEndpoint(endpointIndex);
		if (endpoint) return endpoint.getCCVersion(cc);
		// We sometimes receive messages from an endpoint, but can't find that endpoint.
		// In that case fall back to the root endpoint to determine the supported version.
		return node.getCCVersion(cc);
	}

	/**
	 * Retrieves the maximum version of a command class that can be used to communicate with a node.
	 * Returns 1 if the node claims that it does not support a CC.
	 * Throws if the CC is not implemented in this library yet.
	 *
	 * @param cc The command class whose version should be retrieved
	 * @param nodeId The node for which the CC version should be retrieved
	 * @param endpointIndex The endpoint for which the CC version should be retrieved
	 */
	public getSafeCCVersionForNode(
		cc: CommandClasses,
		nodeId: number,
		endpointIndex: number = 0,
	): number {
		const supportedVersion = this.getSupportedCCVersionForEndpoint(
			cc,
			nodeId,
			endpointIndex,
		);
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

		// Clean up
		this.rejectTransactions(() => true, `The controller was hard-reset`);
		this.nodeAwakeTimeouts.forEach(timeout => clearTimeout(timeout));
		this.nodeAwakeTimeouts.clear();
		this.sendNodeToSleepTimers.forEach(timeout => clearTimeout(timeout));
		this.sendNodeToSleepTimers.clear();
		this.retryNodeInterviewTimeouts.forEach(timeout =>
			clearTimeout(timeout),
		);
		this.retryNodeInterviewTimeouts.clear();

		this._controllerInterviewed = false;
		void this.initializeControllerAndNodes();
	}

	private _wasDestroyed: boolean = false;
	/**
	 * Ensures that the driver is ready to communicate (serial port open and not destroyed).
	 * If desired, also checks that the controller interview has been completed.
	 */
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

	private _cleanupHandler = (): void => {
		this.destroy();
	};

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

		// Remove all timeouts
		for (const timeout of [
			this.ackTimeout,
			this.saveToCacheTimer,
			...this.sendNodeToSleepTimers.values(),
			...this.nodeAwakeTimeouts.values(),
			...this.retryNodeInterviewTimeouts.values(),
			this.currentTransaction?.timeoutInstance,
			this.retryTransactionTimeout,
		]) {
			if (timeout) clearTimeout(timeout);
		}

		// Destroy all nodes
		this._controller?.nodes.forEach(n => n.destroy());

		process.removeListener("exit", this._cleanupHandler);
		process.removeListener("SIGINT", this._cleanupHandler);
		process.removeListener("uncaughtException", this._cleanupHandler);
		// the serialport must be closed in any case
		if (this.serial != undefined) {
			if (this.serial.isOpen) this.serial.close();
			this.serial = undefined;
		}
	}

	// eslint-disable-next-line @typescript-eslint/camelcase
	private serialport_onError(err: Error): void {
		this.emit("error", err);
	}

	/**
	 * Is called when the serial port has received any data
	 */
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
						// INS12350: A host or a Z-Wave chip waiting for new traffic MUST ignore all other
						// byte values than 0x06 (ACK), 0x15 (NAK), 0x18 (CAN) or 0x01 (Data frame).
						// Just skip this byte
					}
				}
				// Continue with the next byte
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
							log.driver.print(
								`Dropping message because it contains invalid data`,
								"warn",
							);
							this.send(MessageHeaders.NAK);
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
							bytesRead = Message.getMessageLength(
								this.receiveBuffer,
							);
							const invalidData = this.receiveBuffer.slice(
								bytesRead,
							);
							log.driver.print(
								`Message with invalid data received. Dropping it:
0x${invalidData.toString("hex")}`,
								"warn",
							);
							handled = true;
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
			if (msg) {
				try {
					await this.handleMessage(msg);
				} catch (e) {
					if (
						e instanceof ZWaveError &&
						e.code === ZWaveErrorCodes.Driver_NotReady
					) {
						log.driver.print(
							`Cannot handle message because the driver is not ready to handle it yet.`,
							"warn",
						);
					} else {
						throw e;
					}
				}
			}
		}

		log.serial.message(
			`The receive buffer is empty, waiting for the next chunk...`,
		);
	}

	/**
	 * Handles the case that a node failed to respond in time
	 */
	private handleMissingNodeResponse(transmitStatus?: TransmitStatus): void {
		if (!this.currentTransaction) return;
		const node = this.currentTransaction.message.getNodeUnsafe();
		if (!node) return; // This should never happen, but whatever

		if (this.mayRetryCurrentTransaction()) {
			// The Z-Wave specs define 500ms as the waiting period for SendData messages
			const timeout = this.retryCurrentTransaction(500);
			log.controller.logNode(
				node.id,
				`The node did not respond to the current transaction, scheduling attempt (${this.currentTransaction.sendAttempts}/${this.currentTransaction.maxSendAttempts}) in ${timeout} ms...`,
				"warn",
			);
		} else if (!this.currentTransaction.nodeAckPending) {
			// The node has already confirmed the receipt, but did not respond to our get-type request
			// This does not mean that the node is asleep or dead!
			this.rejectCurrentTransaction(
				new ZWaveError(
					`The transaction timed out`,
					ZWaveErrorCodes.Controller_NodeTimeout,
				),
			);
		} else if (node.supportsCC(CommandClasses["Wake Up"])) {
			log.controller.logNode(
				node.id,
				`The node did not respond to the current transaction after ${this.currentTransaction.maxSendAttempts} attempts.
It is probably asleep, moving its messages to the wakeup queue.`,
				"warn",
			);
			// The node is asleep
			WakeUpCC.setAwake(node, false);
			// The handler for the asleep status will move the messages to the wakeup queue
		} else {
			let errorMsg = `Node ${node.id} did not respond to the current transaction after ${this.currentTransaction.maxSendAttempts} attempts, it is presumed dead`;
			if (transmitStatus != undefined) {
				errorMsg += ` (Status ${getEnumMemberName(
					TransmitStatus,
					transmitStatus,
				)})`;
			}
			log.controller.logNode(node.id, `${errorMsg}`, "warn");

			node.status = NodeStatus.Dead;
			this.rejectAllTransactionsForNode(node.id, errorMsg);
			// And continue with the next messages
			setImmediate(() => this.workOffSendQueue());
		}
	}

	/**
	 * Is called when a complete message was decoded from the receive buffer
	 * @param msg The decoded message
	 */
	private async handleMessage(msg: Message): Promise<void> {
		// if we have a pending request, check if that is waiting for this message
		if (this.currentTransaction != undefined) {
			// Use the entire encapsulation stack to test what to do with this response
			// because some encapsulation requires this information
			const responseRole = this.currentTransaction.message.testResponse(
				msg,
			);
			if (responseRole !== "unexpected") {
				log.driver.transactionResponse(msg, responseRole);
			}
			// For further actions, we are only interested in the innermost CC
			if (isCommandClassContainer(msg)) this.unwrapCommands(msg);

			switch (responseRole) {
				case "confirmation": {
					// When a node has received the message, it confirms the receipt with a SendDataRequest
					if (msg instanceof SendDataRequest) {
						// As per SDS11846, start a timeout for the expected response
						this.currentTransaction.computeRTT();
						const msRTT = this.currentTransaction.rtt / 1e6;

						log.driver.print(
							`ACK received from node for current transaction. RTT = ${msRTT.toFixed(
								2,
							)} ms`,
						);

						// Since the node actively responded to our request, we now know that it must be awake
						const node = msg.getNodeUnsafe();
						if (node) node.status = NodeStatus.Awake;
						this.currentTransaction.nodeAckPending = false;

						// In some rare (timing?) cases it can happen that this code is executed while
						// timeoutInstance is still set
						if (this.currentTransaction.timeoutInstance) {
							clearTimeout(
								this.currentTransaction.timeoutInstance,
							);
						}

						this.currentTransaction.timeoutInstance = setTimeout(
							() => this.handleMissingNodeResponse(),
							// The timeout SHOULD be RTT + 1s
							msRTT + this.options.timeouts.report,
						)
							// Unref'ing long running timers allows the process to exit mid-timeout
							.unref();
					} else if (isSendReport(msg)) {
						// The message was sent to the node(s)
						this.currentTransaction.nodeAckPending = true;
					}
					// no need to further process intermediate responses, as they only tell us things are good
					return;
				}

				case "fatal_controller": {
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
				}

				case "fatal_node": {
					if (
						this.currentTransaction.message instanceof
						SendDataMulticastRequest
					) {
						// Don't try to resend multicast messages. One or more nodes might have already reacted
						this.rejectCurrentTransaction(
							new ZWaveError(
								`One or more nodes did not respond to the request.`,
								ZWaveErrorCodes.Controller_MessageDropped,
							),
						);
					} else {
						// The node did not acknowledge the receipt
						this.handleMissingNodeResponse(
							isTransmitReport(msg)
								? msg.transmitStatus
								: undefined,
						);
					}
					return;
				}

				case "partial": {
					// This is a multi-step response and we just received a part of it, which is not the final one
					this.currentTransaction.partialResponses.push(msg);

					// Since the node actively responded to our request, we now know that it must be awake
					const node = msg.getNodeUnsafe();
					if (node) node.status = NodeStatus.Awake;

					return;
				}

				case "final": {
					// this is the expected response!
					this.currentTransaction.response = msg;
					if (this.currentTransaction.partialResponses.length > 0) {
						msg.mergePartialMessages(
							this.currentTransaction.partialResponses,
						);
					}

					// Since the node actively responded to our request, we now know that it must be awake
					const node = msg.getNodeUnsafe();
					if (node) node.status = NodeStatus.Awake;

					if (!this.currentTransaction.controllerAckPending) {
						log.driver.print(
							`ACK already received, resolving transaction`,
							"debug",
						);
						this.resolveCurrentTransaction();
					} else {
						// wait for the ack, it might be received out of order
						log.driver.print(
							`no ACK received yet, remembering response`,
							"debug",
						);
					}
					// if the response was expected, don't check any more handlers
					return;
				}

				default:
					// unexpected, nothing to do here => check registered handlers
					break;
			}
		} else {
			// For further actions, we are only interested in the innermost CC
			if (isCommandClassContainer(msg)) this.unwrapCommands(msg);
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

	/**
	 * Is called when a Request-type message was received
	 */
	private async handleRequest(msg: Message): Promise<void> {
		let handlers: RequestHandlerEntry[] | undefined;

		if (isNodeQuery(msg) || isCommandClassContainer(msg)) {
			const node = msg.getNodeUnsafe();
			if (node?.status === NodeStatus.Dead) {
				// We have received a message from a dead node, bring it back to life
				// We do not know if the node is actually awake, so mark it as unknown for now
				node.status = NodeStatus.Unknown;
			}
		}

		if (msg instanceof ApplicationCommandRequest) {
			// we handle ApplicationCommandRequests differently because they are handled by the nodes directly
			const nodeId = msg.command.nodeId;
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

			const node = this.controller.nodes.get(nodeId)!;
			// Check if we need to handle the command ourselves
			if (
				msg.command.ccId === CommandClasses["Device Reset Locally"] &&
				msg.command instanceof DeviceResetLocallyCCNotification
			) {
				log.controller.logNode(msg.command.nodeId, {
					message: `The node was reset locally, removing it`,
					direction: "inbound",
				});
				if (!(await this.controller.isFailedNode(msg.command.nodeId))) {
					try {
						// Force a ping of the node, so it gets added to the failed nodes list
						node.setAwake(true);
						await node.commandClasses["No Operation"].send();
					} catch (e) {
						// this is expected
					}
				}

				try {
					// ...because we can only remove failed nodes
					await this.controller.removeFailedNode(msg.command.nodeId);
				} catch (e) {
					log.controller.logNode(msg.command.nodeId, {
						message: "removing the node failed: " + e,
						level: "error",
					});
				}
			} else if (
				msg.command.ccId === CommandClasses.Supervision &&
				msg.command instanceof SupervisionCCReport &&
				this.supervisionSessions.has(msg.command.sessionId)
			) {
				// Supervision commands are handled here
				log.controller.logNode(msg.command.nodeId, {
					message: `Received update for a Supervision session`,
					direction: "inbound",
				});

				// Call the update handler
				this.supervisionSessions.get(msg.command.sessionId)!(
					msg.command.status,
					msg.command.duration,
				);
				// If this was a final report, remove the handler
				if (!msg.command.moreUpdatesFollow) {
					this.supervisionSessions.delete(msg.command.sessionId);
				}
			} else {
				// dispatch the command to the node itself
				await node.handleCommand(msg.command);
			}

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

	/** Is called when the controller ACKs a message */
	private handleACK(): void {
		// if we have a pending request waiting for the ACK, ACK it
		const trnsact = this.currentTransaction;
		if (trnsact != undefined && trnsact.controllerAckPending) {
			trnsact.controllerAckPending = false;
			this.clearAckTimeout();

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
		this.handleUnsuccessfulTransmission("NAK");
	}

	/** Is called when the controller drops a message because it is busy */
	private handleCAN(): void {
		this.handleUnsuccessfulTransmission("CAN");
	}

	private handleUnsuccessfulTransmission(
		reason: "CAN" | "NAK" | "timeout",
	): void {
		if (this.currentTransaction != undefined) {
			const msg =
				reason === "timeout"
					? "Timeout occured waiting for ACK"
					: `${reason} received`;
			if (this.mayRetryCurrentTransaction()) {
				const timeout = this.retryCurrentTransaction();
				log.driver.print(
					`${msg} - scheduling transmission attempt (${this.currentTransaction.sendAttempts}/${this.currentTransaction.maxSendAttempts}) in ${timeout} ms...`,
					"warn",
				);
			} else {
				log.driver.print(
					`${msg} received - maximum transmission attempts for the current transaction reached, dropping it...`,
					"error",
				);

				this.rejectCurrentTransaction(
					new ZWaveError(
						`Failed to send the message after ${this.currentTransaction.maxSendAttempts} attempts`,
						ZWaveErrorCodes.Controller_MessageDropped,
					),
					false /* don't resume queue, that happens automatically */,
				);
			}
		}
	}

	/** Checks if the current transaction may still be retried */
	private mayRetryCurrentTransaction(): boolean {
		return (
			this.currentTransaction!.sendAttempts <
			this.currentTransaction!.maxSendAttempts
		);
	}

	private retryTransactionTimeout: NodeJS.Timeout | undefined;

	/** Retries the current transaction and returns the calculated timeout */
	private retryCurrentTransaction(timeout?: number): number {
		// If no timeout was given, fallback to the default timeout as defined in the Z-Wave specs
		if (!timeout) {
			timeout = 100 + 1000 * (this.currentTransaction!.sendAttempts - 1);
		}
		this.currentTransaction!.sendAttempts++;
		// Unref'ing long running timers allows the process to exit mid-timeout
		this.retryTransactionTimeout = setTimeout(() => {
			this.retryTransactionTimeout = undefined;
			this.retransmit();
		}, timeout).unref();
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
		if (timeoutInstance) {
			clearTimeout(timeoutInstance);
			this.currentTransaction!.timeoutInstance = undefined;
		}
		// and resolve the current transaction
		promise.resolve(response);
		this.currentTransaction = undefined;

		if (node) {
			// If the node is not meant to be kept awake, try to send it back to sleep
			if (!node.keepAwake) {
				this.debounceSendNodeToSleep(node);
			}
			// Also refresh the timeout after which the node is assumed asleep
			// This is necessary in case sending it to sleep fails
			this.resetNodeAwakeTimeout(node);
		}
		// Resume the send queue
		if (resumeQueue) {
			log.driver.print("resuming send queue", "debug");
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
		if (timeoutInstance) {
			clearTimeout(timeoutInstance);
			this.currentTransaction!.timeoutInstance = undefined;
		}
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

	private encapsulateCommands(msg: Message & ICommandClassContainer): void {
		// The encapsulation order (from outside to inside) is as follows:
		// 5. Any one of the following combinations:
		//   a. Security (S0 or S2) followed by transport service
		//   b. Transport Service
		//   c. Security (S0 or S2)
		//   d. CRC16
		// b and d are mutually exclusive, security is not
		// 4. Multi Channel
		// 3. Supervision
		// 2. Multi Command
		// 1. Encapsulated Command Class (payload), e.g. Basic Set

		// TODO: 2.

		// 3.
		if (SupervisionCC.requiresEncapsulation(msg.command)) {
			msg.command = SupervisionCC.encapsulate(this, msg.command);
		}

		// 4.
		if (MultiChannelCC.requiresEncapsulation(msg.command)) {
			msg.command = MultiChannelCC.encapsulate(this, msg.command);
		}

		// TODO: 5.
	}

	private unwrapCommands(msg: Message & ICommandClassContainer): void {
		// TODO: Remember the command encapsulation order in case we need to respond

		// Unwrap encapsulating CCs until we get to the core
		while (isEncapsulatingCommandClass(msg.command)) {
			const unwrapped = msg.command.constructor.unwrap(msg.command);
			if (isArray(unwrapped)) {
				log.driver.print(
					`Received a command that contains multiple CommandClasses. This is not supported yet! Discarding the message...`,
					"warn",
				);
				return;
			}
			msg.command = unwrapped;
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
			if (node?.status === NodeStatus.Dead) {
				throw new ZWaveError(
					`The message will not be sent because node ${node.id} is presumed dead`,
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

		// Automatically encapsulate commands
		if (isCommandClassContainer(msg)) this.encapsulateCommands(msg);

		// When sending a message to a node that is known to be sleeping,
		// the priority must be WakeUp, so the message gets deprioritized
		// in comparison with messages to awake nodes.
		// However there are a few exceptions...
		if (
			(isNodeQuery(msg) || isCommandClassContainer(msg)) &&
			// We don't want pings in the wakeup queue
			!messageIsPing(msg) &&
			msg.getNodeUnsafe()?.isAwake() === false &&
			// If we move multicasts to the wakeup queue, it is unlikely
			// that there is ever a points where all targets are awake
			!(msg instanceof SendDataMulticastRequest)
		) {
			options.priority = MessagePriority.WakeUp;
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
	 * @param command The command to send. It will be encapsulated in a SendData[Multicast]Request.
	 * @param options (optional) Options regarding the message transmission
	 */
	// wotan-disable-next-line no-misused-generics
	public async sendCommand<TResponse extends CommandClass = CommandClass>(
		command: CommandClass,
		options: SendMessageOptions = {},
	): Promise<TResponse | undefined> {
		let msg: Message;
		if (command.isSinglecast()) {
			msg = new SendDataRequest(this, { command });
		} else if (command.isMulticast()) {
			msg = new SendDataMulticastRequest(this, { command });
		} else {
			throw new ZWaveError(
				`A CC must either be singlecast or multicast`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		const resp = await this.sendMessage(msg, options);
		if (isCommandClassContainer(resp)) {
			return resp.command as TResponse;
		}
	}

	/**
	 * Sends a supervised command to a Z-Wave node. When status updates are requested, the passed callback will be executed for every non-final update.
	 * @param command The command to send
	 * @param options (optional) Options regarding the message transmission
	 */
	public async sendSupervisedCommand(
		command: CommandClass,
		options: SendSupervisedCommandOptions = {
			requestStatusUpdates: false,
		},
	): Promise<SupervisionResult> {
		// Check if the target supports this command
		if (!command.getNode()?.supportsCC(CommandClasses.Supervision)) {
			throw new ZWaveError(
				`Node ${command.nodeId} does not support the Supervision CC!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		// Create the encapsulating CC so we have a session ID
		command = SupervisionCC.encapsulate(
			this,
			command,
			options.requestStatusUpdates,
		);

		const resp = (await this.sendCommand<SupervisionCCReport>(
			command,
			options,
		))!;
		// If future updates are expected, listen for them
		if (options.requestStatusUpdates && resp.moreUpdatesFollow) {
			this.supervisionSessions.set(
				(command as SupervisionCCGet).sessionId,
				options.onUpdate,
			);
		}
		// In any case, return the status
		return {
			status: resp.status,
			remainingDuration: resp.duration,
		};
	}

	/**
	 * Sends a supervised command to a Z-Wave node if the Supervision CC is supported. If not, a normal command is sent.
	 * This does not return any Report values, so only use this for Set-type commands.
	 *
	 * @param command The command to send
	 * @param options (optional) Options regarding the message transmission
	 */
	public async trySendCommandSupervised(
		command: CommandClass,
		options?: SendSupervisedCommandOptions,
	): Promise<SupervisionResult | undefined> {
		if (command.getNode()?.supportsCC(CommandClasses.Supervision)) {
			return this.sendSupervisedCommand(command, options);
		} else {
			await this.sendCommand(command, options);
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

	private ackTimeout: NodeJS.Timer | undefined;
	private startAckTimeout(): void {
		this.clearAckTimeout();
		this.ackTimeout = setTimeout(() => {
			this.handleUnsuccessfulTransmission("timeout");
		}, 1600).unref();
	}
	private clearAckTimeout(): void {
		if (this.ackTimeout) {
			clearTimeout(this.ackTimeout);
			this.ackTimeout = undefined;
		}
	}

	private workOffSendQueue(): void {
		// is there something to send?
		if (this.sendQueue.length === 0) {
			log.driver.print("The send queue is empty", "debug");
			return;
			// } else {
			// 	log.driver.sendQueue(this.sendQueue);
		}
		// we are still waiting for the current transaction to finish
		if (this.currentTransaction != undefined) {
			log.driver.print(
				`workOffSendQueue > skipping because a transaction is pending`,
				"debug",
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

			// And send it
			this.currentTransaction.markAsSent();
			const data = msg.serialize();
			log.driver.transaction(this.currentTransaction);
			log.serial.data("outbound", data);
			this.doSend(data);

			// INS12350-14:
			// A transmitting host or Z-Wave chip may time out waiting for an ACK frame after transmitting a Data frame.
			// If no ACK frame is received, the Data frame MAY be retransmitted.
			// The transmitter MUST wait for at least 1600ms before deeming the Data frame lost.
			this.startAckTimeout();
		} else {
			log.driver.print(
				`The remaining ${this.sendQueue.length} messages are for sleeping nodes, not sending anything!`,
				"debug",
			);
			log.driver.sendQueue(this.sendQueue);
		}
	}

	/** Retransmits the current transaction (if there is any) */
	private retransmit(): void {
		if (!this.currentTransaction) return;

		// TODO: these 6 lines are duplicated in lines 1714 ff.
		const msg = this.currentTransaction.message;

		this.currentTransaction.markAsSent();
		const data = msg.serialize();
		log.driver.transaction(this.currentTransaction);
		log.serial.data("outbound", data);
		this.doSend(data);

		// Retransmissions must also timeout
		this.startAckTimeout();
	}

	/** Sends a raw datagram to the serialport (if that is open) */
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
				if (messageIsPing(msg)) {
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

		// The current transaction must also be transferred
		if (this.currentTransaction?.message.getNodeId() === nodeId) {
			// But only if it is not a ping, because that will block the send queue until wakeup
			if (!messageIsPing(this.currentTransaction.message)) {
				// Change the priority to WakeUp and re-add it to the queue
				this.currentTransaction.priority = MessagePriority.WakeUp;
				this.sendQueue.add(this.currentTransaction);
				// Reset send attempts - we might have already used all of them
				this.currentTransaction.sendAttempts = 0;
			}
			// "reset" the current transaction to none
			this.currentTransaction = undefined;
		}
	}

	/**
	 * @internal
	 * Rejects all pending transactions that match a predicate and removes them from the send queue
	 */
	public rejectTransactions(
		predicate: (t: Transaction) => boolean,
		errorMsg: string = `The message has been removed from the queue`,
	): void {
		const transactionsToRemove: Transaction[] = [];

		// Find all transactions that match the predicate and reject them
		for (const transaction of this.sendQueue) {
			if (predicate(transaction)) {
				transactionsToRemove.push(transaction);
				transaction.promise.reject(
					new ZWaveError(
						errorMsg,
						ZWaveErrorCodes.Controller_MessageDropped,
					),
				);
			}
		}
		this.sendQueue.remove(...transactionsToRemove);

		// Don't forget the current transaction
		if (this.currentTransaction && predicate(this.currentTransaction)) {
			this.rejectCurrentTransaction(
				new ZWaveError(
					errorMsg,
					ZWaveErrorCodes.Controller_MessageDropped,
				),
			);
		}

		// log.driver.sendQueue(this.sendQueue);
	}

	/**
	 * @internal
	 * Rejects all pending transactions for a node and removes them from the send queue
	 */
	public rejectAllTransactionsForNode(
		nodeId: number,
		errorMsg: string = `The node is dead`,
	): void {
		this.rejectTransactions(
			t => t.message.getNodeId() === nodeId,
			errorMsg,
		);
	}

	/** Re-sorts the send queue */
	private sortSendQueue(): void {
		const items = [...this.sendQueue];
		this.sendQueue.clear();
		// Since the send queue is a sorted list, sorting is done on insert/add
		this.sendQueue.add(...items);
	}

	private lastSaveToCache: number = 0;
	private readonly saveToCacheInterval: number = 150;
	private saveToCacheTimer: NodeJS.Timer | undefined;
	private isSavingToCache: boolean = false;

	/**
	 * Does the work for saveNetworkToCache. This is not throttled, so any call
	 * to this method WILL save the network.
	 */
	private async saveNetworkToCacheInternal(): Promise<void> {
		if (!this._controller || !this.controller.homeId) return;

		await this.options.fs.ensureDir(this.cacheDir);
		const cacheFile = path.join(
			this.cacheDir,
			this.controller.homeId.toString(16) + ".json",
		);

		const serializedObj = this.controller.serialize();
		const jsonString = JSON.stringify(serializedObj, undefined, 4);
		await this.options.fs.writeFile(cacheFile, jsonString, "utf8");
	}

	/**
	 * Saves the current configuration and collected data about the controller and all nodes to a cache file.
	 * For performance reasons, these calls may be throttled.
	 */
	public async saveNetworkToCache(): Promise<void> {
		if (!this._controller || !this.controller.homeId) return;
		// Ensure this method isn't being executed too often
		if (
			this.isSavingToCache ||
			Date.now() - this.lastSaveToCache < this.saveToCacheInterval
		) {
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
		this.isSavingToCache = true;
		await this.saveNetworkToCacheInternal();
		this.isSavingToCache = false;
		this.lastSaveToCache = Date.now();
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
		if (!(await this.options.fs.pathExists(cacheFile))) return;
		try {
			log.driver.print(
				`Cache file for homeId ${num2hex(
					this.controller.homeId,
				)} found, attempting to restore the network from cache...`,
			);
			const cacheString = await this.options.fs.readFile(
				cacheFile,
				"utf8",
			);
			const cacheObj = JSON.parse(cacheString);
			await this.controller.deserialize(cacheObj);
			log.driver.print(
				`Restoring the network from cache was successful!`,
			);
		} catch (e) {
			const message = `Restoring the network from cache failed: ${e}`;
			this.emit("error", message);
			log.driver.print(message, "error");
		}
	}

	private sendNodeToSleepTimers = new Map<number, NodeJS.Timeout>();
	/**
	 * Marks a node for a later sleep command. Every call prolongs the period until the node actually goes to sleep
	 */
	private debounceSendNodeToSleep(node: ZWaveNode): void {
		// Delete old timers if any exist
		if (this.sendNodeToSleepTimers.has(node.id)) {
			clearTimeout(this.sendNodeToSleepTimers.get(node.id)!);
		}

		// Sends a node to sleep if it has no more messages.
		const sendNodeToSleep = (node: ZWaveNode): void => {
			this.sendNodeToSleepTimers.delete(node.id);
			if (!this.hasPendingMessages(node)) {
				node.sendNoMoreInformation();
			}
		};

		// If a sleeping node has no messages pending, we may send it back to sleep
		if (
			node.supportsCC(CommandClasses["Wake Up"]) &&
			!this.hasPendingMessages(node)
		) {
			this.sendNodeToSleepTimers.set(
				node.id,
				setTimeout(() => sendNodeToSleep(node), 1000).unref(),
			);
		}
	}

	private nodeAwakeTimeouts = new Map<number, NodeJS.Timeout>();
	/**
	 * A sleeping node will go to sleep 10s after the wake up notification or after the last message has been answered.
	 * Every call to this method prolongs the period after which the node is assumed asleep
	 */
	private resetNodeAwakeTimeout(node: ZWaveNode): void {
		// Delete old timers if any exist
		if (this.nodeAwakeTimeouts.has(node.id)) {
			clearTimeout(this.nodeAwakeTimeouts.get(node.id)!);
		}

		// Marks a node as (most likely) asleep
		const markNodeAsAsleep = (node: ZWaveNode): void => {
			this.nodeAwakeTimeouts.delete(node.id);
			if (node.isAwake()) {
				log.driver.print(
					`The awake timeout for node ${node.id} has elapsed. Assuming it is asleep.`,
					"verbose",
				);
				WakeUpCC.setAwake(node, false);
			}
		};

		// If a sleeping node has no messages pending, we may send it back to sleep
		if (node.supportsCC(CommandClasses["Wake Up"]) && node.isAwake()) {
			this.nodeAwakeTimeouts.set(
				node.id,
				setTimeout(() => markNodeAsAsleep(node), 10000).unref(),
			);
		}
	}
}
