import {
	MAX_NODES,
	MAX_REPEATERS,
	MessageOrCCLogEntry,
	MessagePriority,
	ZWaveDataRate,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	expectedResponse,
	FunctionType,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageType,
	messageTypes,
	priority,
	SuccessIndicator,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";

export interface SetPriorityRouteRequestOptions extends MessageBaseOptions {
	targetNodeId: number;
	repeaters: number[];
	routeSpeed: ZWaveDataRate;
}

@messageTypes(MessageType.Request, FunctionType.SetPriorityRoute)
@priority(MessagePriority.Normal)
@expectedResponse(FunctionType.SetPriorityRoute)
export class SetPriorityRouteRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions | SetPriorityRouteRequestOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (
				options.repeaters.length > MAX_REPEATERS ||
				options.repeaters.some((id) => id < 1 || id > MAX_NODES)
			) {
				throw new ZWaveError(
					`The repeaters array must contain at most ${MAX_REPEATERS} node IDs between 1 and ${MAX_NODES}`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			this.targetNodeId = options.targetNodeId;
			this.repeaters = options.repeaters;
			this.routeSpeed = options.routeSpeed;
		}
	}

	public targetNodeId: number;
	public repeaters: number[];
	public routeSpeed: ZWaveDataRate;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.targetNodeId,
			this.repeaters[0] ?? 0,
			this.repeaters[1] ?? 0,
			this.repeaters[2] ?? 0,
			this.repeaters[3] ?? 0,
			this.routeSpeed,
		]);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"node ID": this.targetNodeId,
				repeaters:
					this.repeaters.length > 0
						? this.repeaters.join(" -> ")
						: "none",
				"route speed": getEnumMemberName(
					ZWaveDataRate,
					this.routeSpeed,
				),
			},
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.SetPriorityRoute)
export class SetPriorityRouteResponse
	extends Message
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.success = this.payload[0] !== 0;
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
