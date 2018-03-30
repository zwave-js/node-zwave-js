import { FunctionType, Message, MessageType } from "../message/Message";
import { Node, QueryStage } from "../node/node";
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

	public async interview(driver: Driver): Promise<void> {
		log("controller", "interviewing controller", "debug");

		// get basic controller version info
		const version = await driver.sendMessage<GetControllerVersionResponse>(new GetControllerVersionRequest(), "none");
		log("controller", `got version info: ${stringify(version)}`, "debug");
		this._libraryVersion = version.libraryVersion;
		this._type = version.controllerType;

		// get the home and node id of the controller
		const ids = await driver.sendMessage<GetControllerIdResponse>(new GetControllerIdRequest(), "none");
		log("controller", `got IDs: ${stringify(ids)}`, "debug");
		this._homeId = ids.homeId;
		this._ownNodeId = ids.ownNodeId;

		// find out what the controller can do
		const ctrlCaps = await driver.sendMessage<GetControllerCapabilitiesResponse>(new GetControllerCapabilitiesRequest(), "none");
		log("controller", `got controller capabilities: ${stringify(ctrlCaps)}`, "debug");
		this._isSecondary = ctrlCaps.isSecondary;
		this._isUsingHomeIdFromOtherNetwork = ctrlCaps.isUsingHomeIdFromOtherNetwork;
		this._isSISPresent = ctrlCaps.isSISPresent;
		this._wasRealPrimary = ctrlCaps.wasRealPrimary;
		this._isStaticUpdateController = ctrlCaps.isStaticUpdateController;

		// find out which part of the API is supported
		const apiCaps = await driver.sendMessage<GetSerialApiCapabilitiesResponse>(new GetSerialApiCapabilitiesRequest(), "none");
		log("controller", `got api capabilities: ${stringify(apiCaps)}`, "debug");
		this._serialApiVersion = apiCaps.serialApiVersion;
		this._manufacturerId = apiCaps.manufacturerId;
		this._productType = apiCaps.productType;
		this._productId = apiCaps.productId;
		this._supportedFunctionTypes = apiCaps.supportedFunctionTypes;

		// now we can check if a function is supported

		// find the SUC
		const suc = await driver.sendMessage<GetSUCNodeIdResponse>(new GetSUCNodeIdRequest(), "none");
		log("controller", `got suc info: ${stringify(suc)}`, "debug");
		this._sucNodeId = suc.sucNodeId;
		// TODO: if configured, enable this controller as SIS if there's no SUC
		// https://github.com/OpenZWave/open-zwave/blob/a46f3f36271f88eed5aea58899a6cb118ad312a2/cpp/src/Driver.cpp#L2586

		// if it's a bridge controller, request the virtual nodes
		if (this.type === ControllerTypes["Bridge Controller"] && this.isFunctionSupported(FunctionType.FUNC_ID_ZW_GET_VIRTUAL_NODES)) {
			// TODO: send FUNC_ID_ZW_GET_VIRTUAL_NODES message
		}

		// Request information about all nodes with the GetInitData message
		const initData = await driver.sendMessage<GetSerialApiInitDataResponse>(new GetSerialApiInitDataRequest());
		log("controller", `got init data: ${stringify(initData)}`, "debug");
		// override the information we might already have
		this._isSecondary = initData.isSecondary;
		this._isStaticUpdateController = initData.isStaticUpdateController;
		// and remember the new info
		this._isSlave = initData.isSlave;
		this._supportsTimers = initData.supportsTimers;
		// ignore the initVersion, no clue what to do with it
		// create an empty entry in the nodes map so we can initialize them afterwards
		for (const nodeId of initData.nodeIds) {
			this.nodes.set(nodeId, new Node(nodeId));
		}

		if (this.type !== ControllerTypes["Bridge Controller"] && this.isFunctionSupported(FunctionType.SetSerialApiTimeouts)) {
			const { ack, byte } = driver.options.timeouts;
			log("controller", `setting serial API timeouts: ack = ${ack} ms, byte = ${byte} ms`, "debug");
			const resp = await driver.sendMessage<SetSerialApiTimeoutsResponse>(new SetSerialApiTimeoutsRequest(ack, byte));
			log("controller", `serial API timeouts overwritten. The old values were: ack = ${resp.oldAckTimeout} ms, byte = ${resp.oldByteTimeout} ms`, "debug");
		}

		// send application info (not sure why tho)
		if (this.isFunctionSupported(FunctionType.FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION)) {
			log("controller", `sending application info`, "debug");
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
			await driver.sendMessage(appInfoMsg, "none");
		}

		log("controller", "interview done!", "debug");
	}

}
