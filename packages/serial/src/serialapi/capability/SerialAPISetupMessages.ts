import {
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	NodeIDType,
	RFRegion,
	ZWaveError,
	ZWaveErrorCodes,
	parseBitMask,
	validatePayload,
} from "@zwave-js/core";
import { sdkVersionLt } from "@zwave-js/core";
import { createSimpleReflectionDecorator } from "@zwave-js/core/reflection";
import type {
	MessageConstructor,
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
import { Bytes, getEnumMemberName } from "@zwave-js/shared";

export enum SerialAPISetupCommand {
	Unsupported = 0x00,
	GetSupportedCommands = 0x01,
	SetTxStatusReport = 0x02,
	SetLongRangeMaximumTxPower = 0x03,
	SetPowerlevel = 0x04,
	GetLongRangeMaximumTxPower = 0x05,
	GetPowerlevel = 0x08,
	GetMaximumPayloadSize = 0x10,
	GetRFRegion = 0x20,
	SetRFRegion = 0x40,
	SetNodeIDType = 0x80,

	GetLongRangeMaximumPayloadSize = 0x11,
	SetPowerlevel16Bit = 0x12,
	GetPowerlevel16Bit = 0x13,
	GetSupportedRegions = 0x15,
	GetRegionInfo = 0x16,
}

// We need to define the decorators for Requests and Responses separately
const {
	decorator: subCommandRequest,
	lookupConstructor: getSubCommandRequestConstructor,
	lookupValue: getSubCommandForRequest,
} = createSimpleReflectionDecorator<
	typeof SerialAPISetupRequest,
	[command: SerialAPISetupCommand],
	MessageConstructor<SerialAPISetupRequest>
>({
	name: "subCommandRequest",
});

const {
	decorator: subCommandResponse,
	lookupConstructor: getSubCommandResponseConstructor,
	lookupValue: getSubCommandForResponse,
} = createSimpleReflectionDecorator<
	typeof SerialAPISetupResponse,
	[command: SerialAPISetupCommand],
	MessageConstructor<SerialAPISetupResponse>
>({
	name: "subCommandResponse",
});

function testResponseForSerialAPISetupRequest(
	sent: Message,
	received: Message,
) {
	if (!(received instanceof SerialAPISetupResponse)) return false;
	return (sent as SerialAPISetupRequest).command === received.command;
}

export interface SerialAPISetupRequestOptions {
	command?: SerialAPISetupCommand;
}

@messageTypes(MessageType.Request, FunctionType.SerialAPISetup)
@priority(MessagePriority.Controller)
@expectedResponse(testResponseForSerialAPISetupRequest)
export class SerialAPISetupRequest extends Message {
	public constructor(
		options: SerialAPISetupRequestOptions & MessageBaseOptions = {},
	) {
		super(options);
		this.command = options.command ?? getSubCommandForRequest(this)!;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SerialAPISetupRequest {
		const command: SerialAPISetupCommand = raw.payload[0];
		const payload = raw.payload.subarray(1);

		const CommandConstructor = getSubCommandRequestConstructor(
			command,
		);
		if (CommandConstructor) {
			return CommandConstructor.from(
				raw.withPayload(payload),
				ctx,
			) as SerialAPISetupRequest;
		}

		const ret = new SerialAPISetupRequest({
			command,
		});
		ret.payload = payload;
		return ret;
	}

	public command: SerialAPISetupCommand;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			Bytes.from([this.command]),
			this.payload,
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			command: getEnumMemberName(SerialAPISetupCommand, this.command),
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

export interface SerialAPISetupResponseOptions {
	command?: SerialAPISetupCommand;
}

@messageTypes(MessageType.Response, FunctionType.SerialAPISetup)
export class SerialAPISetupResponse extends Message {
	public constructor(
		options: SerialAPISetupResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.command = options.command ?? getSubCommandForResponse(this)!;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SerialAPISetupResponse {
		const command: SerialAPISetupCommand = raw.payload[0];
		const payload = raw.payload.subarray(1);

		const CommandConstructor = getSubCommandResponseConstructor(
			command,
		);
		if (CommandConstructor) {
			return CommandConstructor.from(
				raw.withPayload(payload),
				ctx,
			) as SerialAPISetupResponse;
		}

		const ret = new SerialAPISetupResponse({
			command,
		});
		ret.payload = payload;
		return ret;
	}

	public command: SerialAPISetupCommand;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			command: getEnumMemberName(SerialAPISetupCommand, this.command),
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

export interface SerialAPISetup_CommandUnsupportedResponseOptions {
	command: SerialAPISetupCommand;
}

@subCommandResponse(0x00)
export class SerialAPISetup_CommandUnsupportedResponse
	extends SerialAPISetupResponse
{
	public constructor(
		options:
			& SerialAPISetup_CommandUnsupportedResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.command = options.command;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_CommandUnsupportedResponse {
		// The payload contains which command is unsupported
		const command: any = raw.payload[0];

		return new this({
			command,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.error = "unsupported command";
		message.command = getEnumMemberName(
			SerialAPISetupCommand,
			this.command,
		);
		delete message.payload;
		return ret;
	}
}

// =============================================================================

@subCommandRequest(SerialAPISetupCommand.GetSupportedCommands)
export class SerialAPISetup_GetSupportedCommandsRequest
	extends SerialAPISetupRequest
{}

export interface SerialAPISetup_GetSupportedCommandsResponseOptions {
	supportedCommands: SerialAPISetupCommand[];
}

@subCommandResponse(SerialAPISetupCommand.GetSupportedCommands)
export class SerialAPISetup_GetSupportedCommandsResponse
	extends SerialAPISetupResponse
{
	public constructor(
		options:
			& SerialAPISetup_GetSupportedCommandsResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.supportedCommands = options.supportedCommands;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SerialAPISetup_GetSupportedCommandsResponse {
		validatePayload(raw.payload.length >= 1);
		let supportedCommands: SerialAPISetupCommand[];
		if (raw.payload.length > 1) {
			// This module supports the extended bitmask to report the supported serial API setup commands
			// Parse it as a bitmask
			supportedCommands = parseBitMask(
				raw.payload.subarray(1),
				// According to the Host API specification, the first bit (bit 0) should be GetSupportedCommands
				// However, in Z-Wave SDK < 7.19.1, the entire bitmask is shifted by 1 bit and
				// GetSupportedCommands is encoded in the second bit (bit 1)
				sdkVersionLt(ctx.sdkVersion, "7.19.1")
					? SerialAPISetupCommand.Unsupported
					: SerialAPISetupCommand.GetSupportedCommands,
			);
		} else {
			// This module only uses the single byte power-of-2 bitmask. Decode it manually
			supportedCommands = [];
			for (
				const cmd of [
					SerialAPISetupCommand.GetSupportedCommands,
					SerialAPISetupCommand.SetTxStatusReport,
					SerialAPISetupCommand.SetPowerlevel,
					SerialAPISetupCommand.GetPowerlevel,
					SerialAPISetupCommand.GetMaximumPayloadSize,
					SerialAPISetupCommand.GetRFRegion,
					SerialAPISetupCommand.SetRFRegion,
					SerialAPISetupCommand.SetNodeIDType,
				] as const
			) {
				if (!!(raw.payload[0] & cmd)) supportedCommands.push(cmd);
			}
		}

		// Apparently GetSupportedCommands is not always included in the bitmask, although we
		// just received a response to the command
		if (
			!supportedCommands.includes(
				SerialAPISetupCommand.GetSupportedCommands,
			)
		) {
			supportedCommands.unshift(
				SerialAPISetupCommand.GetSupportedCommands,
			);
		}

		return new this({
			supportedCommands,
		});
	}

	public readonly supportedCommands: SerialAPISetupCommand[];
}

// =============================================================================

export interface SerialAPISetup_SetTXStatusReportOptions {
	enabled: boolean;
}

@subCommandRequest(SerialAPISetupCommand.SetTxStatusReport)
export class SerialAPISetup_SetTXStatusReportRequest
	extends SerialAPISetupRequest
{
	public constructor(
		options: SerialAPISetup_SetTXStatusReportOptions & MessageBaseOptions,
	) {
		super(options);
		this.enabled = options.enabled;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_SetTXStatusReportRequest {
		const enabled = raw.payload[0] === 0xff;

		return new this({
			enabled,
		});
	}

	public enabled: boolean;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.enabled ? 0xff : 0x00]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.enabled = this.enabled;
		delete message.payload;
		return ret;
	}
}

export interface SerialAPISetup_SetTXStatusReportResponseOptions {
	success: boolean;
}

@subCommandResponse(SerialAPISetupCommand.SetTxStatusReport)
export class SerialAPISetup_SetTXStatusReportResponse
	extends SerialAPISetupResponse
	implements SuccessIndicator
{
	public constructor(
		options:
			& SerialAPISetup_SetTXStatusReportResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_SetTXStatusReportResponse {
		const success = raw.payload[0] !== 0;

		return new this({
			success,
		});
	}

	isOK(): boolean {
		return this.success;
	}

	public readonly success: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.success = this.success;
		delete message.payload;
		return ret;
	}
}

// =============================================================================

export interface SerialAPISetup_SetNodeIDTypeOptions {
	nodeIdType: NodeIDType;
}

@subCommandRequest(SerialAPISetupCommand.SetNodeIDType)
export class SerialAPISetup_SetNodeIDTypeRequest extends SerialAPISetupRequest {
	public constructor(
		options: SerialAPISetup_SetNodeIDTypeOptions & MessageBaseOptions,
	) {
		super(options);
		this.nodeIdType = options.nodeIdType;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_SetNodeIDTypeRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new SerialAPISetup_SetNodeIDTypeRequest({});
	}

	public nodeIdType: NodeIDType;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.nodeIdType]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message["node ID type"] = this.nodeIdType === NodeIDType.Short
			? "8 bit"
			: "16 bit";
		delete message.payload;
		return ret;
	}
}

export interface SerialAPISetup_SetNodeIDTypeResponseOptions {
	success: boolean;
}

@subCommandResponse(SerialAPISetupCommand.SetNodeIDType)
export class SerialAPISetup_SetNodeIDTypeResponse extends SerialAPISetupResponse
	implements SuccessIndicator
{
	public constructor(
		options:
			& SerialAPISetup_SetNodeIDTypeResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_SetNodeIDTypeResponse {
		const success = raw.payload[0] !== 0;

		return new this({
			success,
		});
	}

	isOK(): boolean {
		return this.success;
	}

	public readonly success: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.success = this.success;
		delete message.payload;
		return ret;
	}
}

// =============================================================================

@subCommandRequest(SerialAPISetupCommand.GetRFRegion)
export class SerialAPISetup_GetRFRegionRequest extends SerialAPISetupRequest {}

export interface SerialAPISetup_GetRFRegionResponseOptions {
	region: RFRegion;
}

@subCommandResponse(SerialAPISetupCommand.GetRFRegion)
export class SerialAPISetup_GetRFRegionResponse extends SerialAPISetupResponse {
	public constructor(
		options: SerialAPISetup_GetRFRegionResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.region = options.region;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_GetRFRegionResponse {
		const region: RFRegion = raw.payload[0];

		return new this({
			region,
		});
	}

	public readonly region: RFRegion;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.region = getEnumMemberName(RFRegion, this.region);
		delete message.payload;
		return ret;
	}
}

// =============================================================================

export interface SerialAPISetup_SetRFRegionOptions {
	region: RFRegion;
}

@subCommandRequest(SerialAPISetupCommand.SetRFRegion)
export class SerialAPISetup_SetRFRegionRequest extends SerialAPISetupRequest {
	public constructor(
		options: SerialAPISetup_SetRFRegionOptions & MessageBaseOptions,
	) {
		super(options);
		this.region = options.region;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_SetRFRegionRequest {
		const region: RFRegion = raw.payload[0];

		return new this({
			region,
		});
	}

	public region: RFRegion;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.region]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.region = getEnumMemberName(RFRegion, this.region);
		delete message.payload;
		return ret;
	}
}

export interface SerialAPISetup_SetRFRegionResponseOptions {
	success: boolean;
}

@subCommandResponse(SerialAPISetupCommand.SetRFRegion)
export class SerialAPISetup_SetRFRegionResponse extends SerialAPISetupResponse
	implements SuccessIndicator
{
	public constructor(
		options: SerialAPISetup_SetRFRegionResponseOptions & MessageBaseOptions,
	) {
		super(options);
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_SetRFRegionResponse {
		const success = raw.payload[0] !== 0;

		return new this({
			success,
		});
	}

	isOK(): boolean {
		return this.success;
	}

	public readonly success: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.success = this.success;
		delete message.payload;
		return ret;
	}
}

// =============================================================================

@subCommandRequest(SerialAPISetupCommand.GetPowerlevel)
export class SerialAPISetup_GetPowerlevelRequest
	extends SerialAPISetupRequest
{}

export interface SerialAPISetup_GetPowerlevelResponseOptions {
	powerlevel: number;
	measured0dBm: number;
}

@subCommandResponse(SerialAPISetupCommand.GetPowerlevel)
export class SerialAPISetup_GetPowerlevelResponse
	extends SerialAPISetupResponse
{
	public constructor(
		options:
			& SerialAPISetup_GetPowerlevelResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.powerlevel = options.powerlevel;
		this.measured0dBm = options.measured0dBm;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_GetPowerlevelResponse {
		validatePayload(raw.payload.length >= 2);
		// The values are in 0.1 dBm, signed
		const powerlevel = raw.payload.readInt8(0) / 10;
		const measured0dBm = raw.payload.readInt8(1) / 10;

		return new this({
			powerlevel,
			measured0dBm,
		});
	}

	/** The configured normal powerlevel in dBm */
	public readonly powerlevel: number;
	/** The measured output power in dBm for a normal output powerlevel of 0 */
	public readonly measured0dBm: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message: MessageRecord = {
			...ret.message!,
			"normal powerlevel": `${this.powerlevel.toFixed(1)} dBm`,
			"output power at 0 dBm": `${this.measured0dBm.toFixed(1)} dBm`,
		};
		delete message.payload;
		ret.message = message;
		return ret;
	}
}

// =============================================================================

export interface SerialAPISetup_SetPowerlevelOptions {
	powerlevel: number;
	measured0dBm: number;
}

@subCommandRequest(SerialAPISetupCommand.SetPowerlevel)
export class SerialAPISetup_SetPowerlevelRequest extends SerialAPISetupRequest {
	public constructor(
		options: SerialAPISetup_SetPowerlevelOptions & MessageBaseOptions,
	) {
		super(options);

		if (options.powerlevel < -12.8 || options.powerlevel > 12.7) {
			throw new ZWaveError(
				`The normal powerlevel must be between -12.8 and +12.7 dBm`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		if (options.measured0dBm < -12.8 || options.measured0dBm > 12.7) {
			throw new ZWaveError(
				`The measured output power at 0 dBm must be between -12.8 and +12.7 dBm`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.powerlevel = options.powerlevel;
		this.measured0dBm = options.measured0dBm;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_SetPowerlevelRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new SerialAPISetup_SetPowerlevelRequest({});
	}

	public powerlevel: number;
	public measured0dBm: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(2);
		// The values are in 0.1 dBm
		this.payload.writeInt8(Math.round(this.powerlevel * 10), 0);
		this.payload.writeInt8(Math.round(this.measured0dBm * 10), 1);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message: MessageRecord = {
			...ret.message!,
			"normal powerlevel": `${this.powerlevel.toFixed(1)} dBm`,
			"output power at 0 dBm": `${this.measured0dBm.toFixed(1)} dBm`,
		};
		delete message.payload;
		ret.message = message;
		return ret;
	}
}

export interface SerialAPISetup_SetPowerlevelResponseOptions {
	success: boolean;
}

@subCommandResponse(SerialAPISetupCommand.SetPowerlevel)
export class SerialAPISetup_SetPowerlevelResponse extends SerialAPISetupResponse
	implements SuccessIndicator
{
	public constructor(
		options:
			& SerialAPISetup_SetPowerlevelResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_SetPowerlevelResponse {
		const success = raw.payload[0] !== 0;

		return new this({
			success,
		});
	}

	isOK(): boolean {
		return this.success;
	}

	public readonly success: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.success = this.success;
		delete message.payload;
		return ret;
	}
}

// =============================================================================

@subCommandRequest(SerialAPISetupCommand.GetPowerlevel16Bit)
export class SerialAPISetup_GetPowerlevel16BitRequest
	extends SerialAPISetupRequest
{}

export interface SerialAPISetup_GetPowerlevel16BitResponseOptions {
	powerlevel: number;
	measured0dBm: number;
}

@subCommandResponse(SerialAPISetupCommand.GetPowerlevel16Bit)
export class SerialAPISetup_GetPowerlevel16BitResponse
	extends SerialAPISetupResponse
{
	public constructor(
		options:
			& SerialAPISetup_GetPowerlevel16BitResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.powerlevel = options.powerlevel;
		this.measured0dBm = options.measured0dBm;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_GetPowerlevel16BitResponse {
		validatePayload(raw.payload.length >= 4);
		// The values are in 0.1 dBm, signed
		const powerlevel = raw.payload.readInt16BE(0) / 10;
		const measured0dBm = raw.payload.readInt16BE(2) / 10;

		return new this({
			powerlevel,
			measured0dBm,
		});
	}

	/** The configured normal powerlevel in dBm */
	public readonly powerlevel: number;
	/** The measured output power in dBm for a normal output powerlevel of 0 */
	public readonly measured0dBm: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message: MessageRecord = {
			...ret.message!,
			"normal powerlevel": `${this.powerlevel.toFixed(1)} dBm`,
			"output power at 0 dBm": `${this.measured0dBm.toFixed(1)} dBm`,
		};
		delete message.payload;
		ret.message = message;
		return ret;
	}
}

// =============================================================================

export interface SerialAPISetup_SetPowerlevel16BitOptions {
	powerlevel: number;
	measured0dBm: number;
}

@subCommandRequest(SerialAPISetupCommand.SetPowerlevel16Bit)
export class SerialAPISetup_SetPowerlevel16BitRequest
	extends SerialAPISetupRequest
{
	public constructor(
		options: SerialAPISetup_SetPowerlevel16BitOptions & MessageBaseOptions,
	) {
		super(options);

		if (options.powerlevel < -10 || options.powerlevel > 20) {
			throw new ZWaveError(
				`The normal powerlevel must be between -10.0 and +20.0 dBm`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		if (options.measured0dBm < -10 || options.measured0dBm > 10) {
			throw new ZWaveError(
				`The measured output power at 0 dBm must be between -10.0 and +10.0 dBm`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.powerlevel = options.powerlevel;
		this.measured0dBm = options.measured0dBm;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_SetPowerlevel16BitRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new SerialAPISetup_SetPowerlevel16BitRequest({});
	}

	public powerlevel: number;
	public measured0dBm: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(4);
		// The values are in 0.1 dBm
		this.payload.writeInt16BE(Math.round(this.powerlevel * 10), 0);
		this.payload.writeInt16BE(Math.round(this.measured0dBm * 10), 2);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message: MessageRecord = {
			...ret.message!,
			"normal powerlevel": `${this.powerlevel.toFixed(1)} dBm`,
			"output power at 0 dBm": `${this.measured0dBm.toFixed(1)} dBm`,
		};
		delete message.payload;
		ret.message = message;
		return ret;
	}
}

export interface SerialAPISetup_SetPowerlevel16BitResponseOptions {
	success: boolean;
}

@subCommandResponse(SerialAPISetupCommand.SetPowerlevel16Bit)
export class SerialAPISetup_SetPowerlevel16BitResponse
	extends SerialAPISetupResponse
	implements SuccessIndicator
{
	public constructor(
		options:
			& SerialAPISetup_SetPowerlevel16BitResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_SetPowerlevel16BitResponse {
		const success = raw.payload[0] !== 0;

		return new this({
			success,
		});
	}

	isOK(): boolean {
		return this.success;
	}

	public readonly success: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.success = this.success;
		delete message.payload;
		return ret;
	}
}

// =============================================================================

@subCommandRequest(SerialAPISetupCommand.GetLongRangeMaximumTxPower)
export class SerialAPISetup_GetLongRangeMaximumTxPowerRequest
	extends SerialAPISetupRequest
{}

export interface SerialAPISetup_GetLongRangeMaximumTxPowerResponseOptions {
	limit: number;
}

@subCommandResponse(SerialAPISetupCommand.GetLongRangeMaximumTxPower)
export class SerialAPISetup_GetLongRangeMaximumTxPowerResponse
	extends SerialAPISetupResponse
{
	public constructor(
		options:
			& SerialAPISetup_GetLongRangeMaximumTxPowerResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.limit = options.limit;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_GetLongRangeMaximumTxPowerResponse {
		validatePayload(raw.payload.length >= 2);
		// The values are in 0.1 dBm, signed
		const limit = raw.payload.readInt16BE(0) / 10;

		return new this({
			limit,
		});
	}

	/** The maximum LR TX power in dBm */
	public readonly limit: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message: MessageRecord = {
			...ret.message!,
			"max. TX power (LR)": `${this.limit.toFixed(1)} dBm`,
		};
		delete message.payload;
		ret.message = message;
		return ret;
	}
}

// =============================================================================

export interface SerialAPISetup_SetLongRangeMaximumTxPowerOptions {
	limit: number;
}

@subCommandRequest(SerialAPISetupCommand.SetLongRangeMaximumTxPower)
export class SerialAPISetup_SetLongRangeMaximumTxPowerRequest
	extends SerialAPISetupRequest
{
	public constructor(
		options:
			& SerialAPISetup_SetLongRangeMaximumTxPowerOptions
			& MessageBaseOptions,
	) {
		super(options);

		if (options.limit < -10 || options.limit > 20) {
			throw new ZWaveError(
				`The maximum LR TX power must be between -10.0 and +20.0 dBm`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.limit = options.limit;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_SetLongRangeMaximumTxPowerRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new SerialAPISetup_SetLongRangeMaximumTxPowerRequest({});
	}

	/** The maximum LR TX power in dBm */
	public limit: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(2);
		// The values are in 0.1 dBm, signed
		this.payload.writeInt16BE(Math.round(this.limit * 10), 0);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message: MessageRecord = {
			...ret.message!,
			"max. TX power (LR)": `${this.limit.toFixed(1)} dBm`,
		};
		delete message.payload;
		ret.message = message;
		return ret;
	}
}

export interface SerialAPISetup_SetLongRangeMaximumTxPowerResponseOptions {
	success: boolean;
}

@subCommandResponse(SerialAPISetupCommand.SetLongRangeMaximumTxPower)
export class SerialAPISetup_SetLongRangeMaximumTxPowerResponse
	extends SerialAPISetupResponse
	implements SuccessIndicator
{
	public constructor(
		options:
			& SerialAPISetup_SetLongRangeMaximumTxPowerResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_SetLongRangeMaximumTxPowerResponse {
		const success = raw.payload[0] !== 0;

		return new this({
			success,
		});
	}

	isOK(): boolean {
		return this.success;
	}

	public readonly success: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.success = this.success;
		delete message.payload;
		return ret;
	}
}

// =============================================================================

@subCommandRequest(SerialAPISetupCommand.GetMaximumPayloadSize)
export class SerialAPISetup_GetMaximumPayloadSizeRequest
	extends SerialAPISetupRequest
{}

export interface SerialAPISetup_GetMaximumPayloadSizeResponseOptions {
	maxPayloadSize: number;
}

@subCommandResponse(SerialAPISetupCommand.GetMaximumPayloadSize)
export class SerialAPISetup_GetMaximumPayloadSizeResponse
	extends SerialAPISetupResponse
{
	public constructor(
		options:
			& SerialAPISetup_GetMaximumPayloadSizeResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.maxPayloadSize = options.maxPayloadSize;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_GetMaximumPayloadSizeResponse {
		const maxPayloadSize = raw.payload[0];

		return new this({
			maxPayloadSize,
		});
	}

	public readonly maxPayloadSize: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message["maximum payload size"] = `${this.maxPayloadSize} bytes`;
		delete message.payload;
		return ret;
	}
}

// =============================================================================

@subCommandRequest(SerialAPISetupCommand.GetLongRangeMaximumPayloadSize)
export class SerialAPISetup_GetLongRangeMaximumPayloadSizeRequest
	extends SerialAPISetupRequest
{}

export interface SerialAPISetup_GetLongRangeMaximumPayloadSizeResponseOptions {
	maxPayloadSize: number;
}

@subCommandResponse(SerialAPISetupCommand.GetLongRangeMaximumPayloadSize)
export class SerialAPISetup_GetLongRangeMaximumPayloadSizeResponse
	extends SerialAPISetupResponse
{
	public constructor(
		options:
			& SerialAPISetup_GetLongRangeMaximumPayloadSizeResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.maxPayloadSize = options.maxPayloadSize;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_GetLongRangeMaximumPayloadSizeResponse {
		const maxPayloadSize = raw.payload[0];

		return new this({
			maxPayloadSize,
		});
	}

	public readonly maxPayloadSize: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message["maximum payload size"] = `${this.maxPayloadSize} bytes`;
		delete message.payload;
		return ret;
	}
}

// =============================================================================

@subCommandRequest(SerialAPISetupCommand.GetSupportedRegions)
export class SerialAPISetup_GetSupportedRegionsRequest
	extends SerialAPISetupRequest
{}

export interface SerialAPISetup_GetSupportedRegionsResponseOptions {
	supportedRegions: RFRegion[];
}

@subCommandResponse(SerialAPISetupCommand.GetSupportedRegions)
export class SerialAPISetup_GetSupportedRegionsResponse
	extends SerialAPISetupResponse
{
	public constructor(
		options:
			& SerialAPISetup_GetSupportedRegionsResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.supportedRegions = options.supportedRegions;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_GetSupportedRegionsResponse {
		validatePayload(raw.payload.length >= 1);
		const numRegions = raw.payload[0];
		validatePayload(numRegions > 0, raw.payload.length >= 1 + numRegions);
		const supportedRegions: RFRegion[] = [
			...raw.payload.subarray(1, 1 + numRegions),
		];

		return new this({
			supportedRegions,
		});
	}

	public readonly supportedRegions: RFRegion[];
}

// =============================================================================

export interface SerialAPISetup_GetRegionInfoOptions {
	region: RFRegion;
}

@subCommandRequest(SerialAPISetupCommand.GetRegionInfo)
export class SerialAPISetup_GetRegionInfoRequest extends SerialAPISetupRequest {
	public constructor(
		options: SerialAPISetup_GetRegionInfoOptions & MessageBaseOptions,
	) {
		super(options);
		this.region = options.region;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_GetRegionInfoRequest {
		const region: RFRegion = raw.payload[0];

		return new this({
			region,
		});
	}

	public region: RFRegion;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.region]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message: MessageRecord = {
			...ret.message!,
			region: getEnumMemberName(RFRegion, this.region),
		};
		delete message.payload;
		ret.message = message;
		return ret;
	}
}

export interface SerialAPISetup_GetRegionInfoResponseOptions {
	region: RFRegion;
	supportsZWave: boolean;
	supportsLongRange: boolean;
	includesRegion?: RFRegion;
}

@subCommandResponse(SerialAPISetupCommand.GetRegionInfo)
export class SerialAPISetup_GetRegionInfoResponse
	extends SerialAPISetupResponse
{
	public constructor(
		options:
			& SerialAPISetup_GetRegionInfoResponseOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.region = options.region;
		this.supportsZWave = options.supportsZWave;
		this.supportsLongRange = options.supportsLongRange;
		this.includesRegion = options.includesRegion;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SerialAPISetup_GetRegionInfoResponse {
		const region: RFRegion = raw.payload[0];
		const supportsZWave = !!(raw.payload[1] & 0b1);
		const supportsLongRange = !!(raw.payload[1] & 0b10);
		let includesRegion: RFRegion | undefined;
		if (raw.payload.length > 2) {
			includesRegion = raw.payload[2];
			if (includesRegion === RFRegion.Unknown) {
				includesRegion = undefined;
			}
		}

		return new this({
			region,
			supportsZWave,
			supportsLongRange,
			includesRegion,
		});
	}

	public readonly region: RFRegion;
	public readonly supportsZWave: boolean;
	public readonly supportsLongRange: boolean;
	public readonly includesRegion?: RFRegion;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message: MessageRecord = {
			...ret.message!,
			region: getEnumMemberName(RFRegion, this.region),
			"supports Z-Wave": this.supportsZWave,
			"supports Long Range": this.supportsLongRange,
		};
		if (this.includesRegion != undefined) {
			message["includes region"] = getEnumMemberName(
				RFRegion,
				this.includesRegion,
			);
		}
		delete message.payload;
		ret.message = message;
		return ret;
	}
}
