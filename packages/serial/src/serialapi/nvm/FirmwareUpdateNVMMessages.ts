import {
	type MessageOrCCLogEntry,
	MessagePriority,
	logBuffer,
	mergeLogDict,
	validatePayload,
} from "@zwave-js/core";
import { createSimpleReflectionDecorator } from "@zwave-js/core/reflection";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageConstructor,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import {
	Bytes,
	type BytesView,
	getEnumMemberName,
	num2hex,
} from "@zwave-js/shared";

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
	lookupConstructor: getSubCommandRequestConstructor,
	lookupValue: getSubCommandForRequest,
} = createSimpleReflectionDecorator<
	typeof FirmwareUpdateNVMRequest,
	[command: FirmwareUpdateNVMCommand],
	MessageConstructor<FirmwareUpdateNVMRequest>
>({
	name: "subCommandRequest",
});

const {
	decorator: subCommandResponse,
	lookupConstructor: getSubCommandResponseConstructor,
	lookupValue: getSubCommandForResponse,
} = createSimpleReflectionDecorator<
	typeof FirmwareUpdateNVMResponse,
	[command: FirmwareUpdateNVMCommand],
	MessageConstructor<FirmwareUpdateNVMResponse>
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

export interface FirmwareUpdateNVMRequestOptions {
	command?: FirmwareUpdateNVMCommand;
}

@messageTypes(MessageType.Request, FunctionType.FirmwareUpdateNVM)
@priority(MessagePriority.Controller)
@expectedResponse(testResponseForFirmwareUpdateNVMRequest)
export class FirmwareUpdateNVMRequest extends Message {
	public constructor(
		options: FirmwareUpdateNVMRequestOptions & MessageBaseOptions = {},
	) {
		super(options);
		this.command = options.command ?? getSubCommandForRequest(this)!;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): FirmwareUpdateNVMRequest {
		const command: FirmwareUpdateNVMCommand = raw.payload[0];
		const payload = raw.payload.subarray(1);

		const CommandConstructor = getSubCommandRequestConstructor(command);
		if (CommandConstructor) {
			return CommandConstructor.from(
				raw.withPayload(payload),
				ctx,
			) as FirmwareUpdateNVMRequest;
		}

		const ret = new FirmwareUpdateNVMRequest({
			command,
		});
		ret.payload = payload;
		return ret;
	}

	public command: FirmwareUpdateNVMCommand;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([[this.command], this.payload]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				command: getEnumMemberName(
					FirmwareUpdateNVMCommand,
					this.command,
				),
				payload: logBuffer(this.payload),
			},
		};
	}
}

export interface FirmwareUpdateNVMResponseOptions {
	command?: FirmwareUpdateNVMCommand;
}

@messageTypes(MessageType.Response, FunctionType.FirmwareUpdateNVM)
export class FirmwareUpdateNVMResponse extends Message {
	public constructor(
		options: FirmwareUpdateNVMResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.command = options.command ?? getSubCommandForResponse(this)!;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): FirmwareUpdateNVMResponse {
		const command: FirmwareUpdateNVMCommand = raw.payload[0];
		const payload = raw.payload.subarray(1);

		const CommandConstructor = getSubCommandResponseConstructor(command);
		if (CommandConstructor) {
			return CommandConstructor.from(
				raw.withPayload(payload),
				ctx,
			) as FirmwareUpdateNVMResponse;
		}

		const ret = new FirmwareUpdateNVMResponse({
			command,
		});
		ret.payload = payload;
		return ret;
	}

	public command: FirmwareUpdateNVMCommand;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				command: getEnumMemberName(
					FirmwareUpdateNVMCommand,
					this.command,
				),
				payload: logBuffer(this.payload),
			},
		};
	}
}

// =============================================================================

@subCommandRequest(FirmwareUpdateNVMCommand.Init)
export class FirmwareUpdateNVM_InitRequest extends FirmwareUpdateNVMRequest {}

export interface FirmwareUpdateNVM_InitResponseOptions {
	supported: boolean;
}

