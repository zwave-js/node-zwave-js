import { MessagePriority, encodeBitMask, parseBitMask } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { type Bytes } from "@zwave-js/shared/safe";

export interface LongRangeShadowNodeIDsRequestOptions {
	shadowNodeIds: number[];
}

const LONG_RANGE_SHADOW_NODE_IDS_START = 2002;
const NUM_LONG_RANGE_SHADOW_NODE_IDS = 4;

@messageTypes(MessageType.Request, FunctionType.SetLongRangeShadowNodeIDs)
@priority(MessagePriority.Controller)
export class SetLongRangeShadowNodeIDsRequest extends Message {
	public constructor(
		options: LongRangeShadowNodeIDsRequestOptions & MessageBaseOptions,
	) {
		super(options);

		this.shadowNodeIds = options.shadowNodeIds;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SetLongRangeShadowNodeIDsRequest {
		const shadowNodeIds = parseBitMask(
			raw.payload.subarray(0, 1),
			LONG_RANGE_SHADOW_NODE_IDS_START,
			NUM_LONG_RANGE_SHADOW_NODE_IDS,
		);

		return new this({
			shadowNodeIds,
		});
	}

	public shadowNodeIds: number[];

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = encodeBitMask(
			this.shadowNodeIds,
			LONG_RANGE_SHADOW_NODE_IDS_START
				+ NUM_LONG_RANGE_SHADOW_NODE_IDS
				- 1,
			LONG_RANGE_SHADOW_NODE_IDS_START,
		);

		return super.serialize(ctx);
	}
}
