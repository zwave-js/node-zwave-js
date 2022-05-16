import { ControllerCapabilityFlags } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	expectedResponse,
	FunctionType,
	Message,
	MessageDeserializationOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import type { JSONObject } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.GetControllerCapabilities)
@expectedResponse(FunctionType.GetControllerCapabilities)
@priority(MessagePriority.Controller)
export class GetControllerCapabilitiesRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetControllerCapabilities)
export class GetControllerCapabilitiesResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
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