@subCommandResponse(FirmwareUpdateNVMCommand.Init)
export class FirmwareUpdateNVM_InitResponse extends FirmwareUpdateNVMResponse {
	public constructor(
		options: FirmwareUpdateNVM_InitResponseOptions & MessageBaseOptions,
	) {
		super(options);

		this.supported = options.supported;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): FirmwareUpdateNVM_InitResponse {
		const supported = raw.payload[0] !== 0;

		return new this({
			supported,
		});
	}

	public readonly supported: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				"FW update supported": this.supported,
				payload: undefined,
			}),
		};
	}
}

// =============================================================================

export interface FirmwareUpdateNVM_SetNewImageRequestOptions {
	newImage: boolean;
}

@subCommandRequest(FirmwareUpdateNVMCommand.SetNewImage)
export class FirmwareUpdateNVM_SetNewImageRequest extends FirmwareUpdateNVMRequest {
	public constructor(
		options: FirmwareUpdateNVM_SetNewImageRequestOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.newImage = options.newImage;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): FirmwareUpdateNVM_SetNewImageRequest {
		const newImage: boolean = raw.payload[0] !== 0;

		return new this({
			newImage,
		});
	}

	public newImage: boolean;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.newImage ? 1 : 0]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				"new image": this.newImage,
				payload: undefined,
			}),
		};
	}
}

export interface FirmwareUpdateNVM_SetNewImageResponseOptions {
	changed: boolean;
}

@subCommandResponse(FirmwareUpdateNVMCommand.SetNewImage)
export class FirmwareUpdateNVM_SetNewImageResponse extends FirmwareUpdateNVMResponse {
	public constructor(
		options: FirmwareUpdateNVM_SetNewImageResponseOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.changed = options.changed;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): FirmwareUpdateNVM_SetNewImageResponse {
		const changed = raw.payload[0] !== 0;

		return new this({
			changed,
		});
	}

	public readonly changed: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				changed: this.changed,
				payload: undefined,
			}),
		};
	}
}

// =============================================================================

@subCommandRequest(FirmwareUpdateNVMCommand.GetNewImage)
export class FirmwareUpdateNVM_GetNewImageRequest extends FirmwareUpdateNVMRequest {}

export interface FirmwareUpdateNVM_GetNewImageResponseOptions {
	newImage: boolean;
}

@subCommandResponse(FirmwareUpdateNVMCommand.GetNewImage)
export class FirmwareUpdateNVM_GetNewImageResponse extends FirmwareUpdateNVMResponse {
	public constructor(
		options: FirmwareUpdateNVM_GetNewImageResponseOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.newImage = options.newImage;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): FirmwareUpdateNVM_GetNewImageResponse {
		const newImage: boolean = raw.payload[0] !== 0;

		return new this({
			newImage,
		});
	}

	public readonly newImage: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				"new image": this.newImage,
				payload: undefined,
			}),
		};
	}
}

// =============================================================================

export interface FirmwareUpdateNVM_UpdateCRC16RequestOptions {
	crcSeed: number;
	offset: number;
	blockLength: number;
}

@subCommandRequest(FirmwareUpdateNVMCommand.UpdateCRC16)
export class FirmwareUpdateNVM_UpdateCRC16Request extends FirmwareUpdateNVMRequest {
	public constructor(
		options: FirmwareUpdateNVM_UpdateCRC16RequestOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.command = FirmwareUpdateNVMCommand.UpdateCRC16;

		this.crcSeed = options.crcSeed;
		this.offset = options.offset;
		this.blockLength = options.blockLength;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): FirmwareUpdateNVM_UpdateCRC16Request {
		validatePayload(raw.payload.length >= 7);
		const offset = raw.payload.readUIntBE(0, 3);
		const blockLength = raw.payload.readUInt16BE(3);
		const crcSeed = raw.payload.readUInt16BE(5);

		return new this({
			crcSeed,
			offset,
			blockLength,
		});
	}

	public crcSeed: number;
	public offset: number;
	public blockLength: number;

