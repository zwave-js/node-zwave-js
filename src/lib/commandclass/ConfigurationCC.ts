import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { log } from "../util/logger";
import {
	isConsecutiveArray,
	JSONObject,
	stripUndefined,
	validatePayload,
} from "../util/misc";
import { CacheValue } from "../values/Cache";
import {
	encodeBitMask,
	getMinIntegerSize,
	Maybe,
	parseBitMask,
} from "../values/Primitive";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccKeyValuePair,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	CommandClassOptions,
	DynamicCCResponse,
	expectedCCResponse,
	getCommandClass,
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

export interface ConfigOption {
	value: number;
	label: string;
}

export interface ParameterInfo {
	minValue?: ConfigValue;
	maxValue?: ConfigValue;
	defaultValue?: ConfigValue;
	valueSize?: number;
	format?: ValueFormat;
	name?: string;
	info?: string;
	noBulkSupport?: boolean;
	isAdvanced?: boolean;
	isReadonly?: boolean;
	requiresReInclusion?: boolean;
	// The following information cannot be detected by scanning
	// We have to rely on configuration to support them
	isWriteonly?: boolean;
	options?: ConfigOption[];
	isFromConfig?: boolean;
}

// A configuration value is either a single number or a bit map
export type ConfigValue = number | Set<number>;

export class ConfigurationCCError extends ZWaveError {
	public constructor(
		public readonly message: string,
		public readonly code: ZWaveErrorCodes,
		public readonly argument: any,
	) {
		super(message, code);

		// We need to set the prototype explicitly
		Object.setPrototypeOf(this, ConfigurationCCError.prototype);
	}
}

