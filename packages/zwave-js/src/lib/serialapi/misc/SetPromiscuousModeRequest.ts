import { type MessageOrCCLogEntry, MessagePriority } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	MessageType,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";

export interface SetPromiscuousModeRequestOptions extends MessageBaseOptions {
	enabled: boolean;
}

@messageTypes(MessageType.Request, FunctionType.SetPromiscuousMode)
@priority(MessagePriority.Controller)
export class SetPromiscuousModeRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| SetPromiscuousModeRequestOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			this.enabled = this.payload[0] !== 0;
		} else {
			this.enabled = options.enabled;
		}
	}

	public enabled: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.enabled ? 0xff : 0x00,
		]);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				enabled: this.enabled,
			},
		};
	}
}
