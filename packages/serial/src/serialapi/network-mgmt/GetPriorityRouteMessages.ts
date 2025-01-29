import {
	MAX_REPEATERS,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	RouteKind,
	ZWaveDataRate,
	ZWaveError,
	ZWaveErrorCodes,
	encodeNodeID,
	parseNodeID,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { type Bytes, getEnumMemberName } from "@zwave-js/shared";

export interface GetPriorityRouteRequestOptions {
	destinationNodeId: number;
}

@messageTypes(MessageType.Request, FunctionType.GetPriorityRoute)
@priority(MessagePriority.Normal)
@expectedResponse(FunctionType.GetPriorityRoute)
export class GetPriorityRouteRequest extends Message {
	public constructor(
		options: GetPriorityRouteRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.destinationNodeId = options.destinationNodeId;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetPriorityRouteRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new GetPriorityRouteRequest({});
	}

	public destinationNodeId: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = encodeNodeID(
			this.destinationNodeId,
			ctx.nodeIdType,
		);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"node ID": this.destinationNodeId,
			},
		};
	}
}

export interface GetPriorityRouteResponseOptions {
	destinationNodeId: number;
	routeKind: RouteKind;
	repeaters?: number[];
	routeSpeed?: ZWaveDataRate;
}

@messageTypes(MessageType.Response, FunctionType.GetPriorityRoute)
export class GetPriorityRouteResponse extends Message {
	public constructor(
		options: GetPriorityRouteResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.destinationNodeId = options.destinationNodeId;
		this.routeKind = options.routeKind;
		this.repeaters = options.repeaters;
		this.routeSpeed = options.routeSpeed;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): GetPriorityRouteResponse {
		let offset = 0;
		const { nodeId, bytesRead: nodeIdBytes } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
			offset,
		);
		offset += nodeIdBytes;
		const destinationNodeId = nodeId;
		const routeKind: RouteKind = raw.payload[offset++];
		let repeaters: number[] | undefined;
		let routeSpeed: ZWaveDataRate | undefined;
		if (routeKind) {
			repeaters = [
				...raw.payload.subarray(offset, offset + MAX_REPEATERS),
			].filter((id) => id > 0);
			routeSpeed = raw.payload[offset + MAX_REPEATERS];
		}

		return new this({
			destinationNodeId,
			routeKind,
			repeaters,
			routeSpeed,
		});
	}

	public readonly destinationNodeId: number;
	public readonly routeKind: RouteKind;
	public readonly repeaters?: number[];
	public readonly routeSpeed?: ZWaveDataRate;

	public toLogEntry(): MessageOrCCLogEntry {
		let message: MessageRecord = {
			"node ID": this.destinationNodeId,
		};
		if (this.routeKind !== RouteKind.None) {
			message = {
				...message,
				"route kind": getEnumMemberName(RouteKind, this.routeKind),
				repeaters: this.repeaters?.length
					? this.repeaters.join(" -> ")
					: "none",
				"route speed": getEnumMemberName(
					ZWaveDataRate,
					this.routeSpeed!,
				),
			};
		} else {
			message = {
				...message,
				route: "(not set)",
			};
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}
