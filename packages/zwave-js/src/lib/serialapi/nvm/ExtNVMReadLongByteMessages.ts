import {
	type MessageOrCCLogEntry,
	MessagePriority,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageEncodingContext,
	MessageType,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { num2hex } from "@zwave-js/shared";

export interface ExtNVMReadLongByteRequestOptions extends MessageBaseOptions {
	offset: number;
}

@messageTypes(MessageType.Request, FunctionType.ExtNVMReadLongByte)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.ExtNVMReadLongByte)
export class ExtNVMReadLongByteRequest extends Message {
	public constructor(
		options:
			| MessageDeserializationOptions
			| ExtNVMReadLongByteRequestOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (options.offset < 0 || options.offset > 0xffffff) {
				throw new ZWaveError(
					"The offset must be a 24-bit number!",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.offset = options.offset;
		}
	}

	public offset: number;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = Buffer.allocUnsafe(3);
		this.payload.writeUIntBE(this.offset, 0, 3);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { offset: num2hex(this.offset) },
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.ExtNVMReadLongByte)
export class ExtNVMReadLongByteResponse extends Message {
	public constructor(
		options: MessageDeserializationOptions,
	) {
		super(options);
		this.byte = this.payload[0];
	}

	public readonly byte: number;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { byte: num2hex(this.byte) },
		};
	}
}
