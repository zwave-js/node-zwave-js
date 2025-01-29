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

export interface ExtNVMWriteLongBufferRequestOptions {
	offset: number;
	buffer: Uint8Array;
}

@messageTypes(MessageType.Request, FunctionType.ExtNVMWriteLongBuffer)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.ExtNVMWriteLongBuffer)
export class ExtNVMWriteLongBufferRequest extends Message {
	public constructor(
		options: ExtNVMWriteLongBufferRequestOptions & MessageBaseOptions,
	) {
		super(options);
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

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): ExtNVMWriteLongBufferRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ExtNVMWriteLongBufferRequest({});
	}

	public offset: number;
	public buffer: Uint8Array;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(5 + this.buffer.length);
		this.payload.writeUIntBE(this.offset, 0, 3);
		this.payload.writeUInt16BE(this.buffer.length, 3);
		this.payload.set(this.buffer, 5);
		return super.serialize(ctx);
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

export interface ExtNVMWriteLongBufferResponseOptions {
	success: boolean;
}

@messageTypes(MessageType.Response, FunctionType.ExtNVMWriteLongBuffer)
export class ExtNVMWriteLongBufferResponse extends Message {
	public constructor(
		options: ExtNVMWriteLongBufferResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): ExtNVMWriteLongBufferResponse {
		const success = raw.payload[0] !== 0;

		return new this({
			success,
		});
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
