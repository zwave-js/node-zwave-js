import { Powerlevel } from "@zwave-js/cc";
import {
	type MessageOrCCLogEntry,
	MessagePriority,
	TransmitStatus,
	encodeNodeID,
	parseNodeID,
} from "@zwave-js/core";
import type { CCEncodingContext, ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageEncodingContext,
	type MessageOptions,
	MessageType,
	type SuccessIndicator,
	expectedCallback,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.SendTestFrame)
@priority(MessagePriority.Normal)
export class SendTestFrameRequestBase extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options)
			&& (new.target as any) !== SendTestFrameTransmitReport
		) {
			return new SendTestFrameTransmitReport(host, options);
		}
		super(host, options);
	}
}

export interface SendTestFrameRequestOptions extends MessageBaseOptions {
	testNodeId: number;
	powerlevel: Powerlevel;
}

@expectedResponse(FunctionType.SendTestFrame)
@expectedCallback(FunctionType.SendTestFrame)
export class SendTestFrameRequest extends SendTestFrameRequestBase {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions | SendTestFrameRequestOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			let offset = 0;
			const { nodeId, bytesRead: nodeIdBytes } = parseNodeID(
				this.payload,
				options.ctx.nodeIdType,
				offset,
			);
			offset += nodeIdBytes;
			this.testNodeId = nodeId;

			this.powerlevel = this.payload[offset++];
			this.callbackId = this.payload[offset++];
		} else {
			this.testNodeId = options.testNodeId;
			this.powerlevel = options.powerlevel;
		}
	}

	public testNodeId: number;
	public powerlevel: Powerlevel;

	public serialize(ctx: MessageEncodingContext): Buffer {
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
				"callback id": this.callbackId,
			},
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.SendTestFrame)
export class SendTestFrameResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.wasSent = this.payload[0] !== 0;
	}

	public readonly wasSent: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "was sent": this.wasSent },
		};
	}
}

export class SendTestFrameTransmitReport extends SendTestFrameRequestBase
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);

		this.callbackId = this.payload[0];
		this.transmitStatus = this.payload[1];
	}

	public transmitStatus: TransmitStatus;

	isOK(): boolean {
		return this.transmitStatus === TransmitStatus.OK;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId,
				"transmit status": getEnumMemberName(
					TransmitStatus,
					this.transmitStatus,
				),
			},
		};
	}
}
