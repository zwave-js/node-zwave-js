import {
	MessagePriority,
	TransmitOptions,
	ZWaveError,
	ZWaveErrorCodes,
	encodeNodeID,
	type MessageOrCCLogEntry,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
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
} from "@zwave-js/serial";

export enum SetSUCNodeIdStatus {
	Succeeded = 0x05,
	Failed = 0x06,
}

export interface SetSUCNodeIdRequestOptions extends MessageBaseOptions {
	sucNodeId?: number;
	enableSUC: boolean;
	enableSIS: boolean;
	transmitOptions?: TransmitOptions;
}

@messageTypes(MessageType.Request, FunctionType.SetSUCNodeId)
@priority(MessagePriority.Controller)
export class SetSUCNodeIdRequestBase extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== SetSUCNodeIdRequestStatusReport
		) {
			return new SetSUCNodeIdRequestStatusReport(host, options);
		}
		super(host, options);
	}
}

@expectedResponse(FunctionType.SetSUCNodeId)
@expectedCallback(FunctionType.SetSUCNodeId)
export class SetSUCNodeIdRequest extends SetSUCNodeIdRequestBase {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions | SetSUCNodeIdRequestOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.sucNodeId = options.sucNodeId ?? host.ownNodeId;
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
		const nodeId = encodeNodeID(this.sucNodeId, this.host.nodeIdType);
		this.payload = Buffer.concat([
			nodeId,
			Buffer.from([
				this.enableSUC ? 0x01 : 0x00,
				this.transmitOptions,
				this.enableSIS ? 0x01 : 0x00,
				this.callbackId,
			]),
		]);

		return super.serialize();
	}

	public expectsCallback(): boolean {
		if (this.sucNodeId === this.host.ownNodeId) return false;
		return super.expectsCallback();
	}
}

@messageTypes(MessageType.Response, FunctionType.SetSUCNodeId)
export class SetSUCNodeIdResponse extends Message implements SuccessIndicator {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
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
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);

		this.callbackId = this.payload[0];
		this._status = this.payload[1];
	}

	private _status: SetSUCNodeIdStatus;
	public get status(): SetSUCNodeIdStatus {
		return this._status;
	}

	public isOK(): boolean {
		return this._status === SetSUCNodeIdStatus.Succeeded;
	}
}
