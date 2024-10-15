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
	type MessageDeserializationOptions,
	type MessageEncodingContext,
	MessageType,
	type SuccessIndicator,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.GetLongRangeChannel)
@expectedResponse(FunctionType.GetLongRangeChannel)
@priority(MessagePriority.Controller)
export class GetLongRangeChannelRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetLongRangeChannel)
@priority(MessagePriority.Controller)
export class GetLongRangeChannelResponse extends Message {
	public constructor(
		options: MessageDeserializationOptions,
	) {
		super(options);
		this.channel = this.payload[0];

		if (this.payload.length >= 2) {
			this.supportsAutoChannelSelection =
				!!(this.payload[1] & 0b0001_0000);
			this.autoChannelSelectionActive = !!(this.payload[1] & 0b0010_0000);
		} else {
			this.supportsAutoChannelSelection = false;
			this.autoChannelSelectionActive = false;
		}
	}

	public readonly channel:
		| LongRangeChannel.A
		| LongRangeChannel.B
		| LongRangeChannel.Unsupported;
	public readonly supportsAutoChannelSelection: boolean;
	public readonly autoChannelSelectionActive: boolean;
}

export interface SetLongRangeChannelRequestOptions extends MessageBaseOptions {
	channel: LongRangeChannel;
}

@messageTypes(MessageType.Request, FunctionType.SetLongRangeChannel)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.SetLongRangeChannel)
export class SetLongRangeChannelRequest extends Message {
	public constructor(
		options:
			| MessageDeserializationOptions
			| SetLongRangeChannelRequestOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.channel = options.channel;
		}
	}

	public channel: LongRangeChannel;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = Buffer.from([this.channel]);
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

@messageTypes(MessageType.Response, FunctionType.SetLongRangeChannel)
export class SetLongRangeChannelResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: MessageDeserializationOptions,
	) {
		super(options);
		this.success = this.payload[0] !== 0;
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
