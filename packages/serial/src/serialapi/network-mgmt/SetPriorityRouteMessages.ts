import {
	MAX_NODES,
	MAX_REPEATERS,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
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
	type SuccessIndicator,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { type AllOrNone, Bytes, getEnumMemberName } from "@zwave-js/shared";

export type SetPriorityRouteRequestOptions =
	& {
		destinationNodeId: number;
	}
	& AllOrNone<{
		repeaters: number[];
		routeSpeed: ZWaveDataRate;
	}>;

@messageTypes(MessageType.Request, FunctionType.SetPriorityRoute)
@priority(MessagePriority.Normal)
@expectedResponse(FunctionType.SetPriorityRoute)
export class SetPriorityRouteRequest extends Message {
	public constructor(
		options: SetPriorityRouteRequestOptions & MessageBaseOptions,
	) {
		super(options);
		if (options.repeaters) {
			if (
				options.repeaters.length > MAX_REPEATERS
				|| options.repeaters.some((id) => id < 1 || id > MAX_NODES)
			) {
				throw new ZWaveError(
					`The repeaters array must contain at most ${MAX_REPEATERS} node IDs between 1 and ${MAX_NODES}`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			if (options.routeSpeed == undefined) {
				throw new ZWaveError(
					`When setting a priority route, repeaters and route speed must be set together`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.repeaters = options.repeaters;
			this.routeSpeed = options.routeSpeed;
		}

		this.destinationNodeId = options.destinationNodeId;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SetPriorityRouteRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new SetPriorityRouteRequest({});
	}

	public destinationNodeId: number;
	public repeaters: number[] | undefined;
	public routeSpeed: ZWaveDataRate | undefined;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		const nodeId = encodeNodeID(
			this.destinationNodeId,
			ctx.nodeIdType,
		);
		if (this.repeaters == undefined || this.routeSpeed == undefined) {
			// Remove the priority route
			this.payload = nodeId;
		} else {
			// Set the priority route
			this.payload = Bytes.concat([
				nodeId,
				Bytes.from([
					this.repeaters[0] ?? 0,
					this.repeaters[1] ?? 0,
					this.repeaters[2] ?? 0,
					this.repeaters[3] ?? 0,
					this.routeSpeed,
				]),
			]);
		}

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		let message: MessageRecord = {
			"node ID": this.destinationNodeId,
		};
		if (this.repeaters != undefined && this.routeSpeed != undefined) {
			message = {
				...message,
				repeaters: this.repeaters.length > 0
					? this.repeaters.join(" -> ")
					: "none",
				"route speed": getEnumMemberName(
					ZWaveDataRate,
					this.routeSpeed,
				),
			};
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

export interface SetPriorityRouteResponseOptions {
	success: boolean;
}

@messageTypes(MessageType.Response, FunctionType.SetPriorityRoute)
export class SetPriorityRouteResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: SetPriorityRouteResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SetPriorityRouteResponse {
		// Byte(s) 0/1 are the node ID - this is missing from the Host API specs
		const { /* nodeId, */ bytesRead } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
			0,
		);
		const success = raw.payload[bytesRead] !== 0;

		return new this({
			success,
		});
	}

	isOK(): boolean {
		return this.success;
	}

	public readonly success: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { success: this.success },
		};
	}
}
