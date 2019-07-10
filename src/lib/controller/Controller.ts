import {
	createDeferredPromise,
	DeferredPromise,
} from "alcalzone-shared/deferred-promise";
import { composeObject } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { EventEmitter } from "events";
import { CommandClasses } from "../commandclass/CommandClasses";
import { Driver, RequestHandler } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import { Message } from "../message/Message";
import { BasicDeviceClasses, DeviceClass } from "../node/DeviceClass";
import { ZWaveNode } from "../node/Node";
import { log } from "../util/logger";
import { JSONObject } from "../util/misc";
import { num2hex } from "../util/strings";
import {
	AddNodeStatus,
	AddNodeToNetworkRequest,
	AddNodeType,
} from "./AddNodeToNetworkRequest";
import {
	GetControllerCapabilitiesRequest,
	GetControllerCapabilitiesResponse,
} from "./GetControllerCapabilitiesMessages";
import {
	GetControllerIdRequest,
	GetControllerIdResponse,
} from "./GetControllerIdMessages";
import {
	GetControllerVersionRequest,
	GetControllerVersionResponse,
} from "./GetControllerVersionMessages";
import {
	GetSerialApiCapabilitiesRequest,
	GetSerialApiCapabilitiesResponse,
} from "./GetSerialApiCapabilitiesMessages";
import {
	GetSerialApiInitDataRequest,
	GetSerialApiInitDataResponse,
} from "./GetSerialApiInitDataMessages";
import {
	GetSUCNodeIdRequest,
	GetSUCNodeIdResponse,
} from "./GetSUCNodeIdMessages";
import { HardResetRequest } from "./HardResetRequest";
import {
	SetSerialApiTimeoutsRequest,
	SetSerialApiTimeoutsResponse,
} from "./SetSerialApiTimeoutsMessages";
import { ZWaveLibraryTypes } from "./ZWaveLibraryTypes";

// Strongly type the event emitter events
export interface ControllerEventCallbacks {
	"inclusion failed": () => void;
	"node added": (node: ZWaveNode) => void;
}

export type ControllerEvents = Extract<keyof ControllerEventCallbacks, string>;

export interface ZWaveController {
	on<TEvent extends ControllerEvents>(
		event: TEvent,
		callback: ControllerEventCallbacks[TEvent],
	): this;
	once<TEvent extends ControllerEvents>(
		event: TEvent,
		callback: ControllerEventCallbacks[TEvent],
	): this;
	removeListener<TEvent extends ControllerEvents>(
		event: TEvent,
		callback: ControllerEventCallbacks[TEvent],
	): this;
	off<TEvent extends ControllerEvents>(
		event: TEvent,
		callback: ControllerEventCallbacks[TEvent],
	): this;
	removeAllListeners(event?: ControllerEvents): this;
}

export class ZWaveController extends EventEmitter {
	/** @internal */
	public constructor(private readonly driver: Driver) {
		super();

		// register message handlers
		driver.registerRequestHandler(
			FunctionType.AddNodeToNetwork,
			// @ts-ignore TODO: This is not valid!
			this.handleAddNodeRequest.bind(this),
		);
	}

	//#region --- Properties ---

	private _libraryVersion: string | undefined;
	public get libraryVersion(): string | undefined {
		return this._libraryVersion;
	}

	private _type: ZWaveLibraryTypes | undefined;
	public get type(): ZWaveLibraryTypes | undefined {
		return this._type;
	}

	private _homeId: number | undefined;
	/** A 32bit number identifying the current network */
	public get homeId(): number | undefined {
		return this._homeId;
	}

	private _ownNodeId: number | undefined;
	/** The ID of the controller in the current network */
	public get ownNodeId(): number | undefined {
		return this._ownNodeId;
	}

	private _isSecondary: boolean | undefined;
	public get isSecondary(): boolean | undefined {
		return this._isSecondary;
	}

	private _isUsingHomeIdFromOtherNetwork: boolean | undefined;
	public get isUsingHomeIdFromOtherNetwork(): boolean | undefined {
		return this._isUsingHomeIdFromOtherNetwork;
	}

	private _isSISPresent: boolean | undefined;
	public get isSISPresent(): boolean | undefined {
		return this._isSISPresent;
	}

	private _wasRealPrimary: boolean | undefined;
	public get wasRealPrimary(): boolean | undefined {
		return this._wasRealPrimary;
	}

