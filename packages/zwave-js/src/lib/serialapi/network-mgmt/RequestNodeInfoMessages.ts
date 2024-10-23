import {
	type MessageOrCCLogEntry,
	MessagePriority,
	encodeNodeID,
	parseNodeID,
} from "@zwave-js/core";
import {
	FunctionType,
	type INodeQuery,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	type SuccessIndicator,
	expectedCallback,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import {
	ApplicationUpdateRequestNodeInfoReceived,
	ApplicationUpdateRequestNodeInfoRequestFailed,
} from "../application/ApplicationUpdateRequest";

export interface RequestNodeInfoResponseOptions {
	wasSent: boolean;
}

@messageTypes(MessageType.Response, FunctionType.RequestNodeInfo)
export class RequestNodeInfoResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: RequestNodeInfoResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.wasSent = options.wasSent;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): RequestNodeInfoResponse {
		const wasSent = raw.payload[0] !== 0;

		return new RequestNodeInfoResponse({
			wasSent,
		});
	}

	public wasSent: boolean;

	public isOK(): boolean {
		return this.wasSent;
	}

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = Buffer.from([this.wasSent ? 0x01 : 0]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "was sent": this.wasSent },
		};
	}
}

export interface RequestNodeInfoRequestOptions {
	nodeId: number;
}

function testCallbackForRequestNodeInfoRequest(
	sent: RequestNodeInfoRequest,
	received: Message,
) {
	return (
		(received instanceof ApplicationUpdateRequestNodeInfoReceived
			&& received.nodeId === sent.nodeId)
		|| received instanceof ApplicationUpdateRequestNodeInfoRequestFailed
	);
}

@messageTypes(MessageType.Request, FunctionType.RequestNodeInfo)
@expectedResponse(RequestNodeInfoResponse)
@expectedCallback(testCallbackForRequestNodeInfoRequest)
@priority(MessagePriority.NodeQuery)
export class RequestNodeInfoRequest extends Message implements INodeQuery {
	public constructor(
		options: RequestNodeInfoRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.nodeId = options.nodeId;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): RequestNodeInfoRequest {
		const nodeId = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
			0,
		).nodeId;

		return new RequestNodeInfoRequest({
			nodeId,
		});
	}

	public nodeId: number;

	public needsCallbackId(): boolean {
		// Not sure why it is this way, but this message contains no callback id
		return false;
	}

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = encodeNodeID(this.nodeId, ctx.nodeIdType);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "node id": this.nodeId },
		};
	}
}
