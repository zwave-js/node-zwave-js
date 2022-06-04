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

export interface ExtNVMReadLongBufferRequestOptions extends MessageBaseOptions {
	offset: number;
	length: number;
}

@messageTypes(MessageType.Request, FunctionType.ExtNVMReadLongBuffer)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.ExtNVMReadLongBuffer)
export class ExtNVMReadLongBufferRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| ExtNVMReadLongBufferRequestOptions,
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
			if (options.length < 1 || options.length > 0xffff) {
				throw new ZWaveError(
					"The length must be between 1 and 65535",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			this.offset = options.offset;
			this.length = options.length;
		}
	}

	public offset: number;
	public length: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(5);
		this.payload.writeUIntBE(this.offset, 0, 3);
		this.payload.writeUInt16BE(this.length, 3);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				offset: num2hex(this.offset),
				length: this.length,
			},
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.ExtNVMReadLongBuffer)
export class ExtNVMReadLongBufferResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.buffer = this.payload;
	}

	public readonly buffer: Buffer;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				buffer: `(${this.buffer.length} byte${
					this.buffer.length === 1 ? "" : "s"
				})`,
			},
		};
	}
}
