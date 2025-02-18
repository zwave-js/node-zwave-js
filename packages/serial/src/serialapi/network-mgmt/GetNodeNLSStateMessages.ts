import {
	type MessageOrCCLogEntry,
	MessagePriority,
	encodeNodeID,
	parseNodeID,
} from "@zwave-js/core";
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

export interface GetNodeNLSStateRequestOptions {
	nlsNodeId: number;
}

@messageTypes(MessageType.Request, FunctionType.GetNodeNLSState)
@priority(MessagePriority.Normal)
@expectedResponse(FunctionType.GetNodeNLSState)
export class GetNodeNLSStateRequest extends Message {
	public constructor(
		options: GetNodeNLSStateRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.nlsNodeId = options.nlsNodeId;
	}

	public nlsNodeId: number;

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): GetNodeNLSStateRequest {
		const { nodeId } = parseNodeID(raw.payload, ctx.nodeIdType, 0);

		return new this({
			nlsNodeId: nodeId,
		});
	}

	public async serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = encodeNodeID(this.nlsNodeId);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"node id": this.nlsNodeId,
			},
		};
	}
}

export interface GetNodeNLSStateResponseOptions {
	enabled: boolean;
}

@messageTypes(MessageType.Response, FunctionType.GetNodeNLSState)
export class GetNodeNLSStateResponse extends Message {
	public constructor(
		options: GetNodeNLSStateResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.enabled = options.enabled;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetNodeNLSStateResponse {
		const enabled = raw.payload[0] === 1;

		return new this({
			enabled,
		});
	}

	isOK(): boolean {
		return this.enabled;
	}

	public readonly enabled: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { state: this.enabled ? "enabled" : "disabled" },
		};
	}
}
