import { FunctionType, MessageType } from "../message/Constants";
import { Message, messageTypes } from "../message/Message";
import { NodeUpdatePayload, parseNodeUpdatePayload } from "../node/NodeInfo";
import { JSONObject } from "../util/misc";

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
	private _updateType: ApplicationUpdateTypes;
	public get updateType(): ApplicationUpdateTypes {
		return this._updateType;
	}

	private _nodeId: number;
	public get nodeId(): number {
		return this._nodeId;
	}

	private _nodeInformation: NodeUpdatePayload;
	public get nodeInformation(): NodeUpdatePayload {
		return this._nodeInformation;
	}

	public serialize(): Buffer {
		throw new Error("not implemented");
	}

	// this is for reports from the controller
	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		this._updateType = this.payload[0];
		switch (this._updateType) {
			case ApplicationUpdateTypes.NodeInfo_Received: {
				this._nodeInformation = parseNodeUpdatePayload(
					this.payload.slice(1),
				);
				this._nodeId = this._nodeInformation.nodeId;
				break;
			}
		}

		return ret;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			updateType: ApplicationUpdateTypes[this.updateType],
			nodeId: this.nodeId,
			nodeInformation: this.nodeInformation,
		});
	}
}
