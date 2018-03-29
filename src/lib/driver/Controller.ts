import { FunctionType } from "../message/Message";
import { log } from "../util/logger";
import { num2hex } from "../util/strings";
import { Driver } from "./Driver";
import { GetControllerCapabilitiesRequest, GetControllerCapabilitiesResponse } from "./GetControllerCapabilitiesMessages";
import { GetControllerIdRequest, GetControllerIdResponse } from "./GetControllerIdMessages";
import { ControllerTypes, GetControllerVersionRequest, GetControllerVersionResponse } from "./GetControllerVersionMessages";
import { GetSerialApiCapabilitiesRequest, GetSerialApiCapabilitiesResponse } from "./GetSerialApiCapabilitiesMessages";
import { GetSUCNodeIdRequest, GetSUCNodeIdResponse } from "./GetSUCNodeIdMessages";

export class ZWaveController {

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

	private _functionBitMask: Buffer;
	public isFunctionSupported(functionType: FunctionType): boolean {
		const byteNum = (functionType - 1) >>> 3; // type / 8
		const bitNum = (functionType - 1) % 8;
		return (this._functionBitMask[byteNum] & (1 << bitNum)) !== 0;
	}

	private _sucNodeId: number;
	public get sucNodeId(): number {
		return this._sucNodeId;
	}

	public async interview(driver: Driver): Promise<void> {
		log("interviewing controller", "debug");
		// get basic controller version info
		const version = await driver.sendMessage<GetControllerVersionResponse>(new GetControllerVersionRequest(), true);
		log(`got version info: ${JSON.stringify(version)}`, "debug");
		this._libraryVersion = version.libraryVersion;
		this._type = version.controllerType;

		// get the home and node id of the controller
		const ids = await driver.sendMessage<GetControllerIdResponse>(new GetControllerIdRequest(), true);
		log(`got IDs: ${JSON.stringify(ids)}`, "debug");
		this._homeId = ids.homeId;
		this._ownNodeId = ids.ownNodeId;

		// find out what the controller can do
		const ctrlCaps = await driver.sendMessage<GetControllerCapabilitiesResponse>(new GetControllerCapabilitiesRequest(), true);
		log(`got controller capabilities: ${JSON.stringify(ctrlCaps)}`, "debug");
		this._isSecondary = ctrlCaps.isSecondary;
		this._isUsingHomeIdFromOtherNetwork = ctrlCaps.isUsingHomeIdFromOtherNetwork;
		this._isSISPresent = ctrlCaps.isSISPresent;
		this._wasRealPrimary = ctrlCaps.wasRealPrimary;
		this._isStaticUpdateController = ctrlCaps.isStaticUpdateController;

		// find out which part of the API is supported
		const apiCaps = await driver.sendMessage<GetSerialApiCapabilitiesResponse>(new GetSerialApiCapabilitiesRequest(), true);
		log(`got api capabilities: ${JSON.stringify(apiCaps)}`, "debug");
		this._serialApiVersion = apiCaps.serialApiVersion;
		this._manufacturerId = apiCaps.manufacturerId;
		this._productType = apiCaps.productType;
		this._productId = apiCaps.productId;
		this._functionBitMask = apiCaps.functionBitMask;

		// find the SUC
		const suc = await driver.sendMessage<GetSUCNodeIdResponse>(new GetSUCNodeIdRequest(), true);
		log(`got suc info: ${JSON.stringify(suc)}`, "debug");
		this._sucNodeId = suc.sucNodeId;
	}

}
