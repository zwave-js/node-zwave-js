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

export interface ExtNVMReadLongByteRequestOptions {
	offset: number;
}

@messageTypes(MessageType.Request, FunctionType.ExtNVMReadLongByte)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.ExtNVMReadLongByte)
export class ExtNVMReadLongByteRequest extends Message {
	public constructor(
		options: ExtNVMReadLongByteRequestOptions & MessageBaseOptions,
	) {
		super(options);
		if (options.offset < 0 || options.offset > 0xffffff) {
			throw new ZWaveError(
				"The offset must be a 24-bit number!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.offset = options.offset;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): ExtNVMReadLongByteRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ExtNVMReadLongByteRequest({});
	}

	public offset: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(3);
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

export interface ExtNVMReadLongByteResponseOptions {
	byte: number;
}

@messageTypes(MessageType.Response, FunctionType.ExtNVMReadLongByte)
export class ExtNVMReadLongByteResponse extends Message {
	public constructor(
		options: ExtNVMReadLongByteResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.byte = options.byte;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): ExtNVMReadLongByteResponse {
		const byte = raw.payload[0];

		return new this({
			byte,
		});
	}

	public readonly byte: number;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { byte: num2hex(this.byte) },
		};
	}
}
