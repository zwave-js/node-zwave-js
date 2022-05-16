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

@messageTypes(MessageType.Request, FunctionType.AssignSUCReturnRoute)
@priority(MessagePriority.Normal)
export class AssignSUCReturnRouteRequestBase extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== AssignSUCReturnRouteRequestTransmitReport
		) {
			return new AssignSUCReturnRouteRequestTransmitReport(host, options);
		}
		super(host, options);
	}
}

export interface AssignSUCReturnRouteRequestOptions extends MessageBaseOptions {
	nodeId: number;
}

@expectedResponse(FunctionType.AssignSUCReturnRoute)
@expectedCallback(FunctionType.AssignSUCReturnRoute)
export class AssignSUCReturnRouteRequest
	extends AssignSUCReturnRouteRequestBase
	implements INodeQuery
{
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| AssignSUCReturnRouteRequestOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.nodeId = options.nodeId;
		}
	}

	public nodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.nodeId, this.callbackId]);

		return super.serialize();
	}
}

@messageTypes(MessageType.Response, FunctionType.AssignSUCReturnRoute)
export class AssignSUCReturnRouteResponse
	extends Message
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.wasExecuted = this.payload[0] !== 0;
	}

	public isOK(): boolean {
		return this.wasExecuted;
	}

	public readonly wasExecuted: boolean;

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			wasExecuted: this.wasExecuted,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "was executed": this.wasExecuted },
		};
	}
}

export class AssignSUCReturnRouteRequestTransmitReport
	extends AssignSUCReturnRouteRequestBase
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
