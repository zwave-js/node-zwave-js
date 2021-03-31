import type { ParamInfoMap } from "@zwave-js/config";
import type {
	MessageOrCCLogEntry,
	MessageRecord,
	ValueID,
} from "@zwave-js/core";
import {
	CacheMetadata,
	CacheValue,
	CommandClasses,
	ConfigurationMetadata,
	ConfigValueFormat,
	encodeBitMask,
	getIntegerLimits,
	getMinimumShiftForBitMask,
	getMinIntegerSize,
	isConsecutiveArray,
	Maybe,
	parseBitMask,
	stripUndefined,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { getEnumMemberName, pick } from "@zwave-js/shared";
import { distinct } from "alcalzone-shared/arrays";
import { composeObject } from "alcalzone-shared/objects";
import { padStart } from "alcalzone-shared/strings";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import {
	PhysicalCCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	CommandClassOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";

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

/** @publicAPI */
export type ConfigValue = import("@zwave-js/core").ConfigValue;

function configValueToString(value: ConfigValue): string {
	if (typeof value === "number") return value.toString();
	else return [...value].join(", ");
}

export class ConfigurationCCError extends ZWaveError {
	public constructor(
		public readonly message: string,
		public readonly code: ZWaveErrorCodes,
		public readonly argument: number,
	) {
		super(message, code);

		// We need to set the prototype explicitly
		Object.setPrototypeOf(this, ConfigurationCCError.prototype);
	}
}

export function getParamInformationValueID(
	parameter: number,
	bitMask?: number,
): ValueID {
	return {
		commandClass: CommandClasses.Configuration,
		property: parameter,
		propertyKey: bitMask,
	};
}

const isParamInfoFromConfigValueId: ValueID = {
	commandClass: CommandClasses.Configuration,
	property: "isParamInformationFromConfig",
};

@API(CommandClasses.Configuration)
export class ConfigurationCCAPI extends PhysicalCCAPI {
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

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property, propertyKey },
		value,
	): Promise<void> => {
		// Config parameters are addressed with numeric properties/keys
		if (typeof property !== "number") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (propertyKey != undefined && typeof propertyKey !== "number") {
			throwUnsupportedPropertyKey(this.ccId, property, propertyKey);
		}
		if (typeof value !== "number") {
			throwWrongValueType(this.ccId, property, "number", typeof value);
		}

		const ccInstance = this.endpoint.createCCInstance(ConfigurationCC)!;
		let valueSize = ccInstance.getParamInformation(property).valueSize;
		const valueFormat =
			ccInstance.getParamInformation(property).format ||
			ConfigValueFormat.SignedInteger;

		let targetValue: number;
		if (propertyKey) {
			// This is a partial value, we need to update some bits only
			// Find out the correct value size
			if (!valueSize) {
				valueSize = ccInstance.getParamInformation(
					property,
					propertyKey,
				).valueSize;
			}
			// Add the target value to the remaining partial values
			targetValue = ccInstance.composePartialParamValue(
				property,
				propertyKey,
				value,
			);
		} else {
			targetValue = value;
		}

		if (!valueSize) {
			// If there's no value size configured, figure out a matching value size
			valueSize = getMinIntegerSize(
				targetValue,
				valueFormat === ConfigValueFormat.SignedInteger,
			);
			// Throw if the value is too large or too small
			if (!valueSize) {
				throw new ZWaveError(
					`The value ${targetValue} is not valid for configuration parameters!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}

		// Make sure that the given value fits into the value size
		if (!isSafeValue(targetValue, valueSize, valueFormat)) {
			// If there is a value size configured, check that the given value is compatible
			throwInvalidValueError(value, property, valueSize, valueFormat);
		}

		await this.set(property, targetValue, valueSize as any);

		// Verify the current value after a delay
		this.schedulePoll({ property, propertyKey }, 1000);
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
		propertyKey,
	}): Promise<unknown> => {
		// Config parameters are addressed with numeric properties/keys
		if (typeof property !== "number") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (propertyKey != undefined && typeof propertyKey !== "number") {
			throwUnsupportedPropertyKey(this.ccId, property, propertyKey);
		}

		return this.get(property, { valueBitMask: propertyKey });
	};

	/**
	 * Requests the current value of a given config parameter from the device.
	 * This may timeout and return `undefined` if the node does not respond.
	 * If the node replied with a different parameter number, a `ConfigurationCCError`
	 * is thrown with the `argument` property set to the reported parameter number.
	 */
	public async get(
		parameter: number,
		options?: {
			valueBitMask?: number;
			allowUnexpectedResponse?: boolean;
		},
	): Promise<ConfigValue | undefined> {
		this.assertSupportsCommand(
			ConfigurationCommand,
			ConfigurationCommand.Get,
		);

		const { valueBitMask, allowUnexpectedResponse } = options ?? {};

		const cc = new ConfigurationCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
			parameter,
			allowUnexpectedResponse,
		});
		const response = await this.driver.sendCommand<ConfigurationCCReport>(
			cc,
			this.commandOptions,
		);
		if (!response) return;
		// Nodes may respond with a different parameter, e.g. if we
		// requested a non-existing one
		if (response.parameter === parameter) {
			if (!valueBitMask) return response.value;
			// If a partial parameter was requested, extract that value
			return (
				((response.value as any) & valueBitMask) >>>
				getMinimumShiftForBitMask(valueBitMask)
			);
		}
		this.driver.controllerLog.logNode(this.endpoint.nodeId, {
			message: `Received unexpected ConfigurationReport (param = ${
				response.parameter
			}, value = ${response.value.toString()})`,
			direction: "inbound",
			level: "error",
		});
		throw new ConfigurationCCError(
			`The first existing parameter on this node is ${response.parameter}`,
			ZWaveErrorCodes.ConfigurationCC_FirstParameterNumber,
			response.parameter,
		);
	}

	/**
	 * Sets a new value for a given config parameter of the device.
	 */
	public async set(
		parameter: number,
		value: ConfigValue,
		valueSize: 1 | 2 | 4,
	): Promise<void> {
		this.assertSupportsCommand(
			ConfigurationCommand,
			ConfigurationCommand.Set,
		);

		const cc = new ConfigurationCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
			parameter,
			value,
			valueSize,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Resets a configuration parameter to its default value.
	 *
	 * WARNING: This will throw on legacy devices (ConfigurationCC v3 and below)
	 */
	public async reset(parameter: number): Promise<void> {
		this.assertSupportsCommand(
			ConfigurationCommand,
			ConfigurationCommand.Set,
		);

		const cc = new ConfigurationCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
			parameter,
			resetToDefault: true,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	/** Resets all configuration parameters to their default value */
	public async resetAll(): Promise<void> {
		this.assertSupportsCommand(
			ConfigurationCommand,
			ConfigurationCommand.DefaultReset,
		);

		const cc = new ConfigurationCCDefaultReset(this.driver, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getProperties(parameter: number) {
		const cc = new ConfigurationCCPropertiesGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
			parameter,
		});
		const response = await this.driver.sendCommand<ConfigurationCCPropertiesReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"valueSize",
				"valueFormat",
				"minValue",
				"maxValue",
				"defaultValue",
				"nextParameter",
				"altersCapabilities",
				"isReadonly",
				"isAdvanced",
				"noBulkSupport",
			]);
		}
	}

	/** Requests the name of a configuration parameter from the node */
	public async getName(parameter: number): Promise<string | undefined> {
		const cc = new ConfigurationCCNameGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
			parameter,
		});
		const response = await this.driver.sendCommand<ConfigurationCCNameReport>(
			cc,
			this.commandOptions,
		);
		return response?.name;
	}

	/** Requests usage info for a configuration parameter from the node */
	public async getInfo(parameter: number): Promise<string | undefined> {
		const cc = new ConfigurationCCInfoGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
			parameter,
		});
		const response = await this.driver.sendCommand<ConfigurationCCInfoReport>(
			cc,
			this.commandOptions,
		);
		return response?.info;
	}

	/**
	 * This scans the node for the existing parameters. Found parameters will be reported
	 * through the `value added` and `value updated` events.
	 *
	 * WARNING: This method throws for newer devices.
	 *
	 * WARNING: On nodes implementing V1 and V2, this process may take
	 * **up to an hour**, depending on the configured timeout.
	 *
	 * WARNING: On nodes implementing V2, all parameters after 255 will be ignored.
	 */
	public async scanParametersLegacy(): Promise<void> {
		if (this.version >= 3) {
			throw new ZWaveError(
				"Use ConfigurationCC.interview instead of scanning parameters for versions 3 and above.",
				ZWaveErrorCodes.ConfigurationCC_NoLegacyScanOnNewDevices,
			);
		}

		// TODO: Reduce the priority of the messages
		this.driver.controllerLog.logNode(
			this.endpoint.nodeId,
			`Scanning available parameters...`,
		);
		const ccInstance = this.endpoint.createCCInstance(ConfigurationCC)!;
		for (let param = 1; param <= 255; param++) {
			// Check if the parameter is readable
			let originalValue: ConfigValue | undefined;
			this.driver.controllerLog.logNode(this.endpoint.nodeId, {
				message: `  trying param ${param}...`,
				direction: "outbound",
			});
			try {
				originalValue = await this.get(param, {
					// When requesting a non-existing parameter, a node SHOULD respond with the
					// first available parameter. We use this for the first param only,
					// because delayed responses might otherwise confuse the interview process
					allowUnexpectedResponse: param === 1,
				});
				if (originalValue != undefined) {
					const logMessage = `  Param ${param}:
    readable  = true
    valueSize = ${ccInstance.getParamInformation(param).valueSize}
    value     = ${originalValue.toString()}`;
					this.driver.controllerLog.logNode(this.endpoint.nodeId, {
						message: logMessage,
						direction: "inbound",
					});
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
}

@commandClass(CommandClasses.Configuration)
@implementedVersion(4)
export class ConfigurationCC extends CommandClass {
	declare ccCommand: ConfigurationCommand;

	public constructor(driver: Driver, options: CommandClassOptions) {
		super(driver, options);
		this.registerValue("isParamInformationFromConfig" as any, true);
	}

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Configuration.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		const config = node.deviceConfig?.paramInformation;
		if (config) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `${this.constructor.name}: Loading configuration parameters from device config`,
				direction: "none",
			});
			this.deserializeParamInformationFromConfig(config);
		}

		if (this.version >= 3) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "finding first configuration parameter...",
				direction: "outbound",
			});
			const param0props = await api.getProperties(0);
			let param: number;
			if (param0props) {
				param = param0props.nextParameter;
				if (param === 0) {
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `didn't report any config params, trying #1 just to be sure...`,
						direction: "inbound",
					});
					param = 1;
				}
			} else {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Finding first configuration parameter timed out, skipping interview...",
					level: "warn",
				});
				return;
			}

			while (param > 0) {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying parameter #${param} information...`,
					direction: "outbound",
				});

				// Query properties and the next param
				const props = await api.getProperties(param);
				if (!props) {
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `Querying parameter #${param} information timed out, skipping interview...`,
						level: "warn",
					});
					return;
				}
				const { nextParameter, ...properties } = props;

				let logMessage: string;
				if (properties.valueSize === 0) {
					logMessage = `Parameter #${param} is unsupported. Next parameter: ${nextParameter}`;
				} else {
					// Query name and info only if the parameter is supported
					const name = (await api.getName(param)) ?? "(unknown)";
					// Skip the info query for bugged devices
					if (
						!node.deviceConfig?.compat?.skipConfigurationInfoQuery
					) {
						await api.getInfo(param);
					}

					logMessage = `received information for parameter #${param}:
parameter name:      ${name}
value format:        ${getEnumMemberName(
						ConfigValueFormat,
						properties.valueFormat,
					)}
value size:          ${properties.valueSize} bytes
min value:           ${properties.minValue?.toString() ?? "undefined"}
max value:           ${properties.maxValue?.toString() ?? "undefined"}
default value:       ${properties.defaultValue?.toString() ?? "undefined"}
is read-only:        ${!!properties.isReadonly}
is advanced (UI):    ${!!properties.isAdvanced}
has bulk support:    ${!properties.noBulkSupport}
alters capabilities: ${!!properties.altersCapabilities}`;
				}
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});

				// Some devices report their parameter 1 instead of 0 as the next one
				// when reaching the end. To avoid infinite loops, stop scanning
				// once the next parameter is lower than the current one
				if (nextParameter > param) {
					param = nextParameter;
				} else {
					break;
				}
			}
		}

		await this.refreshValues();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Configuration.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		if (this.version < 3) {
			// V1/V2: Query all values defined in the config file
			const paramInfo = node.deviceConfig?.paramInformation;
			if (paramInfo?.size) {
				// Because partial params share the same parameter number,
				// we need to remember which ones we have already queried.
				const alreadyQueried = new Set<number>();
				for (const param of paramInfo.keys()) {
					// No need to query writeonly params
					if (paramInfo.get(param)?.writeOnly) continue;
					// Don't double-query params
					if (alreadyQueried.has(param.parameter)) continue;
					alreadyQueried.add(param.parameter);

					// Query the current value
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `querying parameter #${param.parameter} value...`,
						direction: "outbound",
					});
					// ... at least try to
					const paramValue = await api.get(param.parameter);
					if (typeof paramValue === "number") {
						this.driver.controllerLog.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `parameter #${param.parameter} has value: ${paramValue}`,
							direction: "inbound",
						});
					} else if (!paramValue) {
						this.driver.controllerLog.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `received no value for parameter #${param.parameter}`,
							direction: "inbound",
							level: "warn",
						});
					}
				}
			} else {
				this.driver.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `${this.constructor.name}: skipping interview because CC version is < 3 and there is no config file`,
					direction: "none",
				});
			}
		} else {
			// V3+: Query the values of discovered parameters
			const parameters = distinct(
				this.getDefinedValueIDs()
					.map((v) => v.property)
					.filter((p): p is number => typeof p === "number"),
			);
			for (const param of parameters) {
				if (this.getParamInformation(param).readable !== false) {
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `querying parameter #${param} value...`,
						direction: "outbound",
					});
					await api.get(param);
				} else {
					this.driver.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `not querying parameter #${param} value, because it is writeonly`,
						direction: "none",
					});
				}
			}
		}
	}

	/**
	 * Whether this node's param information was loaded from a config file.
	 * If this is true, we don't trust what the node reports
	 */
	protected get isParamInformationFromConfig(): boolean {
		return (
			this.getValueDB().getValue(isParamInfoFromConfigValueId) === true
		);
	}

	/**
	 * @internal
	 * Stores config parameter metadata for this CC's node
	 */
	public extendParamInformation(
		parameter: number,
		valueBitMask: number | undefined,
		info: Partial<ConfigurationMetadata>,
	): void {
		// Don't trust param information that a node reports if we have already loaded it from a config file
		if (this.isParamInformationFromConfig) return;

		const valueDB = this.getValueDB();
		const valueId = getParamInformationValueID(parameter, valueBitMask);
		// Retrieve the base metadata
		const metadata = this.getParamInformation(parameter, valueBitMask);
		// Override it with new data
		Object.assign(metadata, info);
		// And store it back
		valueDB.setMetadata(valueId, metadata);
	}

	/**
	 * @internal
	 * Returns stored config parameter metadata for this CC's node
	 */
	public getParamInformation(
		parameter: number,
		valueBitMask?: number,
	): ConfigurationMetadata {
		const valueDB = this.getValueDB();
		const valueId = getParamInformationValueID(parameter, valueBitMask);
		return (
			(valueDB.getMetadata(valueId) as ConfigurationMetadata) ?? {
				...ValueMetadata.Any,
			}
		);
	}

	/**
	 * @internal
	 * Returns the param info that was queried for this node. This returns the information that was returned by the node
	 * and does not include partial parameters.
	 */
	public getQueriedParamInfos(): Record<number, ConfigurationMetadata> {
		const parameters = distinct(
			this.getDefinedValueIDs()
				.map((v) => v.property)
				.filter((p): p is number => typeof p === "number"),
		);
		return composeObject(
			parameters.map((p) => [p as any, this.getParamInformation(p)]),
		);
	}

	/**
	 * Returns stored config parameter metadata for all partial config params addressed with the given parameter number
	 */
	public getPartialParamInfos(
		parameter: number,
	): (ValueID & { metadata: ConfigurationMetadata })[] {
		const valueDB = this.getValueDB();
		return valueDB.findMetadata(
			(id) =>
				id.commandClass === this.ccId &&
				id.property === parameter &&
				id.propertyKey != undefined,
		) as (ValueID & { metadata: ConfigurationMetadata })[];
	}

	/**
	 * Returns stored config parameter metadata for all partial config params addressed with the given parameter number
	 */
	public composePartialParamValue(
		parameter: number,
		valueBitMask: number,
		maskedValue: number,
	): number {
		const valueDB = this.getValueDB();
		// Add the other values
		const otherValues = valueDB
			.findValues(
				(id) =>
					id.commandClass === this.ccId &&
					id.property === parameter &&
					id.propertyKey != undefined,
			)
			.map(({ propertyKey, value }) =>
				propertyKey === valueBitMask
					? 0
					: (value as number) <<
					  getMinimumShiftForBitMask(propertyKey as number),
			)
			.reduce((prev, cur) => prev | cur, 0);
		return (
			(otherValues & ~valueBitMask) |
			(maskedValue << getMinimumShiftForBitMask(valueBitMask))
		);
	}

	public serializeValuesForCache(): CacheValue[] {
		// Leave out the paramInformation if we have loaded it from a config file
		let values = super.serializeValuesForCache();
		values = values.filter(
			(v) => v.property !== "isParamInformationFromConfig",
		);
		return values;
	}

	public serializeMetadataForCache(): CacheMetadata[] {
		// Leave out the param metadata if we have loaded it from a config file
		let metadata = super.serializeMetadataForCache();
		if (this.isParamInformationFromConfig) {
			metadata = metadata.filter((m) => typeof m.property === "number");
		}
		return metadata;
	}

	/** Deserializes the config parameter info from a config file */
	public deserializeParamInformationFromConfig(config: ParamInfoMap): void {
		const valueDB = this.getValueDB();

		// Clear old param information
		for (const meta of valueDB.getAllMetadata(this.ccId)) {
			if (typeof meta.property === "number") {
				// this is a param information, delete it
				valueDB.setMetadata(
					meta,
					undefined,
					// Don't emit the added/updated events, as this will spam applications with untranslated events
					{ noEvent: true },
				);
			}
		}

		// Allow overwriting the param info (mark it as unloaded)
		valueDB.setValue(isParamInfoFromConfigValueId, false);

		for (const [param, info] of config.entries()) {
			// We need to make the config information compatible with the
			// format that ConfigurationCC reports
			const paramInfo: Partial<ConfigurationMetadata> = {
				// TODO: Make this smarter! (0...1 ==> boolean)
				type: "number",
				valueSize: info.valueSize,
				min: info.minValue,
				max: info.maxValue,
				default: info.defaultValue,
				unit: info.unit,
				format: info.unsigned
					? ConfigValueFormat.UnsignedInteger
					: ConfigValueFormat.SignedInteger,
				readable: !info.writeOnly,
				writeable: !info.readOnly,
				allowManualEntry: info.allowManualEntry,
				states:
					info.options.length > 0
						? composeObject(
								info.options.map(({ label, value }) => [
									value.toString(),
									label,
								]),
						  )
						: undefined,
				label: info.label,
				description: info.description,
				isFromConfig: true,
			};
			this.extendParamInformation(
				param.parameter,
				param.valueBitMask,
				paramInfo,
			);
		}

		// Remember that we loaded the param information from a config file
		valueDB.setValue(isParamInfoFromConfigValueId, true);
	}

	public translatePropertyKey(
		property: string | number,
		propertyKey?: string | number,
	): string | undefined {
		if (
			typeof property === "number" &&
			(propertyKey == undefined || typeof propertyKey === "number")
		) {
			// This CC names all configuration parameters differently,
			// so no name for the property key is required
			return undefined;
		}
		return super.translateProperty(property, propertyKey);
	}

	public translateProperty(
		property: string | number,
		propertyKey?: string | number,
	): string {
		// Try to retrieve the configured param label
		if (
			typeof property === "number" &&
			(propertyKey == undefined || typeof propertyKey === "number")
		) {
			const paramInfo = this.getParamInformation(property, propertyKey);
			if (paramInfo.label) return paramInfo.label;
			// fall back to paramXYZ[_key] if none is defined
			let ret = `param${padStart(property.toString(), 3, "0")}`;
			if (propertyKey != undefined) {
				ret += "_" + propertyKey.toString();
			}
			return ret;
		}
		return super.translateProperty(property, propertyKey);
	}
}

