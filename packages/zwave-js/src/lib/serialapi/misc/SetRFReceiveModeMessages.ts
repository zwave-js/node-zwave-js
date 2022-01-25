import {
	MessageOrCCLogEntry,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { Driver } from "../../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../../message/Constants";
import {
	expectedResponse,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../../message/Message";
import type { SuccessIndicator } from "../../message/SuccessIndicator";

export interface SetRFReceiveModeRequestOptions extends MessageBaseOptions {
	/** Whether the stick should receive (true) or not (false) */
	enabled: boolean;
}

@messageTypes(MessageType.Request, FunctionType.SetRFReceiveMode)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.SetRFReceiveMode)
export class SetRFReceiveModeRequest extends Message {
	public constructor(
		driver: Driver,
		options: MessageDeserializationOptions | SetRFReceiveModeRequestOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.enabled = options.enabled;
		}
	}

	public enabled: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.enabled ? 0x01 : 0x00]);

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

@messageTypes(MessageType.Response, FunctionType.SetRFReceiveMode)
export class SetRFReceiveModeResponse
	extends Message
	implements SuccessIndicator
{
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this.success = this.payload[0] !== 0;
	}

	isOK(): boolean {
		return this.success;
	}

	public readonly success: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { success: this.success },
		};
	}
}
