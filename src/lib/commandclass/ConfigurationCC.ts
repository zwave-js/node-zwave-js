import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { isConsecutiveArray } from "../util/misc";
import { encodeBitMask, Maybe, parseBitMask } from "../values/Primitive";
import {
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	getCommandClass,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";
import { ParameterInfo } from "./ConfigurationCC.1";

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

	/** Stores config parameter metadata for this CC's node */
	// TODO: Actually use this!
	protected extendParamInformation(
		parameter: number,
		info: ParameterInfo,
	): void {
		const valueDB = this.getValueDB();
		const paramInfo = (valueDB.getValue(
			getCommandClass(this),
			this.endpoint,
			"paramInformation",
		) || new Map()) as Map<number, ParameterInfo>;

		if (!paramInfo.has(parameter)) {
			paramInfo.set(parameter, {});
		}
		Object.assign(paramInfo.get(parameter), info);
	}

	/** Returns stored config parameter metadata for this CC's node */
	protected getParamInformation(parameter: number): ParameterInfo {
		const valueDB = this.getValueDB();
		const paramInfo = valueDB.getValue(
			getCommandClass(this),
			this.endpoint,
			"paramInformation",
		) as Map<number, ParameterInfo> | undefined;
		return (paramInfo && paramInfo.get(parameter)) || {};
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

@CCCommand(ConfigurationCommand.Report)
export class ConfigurationCCReport extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._parameter = this.payload[0];
		this._valueSize = this.payload[1] & 0b111;
		this._value = parseValue(
			this.payload.slice(2),
			this._valueSize,
			// In Config CC v1/v2, this must be SignedInteger
			// As those nodes don't communicate any parameter information
			// we fall back to that default value anyways
			this.getParamInformation(this._parameter).format ||
				ValueFormat.SignedInteger,
		);
	}

	private _parameter: number;
	public get parameter(): number {
		return this._parameter;
	}

	private _valueSize: number;
	public get valueSize(): number {
		return this._valueSize;
	}

	private _value: ConfigValue;
	public get value(): ConfigValue {
		return this._value;
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

type ConfigurationCCBulkSetOptions = CCCommandOptions & {
	parameters: number[];
	handshake?: boolean;
} & (
		| {
				resetToDefault: true;
		  }
		| {
				resetToDefault?: false;
				valueSize: number;
				values: number[];
		  });

@CCCommand(ConfigurationCommand.BulkSet)
export class ConfigurationCCBulkSet extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| ConfigurationCCBulkSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new Error("not implemented");
		} else {
			this._parameters = options.parameters;
			if (this._parameters.length < 1) {
				throw new ZWaveError(
					`In a ConfigurationCC.BulkSet, parameters must be a non-empty array`,
					ZWaveErrorCodes.CC_Invalid,
				);
			} else if (!isConsecutiveArray(this._parameters)) {
				throw new ZWaveError(
					`A ConfigurationCC.BulkSet can only be used for consecutive parameters`,
					ZWaveErrorCodes.CC_Invalid,
				);
			}
			this._handshake = !!options.handshake;
			this._resetToDefault = !!options.resetToDefault;
			if (!!options.resetToDefault) {
				this._valueSize = 1;
				this._values = this._parameters.map(() => 0);
			} else {
				this._valueSize = options.valueSize;
				this._values = options.values;
			}
		}
	}

	private _parameters: number[];
	public get parameters(): number[] {
		return this._parameters;
	}
	private _resetToDefault: boolean;
	public get resetToDefault(): boolean {
		return this._resetToDefault;
	}
	private _valueSize: number;
	public get valueSize(): number {
		return this._valueSize;
	}
	private _values: number[];
	public get values(): number[] {
		return this._values;
	}
	private _handshake: boolean;
	public get handshake(): boolean {
		return this._handshake;
	}

	public serialize(): Buffer {
		const valueSize = this._resetToDefault ? 1 : this.valueSize;
		const payloadLength = 4 + valueSize * this.parameters.length;
		this.payload = Buffer.alloc(payloadLength, 0);
		this.payload.writeUInt16BE(this.parameters[0], 0);
		this.payload[2] = this.parameters.length;
		this.payload[3] =
			(this._resetToDefault ? 0b1000_0000 : 0) |
			(this.handshake ? 0b0100_0000 : 0) |
			(valueSize & 0b111);
		if (!this._resetToDefault) {
			for (let i = 0; i < this.parameters.length; i++) {
				const param = this._parameters[i];
				serializeValue(
					this.payload,
					4 + i * valueSize,
					valueSize,
					this.getParamInformation(param).format ||
						ValueFormat.SignedInteger,
					this._values[i],
				);
			}
		}
		return super.serialize();
	}
}

