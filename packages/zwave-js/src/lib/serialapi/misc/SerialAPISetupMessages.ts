import {
	MessageOrCCLogEntry,
	MessageRecord,
	parseBitMask,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName } from "@zwave-js/shared";
import type { Driver } from "../../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../../message/Constants";
import {
	expectedResponse,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	messageTypes,
	priority,
} from "../../message/Message";
import type { SuccessIndicator } from "../../message/SuccessIndicator";

export enum SerialAPISetupCommand {
	GetSupportedCommands = 0x01,
	SetTxStatusReport = 0x02,
	SetPowerlevel = 0x04,
	GetPowerlevel = 0x08,
	GetMaximumPayloadSize = 0x10,
	GetLRMaximumPayloadSize = 0x11,
	GetRFRegion = 0x20,
	SetRFRegion = 0x40,
	SetNodeIDType = 0x80,
}

export enum RFRegion {
	"Europe" = 0x00,
	"USA" = 0x01,
	"Australia/New Zealand" = 0x02,
	"Hong Kong" = 0x03,
	"India" = 0x05,
	"Israel" = 0x06,
	"Russia" = 0x07,
	"China" = 0x08,
	"USA (Long Range)" = 0x09,
	"Japan" = 0x20,
	"Korea" = 0x21,
	"Unknown" = 0xfe,
	"Default (EU)" = 0xff,
}

export enum NodeIDType {
	Short = 0x01,
	Long = 0x02,
}

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
	// This must be set in subclasses
	public command!: SerialAPISetupCommand;

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
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this.command = this.payload[0];
		this.payload = this.payload.slice(1);

		let CommandConstructor: typeof SerialAPISetupResponse | undefined;
		switch (this.command) {
			case SerialAPISetupCommand.SetTxStatusReport:
				CommandConstructor = SerialAPISetup_SetTXStatusReportResponse;
				break;
			case SerialAPISetupCommand.GetSupportedCommands:
				CommandConstructor = SerialAPISetup_GetSupportedCommandsResponse;
				break;
			case SerialAPISetupCommand.SetRFRegion:
				CommandConstructor = SerialAPISetup_SetRFRegionResponse;
				break;
			case SerialAPISetupCommand.GetRFRegion:
				CommandConstructor = SerialAPISetup_GetRFRegionResponse;
				break;
			case SerialAPISetupCommand.SetPowerlevel:
				CommandConstructor = SerialAPISetup_SetPowerlevelResponse;
				break;
			case SerialAPISetupCommand.GetPowerlevel:
				CommandConstructor = SerialAPISetup_GetPowerlevelResponse;
				break;
			case SerialAPISetupCommand.GetMaximumPayloadSize:
				CommandConstructor = SerialAPISetup_GetMaximumPayloadSizeResponse;
				break;
			case SerialAPISetupCommand.GetLRMaximumPayloadSize:
				CommandConstructor = SerialAPISetup_GetLRMaximumPayloadSizeResponse;
				break;
			case SerialAPISetupCommand.SetNodeIDType:
				CommandConstructor = SerialAPISetup_SetNodeIDTypeResponse;
				break;
			case 0x00:
				// This is an unsupported command
				this.command = this.payload[0];
				CommandConstructor = SerialAPISetup_CommandUnsupportedResponse;
				break;
		}

		// wotan-disable-next-line no-useless-predicate
		if (CommandConstructor && (new.target as any) !== CommandConstructor) {
			return new CommandConstructor(driver, options);
		}
	}

	public readonly command!: SerialAPISetupCommand;

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

export class SerialAPISetup_CommandUnsupportedResponse extends SerialAPISetupResponse {
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

export class SerialAPISetup_GetSupportedCommandsRequest extends SerialAPISetupRequest {
	public constructor(driver: Driver, options?: MessageOptions) {
		super(driver, options);
		this.command = SerialAPISetupCommand.GetSupportedCommands;
	}
}

export class SerialAPISetup_GetSupportedCommandsResponse extends SerialAPISetupResponse {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);