@API(CommandClasses.Configuration)
export class ConfigurationCCAPI extends CCAPI {
	/**
	 * Requests the current value of a given config parameter from the device.
	 * This may timeout and return `undefined` if the node does not respond.
	 * If the node replied with a different parameter number, a `ConfigurationCCError`
	 * is thrown with the `argument` property set to the reported parameter number.
	 */
	public async get(parameter: number): Promise<ConfigValue | undefined> {
		const cc = new ConfigurationCCGet(this.driver, {
			nodeId: this.node.id,
			parameter,
		});
		try {
			const response = (await this.driver.sendCommand<
				ConfigurationCCReport
			>(cc, {
				timeout: this.driver.options.timeouts.configurationGetSet,
			}))!;
			// Nodes may respond with a different parameter, e.g. if we
			// requested a non-existing one
			if (response.parameter === parameter) return response.value;
			log(
				"controller",
				`Received unexpected ConfigurationReport (param = ${response.parameter}, value = ${response.value})`,
				"error",
			);
			throw new ConfigurationCCError(
				`The first existing parameter on this node is ${response.parameter}`,
				ZWaveErrorCodes.ConfigurationCC_FirstParameterNumber,
				response.parameter,
			);
		} catch (e) {
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Controller_MessageTimeout
			) {
				// A timeout has to be expected. We return undefined to
				// signal that no value was received
				return undefined;
			}
			// This error was unexpected
			throw e;
		}
	}

	/**
	 * Sets a new value for a given config parameter of the device.
	 * The return value indicates whether the command succeeded (`true`) or timed out (`false`).
	 */
	public async set(
		parameter: number,
		value: ConfigValue,
		valueSize: 1 | 2 | 4,
	): Promise<boolean> {
		const cc = new ConfigurationCCSet(this.driver, {
			nodeId: this.node.id,
			parameter,
			value,
			valueSize,
		});
		try {
			await this.driver.sendCommand(cc, {
				timeout: this.driver.options.timeouts.configurationGetSet,
			});
			return true;
		} catch (e) {
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Controller_MessageTimeout
			) {
				// A timeout has to be expected
				return false;
			}
			// This error was unexpected
			throw e;
		}
	}

	/**
	 * Resets a configuration parameter to its default value.
	 * The return value indicates whether the command succeeded (`true`) or timed out (`false`).
	 */
	public async reset(parameter: number): Promise<boolean> {
		const cc = new ConfigurationCCSet(this.driver, {
			nodeId: this.node.id,
			parameter,
			resetToDefault: true,
		});
		try {
			await this.driver.sendCommand(cc, {
				timeout: this.driver.options.timeouts.configurationGetSet,
			});
			return true;
		} catch (e) {
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Controller_MessageTimeout
			) {
				// A timeout has to be expected
				return false;
			}
			// This error was unexpected
			throw e;
		}
	}

	/** Resets all configuration parameters to their default value */
	public async resetAll(): Promise<void> {
		const cc = new ConfigurationCCDefaultReset(this.driver, {
			nodeId: this.node.id,
		});
		await this.driver.sendCommand(cc);
	}

	/** Scans a V1/V2 node for the existing parameters using get/set commands */
	private async scanParametersV1V2(): Promise<void> {
		// TODO: Reduce the priority of the messages
		log(
			"controller",
			`${this.node.logPrefix}Scanning available parameters...`,
			"debug",
		);
		const ccInstance = this.node.createCCInstance<ConfigurationCC>(
			getCommandClass(this),
		)!;
		for (let param = 1; param <= 255; param++) {
			// Check if the parameter is readable
			let originalValue: ConfigValue | undefined;
			log(
				"controller",
				`${this.node.logPrefix}  trying param ${param}...`,
				"debug",
			);
			try {
				originalValue = await this.get(param);
				if (originalValue != undefined) {
					log(
						"controller",
						`${this.node.logPrefix}  Param ${param}:`,
						"debug",
					);
					log(
						"controller",
						`${this.node.logPrefix}    readable  = true`,
						"debug",
					);
					log(
						"controller",
						`${this.node.logPrefix}    valueSize = ${
							ccInstance.getParamInformation(param).valueSize
						}`,
						"debug",
					);
					log(
						"controller",
						`${this.node.logPrefix}    value     = ${originalValue}`,
						"debug",
					);
				}
			} catch (e) {
				if (
					e instanceof ConfigurationCCError &&
					e.code ===
						ZWaveErrorCodes.ConfigurationCC_FirstParameterNumber
				) {
					// Continue iterating with the next param
					if (e.argument - 1 > param) param = e.argument - 1;
					continue;
				}
				throw e;
			}
		}
	}

	/** Scans a V3+ node for the existing parameters using PropertiesGet commands */
	private async scanParametersV3(): Promise<void> {
		let param = 1;
		while (param > 0 && param <= 0xffff) {
			// Request param properties, name and info
			// The param information is stored automatically on receipt
			const propCC = new ConfigurationCCPropertiesGet(this.driver, {
				nodeId: this.node.id,
				parameter: param,
			});
			const propResponse = (await this.driver.sendCommand<
				ConfigurationCCPropertiesReport
			>(propCC))!;

			const nameCC = new ConfigurationCCNameGet(this.driver, {
				nodeId: this.node.id,
				parameter: param,
			});
			await this.driver.sendCommand(nameCC);

			const infoCC = new ConfigurationCCInfoGet(this.driver, {
				nodeId: this.node.id,
				parameter: param,
			});
			await this.driver.sendCommand(infoCC);

			// Continue with the next parameter
			// 0 indicates that this was the last parameter
			param = propResponse.nextParameter;
		}
	}

	/**
	 * This scans the node for the existing parameters. Found parameters will be reported
	 * through the `value added` and `value updated` events.
	 *
	 * WARNING: On nodes implementing V1 and V2, this process may take
	 * **up to an hour**, depending on the configured timeout.
	 *
	 * WARNING: On nodes implementing V2, all parameters after 255 will be ignored.
	 */
	public async scanParameters(): Promise<void> {
		if (this.version <= 2) return this.scanParametersV1V2();
		return this.scanParametersV3();
	}
}

// TODO: Test how the device interprets the default flag (V1-3) (reset all or only the specified)

