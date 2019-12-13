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
import log from "../log";
import { FunctionType } from "../message/Constants";
import { BasicDeviceClasses, DeviceClass } from "../node/DeviceClass";
import { ZWaveNode } from "../node/Node";
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
	RemoveNodeFromNetworkRequest,
	RemoveNodeStatus,
	RemoveNodeType,
} from "./RemoveNodeFromNetworkRequest";
import {
	NodeNeighborUpdateStatus,
	RequestNodeNeighborUpdateReport,
	RequestNodeNeighborUpdateRequest,
} from "./RequestNodeNeighborUpdate";
import {
	SetSerialApiTimeoutsRequest,
	SetSerialApiTimeoutsResponse,
} from "./SetSerialApiTimeoutsMessages";
import { ZWaveLibraryTypes } from "./ZWaveLibraryTypes";

// Strongly type the event emitter events
interface ControllerEventCallbacks {
	"inclusion failed": () => void;
	"exclusion failed": () => void;
	"inclusion started": () => void;
	"exclusion started": () => void;
	"inclusion stopped": () => void;
	"exclusion stopped": () => void;
	"node added": (node: ZWaveNode) => void;
	"node removed": (node: ZWaveNode) => void;
}

type ControllerEvents = Extract<keyof ControllerEventCallbacks, string>;

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
			this.handleAddNodeRequest.bind(this),
		);
		driver.registerRequestHandler(
			FunctionType.RemoveNodeFromNetwork,
			this.handleRemoveNodeRequest.bind(this),
		);
	}

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
	public get supportedFunctionTypes(): readonly FunctionType[] | undefined {
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

	/**
	 * @internal
	 * Interviews the controller for the necessary information.
	 */
	public async interview(): Promise<void> {
		log.controller.print("beginning interview...");

		// get basic controller version info
		log.controller.print(`querying version info...`);
		const version = await this.driver.sendMessage<
			GetControllerVersionResponse
		>(new GetControllerVersionRequest(this.driver), {
			supportCheck: false,
		});
		this._libraryVersion = version.libraryVersion;
		this._type = version.controllerType;
		log.controller.print(
			`received version info:
  controller type: ${ZWaveLibraryTypes[this._type]}
  library version: ${this._libraryVersion}`,
		);

		// get the home and node id of the controller
		log.controller.print(`querying controller IDs...`);
		const ids = await this.driver.sendMessage<GetControllerIdResponse>(
			new GetControllerIdRequest(this.driver),
			{ supportCheck: false },
		);
		this._homeId = ids.homeId;
		this._ownNodeId = ids.ownNodeId;
		log.controller.print(
			`received controller IDs:
  home ID:     ${num2hex(this._homeId)}
  own node ID: ${this._ownNodeId}`,
		);

		// find out what the controller can do
		log.controller.print(`querying controller capabilities...`);
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
		log.controller.print(
			`received controller capabilities:
  controller role:     ${this._isSecondary ? "secondary" : "primary"}
  is in other network: ${this._isUsingHomeIdFromOtherNetwork}
  is SIS present:      ${this._isSISPresent}
  was real primary:    ${this._wasRealPrimary}
  is a SUC:            ${this._isStaticUpdateController}`,
		);

		// find out which part of the API is supported
		log.controller.print(`querying API capabilities...`);
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
		log.controller.print(
			`received API capabilities:
  serial API version:  ${this._serialApiVersion}
  manufacturer ID:     ${num2hex(this._manufacturerId)}
  product type:        ${num2hex(this._productType)}
  product ID:          ${num2hex(this._productId)}
  supported functions: ${this._supportedFunctionTypes
		.map(fn => `\n  · ${FunctionType[fn]} (${num2hex(fn)})`)
		.join("")}`,
		);

		// now we can check if a function is supported

		// find the SUC
		log.controller.print(`finding SUC...`);
		const suc = await this.driver.sendMessage<GetSUCNodeIdResponse>(
			new GetSUCNodeIdRequest(this.driver),
			{ supportCheck: false },
		);
		this._sucNodeId = suc.sucNodeId;
		if (this._sucNodeId === 0) {
			log.controller.print(`no SUC present`);
		} else {
			log.controller.print(`SUC has node ID ${this.sucNodeId}`);
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
		log.controller.print(`querying node information...`);
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
		log.controller.print(
			`received node information:
  controller role:            ${this._isSecondary ? "secondary" : "primary"}
  controller is a SUC:        ${this._isStaticUpdateController}
  controller is a slave:      ${this._isSlave}
  controller supports timers: ${this._supportsTimers}
  nodes in the network:       ${initData.nodeIds.join(", ")}`,
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
			log.controller.print(
				`setting serial API timeouts: ack = ${ack} ms, byte = ${byte} ms`,
			);
			const resp = await this.driver.sendMessage<
				SetSerialApiTimeoutsResponse
			>(
				new SetSerialApiTimeoutsRequest(this.driver, {
					ackTimeout: ack,
					byteTimeout: byte,
				}),
			);
			log.controller.print(
				`serial API timeouts overwritten. The old values were: ack = ${resp.oldAckTimeout} ms, byte = ${resp.oldByteTimeout} ms`,
			);
		}

		// TODO: Tell the Z-Wave stick what kind of application this is
		//   The Z-Wave Application Layer MUST use the \ref ApplicationNodeInformation
		//   function to generate the Node Information frame and to save information about
		//   node capabilities. All Z Wave application related fields of the Node Information
		//   structure MUST be initialized by this function.

		// Afterwards, a hard reset is required, so we need to move this into another method
		// if (
		// 	this.isFunctionSupported(
		// 		FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION,
		// 	)
		// ) {
		// 	log.controller.print(`sending application info...`);

		// 	// TODO: Generate this list dynamically
		// 	// A list of all CCs the controller will respond to
		// 	const supportedCCs = [CommandClasses.Time];
		// 	// Turn the CCs into buffers and concat them
		// 	const supportedCCBuffer = Buffer.concat(
		// 		supportedCCs.map(cc =>
		// 			cc >= 0xf1
		// 				? // extended CC
		// 				  Buffer.from([cc >>> 8, cc & 0xff])
		// 				: // normal CC
		// 				  Buffer.from([cc]),
		// 		),
		// 	);

		// 	const appInfoMsg = new Message(this.driver, {
		// 		type: MessageType.Request,
		// 		functionType:
		// 			FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION,
		// 		payload: Buffer.concat([
		// 			Buffer.from([
		// 				0x01, // APPLICATION_NODEINFO_LISTENING
		// 				GenericDeviceClasses["Static Controller"],
		// 				0x01, // specific static PC controller
		// 				supportedCCBuffer.length, // length of supported CC list
		// 			]),
		// 			// List of supported CCs
		// 			supportedCCBuffer,
		// 		]),
		// 	});
		// 	await this.driver.sendMessage(appInfoMsg, {
		// 		priority: MessagePriority.Controller,
		// 		supportCheck: false,
		// 	});
		// }

		log.controller.print("Interview completed");
	}

	/**
	 * Performs a hard reset on the controller. This wipes out all configuration!
	 * Warning: The driver needs to re-interview the controller, so don't call this directly
	 * @internal
	 */
	public hardReset(): Promise<void> {
		log.controller.print("performing hard reset...");
		// wotan-disable-next-line async-function-assignability
		return new Promise(async (resolve, reject) => {
			// handle the incoming message
			const handler: RequestHandler = _msg => {
				log.controller.print(`  hard reset succeeded`);
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
					{ supportCheck: false },
				);
			} catch (e) {
				// in any case unregister the handler
				log.controller.print(
					`  hard reset failed: ${e.message}`,
					"error",
				);
				this.driver.unregisterRequestHandler(
					FunctionType.HardReset,
					handler,
				);
				reject(e);
			}
		});
	}

	private _exclusionActive: boolean = false;
	private _inclusionActive: boolean = false;
	private _nodePendingInclusion: ZWaveNode | undefined;
	private _nodePendingExclusion: ZWaveNode | undefined;
	// The following variables are to be used for inclusion AND exclusion
	private _beginInclusionPromise: DeferredPromise<boolean> | undefined;
	private _stopInclusionPromise: DeferredPromise<boolean> | undefined;

	/**
	 * Starts the inclusion process of new nodes.
	 * Resolves to true when the process was started,
	 * and false if the inclusion was already active
	 */
	public async beginInclusion(): Promise<boolean> {
		// don't start it twice
		if (this._inclusionActive || this._exclusionActive) return false;
		this._inclusionActive = true;

		log.controller.print(`starting inclusion process...`);

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

	/** Is used internally to stop an active inclusion process without creating deadlocks */
	private async stopInclusionInternal(): Promise<void> {
		// don't stop it twice
		if (!this._inclusionActive) return;
		this._inclusionActive = false;

		log.controller.print(`stopping inclusion process...`);

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

		// Don't await the promise or we create a deadlock
		void this._stopInclusionPromise.then(() => {
			log.controller.print(`the inclusion process was stopped`);
			this.emit("inclusion stopped");
		});
	}

	/**
	 * Stops an active inclusion process. Resolves to true when the controller leaves inclusion mode,
	 * and false if the inclusion was not active.
	 */
	public async stopInclusion(): Promise<boolean> {
		// don't stop it twice
		if (!this._inclusionActive) return false;
		this._inclusionActive = false;

		await this.stopInclusionInternal();

		return this._stopInclusionPromise!;
	}

	/**
	 * Starts the exclusion process of new nodes.
	 * Resolves to true when the process was started,
	 * and false if an inclusion or exclusion process was already active
	 */
	public async beginExclusion(): Promise<boolean> {
		// don't start it twice
		if (this._inclusionActive || this._exclusionActive) return false;
		this._exclusionActive = true;

		log.controller.print(`starting exclusion process...`);

		// create the promise we're going to return
		this._beginInclusionPromise = createDeferredPromise();

		// kick off the inclusion process
		await this.driver.sendMessage(
			new RemoveNodeFromNetworkRequest(this.driver, {
				removeNodeType: RemoveNodeType.Any,
				highPower: true,
				networkWide: true,
			}),
		);

		return this._beginInclusionPromise;
	}

	/** Is used internally to stop an active inclusion process without creating deadlocks */
	private async stopExclusionInternal(): Promise<void> {
		// don't stop it twice
		if (!this._exclusionActive) return;
		this._exclusionActive = false;

		log.controller.print(`stopping exclusion process...`);

		// create the promise we're going to return
		this._stopInclusionPromise = createDeferredPromise();

		// kick off the inclusion process
		await this.driver.sendMessage(
			new RemoveNodeFromNetworkRequest(this.driver, {
				removeNodeType: RemoveNodeType.Stop,
				highPower: true,
				networkWide: true,
			}),
		);

		void this._stopInclusionPromise.then(() => {
			log.controller.print(`the exclusion process was stopped`);
			this.emit("exclusion stopped");
		});
	}

	/**
	 * Stops an active exclusion process. Resolves to true when the controller leaves exclusion mode,
	 * and false if the inclusion was not active.
	 */
	public async stopExclusion(): Promise<boolean> {
		// don't stop it twice
		if (!this._exclusionActive) return false;
		this._exclusionActive = false;

		await this.stopExclusionInternal();

		return this._stopInclusionPromise!;
	}

	/**
	 * Requests ALL slave nodes to update their neighbor lists
	 */
	public async healNetwork(): Promise<void> {
		for (const nodeId of this._nodes.keys()) {
			if (nodeId !== this._ownNodeId) {
				try {
					await this.healNode(nodeId);
				} catch (e) {
					// we don't care for now
				}
			}
		}
	}

	/**
	 * Requests a node to update its neighbor list.
	 */
	public async healNode(nodeId: number): Promise<boolean> {
		log.controller.logNode(nodeId, {
			message: "refreshing neighbor list...",
			direction: "outbound",
		});
		try {
			const resp = await this.driver.sendMessage<
				RequestNodeNeighborUpdateReport
			>(
				new RequestNodeNeighborUpdateRequest(this.driver, {
					nodeId,
				}),
			);
			if (resp.updateStatus === NodeNeighborUpdateStatus.UpdateDone) {
				log.controller.logNode(nodeId, {
					message: "neighbor list refreshed...",
					direction: "inbound",
				});
				await this.nodes.get(nodeId)!.queryNeighborsInternal();
				return true;
			} else {
				// UpdateFailed
				log.controller.logNode(nodeId, {
					message: "refreshing neighbor list failed...",
					direction: "inbound",
					level: "warn",
				});
				return false;
			}
		} catch (e) {
			log.controller.logNode(
				nodeId,
				`refreshing neighbor list failed: ${e.message}`,
				"error",
			);
			throw e;
		}
	}

	/**
	 * Is called when an AddNode request is received from the controller.
	 * Handles and controls the inclusion process.
	 */
	private async handleAddNodeRequest(
		msg: AddNodeToNetworkRequest,
	): Promise<boolean> {
		log.controller.print(
			`handling add node request (status = ${
				AddNodeStatus[msg.status!]
			})`,
		);
		if (!this._inclusionActive && msg.status !== AddNodeStatus.Done) {
			log.controller.print(`  inclusion is NOT active, ignoring it...`);
			return true; // Don't invoke any more handlers
		}

		switch (msg.status) {
			case AddNodeStatus.Ready:
				// this is called when inclusion was started successfully
				log.controller.print(
					`  the controller is now ready to add nodes`,
				);
				if (this._beginInclusionPromise != null) {
					this._beginInclusionPromise.resolve(true);
					this.emit("inclusion started");
				}
				break;
			case AddNodeStatus.Failed:
				// this is called when inclusion could not be started...
				if (this._beginInclusionPromise != null) {
					log.controller.print(
						`  starting the inclusion failed`,
						"error",
					);
					this._beginInclusionPromise.reject(
						new ZWaveError(
							"The inclusion could not be started.",
							ZWaveErrorCodes.Controller_InclusionFailed,
						),
					);
				} else {
					// ...or adding a node failed
					log.controller.print(`  adding the node failed`, "error");
					this.emit("inclusion failed");
				}
				// in any case, stop the inclusion process so we don't accidentally add another node
				try {
					await this.stopInclusionInternal();
				} catch (e) {
					/* ok */
				}
				break;
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
				return true; // Don't invoke any more handlers
			}
			case AddNodeStatus.ProtocolDone: {
				// this is called after a new node is added
				// stop the inclusion process so we don't accidentally add another node
				try {
					await this.stopInclusionInternal();
				} catch (e) {
					/* ok */
				}
				break;
			}
			case AddNodeStatus.Done: {
				// this is called when the inclusion was completed
				log.controller.print(
					`done called for ${msg.statusContext!.nodeId}`,
				);
				// stopping the inclusion was acknowledged by the controller
				if (this._stopInclusionPromise != null)
					this._stopInclusionPromise.resolve();

				if (this._nodePendingInclusion != null) {
					const newNode = this._nodePendingInclusion;
					const supportedCommandClasses = [
						...newNode.implementedCommandClasses.entries(),
					]
						.filter(([, info]) => info.isSupported)
						.map(([cc]) => cc);
					const controlledCommandClasses = [
						...newNode.implementedCommandClasses.entries(),
					]
						.filter(([, info]) => info.isControlled)
						.map(([cc]) => cc);
					log.controller.print(
						`finished adding node ${newNode.id}:
  basic device class:    ${
		BasicDeviceClasses[newNode.deviceClass!.basic]
  } (${num2hex(newNode.deviceClass!.basic)})
  generic device class:  ${newNode.deviceClass!.generic.name} (${num2hex(
							newNode.deviceClass!.generic.key,
						)})
  specific device class: ${newNode.deviceClass!.specific.name} (${num2hex(
							newNode.deviceClass!.specific.key,
						)})
  supported CCs: ${supportedCommandClasses
		.map(cc => `\n    ${CommandClasses[cc]} (${num2hex(cc)})`)
		.join("")}
  controlled CCs: ${controlledCommandClasses
		.map(cc => `\n    ${CommandClasses[cc]} (${num2hex(cc)})`)
		.join("")}`,
					);
					// remember the node
					this._nodes.set(newNode.id, newNode);
					this._nodePendingInclusion = undefined;
					// and notify listeners
					this.emit("node added", newNode);
				}
				break;
			}
			default:
				// not sure what to do with this message
				return false;
		}
		return true; // Don't invoke any more handlers
	}

	/**
	 * Is called when a RemoveNode request is received from the controller.
	 * Handles and controls the exclusion process.
	 */
	private async handleRemoveNodeRequest(
		msg: RemoveNodeFromNetworkRequest,
	): Promise<boolean> {
		log.controller.print(
			`handling remove node request (status = ${
				RemoveNodeStatus[msg.status!]
			})`,
		);
		if (!this._exclusionActive && msg.status !== RemoveNodeStatus.Done) {
			log.controller.print(`  exclusion is NOT active, ignoring it...`);
			return true; // Don't invoke any more handlers
		}

		switch (msg.status) {
			case RemoveNodeStatus.Ready:
				// this is called when inclusion was started successfully
				log.controller.print(
					`  the controller is now ready to remove nodes`,
				);
				if (this._beginInclusionPromise != null) {
					this._beginInclusionPromise.resolve(true);
					this.emit("exclusion started");
				}
				break;

			case RemoveNodeStatus.Failed:
				// this is called when inclusion could not be started...
				if (this._beginInclusionPromise != null) {
					log.controller.print(
						`  starting the exclusion failed`,
						"error",
					);
					this._beginInclusionPromise.reject(
						new ZWaveError(
							"The exclusion could not be started.",
							ZWaveErrorCodes.Controller_ExclusionFailed,
						),
					);
				} else {
					// ...or removing a node failed
					log.controller.print(`  removing the node failed`, "error");
					this.emit("exclusion failed");
				}
				// in any case, stop the exclusion process so we don't accidentally remove another node
				try {
					await this.stopExclusionInternal();
				} catch (e) {
					/* ok */
				}
				break;

			case RemoveNodeStatus.RemovingSlave:
			case RemoveNodeStatus.RemovingController: {
				// this is called when a node is removed
				this._nodePendingExclusion = this.nodes.get(
					msg.statusContext!.nodeId,
				);
				return true; // Don't invoke any more handlers
			}

			case RemoveNodeStatus.Done: {
				// this is called when the exclusion was completed
				// stop the exclusion process so we don't accidentally remove another node
				try {
					await this.stopExclusionInternal();
				} catch (e) {
					/* ok */
				}

				// stopping the inclusion was acknowledged by the controller
				if (this._stopInclusionPromise != null)
					this._stopInclusionPromise.resolve();

				if (this._nodePendingExclusion != null) {
					log.controller.print(
						`Node ${this._nodePendingExclusion.id} was removed`,
					);

					// notify listeners
					this.emit("node removed", this._nodePendingExclusion);
					// and forget the node
					this._nodes.delete(this._nodePendingExclusion.id);
					this._nodePendingInclusion = undefined;
				}
				break;
			}
			default:
				// not sure what to do with this message
				return false;
		}
		return true; // Don't invoke any more handlers
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
