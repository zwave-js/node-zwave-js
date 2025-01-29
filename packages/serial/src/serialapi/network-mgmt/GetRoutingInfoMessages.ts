import {
	type MessageOrCCLogEntry,
	MessagePriority,
	NUM_NODEMASK_BYTES,
	encodeNodeID,
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

export interface GetRoutingInfoRequestOptions {
	nodeId: number;
	removeNonRepeaters?: boolean;
	removeBadLinks?: boolean;
}

@messageTypes(MessageType.Request, FunctionType.GetRoutingInfo)
@expectedResponse(FunctionType.GetRoutingInfo)
@priority(MessagePriority.Controller)
export class GetRoutingInfoRequest extends Message {
	public constructor(
		options: GetRoutingInfoRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.sourceNodeId = options.nodeId;
		this.removeNonRepeaters = !!options.removeNonRepeaters;
		this.removeBadLinks = !!options.removeBadLinks;
	}

	public sourceNodeId: number;
	public removeNonRepeaters: boolean;
	public removeBadLinks: boolean;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		const nodeId = encodeNodeID(this.sourceNodeId, ctx.nodeIdType);
		const optionsByte = (this.removeBadLinks ? 0b1000_0000 : 0)
			| (this.removeNonRepeaters ? 0b0100_0000 : 0);
		this.payload = Bytes.concat([
			nodeId,
			Bytes.from([
				optionsByte,
				0, // callbackId - this must be 0 as per the docs
			]),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"remove non-repeaters": this.removeNonRepeaters,
				"remove bad links": this.removeBadLinks,
			},
		};
	}
}

export interface GetRoutingInfoResponseOptions {
	nodeIds: number[];
}

@messageTypes(MessageType.Response, FunctionType.GetRoutingInfo)
export class GetRoutingInfoResponse extends Message {
	public constructor(
		options: GetRoutingInfoResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.nodeIds = options.nodeIds;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetRoutingInfoResponse {
		let nodeIds: number[];
		if (raw.payload.length === NUM_NODEMASK_BYTES) {
			// the payload contains a bit mask of all neighbor nodes
			nodeIds = parseNodeBitMask(raw.payload);
		} else {
			nodeIds = [];
		}

		return new this({
			nodeIds,
		});
	}

	public nodeIds: number[];

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "node ids": `${this.nodeIds.join(", ")}` },
		};
	}
}