@commandClass(CommandClasses.Configuration)
@implementedVersion(4)
export class ConfigurationCC extends CommandClass {
	public ccCommand!: ConfigurationCommand;

	public constructor(driver: IDriver, options: CommandClassOptions) {
		super(driver, options);
		// In order to (de)serialize the data composed by extendParamInformation,
		// we need to register a value
		this.registerValue("paramInformation" as any);
	}

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

			case ConfigurationCommand.DefaultReset:
				return this.version >= 4;
		}
		return super.supportsCommand(cmd);
	}

	/**
	 * Whether this node's param information was loaded from a config file.
	 * If this is true, we don't trust what the node reports
	 */
	protected get isParamInformationFromConfig(): boolean {
		return (
			this.getValueDB().getValue(
				getCommandClass(this),
				undefined,
				"isParamInformationFromConfig",
			) === true
		);
	}

	/**
	 * @internal
	 * Stores config parameter metadata for this CC's node
	 */
	public extendParamInformation(
		parameter: number,
		info: ParameterInfo,
	): void {
		// Don't trust reported param information if we have loaded it from a config file
		if (this.isParamInformationFromConfig) return;

		const valueDB = this.getValueDB();
		// Create the map if it does not exist
		if (
			!valueDB.hasValue(
				getCommandClass(this),
				// TODO: Should this be on the root endpoint?
				this.endpoint,
				"paramInformation",
			)
		) {
			valueDB.setValue(
				getCommandClass(this),
				this.endpoint,
				"paramInformation",
				new Map(),
			);
		}
		// Retrieve the map
		const paramInfo = valueDB.getValue(
			getCommandClass(this),
			this.endpoint,
			"paramInformation",
		) as Map<number, ParameterInfo>;
		// And make sure it has one entry for this parameter
		if (!paramInfo.has(parameter)) {
			paramInfo.set(parameter, {});
		}
		// Add/override the property
		Object.assign(paramInfo.get(parameter), info);
	}

	/**
	 * @internal
	 * Returns stored config parameter metadata for this CC's node
	 */
	public getParamInformation(parameter: number): ParameterInfo {
		const valueDB = this.getValueDB();
		const paramInfo = valueDB.getValue<
			Map<number, ParameterInfo> | undefined
		>(getCommandClass(this), this.endpoint, "paramInformation");
		return (paramInfo && paramInfo.get(parameter)) || {};
	}

	public serializeValuesForCache(): CacheValue[] {
		// Leave out the paramInformation if we have loaded it from a config file
		let values = super.serializeValuesForCache();
		if (this.isParamInformationFromConfig) {
			values = values.filter(
				v =>
					v.propertyName !== "paramInformation" &&
					v.propertyName !== "isParamInformationFromConfig",
			);
		}
		return values;
	}

	/** Deserializes the config parameter info from a config file */
	public deserializeParamInformationFromConfig(config: JSONObject): void {
		if (!isObject(config.paramInformation)) return;

		for (const [id, paramInfo] of entries(config.paramInformation)) {
			// TODO: validation
			// TODO: Infer minValue / maxValue from options if any are present
			this.extendParamInformation(parseInt(id), paramInfo);
		}

		// Remember that we loaded the param information from a config file
		this.getValueDB().setValue(
			getCommandClass(this),
			undefined,
			"isParamInformationFromConfig",
			true,
		);
	}
}

