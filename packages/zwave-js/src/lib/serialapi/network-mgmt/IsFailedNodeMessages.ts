import { MessagePriority, encodeNodeID } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageEncodingContext,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";

export interface IsFailedNodeRequestOptions extends MessageBaseOptions {
	// This must not be called nodeId or rejectAllTransactions may reject the request
	failedNodeId: number;
}

@messageTypes(MessageType.Request, FunctionType.IsFailedNode)
@expectedResponse(FunctionType.IsFailedNode)
@priority(MessagePriority.Controller)
export class IsFailedNodeRequest extends Message {
	public constructor(options: IsFailedNodeRequestOptions) {
		super(options);
		this.failedNodeId = options.failedNodeId;
	}

	// This must not be called nodeId or rejectAllTransactions may reject the request
	public failedNodeId: number;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = encodeNodeID(this.failedNodeId, ctx.nodeIdType);
		return super.serialize(ctx);
	}
}

@messageTypes(MessageType.Response, FunctionType.IsFailedNode)
export class IsFailedNodeResponse extends Message {
	public constructor(
		options: MessageDeserializationOptions,
	) {
		super(options);
		this.result = !!this.payload[0];
	}

	public readonly result: boolean;
}
