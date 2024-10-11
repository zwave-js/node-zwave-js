import { MessagePriority, encodeNodeID, parseNodeID } from "@zwave-js/core";
import type { CCEncodingContext, ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageEncodingContext,
	MessageType,
	expectedResponse,
	gotDeserializationOptions,
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
			this.sucNodeId = parseNodeID(
				this.payload,
				options.ctx.nodeIdType,
				0,
			).nodeId;
		} else {
			this.sucNodeId = options.sucNodeId;
		}
	}

	/** The node id of the SUC or 0 if none is present */
	public sucNodeId: number;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = encodeNodeID(this.sucNodeId, ctx.nodeIdType);
		return super.serialize(ctx);
	}
}
