import type { ZWaveHost } from "@zwave-js/host";
import type { INodeQuery, SuccessIndicator } from "@zwave-js/serial";
import {
	expectedCallback,
	expectedResponse,
	FunctionType,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import type { JSONObject } from "@zwave-js/shared";
import {
	ApplicationUpdateRequestNodeInfoReceived,
	ApplicationUpdateRequestNodeInfoRequestFailed,
} from "../application/ApplicationUpdateRequest";

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

interface RequestNodeInfoRequestOptions extends MessageBaseOptions {
	nodeId: number;
}

@messageTypes(MessageType.Response, FunctionType.RequestNodeInfo)
export class RequestNodeInfoResponse
	extends Message
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this._wasSent = this.payload[0] !== 0;
		if (!this._wasSent) this._errorCode = this.payload[0];
	}

	public isOK(): boolean {
		return this._wasSent;
	}

	private _wasSent: boolean;
	public get wasSent(): boolean {
		return this._wasSent;
	}

	private _errorCode: number | undefined;
	public get errorCode(): number | undefined {
		return this._errorCode;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			wasSent: this.wasSent,
			errorCode: this.errorCode,
		});
	}
}

@messageTypes(MessageType.Request, FunctionType.RequestNodeInfo)
@expectedResponse(RequestNodeInfoResponse)
@expectedCallback(testCallbackForRequestNodeInfoRequest)
@priority(MessagePriority.NodeQuery)
export class RequestNodeInfoRequest extends Message implements INodeQuery {
	public constructor(
		host: ZWaveHost,
		options: RequestNodeInfoRequestOptions,
	) {
		super(host, options);
		this.nodeId = options.nodeId;
	}

	public nodeId: number;

	public needsCallbackId(): boolean {
		// Not sure why it is this way, but this message contains no callback id
		return false;
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([this.nodeId]);
		return super.serialize();
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			nodeId: this.nodeId,
		});
	}
}
