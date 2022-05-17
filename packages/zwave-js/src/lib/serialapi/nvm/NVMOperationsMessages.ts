import {
	MessageOrCCLogEntry,
	MessageRecord,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import {
	expectedResponse,
	FunctionType,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName, num2hex } from "@zwave-js/shared";

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

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.command]),
			this.payload,
		]);

		return super.serialize();
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
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		super(host, options);
		this.command = NVMOperationsCommand.Open;
	}
}

// =============================================================================

export class NVMOperationsCloseRequest extends NVMOperationsRequest {
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		super(host, options);
		this.command = NVMOperationsCommand.Close;
	}
}

// =============================================================================

export interface NVMOperationsReadRequestOptions extends MessageBaseOptions {
	length: number;
	offset: number;
}

export class NVMOperationsReadRequest extends NVMOperationsRequest {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| NVMOperationsReadRequestOptions,
	) {
		super(host, options);
		this.command = NVMOperationsCommand.Read;

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
			if (options.offset < 0 || options.offset > 0xffff) {
				throw new ZWaveError(
					"The offset must be a 16-bit number!",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			this.length = options.length;
			this.offset = options.offset;
		}
	}

	public length: number;
	public offset: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(3);
		this.payload[0] = this.length;
		this.payload.writeUInt16BE(this.offset, 1);

		return super.serialize();
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

export interface NVMOperationsWriteRequestOptions extends MessageBaseOptions {
	offset: number;
	buffer: Buffer;
}

export class NVMOperationsWriteRequest extends NVMOperationsRequest {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| NVMOperationsWriteRequestOptions,
	) {
		super(host, options);
		this.command = NVMOperationsCommand.Write;

		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
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
	}

	public offset: number;
	public buffer: Buffer;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(3 + this.buffer.length);
		this.payload[0] = this.buffer.length;
		this.payload.writeUInt16BE(this.offset, 1);
		this.buffer.copy(this.payload, 3);
		return super.serialize();
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

@messageTypes(MessageType.Response, FunctionType.NVMOperations)
export class NVMOperationsResponse extends Message implements SuccessIndicator {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);
		this.status = this.payload[0];

		if (this.payload.length >= 4) {
			this.offsetOrSize = this.payload.readUInt16BE(2);
		} else {
			this.offsetOrSize = 0;
		}

		const dataLength = this.payload[1];
		// The response to the write command contains the offset and written data length, but no data
		if (dataLength > 0 && this.payload.length >= 4 + dataLength) {
			this.buffer = this.payload.slice(4, 4 + dataLength);
		} else {
			this.buffer = Buffer.from([]);
		}
	}

	isOK(): boolean {
		return (
			this.status === NVMOperationStatus.OK ||
			this.status === NVMOperationStatus.EndOfFile
		);
	}

	public readonly status: NVMOperationStatus;
	public readonly offsetOrSize: number;
	public readonly buffer: Buffer;

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
