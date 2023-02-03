import {
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
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";

export interface GetPriorityRouteRequestOptions extends MessageBaseOptions {
	targetNodeId: number;
}

@messageTypes(MessageType.Request, FunctionType.GetPriorityRoute)
@priority(MessagePriority.Normal)
@expectedResponse(FunctionType.GetPriorityRoute)
export class GetPriorityRouteRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions | GetPriorityRouteRequestOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.targetNodeId = options.targetNodeId;
		}
	}

	public targetNodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.targetNodeId]);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"node ID": this.targetNodeId,
			},
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.GetPriorityRoute)
export class GetPriorityRouteResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.targetNodeId = this.payload[0];
		this.repeaters = [...this.payload.slice(1, 1 + MAX_REPEATERS)].filter(
			(id) => id > 0,
		);
		this.routeSpeed = this.payload[1 + MAX_REPEATERS];
	}

	public readonly targetNodeId: number;
	public readonly repeaters: readonly number[];
	public readonly routeSpeed: ZWaveDataRate;

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
