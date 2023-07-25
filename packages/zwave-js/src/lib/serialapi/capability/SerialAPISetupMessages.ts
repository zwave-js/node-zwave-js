import {
	MessagePriority,
	NodeIDType,
	RFRegion,
	ZWaveError,
	ZWaveErrorCodes,
	createSimpleReflectionDecorator,
	parseBitMask,
	validatePayload,
	type MessageOrCCLogEntry,
	type MessageRecord,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type {
	DeserializingMessageConstructor,
	SuccessIndicator,
} from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	MessageType,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageOptions,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";
import { sdkVersionLt } from "../../controller/utils";

export enum SerialAPISetupCommand {
	Unsupported = 0x00,
	GetSupportedCommands = 0x01,
	SetTxStatusReport = 0x02,
	SetPowerlevel = 0x04,
	GetPowerlevel = 0x08,
	GetMaximumPayloadSize = 0x10,
	GetRFRegion = 0x20,
	SetRFRegion = 0x40,
	SetNodeIDType = 0x80,

	// These are added "inbetween" the existing commands
	SetLRMaximumTxPower = 0x03,
	GetLRMaximumTxPower = 0x05,
	GetLRMaximumPayloadSize = 0x11,
	SetPowerlevel16Bit = 0x12,
	GetPowerlevel16Bit = 0x13,
}

// We need to define the decorators for Requests and Responses separately
const {
	decorator: subCommandRequest,
	// lookupConstructor: getSubCommandRequestConstructor,
	lookupValue: getSubCommandForRequest,
} = createSimpleReflectionDecorator<
	SerialAPISetupRequest,
	[command: SerialAPISetupCommand],
	DeserializingMessageConstructor<SerialAPISetupRequest>
>({
	name: "subCommandRequest",
});

const {
	decorator: subCommandResponse,
	lookupConstructor: getSubCommandResponseConstructor,
} = createSimpleReflectionDecorator<
	SerialAPISetupResponse,
	[command: SerialAPISetupCommand],
	DeserializingMessageConstructor<SerialAPISetupResponse>
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

@messageTypes(MessageType.Request, FunctionType.SerialAPISetup)
@priority(MessagePriority.Controller)
@expectedResponse(testResponseForSerialAPISetupRequest)
export class SerialAPISetupRequest extends Message {
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

	public command: SerialAPISetupCommand;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.command]),
			this.payload,
		]);

		return super.serialize();
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

@messageTypes(MessageType.Response, FunctionType.SerialAPISetup)
export class SerialAPISetupResponse extends Message {
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

@subCommandResponse(0x00)
export class SerialAPISetup_CommandUnsupportedResponse extends SerialAPISetupResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		// The payload contains which command is unsupported
		this.command = this.payload[0];
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
export class SerialAPISetup_GetSupportedCommandsRequest extends SerialAPISetupRequest {
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		super(host, options);
		this.command = SerialAPISetupCommand.GetSupportedCommands;
	}
}

@subCommandResponse(SerialAPISetupCommand.GetSupportedCommands)
export class SerialAPISetup_GetSupportedCommandsResponse extends SerialAPISetupResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);

		if (this.payload.length > 1) {
			// This module supports the extended bitmask to report the supported serial API setup commands
			// Parse it as a bitmask
			this.supportedCommands = parseBitMask(
				this.payload.slice(1),
				// According to the Host API specification, the first bit (bit 0) should be GetSupportedCommands
				// However, in Z-Wave SDK < 7.19.1, the entire bitmask is shifted by 1 bit and
				// GetSupportedCommands is encoded in the second bit (bit 1)
				sdkVersionLt(options.sdkVersion, "7.19.1")
					? SerialAPISetupCommand.Unsupported
					: SerialAPISetupCommand.GetSupportedCommands,
			);
		} else {
			// This module only uses the single byte power-of-2 bitmask. Decode it manually
			this.supportedCommands = [];
			for (const cmd of [
				SerialAPISetupCommand.GetSupportedCommands,
				SerialAPISetupCommand.SetTxStatusReport,
				SerialAPISetupCommand.SetPowerlevel,
				SerialAPISetupCommand.GetPowerlevel,
				SerialAPISetupCommand.GetMaximumPayloadSize,
				SerialAPISetupCommand.GetRFRegion,
				SerialAPISetupCommand.SetRFRegion,
				SerialAPISetupCommand.SetNodeIDType,
			] as const) {
				if (!!(this.payload[0] & cmd)) this.supportedCommands.push(cmd);
			}
		}
		// Apparently GetSupportedCommands is not always included in the bitmask, although we
		// just received a response to the command
		if (
			!this.supportedCommands.includes(
				SerialAPISetupCommand.GetSupportedCommands,
			)
		) {
			this.supportedCommands.unshift(
				SerialAPISetupCommand.GetSupportedCommands,
			);
		}
	}

	public readonly supportedCommands: SerialAPISetupCommand[];
}

