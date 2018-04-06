import { ApplicationUpdateRequest, ApplicationUpdateTypes } from "../controller/ApplicationUpdateRequest";
import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { expectedResponse, Message, messageTypes, priority} from "../message/Message";
import { log } from "../util/logger";

function isExpectedResponseToRequestNodeInfoRequest(sent: RequestNodeInfoRequest, received: Message): boolean {
	// A failure to send is an expected response
	if (received instanceof RequestNodeInfoResponse && !received.wasSent) return true;
	// Otherwise find the correct ApplicationUpdateRequest
	if (received instanceof ApplicationUpdateRequest) {
		// received node info for the correct node
		if (
			received.updateType === ApplicationUpdateTypes.NodeInfo_Received
			&& received.nodeId === sent.nodeId
		) return true;
		// requesting node info failed. We cannot check which node that belongs to
		if (received.updateType === ApplicationUpdateTypes.NodeInfo_RequestFailed) return true;
	}
}

@messageTypes(MessageType.Request, FunctionType.RequestNodeInfo)
@expectedResponse(isExpectedResponseToRequestNodeInfoRequest)
@priority(MessagePriority.NodeQuery)
export class RequestNodeInfoRequest extends Message {

	constructor(
		public nodeId?: number,
	) {
		super();
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([this.nodeId]);
		return super.serialize();
	}

	public toJSON() {
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

	public toJSON() {
		return super.toJSONInherited({
			wasSent: this.wasSent,
			errorCode: this.errorCode,
		});
	}

}
