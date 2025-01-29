import {
	type MessageOrCCLogEntry,
	MessagePriority,
	TransmitStatus,
	ZWaveError,
	ZWaveErrorCodes,
	encodeNodeID,
} from "@zwave-js/core";
import type {
	MessageEncodingContext,
	MessageParsingContext,
	MessageRaw,
	SuccessIndicator,
} from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	MessageOrigin,
	MessageType,
	expectedCallback,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes, getEnumMemberName } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.DeleteReturnRoute)
@priority(MessagePriority.Normal)
export class DeleteReturnRouteRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): DeleteReturnRouteRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return DeleteReturnRouteRequest.from(raw, ctx);
		} else {
			return DeleteReturnRouteRequestTransmitReport.from(raw, ctx);
		}
	}
}

export interface DeleteReturnRouteRequestOptions {
	nodeId: number;
}

@expectedResponse(FunctionType.DeleteReturnRoute)
@expectedCallback(FunctionType.DeleteReturnRoute)
export class DeleteReturnRouteRequest extends DeleteReturnRouteRequestBase {
	public constructor(
		options: DeleteReturnRouteRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.nodeId = options.nodeId;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): DeleteReturnRouteRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new DeleteReturnRouteRequest({});
	}

	public nodeId: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		const nodeId = encodeNodeID(this.nodeId, ctx.nodeIdType);
		this.payload = Bytes.concat([nodeId, Bytes.from([this.callbackId])]);

		return super.serialize(ctx);
	}
}

export interface DeleteReturnRouteResponseOptions {
	hasStarted: boolean;
}

@messageTypes(MessageType.Response, FunctionType.DeleteReturnRoute)
export class DeleteReturnRouteResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: DeleteReturnRouteResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.hasStarted = options.hasStarted;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): DeleteReturnRouteResponse {
		const hasStarted = raw.payload[0] !== 0;

		return new this({
			hasStarted,
		});
	}

	public isOK(): boolean {
		return this.hasStarted;
	}

	public readonly hasStarted: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "has started": this.hasStarted },
		};
	}
}

export interface DeleteReturnRouteRequestTransmitReportOptions {
	transmitStatus: TransmitStatus;
}

export class DeleteReturnRouteRequestTransmitReport
	extends DeleteReturnRouteRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			& DeleteReturnRouteRequestTransmitReportOptions
			& MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.callbackId = options.callbackId;
		this.transmitStatus = options.transmitStatus;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): DeleteReturnRouteRequestTransmitReport {
		const callbackId = raw.payload[0];
		const transmitStatus: TransmitStatus = raw.payload[1];

		return new this({
			callbackId,
			transmitStatus,
		});
	}

	public isOK(): boolean {
		// The other statuses are technically "not OK", but they are caused by
		// not being able to contact the node. We don't want the node to be marked
		// as dead because of that
		return this.transmitStatus !== TransmitStatus.NoAck;
	}

	public readonly transmitStatus: TransmitStatus;

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
