import {
	createSimpleReflectionDecorator,
	MessageOrCCLogEntry,
	MessagePriority,
	MessageRecord,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type {
	DeserializingMessageConstructor,
	MessageBaseOptions,
} from "@zwave-js/serial";
import {
	expectedResponse,
	FunctionType,
	gotDeserializationOptions,
	Message,
	MessageDeserializationOptions,
	MessageOptions,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName, num2hex } from "@zwave-js/shared";

export enum FirmwareUpdateNVMCommand {
	Init = 0x00,
	SetNewImage = 0x01,
	GetNewImage = 0x02,
	UpdateCRC16 = 0x03,
	IsValidCRC16 = 0x04,
	Write = 0x05,
}

// We need to define the decorators for Requests and Responses separately
const {
	decorator: subCommandRequest,
	// lookupConstructor: getSubCommandRequestConstructor,
	lookupValue: getSubCommandForRequest,
} = createSimpleReflectionDecorator<
	FirmwareUpdateNVMRequest,
	[command: FirmwareUpdateNVMCommand],
	DeserializingMessageConstructor<FirmwareUpdateNVMRequest>
>({
	name: "subCommandRequest",
});

const {
	decorator: subCommandResponse,
	lookupConstructor: getSubCommandResponseConstructor,
} = createSimpleReflectionDecorator<
	FirmwareUpdateNVMResponse,
	[command: FirmwareUpdateNVMCommand],
	DeserializingMessageConstructor<FirmwareUpdateNVMResponse>
>({
	name: "subCommandResponse",
});

function testResponseForFirmwareUpdateNVMRequest(
	sent: Message,
	received: Message,
) {
	if (!(received instanceof FirmwareUpdateNVMResponse)) return false;
	return (sent as FirmwareUpdateNVMRequest).command === received.command;
}

@messageTypes(MessageType.Request, FunctionType.FirmwareUpdateNVM)
@priority(MessagePriority.Controller)
@expectedResponse(testResponseForFirmwareUpdateNVMRequest)
export class FirmwareUpdateNVMRequest extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions = {}) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.command = getSubCommandForRequest(this)!;
		}
	}

	public command: FirmwareUpdateNVMCommand;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.command]),
			this.payload,
		]);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			command: getEnumMemberName(FirmwareUpdateNVMCommand, this.command),
		};
		if (this.payload.length > 0) {
			message.payload = `0x${this.payload.toString("hex")}`;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@messageTypes(MessageType.Response, FunctionType.FirmwareUpdateNVM)
export class FirmwareUpdateNVMResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.command = this.payload[0];

		const CommandConstructor = getSubCommandResponseConstructor(
			this.command,
		);
		if (CommandConstructor && (new.target as any) !== CommandConstructor) {
			return new CommandConstructor(host, options);
		}

		this.payload = this.payload.slice(1);
	}

	public command: FirmwareUpdateNVMCommand;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			command: getEnumMemberName(FirmwareUpdateNVMCommand, this.command),
		};
		if (this.payload.length > 0) {
			message.payload = `0x${this.payload.toString("hex")}`;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

// =============================================================================

@subCommandRequest(FirmwareUpdateNVMCommand.Init)
export class FirmwareUpdateNVM_InitRequest extends FirmwareUpdateNVMRequest {}

@subCommandResponse(FirmwareUpdateNVMCommand.Init)
export class FirmwareUpdateNVM_InitResponse extends FirmwareUpdateNVMResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.supported = this.payload[0] !== 0;
	}

	public readonly supported: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message["FW update supported"] = this.supported;
		delete message.payload;
		return ret;
	}
}

// =============================================================================

export interface FirmwareUpdateNVM_SetNewImageRequestOptions
	extends MessageBaseOptions {
	newImage: boolean;
}

@subCommandRequest(FirmwareUpdateNVMCommand.SetNewImage)
export class FirmwareUpdateNVM_SetNewImageRequest extends FirmwareUpdateNVMRequest {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| FirmwareUpdateNVM_SetNewImageRequestOptions,
	) {
		super(host, options);
		this.command = FirmwareUpdateNVMCommand.SetNewImage;

		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.newImage = options.newImage;
		}
	}

	public newImage: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.newImage ? 1 : 0]);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message["new image"] = this.newImage;
		delete message.payload;
		return ret;
	}
}

@subCommandResponse(FirmwareUpdateNVMCommand.SetNewImage)
export class FirmwareUpdateNVM_SetNewImageResponse extends FirmwareUpdateNVMResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.changed = this.payload[0] !== 0;
	}

	public readonly changed: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.changed = this.changed;
		delete message.payload;
		return ret;
	}
}

