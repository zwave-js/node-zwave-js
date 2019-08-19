import {
	ApplicationUpdateRequestNodeInfoReceived,
	ApplicationUpdateRequestNodeInfoRequestFailed,
} from "../controller/ApplicationUpdateRequest";
import { IDriver } from "../driver/IDriver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedResponse,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	messageTypes,
	priority,
	ResponseRole,
} from "../message/Message";
import { JSONObject } from "../util/misc";
import { INodeQuery } from "./INodeQuery";

interface RequestNodeInfoRequestOptions extends MessageBaseOptions {
	nodeId: number;
}

@messageTypes(MessageType.Request, FunctionType.RequestNodeInfo)
@expectedResponse(testResponseForNodeInfoRequest)
@priority(MessagePriority.NodeQuery)
export class RequestNodeInfoRequest extends Message implements INodeQuery {
	public constructor(
		driver: IDriver,
		options: RequestNodeInfoRequestOptions,
	) {
		super(driver, options);
		this.nodeId = options.nodeId;
	}

	public nodeId: number;

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

@messageTypes(MessageType.Response, FunctionType.RequestNodeInfo)
export class RequestNodeInfoResponse extends Message {
	public constructor(
		driver: IDriver,
		options: MessageDeserializationOptions,
	) {
		super(driver, options);
		this._wasSent = this.payload[0] !== 0;
		if (!this._wasSent) this._errorCode = this.payload[0];
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

function testResponseForNodeInfoRequest(
	sent: RequestNodeInfoRequest,
	received: Message,
): ResponseRole {
	if (received instanceof RequestNodeInfoResponse) {
		return received.wasSent ? "confirmation" : "fatal_controller";
	} else if (received instanceof ApplicationUpdateRequestNodeInfoReceived) {
		// received node info for the correct node
		if (received.nodeId === sent.nodeId) return "final";
	} else if (
		received instanceof ApplicationUpdateRequestNodeInfoRequestFailed
	) {
		// requesting node info failed. We cannot check which node that belongs to
		return "fatal_node";
	}
	return "unexpected";
}
