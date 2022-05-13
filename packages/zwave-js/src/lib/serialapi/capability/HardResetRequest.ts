import type { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "../../driver/Host";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../../message/Constants";
import {
	expectedCallback,
	gotDeserializationOptions,
	Message,
	MessageDeserializationOptions,
	MessageOptions,
	messageTypes,
	priority,
} from "../../message/Message";

@messageTypes(MessageType.Request, FunctionType.HardReset)
@priority(MessagePriority.Controller)
export class HardResetRequestBase extends Message {
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== HardResetCallback
		) {
			return new HardResetCallback(host, options);
		}
		super(host, options);
	}
}

@expectedCallback(FunctionType.HardReset)
export class HardResetRequest extends HardResetRequestBase {
	public serialize(): Buffer {
		this.payload = Buffer.from([this.callbackId]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId,
			},
		};
	}
}

export class HardResetCallback extends HardResetRequestBase {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.callbackId = this.payload[0];
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId,
			},
		};
	}
}
