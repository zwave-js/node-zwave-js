import { MessagePriority, encodeBitMask, parseBitMask } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageEncodingContext,
	MessageType,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";

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
		options:
			| MessageDeserializationOptions
			| LongRangeShadowNodeIDsRequestOptions,
	) {
		super(options);

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

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = Buffer.allocUnsafe(1);
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
