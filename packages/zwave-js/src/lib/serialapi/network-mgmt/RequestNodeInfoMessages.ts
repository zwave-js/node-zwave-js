import {
	MessagePriority,
	encodeNodeID,
	parseNodeID,
	type MessageOrCCLogEntry,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	MessageType,
	expectedCallback,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
	type INodeQuery,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type SuccessIndicator,
} from "@zwave-js/serial";
import {
	ApplicationUpdateRequestNodeInfoReceived,
	ApplicationUpdateRequestNodeInfoRequestFailed,
} from "../application/ApplicationUpdateRequest";

interface RequestNodeInfoResponseOptions extends MessageBaseOptions {
	wasSent: boolean;
}

@messageTypes(MessageType.Response, FunctionType.RequestNodeInfo)
export class RequestNodeInfoResponse
	extends Message
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions | RequestNodeInfoResponseOptions,
	) {
		super(host, options);
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

	public serialize(): Buffer {
		this.payload = Buffer.from([this.wasSent ? 0x01 : 0]);
		return super.serialize();
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
		(received instanceof ApplicationUpdateRequestNodeInfoReceived &&
			received.nodeId === sent.nodeId) ||
		received instanceof ApplicationUpdateRequestNodeInfoRequestFailed
	);
}

@messageTypes(MessageType.Request, FunctionType.RequestNodeInfo)
@expectedResponse(RequestNodeInfoResponse)
@expectedCallback(testCallbackForRequestNodeInfoRequest)
@priority(MessagePriority.NodeQuery)
export class RequestNodeInfoRequest extends Message implements INodeQuery {
	public constructor(
		host: ZWaveHost,
		options: RequestNodeInfoRequestOptions | MessageDeserializationOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			this.nodeId = parseNodeID(
				this.payload,
				this.host.nodeIdType,
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

	public serialize(): Buffer {
		this.payload = encodeNodeID(this.nodeId, this.host.nodeIdType);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "node id": this.nodeId },
		};
	}
}
