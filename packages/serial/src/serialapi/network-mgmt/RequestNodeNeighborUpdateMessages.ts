import type { MessageOrCCLogEntry } from "@zwave-js/core";
import { MessagePriority, encodeNodeID } from "@zwave-js/core";
import type {
	MessageEncodingContext,
	MessageParsingContext,
	MessageRaw,
	MultiStageCallback,
	SuccessIndicator,
} from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	MessageOrigin,
	MessageType,
	expectedCallback,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes, getEnumMemberName } from "@zwave-js/shared";

export enum NodeNeighborUpdateStatus {
	UpdateStarted = 0x21,
	UpdateDone = 0x22,
	UpdateFailed = 0x23,
}

@messageTypes(MessageType.Request, FunctionType.RequestNodeNeighborUpdate)
@priority(MessagePriority.Controller)
export class RequestNodeNeighborUpdateRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): RequestNodeNeighborUpdateRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return RequestNodeNeighborUpdateRequest.from(raw, ctx);
		} else {
			return RequestNodeNeighborUpdateReport.from(raw, ctx);
		}
	}
}

export interface RequestNodeNeighborUpdateRequestOptions {
	nodeId: number;
	/** This must be determined with {@link computeNeighborDiscoveryTimeout} */
	discoveryTimeout: number;
}

@expectedCallback(FunctionType.RequestNodeNeighborUpdate)
export class RequestNodeNeighborUpdateRequest
	extends RequestNodeNeighborUpdateRequestBase
{
	public constructor(
		options: RequestNodeNeighborUpdateRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.nodeId = options.nodeId;
		this.discoveryTimeout = options.discoveryTimeout;
	}

	public nodeId: number;
	public discoveryTimeout: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		const nodeId = encodeNodeID(this.nodeId, ctx.nodeIdType);
		this.payload = Bytes.concat([nodeId, Bytes.from([this.callbackId])]);
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

export interface RequestNodeNeighborUpdateReportOptions {
	updateStatus: NodeNeighborUpdateStatus;
}

export class RequestNodeNeighborUpdateReport
	extends RequestNodeNeighborUpdateRequestBase
	implements SuccessIndicator, MultiStageCallback
{
	public constructor(
		options: RequestNodeNeighborUpdateReportOptions & MessageBaseOptions,
	) {
		super(options);

		this.callbackId = options.callbackId;
		this.updateStatus = options.updateStatus;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): RequestNodeNeighborUpdateReport {
		const callbackId = raw.payload[0];
		const updateStatus: NodeNeighborUpdateStatus = raw.payload[1];

		return new this({
			callbackId,
			updateStatus,
		});
	}

	isOK(): boolean {
		return this.updateStatus !== NodeNeighborUpdateStatus.UpdateFailed;
	}

	isFinal(): boolean {
		return this.updateStatus === NodeNeighborUpdateStatus.UpdateDone;
	}

	public updateStatus: NodeNeighborUpdateStatus;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId ?? "(not set)",
				"update status": getEnumMemberName(
					NodeNeighborUpdateStatus,
					this.updateStatus,
				),
			},
		};
	}
}
