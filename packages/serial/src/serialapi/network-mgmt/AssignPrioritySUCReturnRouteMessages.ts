import {
	MAX_NODES,
	MAX_REPEATERS,
	type MessageOrCCLogEntry,
	MessagePriority,
	TransmitStatus,
	ZWaveDataRate,
	ZWaveError,
	ZWaveErrorCodes,
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

@messageTypes(MessageType.Request, FunctionType.AssignPrioritySUCReturnRoute)
@priority(MessagePriority.Normal)
export class AssignPrioritySUCReturnRouteRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): AssignPrioritySUCReturnRouteRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return AssignPrioritySUCReturnRouteRequest.from(raw, ctx);
		} else {
			return AssignPrioritySUCReturnRouteRequestTransmitReport.from(
				raw,
				ctx,
			);
		}
	}
}

export interface AssignPrioritySUCReturnRouteRequestOptions {
	nodeId: number;
	repeaters: number[];
	routeSpeed: ZWaveDataRate;
}

@expectedResponse(FunctionType.AssignPrioritySUCReturnRoute)
@expectedCallback(FunctionType.AssignPrioritySUCReturnRoute)
export class AssignPrioritySUCReturnRouteRequest
	extends AssignPrioritySUCReturnRouteRequestBase
{
	public constructor(
		options:
			& AssignPrioritySUCReturnRouteRequestOptions
			& MessageBaseOptions,
	) {
		super(options);
		if (
			options.repeaters.length > MAX_REPEATERS
			|| options.repeaters.some((id) => id < 1 || id > MAX_NODES)
		) {
			throw new ZWaveError(
				`The repeaters array must contain at most ${MAX_REPEATERS} node IDs between 1 and ${MAX_NODES}`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.nodeId = options.nodeId;
		this.repeaters = options.repeaters;
		this.routeSpeed = options.routeSpeed;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): AssignPrioritySUCReturnRouteRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new AssignPrioritySUCReturnRouteRequest({});
	}

	public nodeId: number;
	public repeaters: number[];
	public routeSpeed: ZWaveDataRate;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		const nodeId = encodeNodeID(this.nodeId, ctx.nodeIdType);
		this.payload = Bytes.concat([
			nodeId,
			Bytes.from([
				this.repeaters[0] ?? 0,
				this.repeaters[1] ?? 0,
				this.repeaters[2] ?? 0,
				this.repeaters[3] ?? 0,
				this.routeSpeed,
				this.callbackId,
			]),
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"node ID": this.nodeId,
				repeaters: this.repeaters.length > 0
					? this.repeaters.join(" -> ")
					: "none",
				"route speed": getEnumMemberName(
					ZWaveDataRate,
					this.routeSpeed,
				),
				"callback id": this.callbackId ?? "(not set)",
			},
		};
	}
}

export interface AssignPrioritySUCReturnRouteResponseOptions {
	hasStarted: boolean;
}

@messageTypes(MessageType.Response, FunctionType.AssignPrioritySUCReturnRoute)
export class AssignPrioritySUCReturnRouteResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options:
			& AssignPrioritySUCReturnRouteResponseOptions
			& MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.hasStarted = options.hasStarted;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): AssignPrioritySUCReturnRouteResponse {
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

export interface AssignPrioritySUCReturnRouteRequestTransmitReportOptions {
	transmitStatus: TransmitStatus;
}

export class AssignPrioritySUCReturnRouteRequestTransmitReport
	extends AssignPrioritySUCReturnRouteRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			& AssignPrioritySUCReturnRouteRequestTransmitReportOptions
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
	): AssignPrioritySUCReturnRouteRequestTransmitReport {
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
