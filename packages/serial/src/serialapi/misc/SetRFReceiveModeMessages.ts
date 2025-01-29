import {
	type MessageOrCCLogEntry,
	MessagePriority,
	ZWaveError,
	ZWaveErrorCodes,
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
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared/safe";

export interface SetRFReceiveModeRequestOptions {
	/** Whether the stick should receive (true) or not (false) */
	enabled: boolean;
}

@messageTypes(MessageType.Request, FunctionType.SetRFReceiveMode)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.SetRFReceiveMode)
export class SetRFReceiveModeRequest extends Message {
	public constructor(
		options: SetRFReceiveModeRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.enabled = options.enabled;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SetRFReceiveModeRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new SetRFReceiveModeRequest({});
	}

	public enabled: boolean;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.enabled ? 0x01 : 0x00]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				enabled: this.enabled,
			},
		};
	}
}

export interface SetRFReceiveModeResponseOptions {
	success: boolean;
}

@messageTypes(MessageType.Response, FunctionType.SetRFReceiveMode)
export class SetRFReceiveModeResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: SetRFReceiveModeResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SetRFReceiveModeResponse {
		const success = raw.payload[0] !== 0;

		return new this({
			success,
		});
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
