import {
	MessagePriority,
	NUM_LR_NODEMASK_SEGMENT_BYTES,
	NUM_LR_NODES_PER_SEGMENT,
	encodeLongRangeNodeBitMask,
	parseLongRangeNodeBitMask,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared/safe";

function getFirstNodeId(segmentNumber: number): number {
	return 256 + NUM_LR_NODES_PER_SEGMENT * segmentNumber;
}

export interface GetLongRangeNodesRequestOptions {
	segmentNumber: number;
}

@messageTypes(MessageType.Request, FunctionType.GetLongRangeNodes)
@expectedResponse(FunctionType.GetLongRangeNodes)
@priority(MessagePriority.Controller)
export class GetLongRangeNodesRequest extends Message {
	public constructor(
		options: GetLongRangeNodesRequestOptions & MessageBaseOptions,
	) {
		super(options);

		this.segmentNumber = options.segmentNumber;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetLongRangeNodesRequest {
		const segmentNumber = raw.payload[0];

		return new this({
			segmentNumber,
		});
	}

	public segmentNumber: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.segmentNumber]);
		return super.serialize(ctx);
	}
}

export interface GetLongRangeNodesResponseOptions {
	moreNodes: boolean;
	segmentNumber: number;
	nodeIds: number[];
}

@messageTypes(MessageType.Response, FunctionType.GetLongRangeNodes)
export class GetLongRangeNodesResponse extends Message {
	public constructor(
		options: GetLongRangeNodesResponseOptions & MessageBaseOptions,
	) {
		super(options);

		this.moreNodes = options.moreNodes;
		this.segmentNumber = options.segmentNumber;
		this.nodeIds = options.nodeIds;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetLongRangeNodesResponse {
		const moreNodes: boolean = raw.payload[0] != 0;
		const segmentNumber = raw.payload[1];
		const listLength = raw.payload[2];

		const listStart = 3;
		const listEnd = listStart + listLength;
		let nodeIds: number[];
		if (listEnd <= raw.payload.length) {
			const nodeBitMask = raw.payload.subarray(
				listStart,
				listEnd,
			);
			nodeIds = parseLongRangeNodeBitMask(
				nodeBitMask,
				getFirstNodeId(segmentNumber),
			);
		} else {
			nodeIds = [];
		}

		return new this({
			moreNodes,
			segmentNumber,
			nodeIds,
		});
	}

	public moreNodes: boolean;
	public segmentNumber: number;
	public nodeIds: readonly number[];

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(
			3 + NUM_LR_NODEMASK_SEGMENT_BYTES,
		);

		this.payload[0] = this.moreNodes ? 1 : 0;
		this.payload[1] = this.segmentNumber;
		this.payload[2] = NUM_LR_NODEMASK_SEGMENT_BYTES;

		const nodeBitMask = encodeLongRangeNodeBitMask(
			this.nodeIds,
			getFirstNodeId(this.segmentNumber),
		);
		this.payload.set(nodeBitMask, 3);

		return super.serialize(ctx);
	}
}
