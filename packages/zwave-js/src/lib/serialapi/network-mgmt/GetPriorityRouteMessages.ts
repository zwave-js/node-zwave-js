import {
	MAX_REPEATERS,
	MessagePriority,
	RouteKind,
	ZWaveDataRate,
	ZWaveError,
	ZWaveErrorCodes,
	encodeNodeID,
	parseNodeID,
	type MessageOrCCLogEntry,
	type MessageRecord,
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
		this.payload = encodeNodeID(
			this.destinationNodeId,
			this.host.nodeIdType,
		);

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
		let offset = 0;
		const { nodeId, bytesRead: nodeIdBytes } = parseNodeID(
			this.payload,
			host.nodeIdType,
			offset,
		);
		offset += nodeIdBytes;
		this.destinationNodeId = nodeId;
		this.routeKind = this.payload[offset++];
		if (this.routeKind) {
			this.repeaters = [
				...this.payload.slice(offset, offset + MAX_REPEATERS),
			].filter((id) => id > 0);
			this.routeSpeed = this.payload[offset + MAX_REPEATERS];
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
