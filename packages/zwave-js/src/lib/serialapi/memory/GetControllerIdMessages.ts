import type { ZWaveHost } from "@zwave-js/host";
import {
	expectedResponse,
	FunctionType,
	Message,
	MessageDeserializationOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import type { JSONObject } from "@zwave-js/shared";
import { num2hex } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.GetControllerId)
@expectedResponse(FunctionType.GetControllerId)
@priority(MessagePriority.Controller)
export class GetControllerIdRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetControllerId)
export class GetControllerIdResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		// The payload is 4 bytes home id, followed by the controller node id
		this._homeId = this.payload.readUInt32BE(0);
		this._ownNodeId = this.payload.readUInt8(4);
	}

	private _homeId: number;
	public get homeId(): number {
		return this._homeId;
	}

	private _ownNodeId: number;
	public get ownNodeId(): number {
		return this._ownNodeId;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			homeId: num2hex(this.homeId),
			ownNodeId: this.ownNodeId,
		});
	}
}
