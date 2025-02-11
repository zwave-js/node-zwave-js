import { ControllerCapabilityFlags, MessagePriority } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared/safe";

@messageTypes(MessageType.Request, FunctionType.GetControllerCapabilities)
@expectedResponse(FunctionType.GetControllerCapabilities)
@priority(MessagePriority.Controller)
export class GetControllerCapabilitiesRequest extends Message {}

export interface GetControllerCapabilitiesResponseOptions {
	isSecondary: boolean;
	isUsingHomeIdFromOtherNetwork: boolean;
	isSISPresent: boolean;
	wasRealPrimary: boolean;
	isStaticUpdateController: boolean;
	noNodesIncluded: boolean;
}

@messageTypes(MessageType.Response, FunctionType.GetControllerCapabilities)
export class GetControllerCapabilitiesResponse extends Message {
	public constructor(
		options: GetControllerCapabilitiesResponseOptions & MessageBaseOptions,
	) {
		super(options);

		this.isSecondary = options.isSecondary;
		this.isUsingHomeIdFromOtherNetwork =
			options.isUsingHomeIdFromOtherNetwork;
		this.isSISPresent = options.isSISPresent;
		this.wasRealPrimary = options.wasRealPrimary;
		this.isStaticUpdateController = options.isStaticUpdateController;
		this.noNodesIncluded = options.noNodesIncluded;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetControllerCapabilitiesResponse {
		const capabilityFlags = raw.payload[0];
		const isSecondary = !!(
			capabilityFlags & ControllerCapabilityFlags.Secondary
		);
		const isUsingHomeIdFromOtherNetwork = !!(
			capabilityFlags & ControllerCapabilityFlags.OnOtherNetwork
		);
		const isSISPresent = !!(
			capabilityFlags & ControllerCapabilityFlags.SISPresent
		);
		const wasRealPrimary = !!(
			capabilityFlags & ControllerCapabilityFlags.WasRealPrimary
		);
		const isStaticUpdateController = !!(
			capabilityFlags & ControllerCapabilityFlags.SUC
		);
		const noNodesIncluded = !!(
			capabilityFlags & ControllerCapabilityFlags.NoNodesIncluded
		);

		return new this({
			isSecondary,
			isUsingHomeIdFromOtherNetwork,
			isSISPresent,
			wasRealPrimary,
			isStaticUpdateController,
			noNodesIncluded,
		});
	}

	public isSecondary: boolean;
	public isUsingHomeIdFromOtherNetwork: boolean;
	public isSISPresent: boolean;
	public wasRealPrimary: boolean;
	public isStaticUpdateController: boolean;
	public noNodesIncluded: boolean;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([
			(this.isSecondary ? ControllerCapabilityFlags.Secondary : 0)
			| (this.isUsingHomeIdFromOtherNetwork
				? ControllerCapabilityFlags.OnOtherNetwork
				: 0)
			| (this.isSISPresent ? ControllerCapabilityFlags.SISPresent : 0)
			| (this.wasRealPrimary
				? ControllerCapabilityFlags.WasRealPrimary
				: 0)
			| (this.isStaticUpdateController
				? ControllerCapabilityFlags.SUC
				: 0)
			| (this.noNodesIncluded
				? ControllerCapabilityFlags.NoNodesIncluded
				: 0),
		]);
		return super.serialize(ctx);
	}
}
