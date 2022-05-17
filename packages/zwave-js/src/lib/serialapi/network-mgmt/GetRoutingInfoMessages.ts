import { MessageOrCCLogEntry, NUM_NODEMASK_BYTES } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	expectedResponse,
	FunctionType,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import type { JSONObject } from "@zwave-js/shared";
import { parseNodeBitMask } from "../../controller/NodeBitMask";

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
		this.payload = Buffer.from([
			this.sourceNodeId,
			this.removeNonRepeaters ? 1 : 0,
			this.removeBadLinks ? 1 : 0,
			0, // callbackId - this must be 0 as per the docs
		]);
		return super.serialize();
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			nodeId: this.sourceNodeId,
			removeNonRepeaters: this.removeNonRepeaters,
			removeBadLinks: this.removeBadLinks,
		});
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
