import type { MessageOrCCLogEntry } from "@zwave-js/core";
import type { JSONObject } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedResponse,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../message/Message";
import { NUM_NODEMASK_BYTES, parseNodeBitMask } from "./NodeBitMask";

interface GetRoutingInfoRequestOptions extends MessageBaseOptions {
	nodeId: number;
	removeNonRepeaters?: boolean;
	removeBadLinks?: boolean;
}

@messageTypes(MessageType.Request, FunctionType.GetRoutingInfo)
@expectedResponse(FunctionType.GetRoutingInfo)
@priority(MessagePriority.Controller)
export class GetRoutingInfoRequest extends Message {
	public constructor(driver: Driver, options: GetRoutingInfoRequestOptions) {
		super(driver, options);
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
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);

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
