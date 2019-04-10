import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { expectedResponse, Message, messageTypes, priority } from "../message/Message";
import { JSONObject } from "../util/misc";

const enum ControllerCapabilityFlags {
	Secondary = 1 << 0, // Controller is a secondary
	OnOtherNetwork = 1 << 1, // Controller is using a home ID from another network
	SISPresent = 1 << 2, // There's a SUC id server (SIS) on the network
	WasRealPrimary = 1 << 3, // Before the SIS was added, the controller was the primary
	SUC = 1 << 4, // Controller is a static update controller (SUC)
}

@messageTypes(MessageType.Request, FunctionType.GetControllerCapabilities)
@expectedResponse(FunctionType.GetControllerCapabilities)
@priority(MessagePriority.Controller)
export class GetControllerCapabilitiesRequest extends Message {

}

@messageTypes(MessageType.Response, FunctionType.GetControllerCapabilities)
export class GetControllerCapabilitiesResponse extends Message {

	private _capabilityFlags: number;
	public get isSecondary(): boolean {
		return (this._capabilityFlags & ControllerCapabilityFlags.Secondary) !== 0;
	}
	public get isUsingHomeIdFromOtherNetwork(): boolean {
		return (this._capabilityFlags & ControllerCapabilityFlags.OnOtherNetwork) !== 0;
	}
	public get isSISPresent(): boolean {
		return (this._capabilityFlags & ControllerCapabilityFlags.SISPresent) !== 0;
	}
	public get wasRealPrimary(): boolean {
		return (this._capabilityFlags & ControllerCapabilityFlags.WasRealPrimary) !== 0;
	}
	public get isStaticUpdateController(): boolean {
		return (this._capabilityFlags & ControllerCapabilityFlags.SUC) !== 0;
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		// only one byte (flags) payload
		this._capabilityFlags = this.payload[0];

		return ret;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			isSecondary: this.isSecondary,
			isUsingHomeIdFromOtherNetwork: this.isUsingHomeIdFromOtherNetwork,
			isSISPresent: this.isSISPresent,
			wasRealPrimary: this.wasRealPrimary,
			isStaticUpdateController: this.isStaticUpdateController,
		});
	}

}
