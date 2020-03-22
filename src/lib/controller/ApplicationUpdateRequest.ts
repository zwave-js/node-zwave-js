import type { Driver } from "../driver/Driver";
import { FunctionType, MessageType } from "../message/Constants";
import {
	Message,
	MessageDeserializationOptions,
	messageTypes,
} from "../message/Message";
import { NodeUpdatePayload, parseNodeUpdatePayload } from "../node/NodeInfo";
import type { JSONObject } from "../util/misc";

/* eslint-disable @typescript-eslint/camelcase */
export enum ApplicationUpdateTypes {
	NodeInfo_Received = 0x84,
	NodeInfo_RequestDone = 0x82,
	NodeInfo_RequestFailed = 0x81,
	RoutingPending = 0x80,
	NewIdAssigned = 0x40,
	DeleteDone = 0x20,
	SUC_IdChanged = 0x10,
}
/* eslint-enable @typescript-eslint/camelcase */

@messageTypes(MessageType.Request, FunctionType.ApplicationUpdateRequest)
// this is only received, not sent!
export class ApplicationUpdateRequest extends Message {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this._updateType = this.payload[0];

		if (
			this._updateType === ApplicationUpdateTypes.NodeInfo_Received &&
			new.target !== ApplicationUpdateRequestNodeInfoReceived
		) {
			return new ApplicationUpdateRequestNodeInfoReceived(
				driver,
				options,
			);
		} else if (
			this._updateType ===
				ApplicationUpdateTypes.NodeInfo_RequestFailed &&
			new.target !== ApplicationUpdateRequestNodeInfoRequestFailed
		) {
			return new ApplicationUpdateRequestNodeInfoRequestFailed(
				driver,
				options,
			);
		}
	}

	private _updateType: ApplicationUpdateTypes;
	public get updateType(): ApplicationUpdateTypes {
		return this._updateType;
	}
}

export class ApplicationUpdateRequestNodeInfoReceived extends ApplicationUpdateRequest {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this._nodeInformation = parseNodeUpdatePayload(this.payload.slice(1));
		this._nodeId = this._nodeInformation.nodeId;
	}

	private _nodeId: number;
	public get nodeId(): number {
		return this._nodeId;
	}

	private _nodeInformation: NodeUpdatePayload;
	public get nodeInformation(): NodeUpdatePayload {
		return this._nodeInformation;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			updateType: ApplicationUpdateTypes[this.updateType],
			nodeId: this.nodeId,
			nodeInformation: this.nodeInformation,
		});
	}
}

export class ApplicationUpdateRequestNodeInfoRequestFailed extends ApplicationUpdateRequest {}
