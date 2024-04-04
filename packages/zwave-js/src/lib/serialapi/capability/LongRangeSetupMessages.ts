import { MessagePriority, encodeBitMask, parseBitMask } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	MessageType,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";

import { LongRangeChannel } from "@zwave-js/core";

@messageTypes(MessageType.Request, FunctionType.GetLongRangeChannel)
@expectedResponse(FunctionType.GetLongRangeChannel)
@priority(MessagePriority.Controller)
export class GetLongRangeChannelRequest extends Message {}

export interface LongRangeChannelResponseOptions extends MessageBaseOptions {
	longRangeChannel: LongRangeChannel;
}

export class LongRangeChannelMessageBase extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| LongRangeChannelResponseOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			switch (this.payload[0]) {
				case 0x01:
					this.longRangeChannel = LongRangeChannel.A;
					break;
				case 0x02:
					this.longRangeChannel = LongRangeChannel.B;
					break;
				default:
					this.longRangeChannel = LongRangeChannel.Unknown;
					break;
			}
		} else {
			this.longRangeChannel = options.longRangeChannel;
		}
	}

	public longRangeChannel: LongRangeChannel;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(1);

		switch (this.longRangeChannel) {
			default: // Don't use reserved values, default back to A
			case LongRangeChannel.A:
				this.payload[0] = LongRangeChannel.A;
				break;

			case LongRangeChannel.B:
				this.payload[0] = LongRangeChannel.B;
		}

		return super.serialize();
	}
}

@messageTypes(MessageType.Response, FunctionType.GetLongRangeChannel)
@priority(MessagePriority.Controller)
export class GetLongRangeChannelResponse extends LongRangeChannelMessageBase {}

@messageTypes(MessageType.Request, FunctionType.SetLongRangeChannel)
@expectedResponse(FunctionType.SetLongRangeChannel)
@priority(MessagePriority.Controller)
export class SetLongRangeChannelRequest extends LongRangeChannelMessageBase {
}

export interface SetLongRangeChannelResponseOptions extends MessageBaseOptions {
	responseStatus: number;
}

@messageTypes(MessageType.Response, FunctionType.SetLongRangeChannel)
export class SetLongRangeChannelResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.success = this.payload[0] !== 0;
	}

	public readonly success: boolean;

	public isOK(): boolean {
		return this.success;
	}
}

export interface LongRangeShadowNodeIDsRequestOptions
	extends MessageBaseOptions
{
	shadowNodeIds: number[];
}

const LONG_RANGE_SHADOW_NODE_IDS_START = 2002;
const NUM_LONG_RANGE_SHADOW_NODE_IDS = 4;

@messageTypes(MessageType.Request, FunctionType.SetLongRangeShadowNodeIDs)
@priority(MessagePriority.Controller)
export class SetLongRangeShadowNodeIDsRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| LongRangeShadowNodeIDsRequestOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			this.shadowNodeIds = parseBitMask(
				this.payload.subarray(0, 1),
				LONG_RANGE_SHADOW_NODE_IDS_START,
				NUM_LONG_RANGE_SHADOW_NODE_IDS,
			);
		} else {
			this.shadowNodeIds = options.shadowNodeIds;
		}
	}

	public shadowNodeIds: number[];

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(1);
		this.payload = encodeBitMask(
			this.shadowNodeIds,
			LONG_RANGE_SHADOW_NODE_IDS_START
				+ NUM_LONG_RANGE_SHADOW_NODE_IDS
				- 1,
			LONG_RANGE_SHADOW_NODE_IDS_START,
		);

		return super.serialize();
	}
}