@CCCommand(ConfigurationCommand.Report)
export class ConfigurationCCReport extends ConfigurationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		// All fields must be present
		validatePayload(this.payload.length > 2);
		this._parameter = this.payload[0];
		this._valueSize = this.payload[1] & 0b111;
		// Ensure we received a valid report
		validatePayload(
			this._valueSize >= 1,
			this._valueSize <= 4,
			this.payload.length >= 2 + this._valueSize,
		);

		const oldParamInformation = this.getParamInformation(this._parameter);
		this._value = parseValue(
			this.payload.slice(2),
			this._valueSize,
			// In Config CC v1/v2, this must be SignedInteger
			// As those nodes don't communicate any parameter information
			// we fall back to that default value anyways
			oldParamInformation.format || ConfigValueFormat.SignedInteger,
		);
		// Store the parameter size and value
		this.extendParamInformation(this._parameter, undefined, {
			valueSize: this._valueSize,
			type:
				oldParamInformation.format === ConfigValueFormat.BitField
					? "number[]"
					: "number",
		});
		if (
			this.version < 3 &&
			!this.isParamInformationFromConfig &&
			oldParamInformation.min == undefined &&
			oldParamInformation.max == undefined
		) {
			const isSigned =
				oldParamInformation.format == undefined ||
				oldParamInformation.format === ConfigValueFormat.SignedInteger;
			this.extendParamInformation(
				this._parameter,
				undefined,
				getIntegerLimits(this._valueSize as any, isSigned),
			);
		}
		// And store the value itself
		// If we have partial config params defined, we need to split the value
		const partialParams = this.getPartialParamInfos(this._parameter);
		if (partialParams.length > 0) {
			for (const param of partialParams) {
				if (typeof param.propertyKey === "number") {
					this.getValueDB().setValue(
						{
							commandClass: this.ccId,
							property: this._parameter,
							propertyKey: param.propertyKey,
						},
						((this._value as any) & param.propertyKey) >>>
							getMinimumShiftForBitMask(param.propertyKey),
					);
				}
			}
		} else {
			// This is a single param
			this.getValueDB().setValue(
				{
					commandClass: this.ccId,
					property: this._parameter,
				},
				this._value,
			);
		}
	}

	private _parameter: number;
	public get parameter(): number {
		return this._parameter;
	}

	private _value: ConfigValue;
	public get value(): ConfigValue {
		return this._value;
	}

	private _valueSize: number;
	public get valueSize(): number {
		return this._valueSize;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"parameter #": this.parameter,
				"value size": this.valueSize,
				value: configValueToString(this.value),
			},
		};
	}
}

