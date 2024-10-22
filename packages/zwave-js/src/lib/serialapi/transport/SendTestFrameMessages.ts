import { Powerlevel } from "@zwave-js/cc";
import {
	type MessageOrCCLogEntry,
	MessagePriority,
	TransmitStatus,
	encodeNodeID,
	parseNodeID,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageOptions,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	type SuccessIndicator,
	expectedCallback,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.SendTestFrame)
@priority(MessagePriority.Normal)
export class SendTestFrameRequestBase extends Message {
	public constructor(options: MessageOptions) {
		if (
			gotDeserializationOptions(options)
			&& (new.target as any) !== SendTestFrameTransmitReport
		) {
			return new SendTestFrameTransmitReport(options);
		}
		super(options);
	}
}

export interface SendTestFrameRequestOptions {
	testNodeId: number;
	powerlevel: Powerlevel;
}

@expectedResponse(FunctionType.SendTestFrame)
@expectedCallback(FunctionType.SendTestFrame)
export class SendTestFrameRequest extends SendTestFrameRequestBase {
	public constructor(
		options: SendTestFrameRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.testNodeId = options.testNodeId;
		this.powerlevel = options.powerlevel;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SendTestFrameRequest {
		let offset = 0;
		const { nodeId: testNodeId, bytesRead: nodeIdBytes } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
			offset,
		);
		offset += nodeIdBytes;
		const powerlevel: Powerlevel = raw.payload[offset++];
		const callbackId = raw.payload[offset++];

		return new SendTestFrameRequest({
			testNodeId,
			powerlevel,
			callbackId,
		});
	}

	public testNodeId: number;
	public powerlevel: Powerlevel;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.assertCallbackId();
		const nodeId = encodeNodeID(this.testNodeId, ctx.nodeIdType);
		this.payload = Buffer.concat([
			nodeId,
			Buffer.from([
				this.powerlevel,
				this.callbackId,
			]),
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"test node id": this.testNodeId,
				powerlevel: getEnumMemberName(Powerlevel, this.powerlevel),
				"callback id": this.callbackId ?? "(not set)",
			},
		};
	}
}

export interface SendTestFrameResponseOptions {
	wasSent: boolean;
}

@messageTypes(MessageType.Response, FunctionType.SendTestFrame)
export class SendTestFrameResponse extends Message {
	public constructor(
		options: SendTestFrameResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.wasSent = options.wasSent;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SendTestFrameResponse {
		const wasSent = raw.payload[0] !== 0;

		return new SendTestFrameResponse({
			wasSent,
		});
	}

	public readonly wasSent: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "was sent": this.wasSent },
		};
	}
}

export interface SendTestFrameTransmitReportOptions {
	transmitStatus: TransmitStatus;
}

export class SendTestFrameTransmitReport extends SendTestFrameRequestBase
	implements SuccessIndicator
{
	public constructor(
		options: SendTestFrameTransmitReportOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.callbackId = options.callbackId;
		this.transmitStatus = options.transmitStatus;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SendTestFrameTransmitReport {
		const callbackId = raw.payload[0];
		const transmitStatus: TransmitStatus = raw.payload[1];

		return new SendTestFrameTransmitReport({
			callbackId,
			transmitStatus,
		});
	}

	public transmitStatus: TransmitStatus;

	isOK(): boolean {
		return this.transmitStatus === TransmitStatus.OK;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId ?? "(not set)",
				"transmit status": getEnumMemberName(
					TransmitStatus,
					this.transmitStatus,
				),
			},
		};
	}
}
