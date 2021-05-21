import {
	MessageOrCCLogEntry,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName, JSONObject } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedCallback,
	expectedResponse,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	messageTypes,
	priority,
} from "../message/Message";
import type { SuccessIndicator } from "../message/SuccessIndicator";
import type { INodeQuery } from "../node/INodeQuery";
import { TransmitStatus } from "./SendDataShared";

@messageTypes(MessageType.Request, FunctionType.DeleteSUCReturnRoute)
@priority(MessagePriority.Normal)
export class DeleteSUCReturnRouteRequestBase extends Message {
	public constructor(driver: Driver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== DeleteSUCReturnRouteRequestTransmitReport
		) {
			return new DeleteSUCReturnRouteRequestTransmitReport(
				driver,
				options,
			);
		}
		super(driver, options);
	}
}

export interface DeleteSUCReturnRouteRequestOptions extends MessageBaseOptions {
	nodeId: number;
}

@expectedResponse(FunctionType.DeleteSUCReturnRoute)
@expectedCallback(FunctionType.DeleteSUCReturnRoute)
export class DeleteSUCReturnRouteRequest
	extends DeleteSUCReturnRouteRequestBase
	implements INodeQuery {
	public constructor(
		driver: Driver,
		options:
			| MessageDeserializationOptions
			| DeleteSUCReturnRouteRequestOptions,
	) {
		super(driver, options);
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

@messageTypes(MessageType.Response, FunctionType.DeleteSUCReturnRoute)
export class DeleteSUCReturnRouteResponse
	extends Message
	implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
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

export class DeleteSUCReturnRouteRequestTransmitReport
	extends DeleteSUCReturnRouteRequestBase
	implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);

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
