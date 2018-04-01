import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { Message } from "../message/Message";
import { Node } from "../node/Node";
import { log } from "../util/logger";
import { num2hex, stringify } from "../util/strings";
import { Driver } from "./Driver";
import { GetControllerCapabilitiesRequest, GetControllerCapabilitiesResponse } from "./GetControllerCapabilitiesMessages";
import { GetControllerIdRequest, GetControllerIdResponse } from "./GetControllerIdMessages";
import { ControllerTypes, GetControllerVersionRequest, GetControllerVersionResponse } from "./GetControllerVersionMessages";
import { GetSerialApiCapabilitiesRequest, GetSerialApiCapabilitiesResponse } from "./GetSerialApiCapabilitiesMessages";
import { GetSerialApiInitDataRequest, GetSerialApiInitDataResponse } from "./GetSerialApiInitDataMessages";
import { GetSUCNodeIdRequest, GetSUCNodeIdResponse } from "./GetSUCNodeIdMessages";
import { SetSerialApiTimeoutsRequest, SetSerialApiTimeoutsResponse } from "./SetSerialApiTimeoutsMessages";

export class ZWaveController {

	constructor(
		private readonly driver: Driver,
	) {}

//#region --- Properties ---

	private _libraryVersion: string;
	public get libraryVersion(): string {
		return this._libraryVersion;
	}

	private _type: ControllerTypes;
	public get type(): ControllerTypes {
		return this._type;
	}

	private _homeId: number;
	public get homeId(): number {
		return this._homeId;
	}

	private _ownNodeId: number;
	public get ownNodeId(): number {
		return this._ownNodeId;
	}

	private _isSecondary: boolean;
	public get isSecondary(): boolean {
		return this._isSecondary;
	}

	private _isUsingHomeIdFromOtherNetwork: boolean;
	public get isUsingHomeIdFromOtherNetwork(): boolean {
		return this._isUsingHomeIdFromOtherNetwork;
	}

	private _isSISPresent: boolean;
	public get isSISPresent(): boolean {
		return this._isSISPresent;
	}

	private _wasRealPrimary: boolean;
	public get wasRealPrimary(): boolean {
		return this._wasRealPrimary;
	}

	private _isStaticUpdateController: boolean;
	public get isStaticUpdateController(): boolean {
		return this._isStaticUpdateController;
	}

	private _isSlave: boolean;
	public get isSlave(): boolean {
		return this._isSlave;
	}

	private _serialApiVersion: string;
	public get serialApiVersion() {
		return this._serialApiVersion;
	}

	private _manufacturerId: number;
	public get manufacturerId() {
		return this._manufacturerId;
	}

	private _productType: number;
	public get productType() {
		return this._productType;
	}

	private _productId: number;
	public get productId() {
		return this._productId;
	}

	private _supportedFunctionTypes: FunctionType[];
	public get supportedFunctionTypes(): FunctionType[] {
		return this._supportedFunctionTypes;
	}

	public isFunctionSupported(functionType: FunctionType): boolean {
		return this._supportedFunctionTypes.indexOf(functionType) > -1;
	}

	private _sucNodeId: number;
	public get sucNodeId(): number {
		return this._sucNodeId;
	}

	private _supportsTimers: boolean;
	public get supportsTimers(): boolean {
		return this._supportsTimers;
	}

	public readonly nodes = new Map<number, Node>();

//#endregion

