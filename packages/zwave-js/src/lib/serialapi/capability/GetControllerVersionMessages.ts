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
import { cpp2js } from "@zwave-js/shared";
import type { ZWaveLibraryTypes } from "../_Types";

@messageTypes(MessageType.Request, FunctionType.GetControllerVersion)
@expectedResponse(FunctionType.GetControllerVersion)
@priority(MessagePriority.Controller)
export class GetControllerVersionRequest extends Message {}

export interface GetControllerVersionResponseOptions
	extends MessageBaseOptions {
	controllerType: ZWaveLibraryTypes;
	libraryVersion: string;
}

@messageTypes(MessageType.Response, FunctionType.GetControllerVersion)
export class GetControllerVersionResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| GetControllerVersionResponseOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			// The payload consists of a zero-terminated string and a uint8 for the controller type
			this.libraryVersion = cpp2js(this.payload.toString("ascii"));
			this.controllerType = this.payload[this.libraryVersion.length + 1];
		} else {
			this.controllerType = options.controllerType;
			this.libraryVersion = options.libraryVersion;
		}
	}

	public controllerType: ZWaveLibraryTypes;
	public libraryVersion: string;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from(`${this.libraryVersion}\0`, "ascii"),
			Buffer.from([this.controllerType]),
		]);

		return super.serialize();
	}
}
