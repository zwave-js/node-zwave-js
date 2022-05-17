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

@messageTypes(MessageType.Request, FunctionType.DeleteReturnRoute)
@priority(MessagePriority.Normal)
export class DeleteReturnRouteRequestBase extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== DeleteReturnRouteRequestTransmitReport
		) {
			return new DeleteReturnRouteRequestTransmitReport(host, options);
		}
		super(host, options);
	}
}

export interface DeleteReturnRouteRequestOptions extends MessageBaseOptions {
	nodeId: number;
}

@expectedResponse(FunctionType.DeleteReturnRoute)
@expectedCallback(FunctionType.DeleteReturnRoute)
export class DeleteReturnRouteRequest
	extends DeleteReturnRouteRequestBase
	implements INodeQuery
{
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| DeleteReturnRouteRequestOptions,
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

@messageTypes(MessageType.Response, FunctionType.DeleteReturnRoute)
export class DeleteReturnRouteResponse
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

export class DeleteReturnRouteRequestTransmitReport
	extends DeleteReturnRouteRequestBase
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

	private _transmitStatus: TransmitStatus;
	public get transmitStatus(): TransmitStatus {
		return this._transmitStatus;
	}

	public isOK(): boolean {
		return this._transmitStatus === TransmitStatus.OK;
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