interface ConfigurationCCBulkGetOptions extends CCCommandOptions {
	parameters: number[];
}

@CCCommand(ConfigurationCommand.BulkGet)
export class ConfigurationCCBulkGet extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| ConfigurationCCBulkGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new Error("not implemented");
		} else {
			this._parameters = options.parameters.sort();
			if (!isConsecutiveArray(this.parameters)) {
				throw new ZWaveError(
					`A ConfigurationCC.BulkGet can only be used for consecutive parameters`,
					ZWaveErrorCodes.CC_Invalid,
				);
			}
		}
	}

	private _parameters: number[];
	public get parameters(): number[] {
		return this._parameters;
	}

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(3);
		this.payload.writeUInt16BE(this.parameters[0], 0);
		this.payload[2] = this.parameters.length;
		return super.serialize();
	}
}

@CCCommand(ConfigurationCommand.BulkReport)
export class ConfigurationCCBulkReport extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		const firstParameter = this.payload.readUInt16BE(0);
		const numParams = this.payload[2];
		this._reportsToFollow = this.payload[3];
		this._defaultValues = !!(this.payload[4] & 0b1000_0000);
		this._isHandshakeResponse = !!(this.payload[4] & 0b0100_0000);
		this._valueSize = this.payload[4] & 0b111;
		for (let i = 0; i < numParams; i++) {
			const param = firstParameter + i;
			this._values.set(
				param,
				parseValue(
					this.payload.slice(5 + i * this.valueSize),
					this.valueSize,
					this.getParamInformation(param).format ||
						ValueFormat.SignedInteger,
				),
			);
		}
	}

	private _reportsToFollow: number;
	public get reportsToFollow(): number {
		return this._reportsToFollow;
	}

	public expectMoreMessages(): boolean {
		return this._reportsToFollow > 0;
	}

	private _defaultValues: boolean;
	public get defaultValues(): boolean {
		return this._defaultValues;
	}

	private _isHandshakeResponse: boolean;
	public get isHandshakeResponse(): boolean {
		return this._isHandshakeResponse;
	}

	private _valueSize: number;
	public get valueSize(): number {
		return this._valueSize;
	}

	private _values: Map<number, ConfigValue> = new Map();
	public get values(): ReadonlyMap<number, ConfigValue> {
		return this._values;
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

@CCCommand(ConfigurationCommand.NameReport)
export class ConfigurationCCNameReport extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._parameter = this.payload.readUInt16BE(0);
		this._reportsToFollow = this.payload[2];
		this._name = this.payload.slice(3).toString("utf8");
	}

	private _parameter: number;
	public get parameter(): number {
		return this._parameter;
	}

	private _reportsToFollow: number;
	public get reportsToFollow(): number {
		return this._reportsToFollow;
	}

	public expectMoreMessages(): boolean {
		return this._reportsToFollow > 0;
	}

	private _name: string;
	public get name(): string {
		return this._name;
	}

	public mergePartialCCs(partials: ConfigurationCCNameReport[]): void {
		// Concat the name
		this._name = [...partials, this]
			.map(report => report._name)
			.reduce((prev, cur) => prev + cur, "");
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

@CCCommand(ConfigurationCommand.InfoReport)
export class ConfigurationCCInfoReport extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._parameter = this.payload.readUInt16BE(0);
		this._reportsToFollow = this.payload[2];
		this._info = this.payload.slice(3).toString("utf8");
	}

	private _parameter: number;
	public get parameter(): number {
		return this._parameter;
	}

	private _reportsToFollow: number;
	public get reportsToFollow(): number {
		return this._reportsToFollow;
	}

	public expectMoreMessages(): boolean {
		return this._reportsToFollow > 0;
	}

	private _info: string;
	public get info(): string {
		return this._info;
	}

	public mergePartialCCs(partials: ConfigurationCCInfoReport[]): void {
		// Concat the parameter info
		this._info = [...partials, this]
			.map(report => report._info)
			.reduce((prev, cur) => prev + cur, "");
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

@CCCommand(ConfigurationCommand.PropertiesReport)
export class ConfigurationCCPropertiesReport extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._parameter = this.payload.readUInt16BE(0);
		this._valueFormat = (this.payload[2] & 0b111000) >>> 3;
		this._valueSize = this.payload[2] & 0b111;
		if (this.valueSize > 0) {
			if (this._valueFormat !== ValueFormat.BitField) {
				this._minValue = parseValue(
					this.payload.slice(3),
					this._valueSize,
					this._valueFormat,
				);
			}
			this._maxValue = parseValue(
				this.payload.slice(3 + this._valueSize),
				this._valueSize,
				this._valueFormat,
			);
			this._defaultValue = parseValue(
				this.payload.slice(3 + 2 * this._valueSize),
				this._valueSize,
				this._valueFormat,
			);
		}
		if (this.version < 4) {
			// Read the last 2 bytes to work around nodes not omitting min/max value when their size is 0
			this._nextParameter = this.payload.readUInt16BE(
				this.payload.length - 2,
			);
		} else {
			this._nextParameter = this.payload.readUInt16BE(
				3 + 3 * this.valueSize,
			);

			const options1 = this.payload[2];
			const options2 = this.payload[3 + 3 * this.valueSize + 2];
			this._requiresReInclusion = !!(options1 & 0b1000_0000);
			this._isReadonly = !!(options1 & 0b0100_0000);
			this._isAdvanced = !!(options2 & 0b1);
			this._noBulkSupport = !!(options2 & 0b10);
		}
	}

	private _parameter: number;
	public get parameter(): number {
		return this._parameter;
	}

	private _valueSize: number;
	public get valueSize(): number {
		return this._valueSize;
	}

	private _valueFormat: ValueFormat;
	public get valueFormat(): ValueFormat {
		return this._valueFormat;
	}

	private _minValue: ConfigValue | undefined;
	public get minValue(): ConfigValue | undefined {
		return this._minValue;
	}

	private _maxValue: ConfigValue | undefined;
	public get maxValue(): ConfigValue | undefined {
		return this._maxValue;
	}

	private _defaultValue: ConfigValue | undefined;
	public get defaultValue(): ConfigValue | undefined {
		return this._defaultValue;
	}

	private _nextParameter: number;
	public get nextParameter(): number {
		return this._nextParameter;
	}

	private _requiresReInclusion: boolean | undefined;
	public get requiresReInclusion(): boolean | undefined {
		return this._requiresReInclusion;
	}

	private _isReadonly: boolean | undefined;
	public get isReadonly(): boolean | undefined {
		return this._isReadonly;
	}

	private _isAdvanced: boolean | undefined;
	public get isAdvanced(): boolean | undefined {
		return this._isAdvanced;
	}

	private _noBulkSupport: boolean | undefined;
	public get noBulkSupport(): boolean | undefined {
		return this._noBulkSupport;
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

/** Interprets values from the payload depending on the value format */
function parseValue(
	raw: Buffer,
	size: number,
	format: ValueFormat,
): ConfigValue {
	switch (format) {
		case ValueFormat.SignedInteger:
			return raw.readIntBE(0, size);
		case ValueFormat.UnsignedInteger:
		case ValueFormat.Enumerated:
			return raw.readUIntBE(0, size);
		case ValueFormat.BitField:
			return new Set(parseBitMask(raw.slice(0, size)));
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
