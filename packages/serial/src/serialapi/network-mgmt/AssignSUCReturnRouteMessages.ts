import {
	type MessageOrCCLogEntry,
	MessagePriority,
	TransmitStatus,
	encodeNodeID,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	MessageOrigin,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	type SuccessIndicator,
	expectedCallback,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes, getEnumMemberName } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.AssignSUCReturnRoute)
@priority(MessagePriority.Normal)
export class AssignSUCReturnRouteRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): AssignSUCReturnRouteRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return AssignSUCReturnRouteRequest.from(raw, ctx);
		} else {
			return AssignSUCReturnRouteRequestTransmitReport.from(raw, ctx);
		}
	}
}

export interface AssignSUCReturnRouteRequestOptions {
	nodeId: number;
	disableCallbackFunctionTypeCheck?: boolean;
}

function testAssignSUCReturnRouteCallback(
	sent: AssignSUCReturnRouteRequest,
	callback: Message,
): boolean {
	// Some controllers have a bug where they incorrectly respond with DeleteSUCReturnRoute
	if (sent.disableCallbackFunctionTypeCheck) {
		return true;
	}
	return callback.functionType === FunctionType.AssignSUCReturnRoute;
}

@expectedResponse(FunctionType.AssignSUCReturnRoute)
@expectedCallback(testAssignSUCReturnRouteCallback)
export class AssignSUCReturnRouteRequest
	extends AssignSUCReturnRouteRequestBase
{
	public constructor(
		options: AssignSUCReturnRouteRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.nodeId = options.nodeId;
		this.disableCallbackFunctionTypeCheck =
			options.disableCallbackFunctionTypeCheck;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): AssignSUCReturnRouteRequest {
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

export interface AssignSUCReturnRouteResponseOptions {
	wasExecuted: boolean;
}

@messageTypes(MessageType.Response, FunctionType.AssignSUCReturnRoute)
export class AssignSUCReturnRouteResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: AssignSUCReturnRouteResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.wasExecuted = options.wasExecuted;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): AssignSUCReturnRouteResponse {
		const wasExecuted = raw.payload[0] !== 0;

		return new this({
			wasExecuted,
		});
	}

	public isOK(): boolean {
		return this.wasExecuted;
	}

	public wasExecuted: boolean;

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

export interface AssignSUCReturnRouteRequestTransmitReportOptions {
	transmitStatus: TransmitStatus;
}

export class AssignSUCReturnRouteRequestTransmitReport
	extends AssignSUCReturnRouteRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			& AssignSUCReturnRouteRequestTransmitReportOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.callbackId = options.callbackId;
		this.transmitStatus = options.transmitStatus;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): AssignSUCReturnRouteRequestTransmitReport {
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

	public transmitStatus: TransmitStatus;

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
