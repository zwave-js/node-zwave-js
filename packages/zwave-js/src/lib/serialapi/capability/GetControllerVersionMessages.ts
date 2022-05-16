import type { ZWaveHost } from "@zwave-js/host";
import { cpp2js, JSONObject } from "@zwave-js/shared";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../../message/Constants";
import {
	expectedResponse,
	Message,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../../message/Message";
import type { ZWaveNode } from "../../node/Node";
import type { ZWaveLibraryTypes } from "../_Types";

@messageTypes(MessageType.Request, FunctionType.GetControllerVersion)
@expectedResponse(FunctionType.GetControllerVersion)
@priority(MessagePriority.Controller)
export class GetControllerVersionRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetControllerVersion)
export class GetControllerVersionResponse extends Message {
	public constructor(
		host: ZWaveHost<ZWaveNode>,
		options: MessageDeserializationOptions,
	) {
		super(host, options);

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