// =============================================================================

export interface SerialAPISetup_SetTXStatusReportOptions
	extends MessageBaseOptions {
	enabled: boolean;
}

@subCommandRequest(SerialAPISetupCommand.SetTxStatusReport)
export class SerialAPISetup_SetTXStatusReportRequest extends SerialAPISetupRequest {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| SerialAPISetup_SetTXStatusReportOptions,
	) {
		super(host, options);
		this.command = SerialAPISetupCommand.SetTxStatusReport;

		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.enabled = options.enabled;
		}
	}

	public enabled: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.enabled ? 0xff : 0x00]);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.enabled = this.enabled;
		delete message.payload;
		return ret;
	}
}

@subCommandResponse(SerialAPISetupCommand.SetTxStatusReport)
export class SerialAPISetup_SetTXStatusReportResponse
	extends SerialAPISetupResponse
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.success = this.payload[0] !== 0;
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

export interface SerialAPISetup_SetNodeIDTypeOptions
	extends MessageBaseOptions {
	nodeIdType: NodeIDType;
}

@subCommandRequest(SerialAPISetupCommand.SetNodeIDType)
export class SerialAPISetup_SetNodeIDTypeRequest extends SerialAPISetupRequest {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| SerialAPISetup_SetNodeIDTypeOptions,
	) {
		super(host, options);
		this.command = SerialAPISetupCommand.SetNodeIDType;

		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.nodeIdType = options.nodeIdType;
		}
	}

	public nodeIdType: NodeIDType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.nodeIdType]);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message["node ID type"] =
			this.nodeIdType === NodeIDType.Short ? "8 bit" : "16 bit";
		delete message.payload;
		return ret;
	}
}

@subCommandResponse(SerialAPISetupCommand.SetNodeIDType)
export class SerialAPISetup_SetNodeIDTypeResponse
	extends SerialAPISetupResponse
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.success = this.payload[0] !== 0;
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
export class SerialAPISetup_GetRFRegionRequest extends SerialAPISetupRequest {
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		super(host, options);
		this.command = SerialAPISetupCommand.GetRFRegion;
	}
}

@subCommandResponse(SerialAPISetupCommand.GetRFRegion)
export class SerialAPISetup_GetRFRegionResponse extends SerialAPISetupResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.region = this.payload[0];
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

export interface SerialAPISetup_SetRFRegionOptions extends MessageBaseOptions {
	region: RFRegion;
}

@subCommandRequest(SerialAPISetupCommand.SetRFRegion)
export class SerialAPISetup_SetRFRegionRequest extends SerialAPISetupRequest {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| SerialAPISetup_SetRFRegionOptions,
	) {
		super(host, options);
		this.command = SerialAPISetupCommand.SetRFRegion;

		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.region = options.region;
		}
	}

	public region: RFRegion;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.region]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = { ...super.toLogEntry() };
		const message = ret.message!;
		message.region = getEnumMemberName(RFRegion, this.region);
		delete message.payload;
		return ret;
	}
}

@subCommandResponse(SerialAPISetupCommand.SetRFRegion)
export class SerialAPISetup_SetRFRegionResponse
	extends SerialAPISetupResponse
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.success = this.payload[0] !== 0;
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
export class SerialAPISetup_GetPowerlevelRequest extends SerialAPISetupRequest {
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		super(host, options);
		this.command = SerialAPISetupCommand.GetPowerlevel;
	}
}

@subCommandResponse(SerialAPISetupCommand.GetPowerlevel)
export class SerialAPISetup_GetPowerlevelResponse extends SerialAPISetupResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 2);
		// The values are in 0.1 dBm, signed
		this.powerlevel = this.payload.readInt8(0) / 10;
		this.measured0dBm = this.payload.readInt8(1) / 10;
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

export interface SerialAPISetup_SetPowerlevelOptions
	extends MessageBaseOptions {
	powerlevel: number;
	measured0dBm: number;
}

@subCommandRequest(SerialAPISetupCommand.SetPowerlevel)
export class SerialAPISetup_SetPowerlevelRequest extends SerialAPISetupRequest {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| SerialAPISetup_SetPowerlevelOptions,
	) {
		super(host, options);
		this.command = SerialAPISetupCommand.SetPowerlevel;

		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
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
	}

	public powerlevel: number;
	public measured0dBm: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(2);
		// The values are in 0.1 dBm
		this.payload.writeInt8(Math.round(this.powerlevel * 10), 0);
		this.payload.writeInt8(Math.round(this.measured0dBm * 10), 1);

		return super.serialize();
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

