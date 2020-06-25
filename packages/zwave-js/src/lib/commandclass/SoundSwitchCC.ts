import {
	CommandClasses,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { clamp } from "alcalzone-shared/math";
import type { Driver } from "../driver/Driver";
import {
	CCCommand,
	CCCommandOptions,
	CCResponsePredicate,
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";

export function getToneDurationValueId(
	endpointIndex: number | undefined,
	toneId: number,
): ValueID {
	return {
		commandClass: CommandClasses["Sound Switch"],
		endpoint: endpointIndex,
		property: "duration",
		propertyKey: toneId,
	};
}

export function getToneNameValueId(
	endpointIndex: number | undefined,
	toneId: number,
): ValueID {
	return {
		commandClass: CommandClasses["Sound Switch"],
		endpoint: endpointIndex,
		property: "name",
		propertyKey: toneId,
	};
}

// All the supported commands
export enum SoundSwitchCommand {
	TonesNumberGet = 0x01,
	TonesNumberReport = 0x02,
	ToneInfoGet = 0x03,
	ToneInfoReport = 0x04,
	ConfigurationSet = 0x05,
	ConfigurationGet = 0x06,
	ConfigurationReport = 0x07,
	TonePlaySet = 0x08,
	TonePlayGet = 0x09,
	TonePlayReport = 0x0a,
}

// @publicAPI
export enum ToneId {
	None = 0x00,
	Default = 0xff,
}

@commandClass(CommandClasses["Sound Switch"])
@implementedVersion(1)
export class SoundSwitchCC extends CommandClass {
	declare ccCommand: SoundSwitchCommand;
}

@CCCommand(SoundSwitchCommand.TonesNumberReport)
export class SoundSwitchCCTonesNumberReport extends SoundSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this.numTones = this.payload[0];
		this.persistValues();
	}

	@ccValue({ internal: true })
	public readonly numTones: number;
}

@CCCommand(SoundSwitchCommand.TonesNumberGet)
@expectedCCResponse(SoundSwitchCCTonesNumberReport)
export class SoundSwitchCCTonesNumberGet extends SoundSwitchCC {}

@CCCommand(SoundSwitchCommand.ToneInfoReport)
export class SoundSwitchCCToneInfoReport extends SoundSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 4);
		this.toneId = this.payload[0];
		this.duration = this.payload.readUInt16BE(1);
		const nameLength = this.payload[3];
		validatePayload(this.payload.length >= 4 + nameLength);
		this.name = this.payload.slice(4, 4 + nameLength).toString("utf8");
	}

	public readonly toneId: number;
	public readonly duration: number;
	public readonly name: string;
}

const testResponseForSoundSwitchToneInfoGet: CCResponsePredicate = (
	sent: SoundSwitchCCToneInfoGet,
	received,
	isPositiveTransmitReport,
) => {
	return received instanceof SoundSwitchCCToneInfoReport &&
		received.toneId === sent.toneId
		? "final"
		: isPositiveTransmitReport
		? "confirmation"
		: "unexpected";
};

interface SoundSwitchCCToneInfoGetOptions extends CCCommandOptions {
	toneId: number;
}

@CCCommand(SoundSwitchCommand.ToneInfoGet)
@expectedCCResponse(testResponseForSoundSwitchToneInfoGet)
export class SoundSwitchCCToneInfoGet extends SoundSwitchCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SoundSwitchCCToneInfoGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.toneId = options.toneId;
		}
	}

	public toneId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.toneId]);
		return super.serialize();
	}
}

interface SoundSwitchCCConfigurationSetOptions extends CCCommandOptions {
	volume: number;
	defaultToneId: number;
}

@CCCommand(SoundSwitchCommand.ConfigurationSet)
export class SoundSwitchCCConfigurationSet extends SoundSwitchCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SoundSwitchCCConfigurationSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.volume = options.volume;
			this.defaultToneId = options.defaultToneId;
		}
	}

	public volume: number;
	public defaultToneId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.volume, this.defaultToneId]);
		return super.serialize();
	}
}

@CCCommand(SoundSwitchCommand.ConfigurationReport)
export class SoundSwitchCCConfigurationReport extends SoundSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 2);
		this.volume = clamp(this.payload[0], 0, 100);
		this.defaultToneId = this.payload[1];

		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Number,
		min: 0,
		max: 100,
		unit: "%",
		label: "Volume",
	})
	public readonly volume: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.Number,
		min: 0,
		max: 254,
		label: "Default Tone ID",
	})
	public readonly defaultToneId: number;
}

@CCCommand(SoundSwitchCommand.ConfigurationGet)
@expectedCCResponse(SoundSwitchCCConfigurationReport)
export class SoundSwitchCCConfigurationGet extends SoundSwitchCC {}

interface SoundSwitchCCTonePlaySetOptions extends CCCommandOptions {
	toneId: ToneId | number;
}

@CCCommand(SoundSwitchCommand.TonePlaySet)
export class SoundSwitchCCTonePlaySet extends SoundSwitchCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SoundSwitchCCTonePlaySetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.toneId = options.toneId;
		}
	}

	public toneId: ToneId | number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.toneId]);
		return super.serialize();
	}
}

@CCCommand(SoundSwitchCommand.TonePlayReport)
export class SoundSwitchCCTonePlayReport extends SoundSwitchCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this.toneId = this.payload[0];
		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.UInt8,
		label: "Tone ID",
		description: "The currently played tone",
	})
	public readonly toneId: ToneId | number;
}

@CCCommand(SoundSwitchCommand.TonePlayGet)
@expectedCCResponse(SoundSwitchCCTonePlayReport)
export class SoundSwitchCCTonePlayGet extends SoundSwitchCC {}
