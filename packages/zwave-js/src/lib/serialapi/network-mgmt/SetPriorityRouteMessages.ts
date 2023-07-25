import {
	MAX_NODES,
	MAX_REPEATERS,
	MessagePriority,
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
	type SuccessIndicator,
} from "@zwave-js/serial";
import { getEnumMemberName, type AllOrNone } from "@zwave-js/shared";

export type SetPriorityRouteRequestOptions = {
	destinationNodeId: number;
} & AllOrNone<{
	repeaters: number[];
	routeSpeed: ZWaveDataRate;
}>;

@messageTypes(MessageType.Request, FunctionType.SetPriorityRoute)
@priority(MessagePriority.Normal)
@expectedResponse(FunctionType.SetPriorityRoute)
export class SetPriorityRouteRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| (MessageBaseOptions & SetPriorityRouteRequestOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (options.repeaters) {
				if (
					options.repeaters.length > MAX_REPEATERS ||
					options.repeaters.some((id) => id < 1 || id > MAX_NODES)
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
	}

	public destinationNodeId: number;
	public repeaters: number[] | undefined;
	public routeSpeed: ZWaveDataRate | undefined;

	public serialize(): Buffer {
		const nodeId = encodeNodeID(
			this.destinationNodeId,
			this.host.nodeIdType,
		);
		if (this.repeaters == undefined || this.routeSpeed == undefined) {
			// Remove the priority route
			this.payload = nodeId;
		} else {
			// Set the priority route
			this.payload = Buffer.concat([
				nodeId,
				Buffer.from([
					this.repeaters[0] ?? 0,
					this.repeaters[1] ?? 0,
					this.repeaters[2] ?? 0,
					this.repeaters[3] ?? 0,
					this.routeSpeed,
				]),
			]);
		}

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		let message: MessageRecord = {
			"node ID": this.destinationNodeId,
		};
		if (this.repeaters != undefined && this.routeSpeed != undefined) {
			message = {
				...message,
				repeaters:
					this.repeaters.length > 0
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
		// Byte(s) 0/1 are the node ID - this is missing from the Host API specs
		const { /* nodeId, */ bytesRead } = parseNodeID(
			this.payload,
			this.host.nodeIdType,
			0,
		);

		this.success = this.payload[bytesRead] !== 0;
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