	public override getResponseTimeout(): number | undefined {
		// Computing the CRC-16 of a couple hundred KB can take a while on slow sticks
		return 30000;
	}

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(7);
		this.payload.writeUIntBE(this.offset, 0, 3);
		this.payload.writeUInt16BE(this.blockLength, 3);
		this.payload.writeUInt16BE(this.crcSeed, 5);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				offset: num2hex(this.offset),
				"block length": this.blockLength,
				"CRC seed": num2hex(this.crcSeed),
				payload: undefined,
			}),
		};
	}
}

export interface FirmwareUpdateNVM_UpdateCRC16ResponseOptions {
	crc16: number;
}

@subCommandResponse(FirmwareUpdateNVMCommand.UpdateCRC16)
export class FirmwareUpdateNVM_UpdateCRC16Response extends FirmwareUpdateNVMResponse {
	public constructor(
		options: FirmwareUpdateNVM_UpdateCRC16ResponseOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.crc16 = options.crc16;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): FirmwareUpdateNVM_UpdateCRC16Response {
		validatePayload(raw.payload.length >= 2);
		const crc16 = raw.payload.readUInt16BE(0);

		return new this({
			crc16,
		});
	}

	public readonly crc16: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				"CRC-16": num2hex(this.crc16),
				payload: undefined,
			}),
		};
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

export interface FirmwareUpdateNVM_IsValidCRC16ResponseOptions {
	isValid: boolean;
}

@subCommandResponse(FirmwareUpdateNVMCommand.IsValidCRC16)
export class FirmwareUpdateNVM_IsValidCRC16Response extends FirmwareUpdateNVMResponse {
	public constructor(
		options: FirmwareUpdateNVM_IsValidCRC16ResponseOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.isValid = options.isValid;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): FirmwareUpdateNVM_IsValidCRC16Response {
		const isValid = raw.payload[0] !== 0;
		// There are two more bytes containing the CRC result, but we don't care about that

		return new this({
			isValid,
		});
	}

	public readonly isValid: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				"CRC-16 valid": this.isValid,
				payload: undefined,
			}),
		};
	}
}

// =============================================================================

export interface FirmwareUpdateNVM_WriteRequestOptions {
	offset: number;
	buffer: BytesView;
}

@subCommandRequest(FirmwareUpdateNVMCommand.Write)
export class FirmwareUpdateNVM_WriteRequest extends FirmwareUpdateNVMRequest {
	public constructor(
		options: FirmwareUpdateNVM_WriteRequestOptions & MessageBaseOptions,
	) {
		super(options);

		this.offset = options.offset;
		this.buffer = options.buffer;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): FirmwareUpdateNVM_WriteRequest {
		validatePayload(raw.payload.length >= 5);
		const offset = raw.payload.readUIntBE(0, 3);
		const bufferLength = raw.payload.readUInt16BE(3);
		const buffer = raw.payload.subarray(5, 5 + bufferLength);

		return new this({
			offset,
			buffer,
		});
	}

	public offset: number;
	public buffer: BytesView;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(5 + this.buffer.length);
		this.payload.writeUIntBE(this.offset, 0, 3);
		this.payload.writeUInt16BE(this.buffer.length, 3);
		this.payload.set(this.buffer, 5);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				offset: num2hex(this.offset),
				buffer:
					this.buffer.length > 0
						? `(${this.buffer.length} byte${
								this.buffer.length === 1 ? "" : "s"
							})`
						: undefined,
				payload: undefined,
			}),
		};
	}
}

export interface FirmwareUpdateNVM_WriteResponseOptions {
	overwritten: boolean;
}

@subCommandResponse(FirmwareUpdateNVMCommand.Write)
export class FirmwareUpdateNVM_WriteResponse extends FirmwareUpdateNVMResponse {
	public constructor(
		options: FirmwareUpdateNVM_WriteResponseOptions & MessageBaseOptions,
	) {
		super(options);

		this.overwritten = options.overwritten;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): FirmwareUpdateNVM_WriteResponse {
		const overwritten = raw.payload[0] !== 0;

		return new this({
			overwritten,
		});
	}

	public readonly overwritten: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				overwritten: this.overwritten,
				payload: undefined,
			}),
		};
	}
}
