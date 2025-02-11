import {
	type MessageOrCCLogEntry,
	MessagePriority,
	TransmitStatus,
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

@messageTypes(MessageType.Request, FunctionType.DeleteSUCReturnRoute)
@priority(MessagePriority.Normal)
export class DeleteSUCReturnRouteRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): DeleteSUCReturnRouteRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return DeleteSUCReturnRouteRequest.from(raw, ctx);
		} else {
			return DeleteSUCReturnRouteRequestTransmitReport.from(raw, ctx);
		}
	}
}

export interface DeleteSUCReturnRouteRequestOptions {
	nodeId: number;
	disableCallbackFunctionTypeCheck?: boolean;
}

function testDeleteSUCReturnRouteCallback(
	sent: DeleteSUCReturnRouteRequest,
	callback: Message,
): boolean {
	// Some controllers have a bug where they incorrectly respond with DeleteSUCReturnRoute
	if (sent.disableCallbackFunctionTypeCheck) {
		return true;
	}
	return callback.functionType === FunctionType.DeleteSUCReturnRoute;
}

@expectedResponse(FunctionType.DeleteSUCReturnRoute)
@expectedCallback(testDeleteSUCReturnRouteCallback)
export class DeleteSUCReturnRouteRequest
	extends DeleteSUCReturnRouteRequestBase
{
	public constructor(
		options: DeleteSUCReturnRouteRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.nodeId = options.nodeId;
		this.disableCallbackFunctionTypeCheck =
			options.disableCallbackFunctionTypeCheck;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): DeleteSUCReturnRouteRequest {
		const nodeId = raw.payload[0];
		const callbackId = raw.payload[1];

		return new this({
			nodeId,
			callbackId,
		});
	}

	public nodeId: number;
	public readonly disableCallbackFunctionTypeCheck?: boolean;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		const nodeId = encodeNodeID(this.nodeId, ctx.nodeIdType);
		this.payload = Bytes.concat([nodeId, Bytes.from([this.callbackId])]);

		return super.serialize(ctx);
	}
}

export interface DeleteSUCReturnRouteResponseOptions {
	wasExecuted: boolean;
}

@messageTypes(MessageType.Response, FunctionType.DeleteSUCReturnRoute)
export class DeleteSUCReturnRouteResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: DeleteSUCReturnRouteResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.wasExecuted = options.wasExecuted;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): DeleteSUCReturnRouteResponse {
		const wasExecuted = raw.payload[0] !== 0;

		return new this({
			wasExecuted,
		});
	}

	public isOK(): boolean {
		return this.wasExecuted;
	}

	public readonly wasExecuted: boolean;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.wasExecuted ? 0x01 : 0]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "was executed": this.wasExecuted },
		};
	}
}

export interface DeleteSUCReturnRouteRequestTransmitReportOptions {
	transmitStatus: TransmitStatus;
}

export class DeleteSUCReturnRouteRequestTransmitReport
	extends DeleteSUCReturnRouteRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			& DeleteSUCReturnRouteRequestTransmitReportOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.callbackId = options.callbackId;
		this.transmitStatus = options.transmitStatus;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): DeleteSUCReturnRouteRequestTransmitReport {
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

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		this.payload = Bytes.from([this.callbackId, this.transmitStatus]);
		return super.serialize(ctx);
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
