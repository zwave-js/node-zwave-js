import { IDriver } from "../driver/IDriver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedResponse,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	messageTypes,
	priority,
	ResponseRole,
} from "../message/Message";

export enum NodeNeighborUpdateStatus {
	UpdateStarted = 0x21,
	UpdateDone = 0x22,
	UpdateFailed = 0x23,
}

export interface RequestNodeNeighborUpdateRequestOptions
	extends MessageBaseOptions {
	nodeId: number;
}

// Generic handler for all potential responses to SendDataRequests
function testResponseForNodeNeighborUpdateRequest(
	sent: RequestNodeNeighborUpdateRequest,
	received: Message,
): ResponseRole {
	if (received instanceof RequestNodeNeighborUpdateReport) {
		return received.updateStatus === NodeNeighborUpdateStatus.UpdateStarted
			? "confirmation"
			: "final";
	}
	return "unexpected";
}

@messageTypes(MessageType.Request, FunctionType.RequestNodeNeighborUpdate)
@priority(MessagePriority.Controller)
export class RequestNodeNeighborUpdateRequestBase extends Message {
	public constructor(driver: IDriver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== RequestNodeNeighborUpdateReport
		) {
			return new RequestNodeNeighborUpdateReport(driver, options);
		}
		super(driver, options);
	}
}

@expectedResponse(testResponseForNodeNeighborUpdateRequest)
export class RequestNodeNeighborUpdateRequest extends RequestNodeNeighborUpdateRequestBase {
	public constructor(
		driver: IDriver,
		options: RequestNodeNeighborUpdateRequestOptions,
	) {
		super(driver, options);
		this.nodeId = options.nodeId;
	}

	public nodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.nodeId, this.callbackId]);
		return super.serialize();
	}
}

export class RequestNodeNeighborUpdateReport extends RequestNodeNeighborUpdateRequestBase {
	public constructor(
		driver: IDriver,
		options: MessageDeserializationOptions,
	) {
		super(driver, options);

		this.callbackId = this.payload[0];
		this._updateStatus = this.payload[1];
	}

	private _updateStatus: NodeNeighborUpdateStatus;
	public get updateStatus(): NodeNeighborUpdateStatus {
		return this._updateStatus;
	}
}
