import {
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	type SuccessIndicator,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes, getEnumMemberName, num2hex } from "@zwave-js/shared";

export enum NVMOperationsCommand {
	Open = 0x00,
	Read = 0x01,
	Write = 0x02,
	Close = 0x03,
}

export enum NVMOperationStatus {
	OK = 0x00,
	Error = 0x01,
	Error_OperationMismatch = 0x02,
	Error_OperationInterference = 0x03,
	EndOfFile = 0xff,
}

@messageTypes(MessageType.Request, FunctionType.NVMOperations)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.NVMOperations)
export class NVMOperationsRequest extends Message {
	// This must be set in subclasses
	public command!: NVMOperationsCommand;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			Bytes.from([this.command]),
			this.payload,
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			command: getEnumMemberName(NVMOperationsCommand, this.command),
		};
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

// =============================================================================

export class NVMOperationsOpenRequest extends NVMOperationsRequest {
	public constructor(options: MessageBaseOptions = {}) {
		super(options);
		this.command = NVMOperationsCommand.Open;
	}
}

// =============================================================================

export class NVMOperationsCloseRequest extends NVMOperationsRequest {
	public constructor(options: MessageBaseOptions = {}) {
		super(options);
		this.command = NVMOperationsCommand.Close;
	}
}

// =============================================================================

export interface NVMOperationsReadRequestOptions {
	length: number;
	offset: number;
}

export class NVMOperationsReadRequest extends NVMOperationsRequest {
	public constructor(
		options: NVMOperationsReadRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.command = NVMOperationsCommand.Read;

		if (options.length < 0 || options.length > 0xff) {
			throw new ZWaveError(
				"The length must be between 0 and 255!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		if (options.offset < 0 || options.offset > 0xffff) {
			throw new ZWaveError(
				"The offset must be a 16-bit number!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.length = options.length;
		this.offset = options.offset;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): NVMOperationsReadRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new NVMOperationsReadRequest({});
	}

	public length: number;
	public offset: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(3);
		this.payload[0] = this.length;
		this.payload.writeUInt16BE(this.offset, 1);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: {
				...ret.message,
				"data length": this.length,
				"address offset": num2hex(this.offset),
			},
		};
	}
}

// =============================================================================

export interface NVMOperationsWriteRequestOptions {
	offset: number;
	buffer: Uint8Array;
}

export class NVMOperationsWriteRequest extends NVMOperationsRequest {
	public constructor(
		options: NVMOperationsWriteRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.command = NVMOperationsCommand.Write;

		if (options.offset < 0 || options.offset > 0xffff) {
			throw new ZWaveError(
				"The offset must be a 16-bit number!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		if (options.buffer.length < 1 || options.buffer.length > 0xff) {
			throw new ZWaveError(
				"The buffer must be between 1 and 255 bytes long",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.offset = options.offset;
		this.buffer = options.buffer;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): NVMOperationsWriteRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new NVMOperationsWriteRequest({});
	}

	public offset: number;
	public buffer: Uint8Array;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(3 + this.buffer.length);
		this.payload[0] = this.buffer.length;
		this.payload.writeUInt16BE(this.offset, 1);
		this.payload.set(this.buffer, 3);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: {
				...ret.message,
				offset: num2hex(this.offset),
				buffer: `(${this.buffer.length} byte${
					this.buffer.length === 1 ? "" : "s"
				})`,
			},
		};
	}
}

// =============================================================================
export interface NVMOperationsResponseOptions {
	status: NVMOperationStatus;
	offsetOrSize: number;
	buffer: Uint8Array;
}

@messageTypes(MessageType.Response, FunctionType.NVMOperations)
export class NVMOperationsResponse extends Message implements SuccessIndicator {
	public constructor(
		options: NVMOperationsResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.status = options.status;
		this.offsetOrSize = options.offsetOrSize;
		this.buffer = options.buffer;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): NVMOperationsResponse {
		validatePayload(raw.payload.length >= 2);
		const status: NVMOperationStatus = raw.payload[0];
		let offsetOrSize;
		if (raw.payload.length >= 4) {
			offsetOrSize = raw.payload.readUInt16BE(2);
		} else {
			offsetOrSize = 0;
		}

		const dataLength = raw.payload[1];
		// The response to the write command contains the offset and written data length, but no data
		let buffer: Uint8Array;
		if (dataLength > 0 && raw.payload.length >= 4 + dataLength) {
			buffer = raw.payload.subarray(4, 4 + dataLength);
		} else {
			buffer = new Uint8Array();
		}

		return new this({
			status,
			offsetOrSize,
			buffer,
		});
	}

	isOK(): boolean {
		return (
			this.status === NVMOperationStatus.OK
			|| this.status === NVMOperationStatus.EndOfFile
		);
	}

	public readonly status: NVMOperationStatus;
	public readonly offsetOrSize: number;
	public readonly buffer: Uint8Array;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			status: getEnumMemberName(NVMOperationStatus, this.status),
			"address offset / NVM size": num2hex(this.offsetOrSize),
		};
		if (this.buffer.length > 0) {
			message.buffer = `(${this.buffer.length} byte${
				this.buffer.length === 1 ? "" : "s"
			})`;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}
