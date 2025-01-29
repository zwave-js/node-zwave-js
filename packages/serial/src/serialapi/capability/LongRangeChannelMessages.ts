import {
	type MessageOrCCLogEntry,
	MessagePriority,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { LongRangeChannel } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	type SuccessIndicator,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes, getEnumMemberName } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.GetLongRangeChannel)
@expectedResponse(FunctionType.GetLongRangeChannel)
@priority(MessagePriority.Controller)
export class GetLongRangeChannelRequest extends Message {}

export interface GetLongRangeChannelResponseOptions {
	channel:
		| LongRangeChannel.Unsupported
		| LongRangeChannel.A
		| LongRangeChannel.B;
	supportsAutoChannelSelection: boolean;
	autoChannelSelectionActive: boolean;
}

@messageTypes(MessageType.Response, FunctionType.GetLongRangeChannel)
@priority(MessagePriority.Controller)
export class GetLongRangeChannelResponse extends Message {
	public constructor(
		options: GetLongRangeChannelResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.channel = options.channel;
		this.supportsAutoChannelSelection =
			options.supportsAutoChannelSelection;
		this.autoChannelSelectionActive = options.autoChannelSelectionActive;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetLongRangeChannelResponse {
		const channel: GetLongRangeChannelResponseOptions["channel"] =
			raw.payload[0];
		let supportsAutoChannelSelection: boolean;
		let autoChannelSelectionActive: boolean;
		if (raw.payload.length >= 2) {
			supportsAutoChannelSelection = !!(raw.payload[1] & 0b0001_0000);
			autoChannelSelectionActive = !!(raw.payload[1] & 0b0010_0000);
		} else {
			supportsAutoChannelSelection = false;
			autoChannelSelectionActive = false;
		}

		return new this({
			channel,
			supportsAutoChannelSelection,
			autoChannelSelectionActive,
		});
	}

	public readonly channel:
		| LongRangeChannel.A
		| LongRangeChannel.B
		| LongRangeChannel.Unsupported;
	public readonly supportsAutoChannelSelection: boolean;
	public readonly autoChannelSelectionActive: boolean;
}

export interface SetLongRangeChannelRequestOptions {
	channel: LongRangeChannel;
}

@messageTypes(MessageType.Request, FunctionType.SetLongRangeChannel)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.SetLongRangeChannel)
export class SetLongRangeChannelRequest extends Message {
	public constructor(
		options: SetLongRangeChannelRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.channel = options.channel;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SetLongRangeChannelRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new SetLongRangeChannelRequest({});
	}

	public channel: LongRangeChannel;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.channel]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				channel: getEnumMemberName(LongRangeChannel, this.channel),
			},
		};
	}
}

export interface SetLongRangeChannelResponseOptions {
	success: boolean;
}

@messageTypes(MessageType.Response, FunctionType.SetLongRangeChannel)
export class SetLongRangeChannelResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: SetLongRangeChannelResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SetLongRangeChannelResponse {
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