function testResponseForConfigurationGet(
	sent: ConfigurationCCGet,
	received: ConfigurationCCReport,
) {
	// We expect a Configuration Report that matches the requested parameter
	return (
		sent.parameter === received.parameter || sent.allowUnexpectedResponse
	);
}

interface ConfigurationCCGetOptions extends CCCommandOptions {
	parameter: number;
	/**
	 * If this is `true`, responses with different parameters than expected are accepted
	 * and treated as hints for the first parameter number.
	 */
	allowUnexpectedResponse?: boolean;
}

@CCCommand(ConfigurationCommand.Get)
@expectedCCResponse(ConfigurationCCReport, testResponseForConfigurationGet)
export class ConfigurationCCGet extends ConfigurationCC {
	public constructor(
		driver: Driver,
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
			this.allowUnexpectedResponse =
				options.allowUnexpectedResponse ?? false;
		}
	}

	public parameter: number;
	public allowUnexpectedResponse: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.parameter]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "parameter #": this.parameter },
		};
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
		  }
	);

@CCCommand(ConfigurationCommand.Set)
export class ConfigurationCCSet extends ConfigurationCC {
	public constructor(
		driver: Driver,
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
			// According to SDS14223 this flag SHOULD NOT be set
			// Because we don't want to test the behavior, we enforce that it MUST not be set
			// on legacy nodes
			if (options.resetToDefault && this.version <= 3) {
				throw new ZWaveError(
					`The resetToDefault flag MUST not be used on nodes implementing ConfigurationCC V3 or less!`,
					ZWaveErrorCodes.ConfigurationCC_NoResetToDefaultOnLegacyDevices,
				);
			}
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
			const valueFormat =
				this.getParamInformation(this.parameter).format ||
				ConfigValueFormat.SignedInteger;

			// Make sure that the given value fits into the value size
			if (
				typeof this.value === "number" &&
				!isSafeValue(this.value, valueSize, valueFormat)
			) {
				// If there is a value size configured, check that the given value is compatible
				throwInvalidValueError(
					this.value,
					this.parameter,
					valueSize,
					valueFormat,
				);
			}

			try {
				serializeValue(
					this.payload,
					2,
					valueSize,
					valueFormat,
					this.value!,
				);
			} catch (e) {
				tryCatchOutOfBoundsError(
					e,
					this.value,
					this.parameter,
					valueSize,
					valueFormat,
				);
			}
		}
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"parameter #": this.parameter,
			"reset to default": this.resetToDefault,
		};
		if (this.valueSize != undefined) {
			message["value size"] = this.valueSize;
		}
		if (this.value != undefined) {
			message.value = configValueToString(this.value);
		}
		return {
			...super.toLogEntry(),
			message,
		};
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
		  }
	);

