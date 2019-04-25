import { IDriver } from "../driver/IDriver";
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
import { JSONObject } from "../util/misc";
import { NUM_NODEMASK_BYTES, parseNodeBitMask } from "./NodeBitMask";

export interface GetRoutingInfoRequestOptions extends MessageBaseOptions {
	nodeId: number;
	removeNonRepeaters?: boolean;
	removeBadLinks?: boolean;
}

@messageTypes(MessageType.Request, FunctionType.GetRoutingInfo)
@expectedResponse(FunctionType.GetRoutingInfo)
@priority(MessagePriority.Controller)
export class GetRoutingInfoRequest extends Message {
	public constructor(driver: IDriver, options: GetRoutingInfoRequestOptions) {
		super(driver, options);
		this.nodeId = options.nodeId;
		this.removeNonRepeaters = !!options.removeNonRepeaters;
		this.removeBadLinks = !!options.removeBadLinks;
	}

	public nodeId: number;
	public removeNonRepeaters: boolean;
	public removeBadLinks: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.nodeId,
			this.removeNonRepeaters ? 1 : 0,
			this.removeBadLinks ? 1 : 0,
			0, // funcId - OZW sets this to 3, the docs say it must be 0
		]);
		return super.serialize();
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			nodeId: this.nodeId,
			removeNonRepeaters: this.removeNonRepeaters,
			removeBadLinks: this.removeBadLinks,
		});
	}
}

@messageTypes(MessageType.Response, FunctionType.GetRoutingInfo)
export class GetRoutingInfoResponse extends Message {
	public constructor(
		driver: IDriver,
		options: MessageDeserializationOptions,
	) {
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
}