@CCCommand(ConfigurationCommand.Report)
export class ConfigurationCCReport extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		// All fields must be present
		validatePayload(this.payload.length > 2);
		const parameter = this.payload[0];
		this._valueSize = this.payload[1] & 0b111;
		// Ensure we received a valid report
		validatePayload(
			this._valueSize >= 1,
			this._valueSize <= 4,
			this.payload.length >= 2 + this._valueSize,
		);

		const value = parseValue(
			this.payload.slice(2),
			this._valueSize,
			// In Config CC v1/v2, this must be SignedInteger
			// As those nodes don't communicate any parameter information
			// we fall back to that default value anyways
			this.getParamInformation(parameter).format ||
				ValueFormat.SignedInteger,
		);
		this.values = [parameter, value];
		// Store the key value pair in the value DB
		this.persistValues();
		// And remember the parameter size
		this.extendParamInformation(parameter, { valueSize: this._valueSize });
	}

	@ccKeyValuePair()
	private values: [number, ConfigValue];

	public get parameter(): number {
		return this.values[0];
	}

	// TODO: Does this belong into the KVP?
	private _valueSize: number;
	public get valueSize(): number {
		return this._valueSize;
	}

	public get value(): ConfigValue {
		return this.values[1];
	}
}

interface ConfigurationCCGetOptions extends CCCommandOptions {
	parameter: number;
}

@CCCommand(ConfigurationCommand.Get)
@expectedCCResponse(ConfigurationCCReport)
export class ConfigurationCCGet extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | ConfigurationCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
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

type ConfigurationCCSetOptions = CCCommandOptions &
	(
		| {
				parameter: number;
				resetToDefault: true;
		  }
		| {
				parameter: number;
				resetToDefault?: false;
				valueSize: number;
				value: ConfigValue;
		  });

@CCCommand(ConfigurationCommand.Set)
export class ConfigurationCCSet extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | ConfigurationCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.parameter = options.parameter;
			this.resetToDefault = !!options.resetToDefault;
			if (!options.resetToDefault) {
				// TODO: Default to the stored value size
				this.valueSize = options.valueSize;
				this.value = options.value;
			}
		}
	}

	public resetToDefault: boolean;
	public parameter: number;
	public valueSize: number | undefined;
	public value: ConfigValue | undefined;

	public serialize(): Buffer {
		const valueSize = this.resetToDefault ? 1 : this.valueSize!;
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

const getResponseForBulkSet: DynamicCCResponse = (
	cc: ConfigurationCCBulkSet,
) => {
	return cc.handshake ? ConfigurationCCBulkReport : undefined;
};

@CCCommand(ConfigurationCommand.BulkSet)
@expectedCCResponse(getResponseForBulkSet)
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
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
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

@CCCommand(ConfigurationCommand.BulkReport)
export class ConfigurationCCBulkReport extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		// Ensure we received enough bytes for the preamble
		validatePayload(this.payload.length >= 5);
		const firstParameter = this.payload.readUInt16BE(0);
		const numParams = this.payload[2];
		this._reportsToFollow = this.payload[3];
		this._defaultValues = !!(this.payload[4] & 0b1000_0000);
		this._isHandshakeResponse = !!(this.payload[4] & 0b0100_0000);
		this._valueSize = this.payload[4] & 0b111;

		// Ensure the payload is long enough for all reported values
		validatePayload(this.payload.length >= 5 + numParams * this._valueSize);
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
		this.persistValues();
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
	@ccKeyValuePair()
	public get values(): ReadonlyMap<number, ConfigValue> {
		return this._values;
	}
}

interface ConfigurationCCBulkGetOptions extends CCCommandOptions {
	parameters: number[];
}

@CCCommand(ConfigurationCommand.BulkGet)
@expectedCCResponse(ConfigurationCCBulkReport)
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
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
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

@CCCommand(ConfigurationCommand.NameReport)
export class ConfigurationCCNameReport extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		// All fields must be present
		validatePayload(this.payload.length >= 4);
		this._parameter = this.payload.readUInt16BE(0);
		this._reportsToFollow = this.payload[2];
		this._name = this.payload.slice(3).toString("utf8");
	}

	private _parameter: number;
	public get parameter(): number {
		return this._parameter;
	}

	private _name: string;
	public get name(): string {
		return this._name;
	}

	private _reportsToFollow: number;
	public get reportsToFollow(): number {
		return this._reportsToFollow;
	}

	public expectMoreMessages(): boolean {
		return this._reportsToFollow > 0;
	}

	public mergePartialCCs(partials: ConfigurationCCNameReport[]): void {
		// Concat the name
		this._name = [...partials, this]
			.map(report => report._name)
			.reduce((prev, cur) => prev + cur, "");
		this.extendParamInformation(this.parameter, { name: this.name });
	}
}