function getResponseForBulkSet(cc: ConfigurationCCBulkSet) {
	return cc.handshake ? ConfigurationCCBulkReport : undefined;
}

@CCCommand(ConfigurationCommand.BulkSet)
@expectedCCResponse(getResponseForBulkSet)
export class ConfigurationCCBulkSet extends ConfigurationCC {
	public constructor(
		driver: Driver,
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
				const value = this._values[i];
				const param = this._parameters[i];
				const valueFormat =
					this.getParamInformation(param).format ||
					ConfigValueFormat.SignedInteger;

				// Make sure that the given value fits into the value size
				if (!isSafeValue(value, valueSize, valueFormat)) {
					// If there is a value size configured, check that the given value is compatible
					throwInvalidValueError(
						value,
						param,
						valueSize,
						valueFormat,
					);
				}

				try {
					serializeValue(
						this.payload,
						4 + i * valueSize,
						valueSize,
						valueFormat,
						value,
					);
				} catch (e) {
					tryCatchOutOfBoundsError(
						e,
						value,
						param,
						valueSize,
						valueFormat,
					);
				}
			}
		}
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			handshake: this.handshake,
			"reset to default": this.resetToDefault,
			"value size": this.valueSize,
		};
		if (this._values.length > 0) {
			message.values = this._values
				.map(
					(value, i) =>
						`\n· #${this._parameters[i]}: ${configValueToString(
							value,
						)}`,
				)
				.join("");
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(ConfigurationCommand.BulkReport)
export class ConfigurationCCBulkReport extends ConfigurationCC {
	public constructor(
		driver: Driver,
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
						ConfigValueFormat.SignedInteger,
				),
			);
		}
		// Store every received parameter
		for (const [parameter, value] of this._values.entries()) {
			this.getValueDB().setValue(
				{
					commandClass: this.ccId,
					property: parameter,
				},
				value,
			);
		}
	}

	private _reportsToFollow: number;
	public get reportsToFollow(): number {
		return this._reportsToFollow;
	}

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// We don't expect the driver to merge CCs but we want to wait until all reports have been received
		return {};
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

	private _values = new Map<number, ConfigValue>();
	public get values(): ReadonlyMap<number, ConfigValue> {
		return this._values;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"handshake response": this._isHandshakeResponse,
			"default values": this._defaultValues,
			"value size": this._valueSize,
			"reports to follow": this.reportsToFollow,
		};
		if (this._values.size > 0) {
			message.values = [...this._values]
				.map(
					([param, value]) => `
· #${param}: ${configValueToString(value)}`,
				)
				.join("");
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

interface ConfigurationCCBulkGetOptions extends CCCommandOptions {
	parameters: number[];
}

@CCCommand(ConfigurationCommand.BulkGet)
@expectedCCResponse(ConfigurationCCBulkReport)
export class ConfigurationCCBulkGet extends ConfigurationCC {
	public constructor(
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { parameters: this.parameters.join(", ") },
		};
	}
}

