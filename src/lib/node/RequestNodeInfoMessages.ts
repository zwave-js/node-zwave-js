import {
	ApplicationUpdateRequest,
	ApplicationUpdateTypes,
} from "../controller/ApplicationUpdateRequest";
import { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedResponse,
	Message,
	messageTypes,
	priority,
	ResponseRole,
} from "../message/Message";
import { JSONObject } from "../util/misc";
import { INodeQuery } from "./INodeQuery";

@messageTypes(MessageType.Request, FunctionType.RequestNodeInfo)
@expectedResponse(testResponseForNodeInfoRequest)
@priority(MessagePriority.NodeQuery)
export class RequestNodeInfoRequest extends Message implements INodeQuery {
	public constructor(driver: Driver, nodeId?: number) {
		super(driver);
		this.nodeId = nodeId;
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
	private _wasSent: boolean;
	public get wasSent(): boolean {
		return this._wasSent;
	}

	private _errorCode: number;
	public get errorCode(): number {
		return this._errorCode;
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		this._wasSent = this.payload[0] !== 0;
		if (!this._wasSent) this._errorCode = this.payload[0];

		return ret;
	}

	public toJSON(): ReturnType<Message["toJSONInherited"]> {
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
		return received.wasSent ? "intermediate" : "fatal_controller";
	} else if (received instanceof ApplicationUpdateRequest) {
		// received node info for the correct node
		if (
			received.updateType === ApplicationUpdateTypes.NodeInfo_Received &&
			received.nodeId === sent.nodeId
		)
			return "final";
		// requesting node info failed. We cannot check which node that belongs to
		if (
			received.updateType ===
			ApplicationUpdateTypes.NodeInfo_RequestFailed
		)
			return "fatal_node";
	}
}
