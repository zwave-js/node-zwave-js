import {
	MessageOrCCLogEntry,
	parseBitMask,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
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
	SetNodeIDBase = 0x80,
}

@messageTypes(MessageType.Request, FunctionType.SerialAPISetup)
@priority(MessagePriority.Controller)
@expectedResponse(FunctionType.SerialAPISetup)
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
}

@messageTypes(MessageType.Response, FunctionType.SerialAPISetup)
export class SerialAPISetupResponse extends Message {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this.command = options.data[0];

		let CommandConstructor: typeof SerialAPISetupResponse | undefined;
		switch (this.command) {
			case SerialAPISetupCommand.SetTxStatusReport:
				CommandConstructor = SerialAPISetup_SetTXStatusReportResponse;
				break;
		}

		if (CommandConstructor && (new.target as any) !== CommandConstructor) {
			return new CommandConstructor(driver, options);
		}
	}

	public readonly command!: SerialAPISetupCommand;
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
				SerialAPISetupCommand.SetNodeIDBase,
			] as const) {
				if (!!(this.payload[0] & cmd)) this.supportedCommands.push(cmd);
			}
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
		return {
			...super.toLogEntry(),
			message: {
				enabled: this.enabled,
			},
		};
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
		return {
			...super.toLogEntry(),
			message: { success: this.success },
		};
	}
}
