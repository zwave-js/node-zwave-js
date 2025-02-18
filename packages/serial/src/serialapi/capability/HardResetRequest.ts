import type { MessageOrCCLogEntry } from "@zwave-js/core";
import { MessagePriority } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageEncodingContext,
	MessageOrigin,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedCallback,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared/safe";

@messageTypes(MessageType.Request, FunctionType.HardReset)
@priority(MessagePriority.Controller)
export class HardResetRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): HardResetRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return HardResetRequest.from(raw, ctx);
		} else {
			return HardResetCallback.from(raw, ctx);
		}
	}
}

@expectedCallback(FunctionType.HardReset)
export class HardResetRequest extends HardResetRequestBase {
	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		this.payload = Bytes.from([this.callbackId]);
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
	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): HardResetCallback {
		const callbackId = raw.payload[0];

		return new this({
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
