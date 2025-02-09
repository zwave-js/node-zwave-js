import {
	type MessageOrCCLogEntry,
	MessagePriority,
	NUM_NODEMASK_BYTES,
	parseBitMask,
	parseNodeBitMask,
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
import { Bytes } from "@zwave-js/shared";

export interface GetNLSNodesRequestOptions {
	startOffset: number;
}

@messageTypes(MessageType.Request, FunctionType.GetNLSNodes)
@priority(MessagePriority.Normal)
@expectedResponse(FunctionType.GetNLSNodes)
export class GetNLSNodesRequest extends Message {
	public constructor(
		options: GetNLSNodesRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.startOffset = options.startOffset;
	}

	public startOffset: number;

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetNLSNodesRequest {
		const startOffset = raw.payload[0];

		return new this({
			startOffset,
		});
	}

	public async serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([
			this.startOffset,
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"start offset": this.startOffset,
			},
		};
	}
}

export interface GetNLSNodesResponseOptions {
	moreNodes: boolean;
	startOffset: number;
	nodes: number[];
}

@messageTypes(MessageType.Response, FunctionType.GetNLSNodes)
export class GetNLSNodesResponse extends Message {
	public constructor(
		options: GetNLSNodesResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.moreNodes = options.moreNodes;
		this.startOffset = options.startOffset;
		this.nodes = options.nodes;
	}

	public moreNodes: boolean;
	public startOffset: number;
	public nodes: number[];

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetNLSNodesResponse {
		const moreNodes = !!(raw.payload[0] & 0b1000_0000);
		const startOffset = raw.payload[1];
		const nodeListLength = raw.payload[2];
		const nodeBitMask = raw.payload.subarray(3, 3 + nodeListLength);
		let nodes: number[];

		// Start offset 0 is special because it includes the classic node ids
		// 1-232 and has a gap from 233 to 255
		if (startOffset === 0) {
			const classicNodes = nodeBitMask.subarray(0, NUM_NODEMASK_BYTES);
			const lrNodes = nodeBitMask.subarray(NUM_NODEMASK_BYTES);
			nodes = [
				...parseNodeBitMask(classicNodes),
				...parseBitMask(lrNodes, 256),
			];
		} else {
			nodes = parseBitMask(
				nodeBitMask,
				1048 + (startOffset - 1) * 128 * 8,
			);
		}

		return new this({
			moreNodes,
			startOffset,
			nodes,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"start offset": this.startOffset,
				nodes: `(${this.nodes.length} nodes)`,
				"more nodes": this.moreNodes,
			},
		};
	}
}
