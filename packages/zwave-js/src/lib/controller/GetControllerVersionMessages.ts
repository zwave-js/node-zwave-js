import { cpp2js, JSONObject } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedResponse,
	Message,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../message/Message";
import type { ZWaveLibraryTypes } from "./ZWaveLibraryTypes";

@messageTypes(MessageType.Request, FunctionType.GetControllerVersion)
@expectedResponse(FunctionType.GetControllerVersion)
@priority(MessagePriority.Controller)
export class GetControllerVersionRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetControllerVersion)
export class GetControllerVersionResponse extends Message {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);

		// The payload consists of a zero-terminated string and a uint8 for the controller type
		this._sdkVersion = cpp2js(this.payload.toString("ascii"));
		this._controllerType = this.payload[this.sdkVersion.length + 1];
	}

	private _controllerType: ZWaveLibraryTypes;
	public get controllerType(): ZWaveLibraryTypes {
		return this._controllerType;
	}

	private _sdkVersion: string;
	public get sdkVersion(): string {
		return this._sdkVersion;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			controllerType: this.controllerType,
			sdkVersion: this.sdkVersion,
		});
	}
}
