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

export interface ExtNVMWriteLongByteRequestOptions {
	offset: number;
	byte: number;
}

@messageTypes(MessageType.Request, FunctionType.ExtExtWriteLongByte)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.ExtExtWriteLongByte)
export class ExtNVMWriteLongByteRequest extends Message {
	public constructor(
		options: ExtNVMWriteLongByteRequestOptions & MessageBaseOptions,
	) {
		super(options);
		if (options.offset < 0 || options.offset > 0xffffff) {
			throw new ZWaveError(
				"The offset must be a 24-bit number!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		if ((options.byte & 0xff) !== options.byte) {
			throw new ZWaveError(
				"The data must be a byte!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.offset = options.offset;
		this.byte = options.byte;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): ExtNVMWriteLongByteRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ExtNVMWriteLongByteRequest({});
	}

	public offset: number;
	public byte: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(4);
		this.payload.writeUIntBE(this.offset, 0, 3);
		this.payload[3] = this.byte;
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				offset: num2hex(this.offset),
				byte: num2hex(this.byte),
			},
		};
	}
}

export interface ExtNVMWriteLongByteResponseOptions {
	success: boolean;
}

@messageTypes(MessageType.Response, FunctionType.ExtExtWriteLongByte)
export class ExtNVMWriteLongByteResponse extends Message {
	public constructor(
		options: ExtNVMWriteLongByteResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): ExtNVMWriteLongByteResponse {
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
