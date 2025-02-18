import { MessagePriority, encodeNodeID } from "@zwave-js/core";
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

export interface IsFailedNodeRequestOptions {
	// This must not be called nodeId or rejectAllTransactions may reject the request
	failedNodeId: number;
}

@messageTypes(MessageType.Request, FunctionType.IsFailedNode)
@expectedResponse(FunctionType.IsFailedNode)
@priority(MessagePriority.Controller)
export class IsFailedNodeRequest extends Message {
	public constructor(
		options: IsFailedNodeRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.failedNodeId = options.failedNodeId;
	}

	// This must not be called nodeId or rejectAllTransactions may reject the request
	public failedNodeId: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = encodeNodeID(this.failedNodeId, ctx.nodeIdType);
		return super.serialize(ctx);
	}
}

export interface IsFailedNodeResponseOptions {
	result: boolean;
}

@messageTypes(MessageType.Response, FunctionType.IsFailedNode)
export class IsFailedNodeResponse extends Message {
	public constructor(
		options: IsFailedNodeResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.result = options.result;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): IsFailedNodeResponse {
		const result = !!raw.payload[0];

		return new this({
			result,
		});
	}

	public readonly result: boolean;
}
