import { MessagePriority } from "@zwave-js/core";
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
import { cpp2js } from "@zwave-js/shared";
import type { ZWaveLibraryTypes } from "../_Types";

@messageTypes(MessageType.Request, FunctionType.GetControllerVersion)
@expectedResponse(FunctionType.GetControllerVersion)
@priority(MessagePriority.Controller)
export class GetControllerVersionRequest extends Message {}

export interface GetControllerVersionResponseOptions {
	controllerType: ZWaveLibraryTypes;
	libraryVersion: string;
}

@messageTypes(MessageType.Response, FunctionType.GetControllerVersion)
export class GetControllerVersionResponse extends Message {
	public constructor(
		options: GetControllerVersionResponseOptions & MessageBaseOptions,
	) {
		super(options);

		this.controllerType = options.controllerType;
		this.libraryVersion = options.libraryVersion;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetControllerVersionResponse {
		// The payload consists of a zero-terminated string and a uint8 for the controller type
		const libraryVersion = cpp2js(raw.payload.toString("ascii"));
		const controllerType: ZWaveLibraryTypes =
			raw.payload[libraryVersion.length + 1];

		return new GetControllerVersionResponse({
			libraryVersion,
			controllerType,
		});
	}

	public controllerType: ZWaveLibraryTypes;
	public libraryVersion: string;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = Buffer.concat([
			Buffer.from(`${this.libraryVersion}\0`, "ascii"),
			Buffer.from([this.controllerType]),
		]);

		return super.serialize(ctx);
	}
}