@subCommandResponse(SerialAPISetupCommand.SetPowerlevel)
export class SerialAPISetup_SetPowerlevelResponse
	extends SerialAPISetupResponse
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.success = this.payload[0] !== 0;
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
export class SerialAPISetup_GetPowerlevel16BitRequest extends SerialAPISetupRequest {
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		super(host, options);
		this.command = SerialAPISetupCommand.GetPowerlevel16Bit;
	}
}

@subCommandResponse(SerialAPISetupCommand.GetPowerlevel16Bit)
export class SerialAPISetup_GetPowerlevel16BitResponse extends SerialAPISetupResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 4);
		// The values are in 0.1 dBm, signed
		this.powerlevel = this.payload.readInt16BE(0) / 10;
		this.measured0dBm = this.payload.readInt16BE(2) / 10;
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

export interface SerialAPISetup_SetPowerlevel16BitOptions
	extends MessageBaseOptions {
	powerlevel: number;
	measured0dBm: number;
}

@subCommandRequest(SerialAPISetupCommand.SetPowerlevel16Bit)
export class SerialAPISetup_SetPowerlevel16BitRequest extends SerialAPISetupRequest {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| SerialAPISetup_SetPowerlevel16BitOptions,
	) {
		super(host, options);
		this.command = SerialAPISetupCommand.SetPowerlevel16Bit;

		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
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
	}

	public powerlevel: number;
	public measured0dBm: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(4);
		// The values are in 0.1 dBm
		this.payload.writeInt16BE(Math.round(this.powerlevel * 10), 0);
		this.payload.writeInt16BE(Math.round(this.measured0dBm * 10), 2);

		return super.serialize();
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

@subCommandResponse(SerialAPISetupCommand.SetPowerlevel16Bit)
export class SerialAPISetup_SetPowerlevel16BitResponse
	extends SerialAPISetupResponse
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.success = this.payload[0] !== 0;
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

@subCommandRequest(SerialAPISetupCommand.GetLRMaximumTxPower)
export class SerialAPISetup_GetLRMaximumTxPowerRequest extends SerialAPISetupRequest {
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		super(host, options);
		this.command = SerialAPISetupCommand.GetLRMaximumTxPower;
	}
}

@subCommandResponse(SerialAPISetupCommand.GetLRMaximumTxPower)
export class SerialAPISetup_GetLRMaximumTxPowerResponse extends SerialAPISetupResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 2);
		// The values are in 0.1 dBm, signed
		this.limit = this.payload.readInt16BE(0) / 10;
	}

	/** The maximum LR TX power dBm */
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

export interface SerialAPISetup_SetLRMaximumTxPowerOptions
	extends MessageBaseOptions {
	limit: number;
}

@subCommandRequest(SerialAPISetupCommand.SetLRMaximumTxPower)
export class SerialAPISetup_SetLRMaximumTxPowerRequest extends SerialAPISetupRequest {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| SerialAPISetup_SetLRMaximumTxPowerOptions,
	) {
		super(host, options);
		this.command = SerialAPISetupCommand.SetLRMaximumTxPower;

		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (options.limit < -10 || options.limit > 20) {
				throw new ZWaveError(
					`The maximum LR TX power must be between -10.0 and +20.0 dBm`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			this.limit = options.limit;
		}
	}

	public limit: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(2);
		// The values are in 0.1 dBm
		this.payload.writeInt16BE(Math.round(this.limit * 10), 0);

		return super.serialize();
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

@subCommandResponse(SerialAPISetupCommand.SetLRMaximumTxPower)
export class SerialAPISetup_SetLRMaximumTxPowerResponse
	extends SerialAPISetupResponse
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.success = this.payload[0] !== 0;
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
export class SerialAPISetup_GetMaximumPayloadSizeRequest extends SerialAPISetupRequest {
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		super(host, options);
		this.command = SerialAPISetupCommand.GetMaximumPayloadSize;
	}
}

@subCommandResponse(SerialAPISetupCommand.GetMaximumPayloadSize)
export class SerialAPISetup_GetMaximumPayloadSizeResponse extends SerialAPISetupResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.maxPayloadSize = this.payload[0];
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

@subCommandRequest(SerialAPISetupCommand.GetLRMaximumPayloadSize)
export class SerialAPISetup_GetLRMaximumPayloadSizeRequest extends SerialAPISetupRequest {
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		super(host, options);
		this.command = SerialAPISetupCommand.GetLRMaximumPayloadSize;
	}
}

@subCommandResponse(SerialAPISetupCommand.GetLRMaximumPayloadSize)
export class SerialAPISetup_GetLRMaximumPayloadSizeResponse extends SerialAPISetupResponse {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.maxPayloadSize = this.payload[0];
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
