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

export interface ExtNVMWriteLongBufferRequestOptions
	extends MessageBaseOptions {
	offset: number;
	buffer: Buffer;
}

@messageTypes(MessageType.Request, FunctionType.ExtNVMWriteLongBuffer)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.ExtNVMWriteLongBuffer)
export class ExtNVMWriteLongBufferRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| ExtNVMWriteLongBufferRequestOptions,
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
			if (options.buffer.length < 1 || options.buffer.length > 0xffff) {
				throw new ZWaveError(
					"The buffer must be between 1 and 65535 bytes long",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.offset = options.offset;
			this.buffer = options.buffer;
		}
	}

	public offset: number;
	public buffer: Buffer;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(5 + this.buffer.length);
		this.payload.writeUIntBE(this.offset, 0, 3);
		this.payload.writeUInt16BE(this.buffer.length, 3);
		this.buffer.copy(this.payload, 5);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				offset: num2hex(this.offset),
				buffer: `(${this.buffer.length} byte${
					this.buffer.length === 1 ? "" : "s"
				})`,
			},
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.ExtNVMWriteLongBuffer)
export class ExtNVMWriteLongBufferResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.success = this.payload[0] !== 0;
	}

	public readonly success: boolean;

	public isOK(): boolean {
		return this.success;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				success: this.success,
			},
		};
	}
}
