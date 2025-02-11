import { MessagePriority, encodeNodeID, parseNodeID } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { type Bytes } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.GetSUCNodeId)
@expectedResponse(FunctionType.GetSUCNodeId)
@priority(MessagePriority.Controller)
export class GetSUCNodeIdRequest extends Message {}

export interface GetSUCNodeIdResponseOptions {
	sucNodeId: number;
}

@messageTypes(MessageType.Response, FunctionType.GetSUCNodeId)
export class GetSUCNodeIdResponse extends Message {
	public constructor(
		options: GetSUCNodeIdResponseOptions & MessageBaseOptions,
	) {
		super(options);

		this.sucNodeId = options.sucNodeId;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): GetSUCNodeIdResponse {
		const sucNodeId = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
			0,
		).nodeId;

		return new this({
			sucNodeId,
		});
	}

	/** The node id of the SUC or 0 if none is present */
	public sucNodeId: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = encodeNodeID(this.sucNodeId, ctx.nodeIdType);
		return super.serialize(ctx);
	}
}