@CCCommand(ConfigurationCommand.NameReport)
export class ConfigurationCCNameReport extends ConfigurationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		// Parameter and # of reports must be present
		validatePayload(this.payload.length >= 3);
		this._parameter = this.payload.readUInt16BE(0);
		this._reportsToFollow = this.payload[2];
		if (this._reportsToFollow > 0) {
			// If more reports follow, the info must at least be one byte
			validatePayload(this.payload.length >= 4);
		}
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

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Distinguish sessions by the parameter number
		return { parameter: this._parameter };
	}

	public expectMoreMessages(): boolean {
		return this._reportsToFollow > 0;
	}

	public mergePartialCCs(partials: ConfigurationCCNameReport[]): void {
		// Concat the name
		this._name = [...partials, this]
			.map((report) => report._name)
			.reduce((prev, cur) => prev + cur, "");
		this.extendParamInformation(this.parameter, undefined, {
			name: this.name,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"parameter #": this.parameter,
				name: this.name,
				"reports to follow": this.reportsToFollow,
			},
		};
	}
}

@CCCommand(ConfigurationCommand.NameGet)
@expectedCCResponse(ConfigurationCCNameReport)
export class ConfigurationCCNameGet extends ConfigurationCC {
	public constructor(
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "parameter #": this.parameter },
		};
	}
}