		if (this.payload.length > 1) {
			// This module supports the extended bitmask to report the supported serial API setup commands
			// Parse it as a bitmask
			this.supportedCommands = parseBitMask(
				this.payload.slice(1),
				SerialAPISetupCommand.GetSupportedCommands,
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

export class SerialAPISetup_SetTXStatusReportRequest extends SerialAPISetupRequest {
	public constructor(
		driver: Driver,
		options:
			| MessageDeserializationOptions
			| SerialAPISetup_SetTXStatusReportOptions,
	) {
		super(driver, options);
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

export class SerialAPISetup_SetTXStatusReportResponse
	extends SerialAPISetupResponse
	implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
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

export class SerialAPISetup_SetNodeIDTypeRequest extends SerialAPISetupRequest {
	public constructor(
		driver: Driver,
		options:
			| MessageDeserializationOptions
			| SerialAPISetup_SetNodeIDTypeOptions,
	) {
		super(driver, options);
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

export class SerialAPISetup_SetNodeIDTypeResponse
	extends SerialAPISetupResponse
	implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
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

export class SerialAPISetup_GetRFRegionRequest extends SerialAPISetupRequest {
	public constructor(driver: Driver, options?: MessageOptions) {
		super(driver, options);
		this.command = SerialAPISetupCommand.GetRFRegion;
	}
}

export class SerialAPISetup_GetRFRegionResponse extends SerialAPISetupResponse {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
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

export class SerialAPISetup_SetRFRegionRequest extends SerialAPISetupRequest {
	public constructor(
		driver: Driver,
		options:
			| MessageDeserializationOptions
			| SerialAPISetup_SetRFRegionOptions,
	) {
		super(driver, options);
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

export class SerialAPISetup_SetRFRegionResponse
	extends SerialAPISetupResponse
	implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
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

export class SerialAPISetup_GetPowerlevelRequest extends SerialAPISetupRequest {
	public constructor(driver: Driver, options?: MessageOptions) {
		super(driver, options);
		this.command = SerialAPISetupCommand.GetPowerlevel;
	}
}

export class SerialAPISetup_GetPowerlevelResponse extends SerialAPISetupResponse {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		validatePayload(this.payload.length >= 2);
		// The values are in 0.1 dBm
		this.powerlevel = this.payload[0] / 10;
		this.measured0dBm = this.payload[1] / 10;
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

export class SerialAPISetup_SetPowerlevelRequest extends SerialAPISetupRequest {
	public constructor(
		driver: Driver,
		options:
			| MessageDeserializationOptions
			| SerialAPISetup_SetPowerlevelOptions,
	) {
		super(driver, options);
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
		this.payload = Buffer.from([
			// The values are in 0.1 dBm
			Math.round(this.powerlevel * 10),
			Math.round(this.measured0dBm * 10),
		]);
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

export class SerialAPISetup_SetPowerlevelResponse
	extends SerialAPISetupResponse
	implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
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

export class SerialAPISetup_GetMaximumPayloadSizeRequest extends SerialAPISetupRequest {
	public constructor(driver: Driver, options?: MessageOptions) {
		super(driver, options);
		this.command = SerialAPISetupCommand.GetMaximumPayloadSize;
	}
}

export class SerialAPISetup_GetMaximumPayloadSizeResponse extends SerialAPISetupResponse {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
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

export class SerialAPISetup_GetLRMaximumPayloadSizeRequest extends SerialAPISetupRequest {
	public constructor(driver: Driver, options?: MessageOptions) {
		super(driver, options);
		this.command = SerialAPISetupCommand.GetLRMaximumPayloadSize;
	}
}

export class SerialAPISetup_GetLRMaximumPayloadSizeResponse extends SerialAPISetupResponse {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
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
