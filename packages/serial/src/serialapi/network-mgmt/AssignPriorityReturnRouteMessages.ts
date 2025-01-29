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

@messageTypes(MessageType.Request, FunctionType.AssignPriorityReturnRoute)
@priority(MessagePriority.Normal)
export class AssignPriorityReturnRouteRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): AssignPriorityReturnRouteRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return AssignPriorityReturnRouteRequest.from(raw, ctx);
		} else {
			return AssignPriorityReturnRouteRequestTransmitReport.from(
				raw,
				ctx,
			);
		}
	}
}

export interface AssignPriorityReturnRouteRequestOptions {
	nodeId: number;
	destinationNodeId: number;
	repeaters: number[];
	routeSpeed: ZWaveDataRate;
}

@expectedResponse(FunctionType.AssignPriorityReturnRoute)
@expectedCallback(FunctionType.AssignPriorityReturnRoute)
export class AssignPriorityReturnRouteRequest
	extends AssignPriorityReturnRouteRequestBase
{
	public constructor(
		options: AssignPriorityReturnRouteRequestOptions & MessageBaseOptions,
	) {
		super(options);
		if (options.nodeId === options.destinationNodeId) {
			throw new ZWaveError(
				`The source and destination node must not be identical`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
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
		this.destinationNodeId = options.destinationNodeId;
		this.repeaters = options.repeaters;
		this.routeSpeed = options.routeSpeed;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): AssignPriorityReturnRouteRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new AssignPriorityReturnRouteRequest({});
	}

	public nodeId: number;
	public destinationNodeId: number;
	public repeaters: number[];
	public routeSpeed: ZWaveDataRate;

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
				"source node ID": this.nodeId,
				"destination node ID": this.destinationNodeId,
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

export interface AssignPriorityReturnRouteResponseOptions {
	hasStarted: boolean;
}

@messageTypes(MessageType.Response, FunctionType.AssignPriorityReturnRoute)
export class AssignPriorityReturnRouteResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: AssignPriorityReturnRouteResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.hasStarted = options.hasStarted;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): AssignPriorityReturnRouteResponse {
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

export interface AssignPriorityReturnRouteRequestTransmitReportOptions {
	transmitStatus: TransmitStatus;
}

export class AssignPriorityReturnRouteRequestTransmitReport
	extends AssignPriorityReturnRouteRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			& AssignPriorityReturnRouteRequestTransmitReportOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.callbackId = this.payload[0];
		this.transmitStatus = this.payload[1];
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): AssignPriorityReturnRouteRequestTransmitReport {
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
