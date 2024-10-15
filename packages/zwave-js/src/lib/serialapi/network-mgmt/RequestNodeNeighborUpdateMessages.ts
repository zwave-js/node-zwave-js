import type { MessageOrCCLogEntry } from "@zwave-js/core";
import { MessagePriority, encodeNodeID } from "@zwave-js/core";
import type {
	MessageEncodingContext,
	MultiStageCallback,
	SuccessIndicator,
} from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageOptions,
	MessageType,
	expectedCallback,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";

export enum NodeNeighborUpdateStatus {
	UpdateStarted = 0x21,
	UpdateDone = 0x22,
	UpdateFailed = 0x23,
}

export interface RequestNodeNeighborUpdateRequestOptions
	extends MessageBaseOptions
{
	nodeId: number;
	/** This must be determined with {@link computeNeighborDiscoveryTimeout} */
	discoveryTimeout: number;
}

@messageTypes(MessageType.Request, FunctionType.RequestNodeNeighborUpdate)
@priority(MessagePriority.Controller)
export class RequestNodeNeighborUpdateRequestBase extends Message {
	public constructor(options: MessageOptions) {
		if (
			gotDeserializationOptions(options)
			&& (new.target as any) !== RequestNodeNeighborUpdateReport
		) {
			return new RequestNodeNeighborUpdateReport(options);
		}
		super(options);
	}
}

@expectedCallback(FunctionType.RequestNodeNeighborUpdate)
export class RequestNodeNeighborUpdateRequest
	extends RequestNodeNeighborUpdateRequestBase
{
	public constructor(
		options: RequestNodeNeighborUpdateRequestOptions,
	) {
		super(options);
		this.nodeId = options.nodeId;
		this.discoveryTimeout = options.discoveryTimeout;
	}

	public nodeId: number;
	public discoveryTimeout: number;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.assertCallbackId();
		const nodeId = encodeNodeID(this.nodeId, ctx.nodeIdType);
		this.payload = Buffer.concat([nodeId, Buffer.from([this.callbackId])]);
		return super.serialize(ctx);
	}

	public getCallbackTimeout(): number | undefined {
		return this.discoveryTimeout;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId ?? "(not set)",
			},
		};
	}
}

export class RequestNodeNeighborUpdateReport
	extends RequestNodeNeighborUpdateRequestBase
	implements SuccessIndicator, MultiStageCallback
{
	public constructor(
		options: MessageDeserializationOptions,
	) {
		super(options);

		this.callbackId = this.payload[0];
		this._updateStatus = this.payload[1];
	}

	isOK(): boolean {
		return this._updateStatus !== NodeNeighborUpdateStatus.UpdateFailed;
	}

	isFinal(): boolean {
		return this._updateStatus === NodeNeighborUpdateStatus.UpdateDone;
	}

	private _updateStatus: NodeNeighborUpdateStatus;
	public get updateStatus(): NodeNeighborUpdateStatus {
		return this._updateStatus;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId ?? "(not set)",
				"update status": getEnumMemberName(
					NodeNeighborUpdateStatus,
					this._updateStatus,
				),
			},
		};
	}
}
