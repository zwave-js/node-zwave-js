import { type MessageOrCCLogEntry, MessagePriority } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";

export interface ShutdownRequestOptions {
	someProperty: number;
}

@messageTypes(MessageType.Request, FunctionType.Shutdown)
@priority(MessagePriority.Normal)
@expectedResponse(FunctionType.Shutdown)
export class ShutdownRequest extends Message {}

export interface ShutdownResponseOptions {
	success: boolean;
}

@messageTypes(MessageType.Response, FunctionType.Shutdown)
export class ShutdownResponse extends Message {
	public constructor(
		options: ShutdownResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): ShutdownResponse {
		const success = raw.payload[0] !== 0;

		return new this({
			success,
		});
	}

	public readonly success: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { success: this.success },
		};
	}
}
