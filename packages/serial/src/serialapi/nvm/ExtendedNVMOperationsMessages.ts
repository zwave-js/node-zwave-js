import {
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core";
import type {
	MessageEncodingContext,
	MessageParsingContext,
	MessageRaw,
	SuccessIndicator,
} from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes, getEnumMemberName, num2hex } from "@zwave-js/shared";

export enum ExtendedNVMOperationsCommand {
	Open = 0x00,
	Read = 0x01,
	Write = 0x02,
	Close = 0x03,
}

export enum ExtendedNVMOperationStatus {
	OK = 0x00,
	Error = 0x01,
	Error_OperationMismatch = 0x02,
	Error_OperationInterference = 0x03,
	Error_SubCommandNotSupported = 0x04,
	EndOfFile = 0xff,
}

@messageTypes(MessageType.Request, FunctionType.ExtendedNVMOperations)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.ExtendedNVMOperations)
export class ExtendedNVMOperationsRequest extends Message {
	// This must be set in subclasses
	public command!: ExtendedNVMOperationsCommand;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			Bytes.from([this.command]),
			this.payload,
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			command: getEnumMemberName(
				ExtendedNVMOperationsCommand,
				this.command,
			),
		};
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

// =============================================================================

export class ExtendedNVMOperationsOpenRequest
	extends ExtendedNVMOperationsRequest
{
	public constructor(options: MessageBaseOptions = {}) {
		super(options);
		this.command = ExtendedNVMOperationsCommand.Open;
	}
}

// =============================================================================

export class ExtendedNVMOperationsCloseRequest
	extends ExtendedNVMOperationsRequest
{
	public constructor(options: MessageBaseOptions = {}) {
		super(options);
		this.command = ExtendedNVMOperationsCommand.Close;
	}
}

// =============================================================================

export interface ExtendedNVMOperationsReadRequestOptions {
	length: number;
	offset: number;
}

export class ExtendedNVMOperationsReadRequest
	extends ExtendedNVMOperationsRequest
{
	public constructor(
		options: ExtendedNVMOperationsReadRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.command = ExtendedNVMOperationsCommand.Read;

		if (options.length < 0 || options.length > 0xff) {
			throw new ZWaveError(
				"The length must be between 0 and 255!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		if (options.offset < 0 || options.offset > 0xffffffff) {
			throw new ZWaveError(
				"The offset must be a 32-bit number!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.length = options.length;
		this.offset = options.offset;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): ExtendedNVMOperationsReadRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ExtendedNVMOperationsReadRequest({});
	}

	public length: number;
	public offset: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(5);
		this.payload[0] = this.length;
		this.payload.writeUInt32BE(this.offset, 1);

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

export interface ExtendedNVMOperationsWriteRequestOptions {
	offset: number;
	buffer: Uint8Array;
}

export class ExtendedNVMOperationsWriteRequest
	extends ExtendedNVMOperationsRequest
{
	public constructor(
		options: ExtendedNVMOperationsWriteRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.command = ExtendedNVMOperationsCommand.Write;

		if (options.offset < 0 || options.offset > 0xffffffff) {
			throw new ZWaveError(
				"The offset must be a 32-bit number!",
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
	): ExtendedNVMOperationsWriteRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ExtendedNVMOperationsWriteRequest({});
	}

	public offset: number;
	public buffer: Uint8Array;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(1 + 4 + this.buffer.length);
		this.payload[0] = this.buffer.length;
		this.payload.writeUInt32BE(this.offset, 1);
		this.payload.set(this.buffer, 5);
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
export interface ExtendedNVMOperationsResponseOptions {
	status: ExtendedNVMOperationStatus;
	offsetOrSize: number;
	bufferOrBitmask: Uint8Array;
}

@messageTypes(MessageType.Response, FunctionType.ExtendedNVMOperations)
export class ExtendedNVMOperationsResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: ExtendedNVMOperationsResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.status = options.status;
		this.offsetOrSize = options.offsetOrSize;
		this.bufferOrBitmask = options.bufferOrBitmask;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): ExtendedNVMOperationsResponse {
		validatePayload(raw.payload.length >= 2);
		const status: ExtendedNVMOperationStatus = raw.payload[0];
		const dataLength = raw.payload[1];
		let offset = 2;
		let offsetOrSize = 0;
		if (raw.payload.length >= offset + 4) {
			offsetOrSize = raw.payload.readUInt32BE(offset);
		}

		offset += 4;
		// The buffer will contain:
		// - Read command: the read NVM data
		// - Write/Close command: nothing
		// - Open command: bit mask of supported sub-commands
		let bufferOrBitmask: Uint8Array;
		if (dataLength > 0 && raw.payload.length >= offset + dataLength) {
			bufferOrBitmask = raw.payload.subarray(
				offset,
				offset + dataLength,
			);
		} else {
			bufferOrBitmask = new Uint8Array();
		}

		return new this({
			status,
			offsetOrSize,
			bufferOrBitmask,
		});
	}

	isOK(): boolean {
		return (
			this.status === ExtendedNVMOperationStatus.OK
			|| this.status === ExtendedNVMOperationStatus.EndOfFile
		);
	}

	public readonly status: ExtendedNVMOperationStatus;
	public readonly offsetOrSize: number;
	public readonly bufferOrBitmask: Uint8Array;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			status: getEnumMemberName(ExtendedNVMOperationStatus, this.status),
			"address offset / NVM size": num2hex(this.offsetOrSize),
		};
		if (this.bufferOrBitmask.length > 0) {
			message.buffer = `(${this.bufferOrBitmask.length} byte${
				this.bufferOrBitmask.length === 1 ? "" : "s"
			})`;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}
