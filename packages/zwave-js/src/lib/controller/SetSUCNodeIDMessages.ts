import {
	MessageOrCCLogEntry,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
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
import { TransmitOptions, TransmitStatus } from "./SendDataShared";

export interface SetSUCNodeIdRequestOptions extends MessageBaseOptions {
	sucNodeId?: number;
	enableSUC: boolean;
	enableSIS: boolean;
	transmitOptions?: TransmitOptions;
}

@messageTypes(MessageType.Request, FunctionType.SetSUCNodeId)
@priority(MessagePriority.Controller)
export class SetSUCNodeIdRequestBase extends Message {
	public constructor(driver: Driver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== SetSUCNodeIdRequestStatusReport
		) {
			return new SetSUCNodeIdRequestStatusReport(driver, options);
		}
		super(driver, options);
	}
}

@expectedResponse(FunctionType.SetSUCNodeId)
@expectedCallback(FunctionType.SetSUCNodeId)
export class SetSUCNodeIdRequest extends SetSUCNodeIdRequestBase {
	public constructor(
		driver: Driver,
		options: MessageDeserializationOptions | SetSUCNodeIdRequestOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.sucNodeId = options.sucNodeId ?? driver.controller.ownNodeId!;
			this.enableSUC = options.enableSUC;
			this.enableSIS = options.enableSIS;
			this.transmitOptions =
				options.transmitOptions ?? TransmitOptions.DEFAULT;
		}
	}

	public sucNodeId: number;
	public enableSUC: boolean;
	public enableSIS: boolean;
	public transmitOptions: TransmitOptions;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.sucNodeId,
			this.enableSUC ? 0x01 : 0x00,
			this.transmitOptions,
			this.enableSIS ? 0x01 : 0x00,
			this.callbackId,
		]);

		return super.serialize();
	}

	public expectsCallback(): boolean {
		if (this.sucNodeId === this.driver.controller.ownNodeId) return false;
		return super.expectsCallback();
	}
}

@messageTypes(MessageType.Response, FunctionType.SetSUCNodeId)
export class SetSUCNodeIdResponse extends Message implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this._wasExecuted = this.payload[0] !== 0;
	}

	isOK(): boolean {
		return this._wasExecuted;
	}

	private _wasExecuted: boolean;
	public get wasExecuted(): boolean {
		return this._wasExecuted;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "was executed": this.wasExecuted },
		};
	}
}

export class SetSUCNodeIdRequestStatusReport
	extends SetSUCNodeIdRequestBase
	implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);

		this.callbackId = this.payload[0];
		this._status = this.payload[1];
	}

	private _status: TransmitStatus;
	public get status(): TransmitStatus {
		return this._status;
	}

	public isOK(): boolean {
		return this._status === TransmitStatus.OK;
	}
}
