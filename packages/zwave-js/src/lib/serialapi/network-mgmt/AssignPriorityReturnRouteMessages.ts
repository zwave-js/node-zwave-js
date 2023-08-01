import {
	MAX_NODES,
	MAX_REPEATERS,
	MessagePriority,
	TransmitStatus,
	ZWaveDataRate,
	ZWaveError,
	ZWaveErrorCodes,
	encodeNodeID,
	type MessageOrCCLogEntry,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	MessageType,
	expectedCallback,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageOptions,
	type SuccessIndicator,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.AssignPriorityReturnRoute)
@priority(MessagePriority.Normal)
export class AssignPriorityReturnRouteRequestBase extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !==
				AssignPriorityReturnRouteRequestTransmitReport
		) {
			return new AssignPriorityReturnRouteRequestTransmitReport(
				host,
				options,
			);
		}
		super(host, options);
	}
}

export interface AssignPriorityReturnRouteRequestOptions
	extends MessageBaseOptions {
	nodeId: number;
	destinationNodeId: number;
	repeaters: number[];
	routeSpeed: ZWaveDataRate;
}

@expectedResponse(FunctionType.AssignPriorityReturnRoute)
@expectedCallback(FunctionType.AssignPriorityReturnRoute)
export class AssignPriorityReturnRouteRequest extends AssignPriorityReturnRouteRequestBase {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| AssignPriorityReturnRouteRequestOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (options.nodeId === options.destinationNodeId) {
				throw new ZWaveError(
					`The source and destination node must not be identical`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			if (
				options.repeaters.length > MAX_REPEATERS ||
				options.repeaters.some((id) => id < 1 || id > MAX_NODES)
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
	}

	public nodeId: number;
	public destinationNodeId: number;
	public repeaters: number[];
	public routeSpeed: ZWaveDataRate;

	public serialize(): Buffer {
		const nodeId = encodeNodeID(this.nodeId, this.host.nodeIdType);
		const destinationNodeId = encodeNodeID(
			this.destinationNodeId,
			this.host.nodeIdType,
		);
		this.payload = Buffer.concat([
			nodeId,
			destinationNodeId,
			Buffer.from([
				this.repeaters[0] ?? 0,
				this.repeaters[1] ?? 0,
				this.repeaters[2] ?? 0,
				this.repeaters[3] ?? 0,
				this.routeSpeed,
				this.callbackId,
			]),
		]);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"source node ID": this.nodeId,
				"destination node ID": this.destinationNodeId,
				repeaters:
					this.repeaters.length > 0
						? this.repeaters.join(" -> ")
						: "none",
				"route speed": getEnumMemberName(
					ZWaveDataRate,
					this.routeSpeed,
				),
				"callback id": this.callbackId,
			},
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.AssignPriorityReturnRoute)
export class AssignPriorityReturnRouteResponse
	extends Message
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.hasStarted = this.payload[0] !== 0;
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

export class AssignPriorityReturnRouteRequestTransmitReport
	extends AssignPriorityReturnRouteRequestBase
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);

		this.callbackId = this.payload[0];
		this.transmitStatus = this.payload[1];
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
				"callback id": this.callbackId,
				"transmit status": getEnumMemberName(
					TransmitStatus,
					this.transmitStatus,
				),
			},
		};
	}
}
