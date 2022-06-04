import { ControllerCapabilityFlags } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	expectedResponse,
	FunctionType,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";

@messageTypes(MessageType.Request, FunctionType.GetControllerCapabilities)
@expectedResponse(FunctionType.GetControllerCapabilities)
@priority(MessagePriority.Controller)
export class GetControllerCapabilitiesRequest extends Message {}

export interface GetControllerCapabilitiesResponseOptions
	extends MessageBaseOptions {
	isSecondary: boolean;
	isUsingHomeIdFromOtherNetwork: boolean;
	isSISPresent: boolean;
	wasRealPrimary: boolean;
	isStaticUpdateController: boolean;
}

@messageTypes(MessageType.Response, FunctionType.GetControllerCapabilities)
export class GetControllerCapabilitiesResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| GetControllerCapabilitiesResponseOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			const capabilityFlags = this.payload[0];
			this.isSecondary = !!(
				capabilityFlags & ControllerCapabilityFlags.Secondary
			);
			this.isUsingHomeIdFromOtherNetwork = !!(
				capabilityFlags & ControllerCapabilityFlags.OnOtherNetwork
			);
			this.isSISPresent = !!(
				capabilityFlags & ControllerCapabilityFlags.SISPresent
			);
			this.wasRealPrimary = !!(
				capabilityFlags & ControllerCapabilityFlags.WasRealPrimary
			);
			this.isStaticUpdateController = !!(
				capabilityFlags & ControllerCapabilityFlags.SUC
			);
		} else {
			this.isSecondary = options.isSecondary;
			this.isUsingHomeIdFromOtherNetwork =
				options.isUsingHomeIdFromOtherNetwork;
			this.isSISPresent = options.isSISPresent;
			this.wasRealPrimary = options.wasRealPrimary;
			this.isStaticUpdateController = options.isStaticUpdateController;
		}
	}

	public isSecondary: boolean;
	public isUsingHomeIdFromOtherNetwork: boolean;
	public isSISPresent: boolean;
	public wasRealPrimary: boolean;
	public isStaticUpdateController: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			(this.isSecondary ? ControllerCapabilityFlags.Secondary : 0) |
				(this.isUsingHomeIdFromOtherNetwork
					? ControllerCapabilityFlags.OnOtherNetwork
					: 0) |
				(this.isSISPresent ? ControllerCapabilityFlags.SISPresent : 0) |
				(this.wasRealPrimary
					? ControllerCapabilityFlags.WasRealPrimary
					: 0) |
				(this.isStaticUpdateController
					? ControllerCapabilityFlags.SUC
					: 0),
		]);
		return super.serialize();
	}
}
