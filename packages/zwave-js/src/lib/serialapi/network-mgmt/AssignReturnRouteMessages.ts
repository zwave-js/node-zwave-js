import {
	MessageOrCCLogEntry,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { INodeQuery, SuccessIndicator } from "@zwave-js/serial";
import {
	expectedCallback,
	expectedResponse,
	FunctionType,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName, JSONObject } from "@zwave-js/shared";
import { TransmitStatus } from "../../controller/_Types";

@messageTypes(MessageType.Request, FunctionType.AssignReturnRoute)
@priority(MessagePriority.Normal)
export class AssignReturnRouteRequestBase extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== AssignReturnRouteRequestTransmitReport
		) {
			return new AssignReturnRouteRequestTransmitReport(host, options);
		}
		super(host, options);
	}
}

export interface AssignReturnRouteRequestOptions extends MessageBaseOptions {
	nodeId: number;
	destinationNodeId: number;
}

@expectedResponse(FunctionType.AssignReturnRoute)
@expectedCallback(FunctionType.AssignReturnRoute)
export class AssignReturnRouteRequest
	extends AssignReturnRouteRequestBase
	implements INodeQuery
{
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| AssignReturnRouteRequestOptions,
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
			this.nodeId = options.nodeId;
			this.destinationNodeId = options.destinationNodeId;
		}
	}

	public nodeId: number;
	public destinationNodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.nodeId,
			this.destinationNodeId,
			this.callbackId,
		]);

		return super.serialize();
	}
}

@messageTypes(MessageType.Response, FunctionType.AssignReturnRoute)
export class AssignReturnRouteResponse
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

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			hasStarted: this.hasStarted,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "has started": this.hasStarted },
		};
	}
}

export class AssignReturnRouteRequestTransmitReport
	extends AssignReturnRouteRequestBase
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);

		this.callbackId = this.payload[0];
		this._transmitStatus = this.payload[1];
	}

	public isOK(): boolean {
		return this._transmitStatus === TransmitStatus.OK;
	}

	private _transmitStatus: TransmitStatus;
	public get transmitStatus(): TransmitStatus {
		return this._transmitStatus;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			callbackId: this.callbackId,
			transmitStatus: this.transmitStatus,
		});
	}

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
