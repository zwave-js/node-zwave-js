import {
	type MessageOrCCLogEntry,
	MessagePriority,
	TransmitOptions,
	ZWaveError,
	ZWaveErrorCodes,
	encodeNodeID,
} from "@zwave-js/core";
import type {
	MessageEncodingContext,
	MessageParsingContext,
	MessageRaw,
	SuccessIndicator,
} from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	MessageOrigin,
	MessageType,
	expectedCallback,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared";

export enum SetSUCNodeIdStatus {
	Succeeded = 0x05,
	Failed = 0x06,
}

export interface SetSUCNodeIdRequestOptions {
	ownNodeId: number;
	sucNodeId: number;
	enableSUC: boolean;
	enableSIS: boolean;
	transmitOptions?: TransmitOptions;
}

@messageTypes(MessageType.Request, FunctionType.SetSUCNodeId)
@priority(MessagePriority.Controller)
export class SetSUCNodeIdRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SetSUCNodeIdRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return SetSUCNodeIdRequest.from(raw, ctx);
		} else {
			return SetSUCNodeIdRequestStatusReport.from(raw, ctx);
		}
	}
}

@expectedResponse(FunctionType.SetSUCNodeId)
@expectedCallback(FunctionType.SetSUCNodeId)
export class SetSUCNodeIdRequest extends SetSUCNodeIdRequestBase {
	public constructor(
		options: SetSUCNodeIdRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.sucNodeId = options.sucNodeId;
		this.enableSUC = options.enableSUC;
		this.enableSIS = options.enableSIS;
		this.transmitOptions = options.transmitOptions
			?? TransmitOptions.DEFAULT;
		this._ownNodeId = options.ownNodeId;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SetSUCNodeIdRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new SetSUCNodeIdRequest({});
	}

	public sucNodeId: number;
	public enableSUC: boolean;
	public enableSIS: boolean;
	public transmitOptions: TransmitOptions;

	private _ownNodeId: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		const nodeId = encodeNodeID(this.sucNodeId, ctx.nodeIdType);
		this.payload = Bytes.concat([
			nodeId,
			Bytes.from([
				this.enableSUC ? 0x01 : 0x00,
				this.transmitOptions,
				this.enableSIS ? 0x01 : 0x00,
				this.callbackId,
			]),
		]);

		return super.serialize(ctx);
	}

	public expectsCallback(): boolean {
		if (this.sucNodeId === this._ownNodeId) return false;
		return super.expectsCallback();
	}
}

export interface SetSUCNodeIdResponseOptions {
	wasExecuted: boolean;
}

@messageTypes(MessageType.Response, FunctionType.SetSUCNodeId)
export class SetSUCNodeIdResponse extends Message implements SuccessIndicator {
	public constructor(
		options: SetSUCNodeIdResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.wasExecuted = options.wasExecuted;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SetSUCNodeIdResponse {
		const wasExecuted = raw.payload[0] !== 0;

		return new this({
			wasExecuted,
		});
	}

	isOK(): boolean {
		return this.wasExecuted;
	}

	public wasExecuted: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "was executed": this.wasExecuted },
		};
	}
}

export interface SetSUCNodeIdRequestStatusReportOptions {
	status: SetSUCNodeIdStatus;
}

export class SetSUCNodeIdRequestStatusReport extends SetSUCNodeIdRequestBase
	implements SuccessIndicator
{
	public constructor(
		options: SetSUCNodeIdRequestStatusReportOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.callbackId = options.callbackId;
		this.status = options.status;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SetSUCNodeIdRequestStatusReport {
		const callbackId = raw.payload[0];
		const status: SetSUCNodeIdStatus = raw.payload[1];

		return new this({
			callbackId,
			status,
		});
	}

	public status: SetSUCNodeIdStatus;

	public isOK(): boolean {
		return this.status === SetSUCNodeIdStatus.Succeeded;
	}
}