// =============================================================================

@subCommandRequest(FirmwareUpdateNVMCommand.GetNewImage)
export class FirmwareUpdateNVM_GetNewImageRequest extends FirmwareUpdateNVMRequest {}

@subCommandResponse(FirmwareUpdateNVMCommand.GetNewImage)
export class FirmwareUpdateNVM_GetNewImageResponse extends FirmwareUpdateNVMResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.newImage = this.payload[0] !== 0;
	}

	public readonly newImage: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message["new image"] = this.newImage;
		delete message.payload;
		return ret;
	}
}

// =============================================================================

export interface FirmwareUpdateNVM_UpdateCRC16RequestOptions
	extends MessageBaseOptions {
	crcSeed: number;
	offset: number;
	blockLength: number;
}

@subCommandRequest(FirmwareUpdateNVMCommand.UpdateCRC16)
export class FirmwareUpdateNVM_UpdateCRC16Request extends FirmwareUpdateNVMRequest {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| FirmwareUpdateNVM_UpdateCRC16RequestOptions,
	) {
		super(host, options);
		this.command = FirmwareUpdateNVMCommand.UpdateCRC16;

		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.crcSeed = options.crcSeed;
			this.offset = options.offset;
			this.blockLength = options.blockLength;
		}
	}

	public crcSeed: number;
	public offset: number;
	public blockLength: number;

	public override getResponseTimeout(): number | undefined {
		// Computing the CRC-16 of a couple hundred KB can take a while on slow sticks
		return 30000;
	}

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(7);
		this.payload.writeUIntBE(this.offset, 0, 3);
		this.payload.writeUInt16BE(this.blockLength, 3);
		this.payload.writeUInt16BE(this.crcSeed, 5);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.offset = num2hex(this.offset);
		message["block length"] = this.blockLength;
		message["CRC seed"] = num2hex(this.crcSeed);
		delete message.payload;
		return ret;
	}
}

@subCommandResponse(FirmwareUpdateNVMCommand.UpdateCRC16)
export class FirmwareUpdateNVM_UpdateCRC16Response extends FirmwareUpdateNVMResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 2);
		this.crc16 = this.payload.readUint16BE(0);
	}

	public readonly crc16: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message["CRC-16"] = num2hex(this.crc16);
		delete message.payload;
		return ret;
	}
}

// =============================================================================

@subCommandRequest(FirmwareUpdateNVMCommand.IsValidCRC16)
export class FirmwareUpdateNVM_IsValidCRC16Request extends FirmwareUpdateNVMRequest {
	public override getResponseTimeout(): number | undefined {
		// Computing the CRC-16 of a couple hundred KB can take a while on slow sticks
		return 30000;
	}
}

@subCommandResponse(FirmwareUpdateNVMCommand.IsValidCRC16)
export class FirmwareUpdateNVM_IsValidCRC16Response extends FirmwareUpdateNVMResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.isValid = this.payload[0] !== 0;
		// There are two more bytes containing the CRC result, but we don't care about that
	}

	public readonly isValid: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message["CRC-16 valid"] = this.isValid;
		delete message.payload;
		return ret;
	}
}

// =============================================================================

export interface FirmwareUpdateNVM_WriteRequestOptions
	extends MessageBaseOptions {
	offset: number;
	buffer: Buffer;
}

@subCommandRequest(FirmwareUpdateNVMCommand.Write)
export class FirmwareUpdateNVM_WriteRequest extends FirmwareUpdateNVMRequest {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| FirmwareUpdateNVM_WriteRequestOptions,
	) {
		super(host, options);
		this.command = FirmwareUpdateNVMCommand.Write;

		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.offset = options.offset;
			this.buffer = options.buffer;
		}
	}

	public offset: number;
	public buffer: Buffer;

	public serialize(): Buffer {
		this.payload = Buffer.concat([Buffer.allocUnsafe(5), this.buffer]);
		this.payload.writeUintBE(this.offset, 0, 3);
		this.payload.writeUInt16BE(this.buffer.length, 3);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.offset = num2hex(this.offset);
		if (this.buffer.length > 0) {
			message.buffer = `(${this.buffer.length} byte${
				this.buffer.length === 1 ? "" : "s"
			})`;
		}
		delete message.payload;
		return ret;
	}
}

@subCommandResponse(FirmwareUpdateNVMCommand.Write)
export class FirmwareUpdateNVM_WriteResponse extends FirmwareUpdateNVMResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.overwritten = this.payload[0] !== 0;
	}

	public readonly overwritten: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.overwritten = this.overwritten;
		delete message.payload;
		return ret;
	}
}
