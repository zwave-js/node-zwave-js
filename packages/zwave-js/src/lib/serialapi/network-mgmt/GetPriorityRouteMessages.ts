import {
	MAX_REPEATERS,
	MessagePriority,
	MessageRecord,
	RouteKind,
	ZWaveDataRate,
	ZWaveError,
	ZWaveErrorCodes,
	type MessageOrCCLogEntry,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	MessageType,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";

export interface GetPriorityRouteRequestOptions extends MessageBaseOptions {
	destinationNodeId: number;
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
			this.destinationNodeId = options.destinationNodeId;
		}
	}

	public destinationNodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.destinationNodeId]);

		return super.serialize();
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

@messageTypes(MessageType.Response, FunctionType.GetPriorityRoute)
export class GetPriorityRouteResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.destinationNodeId = this.payload[0];
		this.routeKind = this.payload[1];
		if (this.routeKind) {
			this.repeaters = [
				...this.payload.slice(2, 2 + MAX_REPEATERS),
			].filter((id) => id > 0);
			this.routeSpeed = this.payload[2 + MAX_REPEATERS];
		}
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
