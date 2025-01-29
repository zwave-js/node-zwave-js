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

@messageTypes(MessageType.Request, FunctionType.AssignReturnRoute)
@priority(MessagePriority.Normal)
export class AssignReturnRouteRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): AssignReturnRouteRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return AssignReturnRouteRequest.from(raw, ctx);
		} else {
			return AssignReturnRouteRequestTransmitReport.from(raw, ctx);
		}
	}
}

export interface AssignReturnRouteRequestOptions {
	nodeId: number;
	destinationNodeId: number;
}

@expectedResponse(FunctionType.AssignReturnRoute)
@expectedCallback(FunctionType.AssignReturnRoute)
export class AssignReturnRouteRequest extends AssignReturnRouteRequestBase {
	public constructor(
		options: AssignReturnRouteRequestOptions & MessageBaseOptions,
	) {
		super(options);
		if (options.nodeId === options.destinationNodeId) {
			throw new ZWaveError(
				`The source and destination node must not be identical`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.nodeId = options.nodeId;
		this.destinationNodeId = options.destinationNodeId;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): AssignReturnRouteRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new AssignReturnRouteRequest({});
	}

	public nodeId: number;
	public destinationNodeId: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		const nodeId = encodeNodeID(this.nodeId, ctx.nodeIdType);
		const destinationNodeId = encodeNodeID(
			this.destinationNodeId,
			ctx.nodeIdType,
		);

		this.payload = Bytes.concat([
			nodeId,
			destinationNodeId,
			Bytes.from([this.callbackId]),
		]);

		return super.serialize(ctx);
	}
}

export interface AssignReturnRouteResponseOptions {
	hasStarted: boolean;
}

@messageTypes(MessageType.Response, FunctionType.AssignReturnRoute)
export class AssignReturnRouteResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: AssignReturnRouteResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.hasStarted = options.hasStarted;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): AssignReturnRouteResponse {
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

export interface AssignReturnRouteRequestTransmitReportOptions {
	transmitStatus: TransmitStatus;
}

export class AssignReturnRouteRequestTransmitReport
	extends AssignReturnRouteRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			& AssignReturnRouteRequestTransmitReportOptions
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
	): AssignReturnRouteRequestTransmitReport {
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
