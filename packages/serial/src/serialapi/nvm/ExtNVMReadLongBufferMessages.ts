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
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes, num2hex } from "@zwave-js/shared";

export interface ExtNVMReadLongBufferRequestOptions {
	offset: number;
	length: number;
}

@messageTypes(MessageType.Request, FunctionType.ExtNVMReadLongBuffer)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.ExtNVMReadLongBuffer)
export class ExtNVMReadLongBufferRequest extends Message {
	public constructor(
		options: ExtNVMReadLongBufferRequestOptions & MessageBaseOptions,
	) {
		super(options);
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

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): ExtNVMReadLongBufferRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ExtNVMReadLongBufferRequest({});
	}

	public offset: number;
	public length: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(5);
		this.payload.writeUIntBE(this.offset, 0, 3);
		this.payload.writeUInt16BE(this.length, 3);
		return super.serialize(ctx);
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

export interface ExtNVMReadLongBufferResponseOptions {
	buffer: Uint8Array;
}

@messageTypes(MessageType.Response, FunctionType.ExtNVMReadLongBuffer)
export class ExtNVMReadLongBufferResponse extends Message {
	public constructor(
		options: ExtNVMReadLongBufferResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.buffer = options.buffer;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): ExtNVMReadLongBufferResponse {
		return new this({
			buffer: raw.payload,
		});
	}

	public readonly buffer: Uint8Array;

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
