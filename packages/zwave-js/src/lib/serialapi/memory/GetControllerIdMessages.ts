import type { MessageOrCCLogEntry } from "@zwave-js/core";
import { MessagePriority, encodeNodeID, parseNodeID } from "@zwave-js/core";
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
import { num2hex } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.GetControllerId)
@expectedResponse(FunctionType.GetControllerId)
@priority(MessagePriority.Controller)
export class GetControllerIdRequest extends Message {}

export interface GetControllerIdResponseOptions extends MessageBaseOptions {
	homeId: number;
	ownNodeId: number;
}

@messageTypes(MessageType.Response, FunctionType.GetControllerId)
export class GetControllerIdResponse extends Message {
	public constructor(
		options: MessageDeserializationOptions | GetControllerIdResponseOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			// The payload is 4 bytes home id, followed by the controller node id
			this.homeId = this.payload.readUInt32BE(0);
			const { nodeId } = parseNodeID(
				this.payload,
				options.ctx.nodeIdType,
				4,
			);
			this.ownNodeId = nodeId;
		} else {
			this.homeId = options.homeId;
			this.ownNodeId = options.ownNodeId;
		}
	}

	public homeId: number;
	public ownNodeId: number;

	public serialize(ctx: MessageEncodingContext): Buffer {
		const nodeId = encodeNodeID(this.ownNodeId, ctx.nodeIdType);
		const homeId = Buffer.allocUnsafe(4);
		homeId.writeUInt32BE(this.homeId, 0);

		this.payload = Buffer.concat([homeId, nodeId]);

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