	public async interview(): Promise<void> {
		log("controller", "beginning interview...", "debug");

		// get basic controller version info
		log("controller", `querying version info...`, "debug");
		const version = await this.driver.sendMessage<GetControllerVersionResponse>(new GetControllerVersionRequest(), "none");
		this._libraryVersion = version.libraryVersion;
		this._type = version.controllerType;
		log("controller", `received version info:`, "debug");
		log("controller", `  controller type: ${ControllerTypes[this._type]}`, "debug");
		log("controller", `  library version: ${this._libraryVersion}`, "debug");

		// get the home and node id of the controller
		log("controller", `querying controller IDs...`, "debug");
		const ids = await this.driver.sendMessage<GetControllerIdResponse>(new GetControllerIdRequest(), "none");
		this._homeId = ids.homeId;
		this._ownNodeId = ids.ownNodeId;
		log("controller", `received controller IDs:`, "debug");
		log("controller", `  home ID:     ${num2hex(this._homeId)}`, "debug");
		log("controller", `  own node ID: ${this._ownNodeId}`, "debug");

		// find out what the controller can do
		log("controller", `querying controller capabilities...`, "debug");
		const ctrlCaps = await this.driver.sendMessage<GetControllerCapabilitiesResponse>(new GetControllerCapabilitiesRequest(), "none");
		this._isSecondary = ctrlCaps.isSecondary;
		this._isUsingHomeIdFromOtherNetwork = ctrlCaps.isUsingHomeIdFromOtherNetwork;
		this._isSISPresent = ctrlCaps.isSISPresent;
		this._wasRealPrimary = ctrlCaps.wasRealPrimary;
		this._isStaticUpdateController = ctrlCaps.isStaticUpdateController;
		log("controller", `received controller capabilities:`, "debug");
		log("controller", `  controller role:     ${this._isSecondary ? "secondary" : "primary"}`, "debug");
		log("controller", `  is in other network: ${this._isUsingHomeIdFromOtherNetwork}`, "debug");
		log("controller", `  is SIS present:      ${this._isSISPresent}`, "debug");
		log("controller", `  was real primary:    ${this._wasRealPrimary}`, "debug");
		log("controller", `  is a SUC:            ${this._isStaticUpdateController}`, "debug");

		// find out which part of the API is supported
		log("controller", `querying API capabilities...`, "debug");
		const apiCaps = await this.driver.sendMessage<GetSerialApiCapabilitiesResponse>(new GetSerialApiCapabilitiesRequest(), "none");
		this._serialApiVersion = apiCaps.serialApiVersion;
		this._manufacturerId = apiCaps.manufacturerId;
		this._productType = apiCaps.productType;
		this._productId = apiCaps.productId;
		this._supportedFunctionTypes = apiCaps.supportedFunctionTypes;
		log("controller", `received API capabilities:`, "debug");
		log("controller", `  serial API version:  ${this._serialApiVersion}`, "debug");
		log("controller", `  manufacturer ID:     ${num2hex(this._manufacturerId)}`, "debug");
		log("controller", `  product type:        ${num2hex(this._productType)}`, "debug");
		log("controller", `  product ID:          ${num2hex(this._productId)}`, "debug");
		log("controller", `  supported functions:`, "debug");
		for (const fn of this._supportedFunctionTypes) {
			log("controller", `    ${FunctionType[fn]} (${num2hex(fn)})`, "debug");
		}

		// now we can check if a function is supported

		// find the SUC
		log("controller", `finding SUC...`, "debug");
		const suc = await this.driver.sendMessage<GetSUCNodeIdResponse>(new GetSUCNodeIdRequest(), "none");
		this._sucNodeId = suc.sucNodeId;
		if (this._sucNodeId === 0) {
			log("controller", `no SUC present`, "debug");
		} else {
			log("controller", `SUC has node ID ${this.sucNodeId}`, "debug");
		}
		// TODO: if configured, enable this controller as SIS if there's no SUC
		// https://github.com/OpenZWave/open-zwave/blob/a46f3f36271f88eed5aea58899a6cb118ad312a2/cpp/src/Driver.cpp#L2586

		// if it's a bridge controller, request the virtual nodes
		if (this.type === ControllerTypes["Bridge Controller"] && this.isFunctionSupported(FunctionType.FUNC_ID_ZW_GET_VIRTUAL_NODES)) {
			// TODO: send FUNC_ID_ZW_GET_VIRTUAL_NODES message
		}

		// Request information about all nodes with the GetInitData message
		log("controller", `querying node information...`, "debug");
		const initData = await this.driver.sendMessage<GetSerialApiInitDataResponse>(new GetSerialApiInitDataRequest());
		// override the information we might already have
		this._isSecondary = initData.isSecondary;
		this._isStaticUpdateController = initData.isStaticUpdateController;
		// and remember the new info
		this._isSlave = initData.isSlave;
		this._supportsTimers = initData.supportsTimers;
		// ignore the initVersion, no clue what to do with it
		log("controller", `received node information:`, "debug");
		log("controller", `  controller role:            ${this._isSecondary ? "secondary" : "primary"}`, "debug");
		log("controller", `  controller is a SUC:        ${this._isStaticUpdateController}`, "debug");
		log("controller", `  controller is a slave:      ${this._isSlave}`, "debug");
		log("controller", `  controller supports timers: ${this._supportsTimers}`, "debug");
		log("controller", `  nodes in the network:       ${initData.nodeIds.join(", ")}`, "debug");
		// create an empty entry in the nodes map so we can initialize them afterwards
		for (const nodeId of initData.nodeIds) {
			this.nodes.set(nodeId, new Node(nodeId, this.driver));
		}

		if (this.type !== ControllerTypes["Bridge Controller"] && this.isFunctionSupported(FunctionType.SetSerialApiTimeouts)) {
			const { ack, byte } = this.driver.options.timeouts;
			log("controller", `setting serial API timeouts: ack = ${ack} ms, byte = ${byte} ms`, "debug");
			const resp = await this.driver.sendMessage<SetSerialApiTimeoutsResponse>(new SetSerialApiTimeoutsRequest(ack, byte));
			log("controller", `serial API timeouts overwritten. The old values were: ack = ${resp.oldAckTimeout} ms, byte = ${resp.oldByteTimeout} ms`, "debug");
		}

		// send application info (not sure why tho)
		if (this.isFunctionSupported(FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION)) {
			log("controller", `sending application info...`, "debug");
			const appInfoMsg = new Message(
				MessageType.Request,
				FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION,
				null,
				Buffer.from([
					0x01, // APPLICATION_NODEINFO_LISTENING
					0x02, // generic static controller
					0x01, // specific static PC controller
					0x00, // length
				]),
			);
			await this.driver.sendMessage(appInfoMsg, MessagePriority.Controller, "none");
		}

		log("controller", "interview completed", "debug");
	}

}