@CCCommand(ConfigurationCommand.InfoReport)
export class ConfigurationCCInfoReport extends ConfigurationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		// Parameter and # of reports must be present
		validatePayload(this.payload.length >= 3);
		this._parameter = this.payload.readUInt16BE(0);
		this._reportsToFollow = this.payload[2];
		if (this._reportsToFollow > 0) {
			// If more reports follow, the info must at least be one byte
			validatePayload(this.payload.length >= 4);
		}
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

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Distinguish sessions by the parameter number
		return { parameter: this._parameter };
	}

	public expectMoreMessages(): boolean {
		return this._reportsToFollow > 0;
	}

	public mergePartialCCs(partials: ConfigurationCCInfoReport[]): void {
		// Concat the info
		this._info = [...partials, this]
			.map((report) => report._info)
			.reduce((prev, cur) => prev + cur, "");
		this.extendParamInformation(this._parameter, undefined, {
			info: this._info,
		});
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"parameter #": this.parameter,
				info: this.info,
				"reports to follow": this.reportsToFollow,
			},
		};
	}
}

@CCCommand(ConfigurationCommand.InfoGet)
@expectedCCResponse(ConfigurationCCInfoReport)
export class ConfigurationCCInfoGet extends ConfigurationCC {
	public constructor(
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "parameter #": this.parameter },
		};
	}
}

