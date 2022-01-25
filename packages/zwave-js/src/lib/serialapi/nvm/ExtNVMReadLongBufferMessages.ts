import {
	MessageOrCCLogEntry,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { num2hex } from "@zwave-js/shared";
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

export interface ExtNVMReadLongBufferRequestOptions extends MessageBaseOptions {
	offset: number;
	length: number;
}

@messageTypes(MessageType.Request, FunctionType.ExtNVMReadLongBuffer)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.ExtNVMReadLongBuffer)
export class ExtNVMReadLongBufferRequest extends Message {
	public constructor(
		driver: Driver,
		options:
			| MessageDeserializationOptions
			| ExtNVMReadLongBufferRequestOptions,
	) {
		super(driver, options);
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
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
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
