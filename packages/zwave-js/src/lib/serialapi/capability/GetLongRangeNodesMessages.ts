import {
	MessagePriority,
	NUM_LR_NODEMASK_SEGMENT_BYTES,
	NUM_LR_NODES_PER_SEGMENT,
	encodeLongRangeNodeBitMask,
	parseLongRangeNodeBitMask,
} from "@zwave-js/core";
import type { CCEncodingContext, ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageEncodingContext,
	MessageType,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";

export interface GetLongRangeNodesRequestOptions extends MessageBaseOptions {
	segmentNumber: number;
}

@messageTypes(MessageType.Request, FunctionType.GetLongRangeNodes)
@expectedResponse(FunctionType.GetLongRangeNodes)
@priority(MessagePriority.Controller)
export class GetLongRangeNodesRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| GetLongRangeNodesRequestOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			this.segmentNumber = this.payload[0];
		} else {
			this.segmentNumber = options.segmentNumber;
		}
	}

	public segmentNumber: number;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = Buffer.from([this.segmentNumber]);
		return super.serialize(ctx);
	}
}

export interface GetLongRangeNodesResponseOptions extends MessageBaseOptions {
	moreNodes: boolean;
	segmentNumber: number;
	nodeIds: number[];
}

@messageTypes(MessageType.Response, FunctionType.GetLongRangeNodes)
export class GetLongRangeNodesResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| GetLongRangeNodesResponseOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			this.moreNodes = this.payload[0] != 0;
			this.segmentNumber = this.payload[1];
			const listLength = this.payload[2];

			const listStart = 3;
			const listEnd = listStart + listLength;
			if (listEnd <= this.payload.length) {
				const nodeBitMask = this.payload.subarray(
					listStart,
					listEnd,
				);
				this.nodeIds = parseLongRangeNodeBitMask(
					nodeBitMask,
					this.listStartNode(),
				);
			} else {
				this.nodeIds = [];
			}
		} else {
			this.moreNodes = options.moreNodes;
			this.segmentNumber = options.segmentNumber;
			this.nodeIds = options.nodeIds;
		}
	}

	public moreNodes: boolean;
	public segmentNumber: number;
	public nodeIds: readonly number[];

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = Buffer.allocUnsafe(
			3 + NUM_LR_NODEMASK_SEGMENT_BYTES,
		);

		this.payload[0] = this.moreNodes ? 1 : 0;
		this.payload[1] = this.segmentNumber;
		this.payload[2] = NUM_LR_NODEMASK_SEGMENT_BYTES;

		const nodeBitMask = encodeLongRangeNodeBitMask(
			this.nodeIds,
			this.listStartNode(),
		);
		nodeBitMask.copy(this.payload, 3);

		return super.serialize(ctx);
	}

	private listStartNode(): number {
		return 256 + NUM_LR_NODES_PER_SEGMENT * this.segmentNumber;
	}
}