@CCCommand(ConfigurationCommand.PropertiesReport)
export class ConfigurationCCPropertiesReport extends ConfigurationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 3);
		this._parameter = this.payload.readUInt16BE(0);
		this._valueFormat = (this.payload[2] & 0b111000) >>> 3;
		this._valueSize = this.payload[2] & 0b111;

		// GH#1309 Some devices don't tell us the first parameter if we query #0
		// Instead, they contain 0x000000
		if (this._valueSize === 0 && this.payload.length < 5) {
			this._nextParameter = 0;
			return;
		}

		// Ensure the payload contains the two bytes for next parameter
		const nextParameterOffset = 3 + 3 * this._valueSize;
		validatePayload(this.payload.length >= nextParameterOffset + 2);

		if (this.valueSize > 0) {
			if (this._valueFormat !== ConfigValueFormat.BitField) {
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
			this._altersCapabilities = !!(options1 & 0b1000_0000);
			this._isReadonly = !!(options1 & 0b0100_0000);
			this._isAdvanced = !!(options2 & 0b1);
			this._noBulkSupport = !!(options2 & 0b10);
		}

		// If we actually received parameter info, store it
		if (this._valueSize > 0) {
			const valueType =
				this._valueFormat === ConfigValueFormat.SignedInteger ||
				this._valueFormat === ConfigValueFormat.UnsignedInteger
					? "number"
					: "number[]";
			const paramInfo: Partial<ConfigurationMetadata> = stripUndefined({
				type: valueType,
				valueFormat: this._valueFormat,
				valueSize: this._valueSize,
				minValue: this._minValue,
				maxValue: this._maxValue,
				defaultValue: this._defaultValue,
				requiresReInclusion: this._altersCapabilities,
				writeable: !this._isReadonly,
				isAdvanced: this._isAdvanced,
				noBulkSupport: this._noBulkSupport,
			});
			this.extendParamInformation(this._parameter, undefined, paramInfo);
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

	private _valueFormat: ConfigValueFormat;
	public get valueFormat(): ConfigValueFormat {
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

	private _altersCapabilities: boolean | undefined;
	public get altersCapabilities(): boolean | undefined {
		return this._altersCapabilities;
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

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"parameter #": this._parameter,
			"next param #": this._nextParameter,
			"value size": this._valueSize,
			"value format": getEnumMemberName(
				ConfigValueFormat,
				this._valueFormat,
			),
		};
		if (this._minValue != undefined) {
			message["min value"] = configValueToString(this._minValue);
		}
		if (this._maxValue != undefined) {
			message["max value"] = configValueToString(this._maxValue);
		}
		if (this._defaultValue != undefined) {
			message["default value"] = configValueToString(this._defaultValue);
		}
		if (this._altersCapabilities != undefined) {
			message["alters capabilities"] = this._altersCapabilities;
		}
		if (this._isReadonly != undefined) {
			message.readonly = this._isReadonly;
		}
		if (this._isAdvanced != undefined) {
			message.advanced = this._isAdvanced;
		}
		if (this._noBulkSupport != undefined) {
			message["bulk support"] = !this._noBulkSupport;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(ConfigurationCommand.PropertiesGet)
@expectedCCResponse(ConfigurationCCPropertiesReport)
export class ConfigurationCCPropertiesGet extends ConfigurationCC {
	public constructor(
		driver: Driver,
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "parameter #": this.parameter },
		};
	}
}

@CCCommand(ConfigurationCommand.DefaultReset)
export class ConfigurationCCDefaultReset extends ConfigurationCC {}

function isSafeValue(
	value: number,
	size: number,
	format: ConfigValueFormat,
): boolean {
	let minValue: number;
	let maxValue: number;
	switch (format) {
		case ConfigValueFormat.SignedInteger:
			minValue = -Math.pow(2, 8 * size - 1);
			maxValue = Math.pow(2, 8 * size - 1) - 1;
			break;
		case ConfigValueFormat.UnsignedInteger:
		case ConfigValueFormat.Enumerated:
			minValue = 0;
			maxValue = Math.pow(2, 8 * size);
			break;
		case ConfigValueFormat.BitField:
		default:
			throw new Error("not implemented");
	}
	return minValue <= value && value <= maxValue;
}

/** Interprets values from the payload depending on the value format */
function parseValue(
	raw: Buffer,
	size: number,
	format: ConfigValueFormat,
): ConfigValue {
	switch (format) {
		case ConfigValueFormat.SignedInteger:
			return raw.readIntBE(0, size);
		case ConfigValueFormat.UnsignedInteger:
		case ConfigValueFormat.Enumerated:
			return raw.readUIntBE(0, size);
		case ConfigValueFormat.BitField:
			return new Set(parseBitMask(raw.slice(0, size)));
	}
}

function throwInvalidValueError(
	value: any,
	parameter: number,
	valueSize: number,
	valueFormat: ConfigValueFormat,
): never {
	throw new ZWaveError(
		`The value ${value} is invalid for configuration parameter ${parameter} (size = ${valueSize}, format = ${getEnumMemberName(
			ConfigValueFormat,
			valueFormat,
		)})!`,
		ZWaveErrorCodes.Argument_Invalid,
	);
}

function tryCatchOutOfBoundsError(
	e: Error,
	value: any,
	parameter: number,
	valueSize: number,
	valueFormat: ConfigValueFormat,
): void {
	if (e.message.includes("out of bounds")) {
		throwInvalidValueError(value, parameter, valueSize, valueFormat);
	} else {
		throw e;
	}
}

/** Serializes values into the payload according to the value format */
function serializeValue(
	payload: Buffer,
	offset: number,
	size: number,
	format: ConfigValueFormat,
	value: ConfigValue,
): void {
	switch (format) {
		case ConfigValueFormat.SignedInteger:
			payload.writeIntBE(value as number, offset, size);
			return;
		case ConfigValueFormat.UnsignedInteger:
		case ConfigValueFormat.Enumerated:
			payload.writeUIntBE(value as number, offset, size);
			return;
		case ConfigValueFormat.BitField: {
			const mask = encodeBitMask(
				[...(value as Set<number>).values()],
				size * 8,
			);
			mask.copy(payload, offset);
			return;
		}
	}
}
