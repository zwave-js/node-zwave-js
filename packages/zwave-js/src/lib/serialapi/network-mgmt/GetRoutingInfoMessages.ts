import {
	MessagePriority,
	NUM_NODEMASK_BYTES,
	encodeNodeID,
	parseNodeBitMask,
	type MessageOrCCLogEntry,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
} from "@zwave-js/serial";

interface GetRoutingInfoRequestOptions extends MessageBaseOptions {
	nodeId: number;
	removeNonRepeaters?: boolean;
	removeBadLinks?: boolean;
}

@messageTypes(MessageType.Request, FunctionType.GetRoutingInfo)
@expectedResponse(FunctionType.GetRoutingInfo)
@priority(MessagePriority.Controller)
export class GetRoutingInfoRequest extends Message {
	public constructor(host: ZWaveHost, options: GetRoutingInfoRequestOptions) {
		super(host, options);
		this.sourceNodeId = options.nodeId;
		this.removeNonRepeaters = !!options.removeNonRepeaters;
		this.removeBadLinks = !!options.removeBadLinks;
	}

	public sourceNodeId: number;
	public removeNonRepeaters: boolean;
	public removeBadLinks: boolean;

	public serialize(): Buffer {
		const nodeId = encodeNodeID(this.sourceNodeId, this.host.nodeIdType);
		const optionsByte =
			(this.removeBadLinks ? 0b1000_0000 : 0) |
			(this.removeNonRepeaters ? 0b0100_0000 : 0);
		this.payload = Buffer.concat([
			nodeId,
			Buffer.from([
				optionsByte,
				0, // callbackId - this must be 0 as per the docs
			]),
		]);
		return super.serialize();
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

@messageTypes(MessageType.Response, FunctionType.GetRoutingInfo)
export class GetRoutingInfoResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);

		if (this.payload.length === NUM_NODEMASK_BYTES) {
			// the payload contains a bit mask of all neighbor nodes
			this._nodeIds = parseNodeBitMask(this.payload);
		} else {
			this._nodeIds = [];
		}
	}

	private _nodeIds: number[];
	public get nodeIds(): number[] {
		return this._nodeIds;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "node ids": `${this._nodeIds.join(", ")}` },
		};
	}
}
