import type { ZWaveHost } from "@zwave-js/host";
import {
	expectedResponse,
	FunctionType,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";

@messageTypes(MessageType.Request, FunctionType.GetSUCNodeId)
@expectedResponse(FunctionType.GetSUCNodeId)
@priority(MessagePriority.Controller)
export class GetSUCNodeIdRequest extends Message {}

export interface GetSUCNodeIdResponseOptions extends MessageBaseOptions {
	sucNodeId: number;
}

@messageTypes(MessageType.Response, FunctionType.GetSUCNodeId)
export class GetSUCNodeIdResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions | GetSUCNodeIdResponseOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			this.sucNodeId = this.payload[0];
		} else {
			this.sucNodeId = options.sucNodeId;
		}
	}

	/** The node id of the SUC or 0 if none is present */
	public sucNodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.sucNodeId]);
		return super.serialize();
	}
}
