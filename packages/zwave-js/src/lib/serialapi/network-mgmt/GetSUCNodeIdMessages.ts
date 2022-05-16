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

@messageTypes(MessageType.Request, FunctionType.GetSUCNodeId)
@expectedResponse(FunctionType.GetSUCNodeId)
@priority(MessagePriority.Controller)
export class GetSUCNodeIdRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetSUCNodeId)
export class GetSUCNodeIdResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this._sucNodeId = this.payload[0];
	}

	private _sucNodeId: number;
	/** The node id of the SUC or 0 if none is present */
	public get sucNodeId(): number {
		return this._sucNodeId;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			sucNodeId: this.sucNodeId,
		});
	}
}
