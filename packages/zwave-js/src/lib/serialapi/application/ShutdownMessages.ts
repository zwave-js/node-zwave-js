import { MessagePriority, type MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
} from "@zwave-js/serial";

export interface ShutdownRequestOptions extends MessageBaseOptions {
	someProperty: number;
}

@messageTypes(MessageType.Request, FunctionType.Shutdown)
@priority(MessagePriority.Normal)
@expectedResponse(FunctionType.Shutdown)
export class ShutdownRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.Shutdown)
export class ShutdownResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.success = this.payload[0] !== 0;
	}

	public readonly success: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { success: this.success },
		};
	}
}