@CCCommand(ConfigurationCommand.NameGet)
@expectedCCResponse(ConfigurationCCNameReport)
export class ConfigurationCCNameGet extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | ConfigurationCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
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
		// All fields must be present
		validatePayload(this.payload.length >= 4);
		this._parameter = this.payload.readUInt16BE(0);
		this._reportsToFollow = this.payload[2];
		this._info = this.payload.slice(3).toString("utf8");
	}

	private _parameter: number;
	public get parameter(): number {
		return this._parameter;
	}

	private _info: string;
	public get info(): string {
		return this._info;
	}

	private _reportsToFollow: number;
	public get reportsToFollow(): number {
		return this._reportsToFollow;
	}

	public expectMoreMessages(): boolean {
		return this._reportsToFollow > 0;
	}

	public mergePartialCCs(partials: ConfigurationCCInfoReport[]): void {
		// Concat the info
		this._info = [...partials, this]
			.map(report => report._info)
			.reduce((prev, cur) => prev + cur, "");
		this.extendParamInformation(this._parameter, {
			info: this._info,
		});
	}
}

@CCCommand(ConfigurationCommand.InfoGet)
@expectedCCResponse(ConfigurationCCInfoReport)
export class ConfigurationCCInfoGet extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | ConfigurationCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
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

		validatePayload(this.payload.length >= 3);
		this._parameter = this.payload.readUInt16BE(0);
		this._valueFormat = (this.payload[2] & 0b111000) >>> 3;
		this._valueSize = this.payload[2] & 0b111;

		// Ensure the payload contains the two bytes for next parameter
		const nextParameterOffset = 3 + 3 * this._valueSize;
		validatePayload(this.payload.length >= nextParameterOffset + 2);

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
				nextParameterOffset,
			);

			// Ensure the payload contains a byte for the 2nd option flags
			validatePayload(this.payload.length >= nextParameterOffset + 3);
			const options1 = this.payload[2];
			const options2 = this.payload[3 + 3 * this.valueSize + 2];
			this._requiresReInclusion = !!(options1 & 0b1000_0000);
			this._isReadonly = !!(options1 & 0b0100_0000);
			this._isAdvanced = !!(options2 & 0b1);
			this._noBulkSupport = !!(options2 & 0b10);
		}

		// If we actually received parameter info, store it
		if (this._valueSize > 0) {
			const paramInfo: ParameterInfo = stripUndefined({
				valueFormat: this._valueFormat,
				valueSize: this._valueSize,
				minValue: this._minValue,
				maxValue: this._maxValue,
				defaultValue: this._defaultValue,
				requiresReInclusion: this._requiresReInclusion,
				isReadonly: this._isReadonly,
				isAdvanced: this._isAdvanced,
				noBulkSupport: this._noBulkSupport,
			});
			this.extendParamInformation(this._parameter, paramInfo);
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

@CCCommand(ConfigurationCommand.PropertiesGet)
@expectedCCResponse(ConfigurationCCPropertiesReport)
export class ConfigurationCCPropertiesGet extends ConfigurationCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | ConfigurationCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
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

export function isSafeValue(
	value: number,
	size: 1 | 2 | 4,
	format: ValueFormat,
): boolean {
	let minSize: number | undefined;
	switch (format) {
		case ValueFormat.SignedInteger:
			minSize = getMinIntegerSize(value, true);
			break;
		case ValueFormat.UnsignedInteger:
		case ValueFormat.Enumerated:
			minSize = getMinIntegerSize(value, false);
			break;
		case ValueFormat.BitField:
		default:
			throw new Error("not implemented");
	}
	return minSize != undefined && size >= minSize;
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
