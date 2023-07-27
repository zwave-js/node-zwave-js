import type { MessageOrCCLogEntry } from "@zwave-js/core";
import { MessagePriority, encodeNodeID, parseNodeID } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	MessageType,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
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
		host: ZWaveHost,
		options: MessageDeserializationOptions | GetControllerIdResponseOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// The payload is 4 bytes home id, followed by the controller node id
			this.homeId = this.payload.readUInt32BE(0);
			const { nodeId } = parseNodeID(this.payload, host.nodeIdType, 4);
			this.ownNodeId = nodeId;
		} else {
			this.homeId = options.homeId;
			this.ownNodeId = options.ownNodeId;
		}
	}

	public homeId: number;
	public ownNodeId: number;

	public serialize(): Buffer {
		const nodeId = encodeNodeID(this.ownNodeId, this.host.nodeIdType);
		const homeId = Buffer.allocUnsafe(4);
		homeId.writeUInt32BE(this.homeId, 0);

		this.payload = Buffer.concat([homeId, nodeId]);

		return super.serialize();
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
