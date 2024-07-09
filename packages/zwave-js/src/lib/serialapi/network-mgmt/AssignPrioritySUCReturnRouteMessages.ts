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
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageOptions,
	MessageType,
	type SuccessIndicator,
	expectedCallback,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.AssignPrioritySUCReturnRoute)
@priority(MessagePriority.Normal)
export class AssignPrioritySUCReturnRouteRequestBase extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options)
			&& (new.target as any)
				!== AssignPrioritySUCReturnRouteRequestTransmitReport
		) {
			return new AssignPrioritySUCReturnRouteRequestTransmitReport(
				host,
				options,
			);
		}
		super(host, options);
	}
}

export interface AssignPrioritySUCReturnRouteRequestOptions
	extends MessageBaseOptions
{
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
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| AssignPrioritySUCReturnRouteRequestOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
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
	}

	public nodeId: number;
	public repeaters: number[];
	public routeSpeed: ZWaveDataRate;

	public serialize(): Buffer {
		const nodeId = encodeNodeID(this.nodeId, this.host.nodeIdType);
		this.payload = Buffer.concat([
			nodeId,
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
				"node ID": this.nodeId,
				repeaters: this.repeaters.length > 0
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

@messageTypes(MessageType.Response, FunctionType.AssignPrioritySUCReturnRoute)
export class AssignPrioritySUCReturnRouteResponse extends Message
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

export class AssignPrioritySUCReturnRouteRequestTransmitReport
	extends AssignPrioritySUCReturnRouteRequestBase
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