	private _isStaticUpdateController: boolean | undefined;
	public get isStaticUpdateController(): boolean | undefined {
		return this._isStaticUpdateController;
	}

	private _isSlave: boolean | undefined;
	public get isSlave(): boolean | undefined {
		return this._isSlave;
	}

	private _serialApiVersion: string | undefined;
	public get serialApiVersion(): string | undefined {
		return this._serialApiVersion;
	}

	private _manufacturerId: number | undefined;
	public get manufacturerId(): number | undefined {
		return this._manufacturerId;
	}

	private _productType: number | undefined;
	public get productType(): number | undefined {
		return this._productType;
	}

	private _productId: number | undefined;
	public get productId(): number | undefined {
		return this._productId;
	}

	private _supportedFunctionTypes: FunctionType[] | undefined;
	public get supportedFunctionTypes(): FunctionType[] | undefined {
		return this._supportedFunctionTypes;
	}

	/** Checks if a given Z-Wave function type is supported by this controller */
	public isFunctionSupported(functionType: FunctionType): boolean {
		if (this._supportedFunctionTypes == null) {
			throw new ZWaveError(
				"Cannot check yet if a function is supported by the controller. The interview process has not been completed.",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._supportedFunctionTypes.indexOf(functionType) > -1;
	}

	private _sucNodeId: number | undefined;
	public get sucNodeId(): number | undefined {
		return this._sucNodeId;
	}

	private _supportsTimers: boolean | undefined;
	public get supportsTimers(): boolean | undefined {
		return this._supportsTimers;
	}

	private _nodes = new Map<number, ZWaveNode>();
	/** A dictionary of the nodes connected to this controller */
	public get nodes(): ReadonlyMap<number, ZWaveNode> {
		return this._nodes;
	}

	//#endregion

	/**
	 * @internal
	 * Interviews the controller for the necessary information.
	 */
	public async interview(): Promise<void> {
		log("controller", "beginning interview...", "debug");

		// get basic controller version info
		log("controller", `querying version info...`, "debug");
		const version = await this.driver.sendMessage<
			GetControllerVersionResponse
		>(new GetControllerVersionRequest(this.driver), {
			supportCheck: false,
		});
		this._libraryVersion = version.libraryVersion;
		this._type = version.controllerType;
		log("controller", `received version info:`, "debug");
		log(
			"controller",
			`  controller type: ${ZWaveLibraryTypes[this._type]}`,
			"debug",
		);
		log(
			"controller",
			`  library version: ${this._libraryVersion}`,
			"debug",
		);

		// get the home and node id of the controller
		log("controller", `querying controller IDs...`, "debug");
		const ids = await this.driver.sendMessage<GetControllerIdResponse>(
			new GetControllerIdRequest(this.driver),
			{ supportCheck: false },
		);
		this._homeId = ids.homeId;
		this._ownNodeId = ids.ownNodeId;
		log("controller", `received controller IDs:`, "debug");
		log("controller", `  home ID:     ${num2hex(this._homeId)}`, "debug");
		log("controller", `  own node ID: ${this._ownNodeId}`, "debug");

		// find out what the controller can do
		log("controller", `querying controller capabilities...`, "debug");
		const ctrlCaps = await this.driver.sendMessage<
			GetControllerCapabilitiesResponse
		>(new GetControllerCapabilitiesRequest(this.driver), {
			supportCheck: false,
		});
		this._isSecondary = ctrlCaps.isSecondary;
		this._isUsingHomeIdFromOtherNetwork =
			ctrlCaps.isUsingHomeIdFromOtherNetwork;
		this._isSISPresent = ctrlCaps.isSISPresent;
		this._wasRealPrimary = ctrlCaps.wasRealPrimary;
		this._isStaticUpdateController = ctrlCaps.isStaticUpdateController;
		log("controller", `received controller capabilities:`, "debug");
		log(
			"controller",
			`  controller role:     ${
				this._isSecondary ? "secondary" : "primary"
			}`,
			"debug",
		);
		log(
			"controller",
			`  is in other network: ${this._isUsingHomeIdFromOtherNetwork}`,
			"debug",
		);
		log(
			"controller",
			`  is SIS present:      ${this._isSISPresent}`,
			"debug",
		);
		log(
			"controller",
			`  was real primary:    ${this._wasRealPrimary}`,
			"debug",
		);
		log(
			"controller",
			`  is a SUC:            ${this._isStaticUpdateController}`,
			"debug",
		);

		// find out which part of the API is supported
		log("controller", `querying API capabilities...`, "debug");
		const apiCaps = await this.driver.sendMessage<
			GetSerialApiCapabilitiesResponse
		>(new GetSerialApiCapabilitiesRequest(this.driver), {
			supportCheck: false,
		});
		this._serialApiVersion = apiCaps.serialApiVersion;
		this._manufacturerId = apiCaps.manufacturerId;
		this._productType = apiCaps.productType;
		this._productId = apiCaps.productId;
		this._supportedFunctionTypes = apiCaps.supportedFunctionTypes;
		log("controller", `received API capabilities:`, "debug");
		log(
			"controller",
			`  serial API version:  ${this._serialApiVersion}`,
			"debug",
		);
		log(
			"controller",
			`  manufacturer ID:     ${num2hex(this._manufacturerId)}`,
			"debug",
		);
		log(
			"controller",
			`  product type:        ${num2hex(this._productType)}`,
			"debug",
		);
		log(
			"controller",
			`  product ID:          ${num2hex(this._productId)}`,
			"debug",
		);
		log("controller", `  supported functions:`, "debug");
		for (const fn of this._supportedFunctionTypes) {
			log(
				"controller",
				`    ${FunctionType[fn]} (${num2hex(fn)})`,
				"debug",
			);
		}

		// now we can check if a function is supported

		// find the SUC
		log("controller", `finding SUC...`, "debug");
		const suc = await this.driver.sendMessage<GetSUCNodeIdResponse>(
			new GetSUCNodeIdRequest(this.driver),
			{ supportCheck: false },
		);
		this._sucNodeId = suc.sucNodeId;
		if (this._sucNodeId === 0) {
			log("controller", `no SUC present`, "debug");
		} else {
			log("controller", `SUC has node ID ${this.sucNodeId}`, "debug");
		}
		// TODO: if configured, enable this controller as SIS if there's no SUC
		// https://github.com/OpenZWave/open-zwave/blob/a46f3f36271f88eed5aea58899a6cb118ad312a2/cpp/src/Driver.cpp#L2586

		// if it's a bridge controller, request the virtual nodes
		if (
			this.type === ZWaveLibraryTypes["Bridge Controller"] &&
			this.isFunctionSupported(FunctionType.FUNC_ID_ZW_GET_VIRTUAL_NODES)
		) {
			// TODO: send FUNC_ID_ZW_GET_VIRTUAL_NODES message
		}

		// Request information about all nodes with the GetInitData message
		log("controller", `querying node information...`, "debug");
		const initData = await this.driver.sendMessage<
			GetSerialApiInitDataResponse
		>(new GetSerialApiInitDataRequest(this.driver));
		// override the information we might already have
		this._isSecondary = initData.isSecondary;
		this._isStaticUpdateController = initData.isStaticUpdateController;
		// and remember the new info
		this._isSlave = initData.isSlave;
		this._supportsTimers = initData.supportsTimers;
		// ignore the initVersion, no clue what to do with it
		log("controller", `received node information:`, "debug");
		log(
			"controller",
			`  controller role:            ${
				this._isSecondary ? "secondary" : "primary"
			}`,
			"debug",
		);
		log(
			"controller",
			`  controller is a SUC:        ${this._isStaticUpdateController}`,
			"debug",
		);
		log(
			"controller",
			`  controller is a slave:      ${this._isSlave}`,
			"debug",
		);
		log(
			"controller",
			`  controller supports timers: ${this._supportsTimers}`,
			"debug",
		);
		log(
			"controller",
			`  nodes in the network:       ${initData.nodeIds.join(", ")}`,
			"debug",
		);
		// create an empty entry in the nodes map so we can initialize them afterwards
		for (const nodeId of initData.nodeIds) {
			this._nodes.set(nodeId, new ZWaveNode(nodeId, this.driver));
		}

		if (
			this.type !== ZWaveLibraryTypes["Bridge Controller"] &&
			this.isFunctionSupported(FunctionType.SetSerialApiTimeouts)
		) {
			const { ack, byte } = this.driver.options.timeouts;
			log(
				"controller",
				`setting serial API timeouts: ack = ${ack} ms, byte = ${byte} ms`,
				"debug",
			);
			const resp = await this.driver.sendMessage<
				SetSerialApiTimeoutsResponse
			>(
				new SetSerialApiTimeoutsRequest(this.driver, {
					ackTimeout: ack,
					byteTimeout: byte,
				}),
			);
			log(
				"controller",
				`serial API timeouts overwritten. The old values were: ack = ${resp.oldAckTimeout} ms, byte = ${resp.oldByteTimeout} ms`,
				"debug",
			);
		}

		// TODO: Try to find out what this does from the new docs
		// send application info (not sure why tho)
		if (
			this.isFunctionSupported(
				FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION,
			)
		) {
			log("controller", `sending application info...`, "debug");
			const appInfoMsg = new Message(this.driver, {
				type: MessageType.Request,
				functionType:
					FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION,
				payload: Buffer.from([
					0x01, // APPLICATION_NODEINFO_LISTENING
					0x02, // generic static controller
					0x01, // specific static PC controller
					0x00, // length
				]),
			});
			await this.driver.sendMessage(appInfoMsg, {
				priority: MessagePriority.Controller,
				supportCheck: false,
			});
		}

		log("controller", "interview completed", "debug");
	}

	/**
	 * Performs a hard reset on the controller. This wipes out all configuration!
	 * Warning: The driver needs to re-interview the controller, so don't call this directly
	 * @internal
	 */
	public hardReset(): Promise<void> {
		log("controller", "performing hard reset...", "debug");
		// wotan-disable-next-line async-function-assignability
		return new Promise(async (resolve, reject) => {
			// handle the incoming message
			const handler: RequestHandler = _msg => {
				log("controller", `  hard reset succeeded`, "debug");
				resolve();
				return true;
			};
			this.driver.registerRequestHandler(
				FunctionType.HardReset,
				handler,
				true,
			);
			// begin the reset process
			try {
				await this.driver.sendMessage(
					new HardResetRequest(this.driver),
				);
			} catch (e) {
				// in any case unregister the handler
				log("controller", `  hard reset failed: ${e.message}`, "debug");
				this.driver.unregisterRequestHandler(
					FunctionType.HardReset,
					handler,
				);
				reject(e);
			}
		});
	}

	private _inclusionActive: boolean = false;
	private _beginInclusionPromise: DeferredPromise<boolean> | undefined;
	private _stopInclusionPromise: DeferredPromise<boolean> | undefined;
	private _nodePendingInclusion: ZWaveNode | undefined;

	/**
	 * Starts the inclusion process of new nodes.
	 * Resolves to true when the process was started,
	 * and false if the inclusion was already active
	 */
	public async beginInclusion(): Promise<boolean> {
		// don't start it twice
		if (this._inclusionActive) return false;
		this._inclusionActive = true;

		log("controller", `starting inclusion process...`, "debug");

		// create the promise we're going to return
		this._beginInclusionPromise = createDeferredPromise();

		// kick off the inclusion process
		await this.driver.sendMessage(
			new AddNodeToNetworkRequest(this.driver, {
				addNodeType: AddNodeType.Any,
				highPower: true,
				networkWide: true,
			}),
		);

		return this._beginInclusionPromise;
	}

	/**
	 * Stops an active inclusion process. Resolves to true when the controller leaves inclusion mode,
	 * and false if the inclusion was not active.
	 */
	public async stopInclusion(): Promise<boolean> {
		// don't stop it twice
		if (!this._inclusionActive) return false;
		this._inclusionActive = false;

		log("controller", `stopping inclusion process...`, "debug");

		// create the promise we're going to return
		this._stopInclusionPromise = createDeferredPromise();

		// kick off the inclusion process
		await this.driver.sendMessage(
			new AddNodeToNetworkRequest(this.driver, {
				addNodeType: AddNodeType.Stop,
				highPower: true,
				networkWide: true,
			}),
		);

		const result = await this._stopInclusionPromise;
		log("controller", `the inclusion process was stopped`, "debug");
		return result;
	}

	private async handleAddNodeRequest(
		msg: AddNodeToNetworkRequest,
	): Promise<void> {
		// TODO: Make sure we work with a deserialized request here
		log(
			"controller",
			`handling add node request (status = ${
				AddNodeStatus[msg.status!]
			})`,
			"debug",
		);
		if (!this._inclusionActive && msg.status !== AddNodeStatus.Done) {
			log(
				"controller",
				`  inclusion is NOT active, ignoring it...`,
				"debug",
			);
			return;
		}

		switch (msg.status) {
			case AddNodeStatus.Ready:
				// this is called when inclusion was started successfully
				log(
					"controller",
					`  the controller is now ready to add nodes`,
					"debug",
				);
				if (this._beginInclusionPromise != null)
					this._beginInclusionPromise.resolve(true);
				return;
			case AddNodeStatus.Failed:
				// this is called when inclusion could not be started...
				if (this._beginInclusionPromise != null) {
					log(
						"controller",
						`  starting the inclusion failed`,
						"debug",
					);
					this._beginInclusionPromise.reject(
						new ZWaveError(
							"The inclusion could not be started.",
							ZWaveErrorCodes.Controller_InclusionFailed,
						),
					);
				} else {
					// ...or adding a node failed
					log("controller", `  adding the node failed`, "debug");
					this.emit("inclusion failed");
				}
				// in any case, stop the inclusion process so we don't accidentally add another node
				try {
					await this.stopInclusion();
				} catch (e) {
					/* ok */
				}
				return;
			case AddNodeStatus.AddingSlave: {
				// this is called when a new node is added
				this._nodePendingInclusion = new ZWaveNode(
					msg.statusContext!.nodeId,
					this.driver,
					new DeviceClass(
						msg.statusContext!.basic!,
						msg.statusContext!.generic!,
						msg.statusContext!.specific!,
					),
					msg.statusContext!.supportedCCs,
					msg.statusContext!.controlledCCs,
				);
				return;
			}
			case AddNodeStatus.ProtocolDone: {
				// this is called after a new node is added
				// stop the inclusion process so we don't accidentally add another node
				try {
					await this.stopInclusion();
				} catch (e) {
					/* ok */
				}
				return;
			}
			case AddNodeStatus.Done: {
				// this is called when the inclusion was completed
				log(
					"controller",
					`done called for ${msg.statusContext!.nodeId}`,
					"debug",
				);
				// stopping the inclusion was acknowledged by the controller
				if (this._stopInclusionPromise != null)
					this._stopInclusionPromise.resolve();

				if (this._nodePendingInclusion != null) {
					const newNode = this._nodePendingInclusion;
					log(
						"controller",
						`finished adding node ${newNode.id}:`,
						"debug",
					);
					log(
						"controller",
						`  basic device class:    ${
							BasicDeviceClasses[newNode.deviceClass!.basic]
						} (${num2hex(newNode.deviceClass!.basic)})`,
						"debug",
					);
					log(
						"controller",
						`  generic device class:  ${
							newNode.deviceClass!.generic.name
						} (${num2hex(newNode.deviceClass!.generic.key)})`,
						"debug",
					);
					log(
						"controller",
						`  specific device class: ${
							newNode.deviceClass!.specific.name
						} (${num2hex(newNode.deviceClass!.specific.key)})`,
						"debug",
					);
					log("controller", `  supported CCs:`, "debug");
					for (const [
						cc,
						info,
					] of newNode.implementedCommandClasses.entries()) {
						if (info.isSupported)
							log(
								"controller",
								`    ${CommandClasses[cc]} (${num2hex(cc)})`,
								"debug",
							);
					}
					log("controller", `  controlled CCs:`, "debug");
					for (const [
						cc,
						info,
					] of newNode.implementedCommandClasses.entries()) {
						if (info.isControlled)
							log(
								"controller",
								`    ${CommandClasses[cc]} (${num2hex(cc)})`,
								"debug",
							);
					}

					// remember the node
					this._nodes.set(newNode.id, newNode);
					this._nodePendingInclusion = undefined;
					// and notify listeners
					this.emit("node added", newNode);
				}
			}
		}
	}

	/**
	 * @internal
	 * Serializes the controller information and all nodes to store them in a cache.
	 */
	public serialize(): JSONObject {
		return {
			nodes: composeObject(
				[...this.nodes.entries()].map(
					([id, node]) =>
						[id.toString(), node.serialize()] as [string, object],
				),
			),
		};
	}

	/**
	 * @internal
	 * Deserializes the controller information and all nodes from the cache.
	 */
	public deserialize(serialized: any): void {
		if (isObject(serialized.nodes)) {
			for (const nodeId of Object.keys(serialized.nodes)) {
				const serializedNode = serialized.nodes[nodeId];
				if (
					!serializedNode ||
					typeof serializedNode.id !== "number" ||
					serializedNode.id.toString() !== nodeId
				) {
					throw new ZWaveError(
						"The cache file is invalid",
						ZWaveErrorCodes.Driver_InvalidCache,
					);
				}

				if (this.nodes.has(serializedNode.id)) {
					this.nodes
						.get(serializedNode.id)!
						.deserialize(serializedNode);
				}
			}
		}
	}
}
