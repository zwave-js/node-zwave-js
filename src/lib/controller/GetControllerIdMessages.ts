import { Driver } from "../driver/Driver";
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
import { JSONObject } from "../util/misc";
import { num2hex } from "../util/strings";

@messageTypes(MessageType.Request, FunctionType.GetControllerId)
@expectedResponse(FunctionType.GetControllerId)
@priority(MessagePriority.Controller)
export class GetControllerIdRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetControllerId)
export class GetControllerIdResponse extends Message {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
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
