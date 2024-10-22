import type { MessageOrCCLogEntry } from "@zwave-js/core";
import { MessagePriority } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageEncodingContext,
	type MessageOptions,
	MessageOrigin,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedCallback,
	messageTypes,
	priority,
} from "@zwave-js/serial";

@messageTypes(MessageType.Request, FunctionType.HardReset)
@priority(MessagePriority.Controller)
export class HardResetRequestBase extends Message {
	public constructor(options?: MessageOptions) {
		if (gotDeserializationOptions(options)) {
			if (
				options.origin === MessageOrigin.Host
				&& (new.target as any) !== HardResetRequest
			) {
				return new HardResetRequest(options);
			} else if (
				options.origin !== MessageOrigin.Host
				&& (new.target as any) !== HardResetCallback
			) {
				return new HardResetCallback(options);
			}
		}
		super(options);
	}
}

@expectedCallback(FunctionType.HardReset)
export class HardResetRequest extends HardResetRequestBase {
	public serialize(ctx: MessageEncodingContext): Buffer {
		this.assertCallbackId();
		this.payload = Buffer.from([this.callbackId]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId ?? "(not set)",
			},
		};
	}
}

export class HardResetCallback extends HardResetRequestBase {
	public constructor(
		options: MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.callbackId = options.callbackId;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): HardResetCallback {
		const callbackId = raw.payload[0];

		return new HardResetCallback({
			callbackId,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId ?? "(not set)",
			},
		};
	}
}
