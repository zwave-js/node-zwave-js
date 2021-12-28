import { ControllerCapabilityFlags } from "@zwave-js/core";
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
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../message/Message";

@messageTypes(MessageType.Request, FunctionType.GetControllerCapabilities)
@expectedResponse(FunctionType.GetControllerCapabilities)
@priority(MessagePriority.Controller)
export class GetControllerCapabilitiesRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetControllerCapabilities)
export class GetControllerCapabilitiesResponse extends Message {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this._capabilityFlags = this.payload[0];
	}

	private _capabilityFlags: number;
	public get isSecondary(): boolean {
		return !!(this._capabilityFlags & ControllerCapabilityFlags.Secondary);
	}
	public get isUsingHomeIdFromOtherNetwork(): boolean {
		return !!(
			this._capabilityFlags & ControllerCapabilityFlags.OnOtherNetwork
		);
	}
	public get isSISPresent(): boolean {
		return !!(this._capabilityFlags & ControllerCapabilityFlags.SISPresent);
	}
	public get wasRealPrimary(): boolean {
		return !!(
			this._capabilityFlags & ControllerCapabilityFlags.WasRealPrimary
		);
	}
	public get isStaticUpdateController(): boolean {
		return !!(this._capabilityFlags & ControllerCapabilityFlags.SUC);
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
