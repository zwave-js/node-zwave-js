import {
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core";
import type { CCEncodingContext, ZWaveHost } from "@zwave-js/host";
import type {
	MessageEncodingContext,
	SuccessIndicator,
} from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageOptions,
	MessageType,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName, num2hex } from "@zwave-js/shared";

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

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.command]),
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
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		super(host, options);
		this.command = ExtendedNVMOperationsCommand.Open;
	}
}

// =============================================================================

export class ExtendedNVMOperationsCloseRequest
	extends ExtendedNVMOperationsRequest
{
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		super(host, options);
		this.command = ExtendedNVMOperationsCommand.Close;
	}
}

// =============================================================================

export interface ExtendedNVMOperationsReadRequestOptions
	extends MessageBaseOptions
{
	length: number;
	offset: number;
}

export class ExtendedNVMOperationsReadRequest
	extends ExtendedNVMOperationsRequest
{
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| ExtendedNVMOperationsReadRequestOptions,
	) {
		super(host, options);
		this.command = ExtendedNVMOperationsCommand.Read;

		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
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
	}

	public length: number;
	public offset: number;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = Buffer.allocUnsafe(5);
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

export interface ExtendedNVMOperationsWriteRequestOptions
	extends MessageBaseOptions
{
	offset: number;
	buffer: Buffer;
}

export class ExtendedNVMOperationsWriteRequest
	extends ExtendedNVMOperationsRequest
{
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| ExtendedNVMOperationsWriteRequestOptions,
	) {
		super(host, options);
		this.command = ExtendedNVMOperationsCommand.Write;

		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
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
	}

	public offset: number;
	public buffer: Buffer;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = Buffer.allocUnsafe(1 + 4 + this.buffer.length);
		this.payload[0] = this.buffer.length;
		this.payload.writeUInt32BE(this.offset, 1);
		this.buffer.copy(this.payload, 5);
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

@messageTypes(MessageType.Response, FunctionType.ExtendedNVMOperations)
export class ExtendedNVMOperationsResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);
		this.status = this.payload[0];
		const dataLength = this.payload[1];

		let offset = 2;

		if (this.payload.length >= offset + 4) {
			this.offsetOrSize = this.payload.readUInt32BE(offset);
		} else {
			this.offsetOrSize = 0;
		}

		offset += 4;

		// The buffer will contain:
		// - Read command: the read NVM data
		// - Write/Close command: nothing
		// - Open command: bit mask of supported sub-commands
		if (dataLength > 0 && this.payload.length >= offset + dataLength) {
			this.bufferOrBitmask = this.payload.subarray(
				offset,
				offset + dataLength,
			);
		} else {
			this.bufferOrBitmask = Buffer.from([]);
		}
	}

	isOK(): boolean {
		return (
			this.status === ExtendedNVMOperationStatus.OK
			|| this.status === ExtendedNVMOperationStatus.EndOfFile
		);
	}

	public readonly status: ExtendedNVMOperationStatus;
	public readonly offsetOrSize: number;
	public readonly bufferOrBitmask: Buffer;

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
