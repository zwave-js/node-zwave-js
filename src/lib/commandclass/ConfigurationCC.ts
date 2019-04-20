import { IDriver } from "../driver/IDriver";
import { encodeBitMask, Maybe } from "../values/Primitive";
import {
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum ConfigurationCommand {
	Set = 0x04,
	Get = 0x05,
	Report = 0x06,
	BulkSet = 0x07,
	BulkGet = 0x08,
	BulkReport = 0x09,
	NameGet = 0x0a,
	NameReport = 0x0b,
	InfoGet = 0x0c,
	InfoReport = 0x0d,
	PropertiesGet = 0x0e,
	PropertiesReport = 0x0f,
	DefaultReset = 0x01,
}

export enum ValueFormat {
	SignedInteger = 0x00,
	UnsignedInteger = 0x01,
	Enumerated = 0x02, // UnsignedInt, Radio Buttons
	BitField = 0x03, // Check Boxes
}

export interface ParameterInfo {
	minValue?: number;
	maxValue?: ConfigValue;
	defaultValue?: ConfigValue;
	valueSize?: number; // TODO: Use this
	format?: ValueFormat;
	name?: string;
	info?: string;
	noBulkSupport?: boolean;
	isAdvanced?: boolean;
	isReadonly?: boolean;
	requiresReInclusion?: boolean;
}

export type ConfigValue = number | Set<number>;

// TODO: * Scan available config params (V1-V2)
//       * or use PropertiesGet (V3+)
// TODO: Test how the device interprets the default flag (V1-3) (reset all or only the specified)

@commandClass(CommandClasses.Configuration)
@implementedVersion(4)
@expectedCCResponse(CommandClasses.Configuration)
export class ConfigurationCC extends CommandClass {
	public ccCommand!: ConfigurationCommand;

	public supportsCommand(cmd: ConfigurationCommand): Maybe<boolean> {
		switch (cmd) {
			case ConfigurationCommand.Get:
			case ConfigurationCommand.Set:
				return true; // This is mandatory

			case ConfigurationCommand.BulkGet:
			case ConfigurationCommand.BulkSet:
				return this.version >= 2;

			case ConfigurationCommand.NameGet:
			case ConfigurationCommand.InfoGet:
			case ConfigurationCommand.PropertiesGet:
				return this.version >= 3;
		}
		return super.supportsCommand(cmd);
	}

	protected extendParamInformation(
		parameter: number,
		info: ParameterInfo,
	): void {
		// TODO: Store param information in th enode
		// this.getValueDB().getValue()
		// if (!this.paramInformation.has(parameter)) {
		// 	this.paramInformation.set(parameter, {});
		// }
		// Object.assign(this.paramInformation.get(parameter), info);
	}
	protected getParamInformation(parameter: number): ParameterInfo {
		// return this.paramInformation.get(parameter) || {};
		// TODO: Retrieve param information from the node
		return {};
	}
}

interface ConfigurationCCGetOptions extends CCCommandOptions {
	parameter: number;
}

@CCCommand(ConfigurationCommand.Get)
export class ConfigurationCCGet extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | ConfigurationCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new Error("not implemented");
		} else {
			this.parameter = options.parameter;
		}
	}

	public parameter: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.parameter & 0xff]);
		return super.serialize();
	}
}

interface ConfigurationCCSetOptions extends CCCommandOptions {
	parameter: number;
	resetToDefault: boolean;
	valueSize?: number;
	value?: ConfigValue;
}

@CCCommand(ConfigurationCommand.Set)
export class ConfigurationCCSet extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | ConfigurationCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new Error("not implemented");
		} else {
			this.parameter = options.parameter;
			this.resetToDefault = options.resetToDefault;
			this.valueSize = options.valueSize || 0;
			this.value = options.value;
		}
	}

	public resetToDefault: boolean;
	public parameter: number;
	public valueSize: number;
	public value: ConfigValue | undefined;

	public serialize(): Buffer {
		const valueSize = this.resetToDefault ? 1 : this.valueSize;
		const payloadLength = 2 + valueSize;
		this.payload = Buffer.alloc(payloadLength, 0);
		this.payload[0] = this.parameter;
		this.payload[1] =
			(this.resetToDefault ? 0b1000_0000 : 0) | (valueSize & 0b111);
		if (!this.resetToDefault) {
			serializeValue(
				this.payload,
				2,
				valueSize,
				this.getParamInformation(this.parameter).format ||
					ValueFormat.SignedInteger,
				this.value!,
			);
		}
		return super.serialize();
	}
}

@CCCommand(ConfigurationCommand.NameGet)
export class ConfigurationCCNameGet extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | ConfigurationCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new Error("not implemented");
		} else {
			this.parameter = options.parameter;
		}
	}

	public parameter: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(2);
		this.payload.writeUInt16BE(this.parameter, 0);
		return super.serialize();
	}
}

@CCCommand(ConfigurationCommand.InfoGet)
export class ConfigurationCCInfoGet extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | ConfigurationCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new Error("not implemented");
		} else {
			this.parameter = options.parameter;
		}
	}

	public parameter: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(2);
		this.payload.writeUInt16BE(this.parameter, 0);
		return super.serialize();
	}
}

@CCCommand(ConfigurationCommand.PropertiesGet)
export class ConfigurationCCPropertiesGet extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | ConfigurationCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new Error("not implemented");
		} else {
			this.parameter = options.parameter;
		}
	}

	public parameter: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(2);
		this.payload.writeUInt16BE(this.parameter, 0);
		return super.serialize();
	}
}

@CCCommand(ConfigurationCommand.DefaultReset)
export class ConfigurationCCDefaultReset extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

/** Serializes values into the payload according to the value format */
function serializeValue(
	payload: Buffer,
	offset: number,
	size: number,
	format: ValueFormat,
	value: ConfigValue,
): void {
	switch (format) {
		case ValueFormat.SignedInteger:
			payload.writeIntBE(value as number, offset, size);
			return;
		case ValueFormat.UnsignedInteger:
		case ValueFormat.Enumerated:
			payload.writeUIntBE(value as number, offset, size);
			return;
		case ValueFormat.BitField: {
			const mask = encodeBitMask(
				[...(value as Set<number>).values()],
				size * 8,
			);
			mask.copy(payload, offset);
			return;
		}
	}
}
