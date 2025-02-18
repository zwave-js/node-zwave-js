import type { MessageOrCCLogEntry } from "@zwave-js/core";
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
import { Bytes, num2hex } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.GetControllerId)
@expectedResponse(FunctionType.GetControllerId)
@priority(MessagePriority.Controller)
export class GetControllerIdRequest extends Message {}

export interface GetControllerIdResponseOptions {
	homeId: number;
	ownNodeId: number;
}

@messageTypes(MessageType.Response, FunctionType.GetControllerId)
export class GetControllerIdResponse extends Message {
	public constructor(
		options: GetControllerIdResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.homeId = options.homeId;
		this.ownNodeId = options.ownNodeId;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): GetControllerIdResponse {
		// The payload is 4 bytes home id, followed by the controller node id
		const homeId = raw.payload.readUInt32BE(0);
		const { nodeId: ownNodeId } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
			4,
		);

		return new this({
			homeId,
			ownNodeId,
		});
	}

	public homeId: number;
	public ownNodeId: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		const nodeId = encodeNodeID(this.ownNodeId, ctx.nodeIdType);
		const homeId = new Bytes(4);
		homeId.writeUInt32BE(this.homeId, 0);

		this.payload = Bytes.concat([homeId, nodeId]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"home ID": num2hex(this.homeId),
				"own node ID": this.ownNodeId,
			},
		};
	}
}
