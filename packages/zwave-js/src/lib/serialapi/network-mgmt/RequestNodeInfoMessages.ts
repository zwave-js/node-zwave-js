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
	type MessageDeserializationOptions,
	type MessageEncodingContext,
	MessageType,
	type SuccessIndicator,
	expectedCallback,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import {
	ApplicationUpdateRequestNodeInfoReceived,
	ApplicationUpdateRequestNodeInfoRequestFailed,
} from "../application/ApplicationUpdateRequest";

interface RequestNodeInfoResponseOptions extends MessageBaseOptions {
	wasSent: boolean;
}

@messageTypes(MessageType.Response, FunctionType.RequestNodeInfo)
export class RequestNodeInfoResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: MessageDeserializationOptions | RequestNodeInfoResponseOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.wasSent = this.payload[0] !== 0;
		} else {
			this.wasSent = options.wasSent;
		}
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

interface RequestNodeInfoRequestOptions extends MessageBaseOptions {
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
		options: RequestNodeInfoRequestOptions | MessageDeserializationOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.nodeId = parseNodeID(
				this.payload,
				options.ctx.nodeIdType,
				0,
			).nodeId;
		} else {
			this.nodeId = options.nodeId;
		}
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
