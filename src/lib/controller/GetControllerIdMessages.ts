import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { expectedResponse, Message, messageTypes, priority} from "../message/Message";

@messageTypes(MessageType.Request, FunctionType.GetControllerId)
@expectedResponse(FunctionType.GetControllerId)
@priority(MessagePriority.Controller)
export class GetControllerIdRequest extends Message {

}

@messageTypes(MessageType.Response, FunctionType.GetControllerId)
export class GetControllerIdResponse extends Message {

	private _homeId: number;
	public get homeId() {
		return this._homeId;
	}

	private _ownNodeId: number;
	public get ownNodeId() {
		return this._ownNodeId;
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		// The payload is 4 bytes home id, followed by the controller node id
		this._homeId = this.payload.readUInt32BE(0);
		this._ownNodeId = this.payload.readUInt8(4);

		return ret;
	}

	public toJSON() {
		return super.toJSONInherited({
			homeId: this.homeId,
			ownNodeId: this.ownNodeId,
		});
	}
}
