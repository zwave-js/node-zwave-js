import {
	MessageOrCCLogEntry,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
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
import { num2hex } from "@zwave-js/shared";

export interface ExtNVMReadLongByteRequestOptions extends MessageBaseOptions {
	offset: number;
}

@messageTypes(MessageType.Request, FunctionType.ExtNVMReadLongByte)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.ExtNVMReadLongByte)
export class ExtNVMReadLongByteRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| ExtNVMReadLongByteRequestOptions,
	) {
		super(host, options);
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

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(3);
		this.payload.writeUIntBE(this.offset, 0, 3);
		return super.serialize();
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
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
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
