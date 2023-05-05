import type { ParamInfoMap } from "@zwave-js/config";
import {
	CommandClasses,
	ConfigurationMetadata,
	ConfigValueFormat,
	encodeBitMask,
	encodePartial,
	getBitMaskWidth,
	getIntegerLimits,
	getMinIntegerSize,
	isConsecutiveArray,
	IVirtualEndpoint,
	IZWaveEndpoint,
	Maybe,
	MessageOrCCLogEntry,
	MessagePriority,
	MessageRecord,
	parseBitMask,
	parsePartial,
	stripUndefined,
	supervisedCommandSucceeded,
	SupervisionResult,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { distinct } from "alcalzone-shared/arrays";
import { composeObject } from "alcalzone-shared/objects";
import { padStart } from "alcalzone-shared/strings";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../lib/API";
import {
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { ConfigurationCommand, ConfigValue } from "../lib/_Types";

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

export const ConfigurationCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Configuration, {
		...V.staticProperty(
			"isParamInformationFromConfig",
			undefined, // meta
			{ internal: true, supportsEndpoints: false }, // value options
		),
	}),

	...V.defineDynamicCCValues(CommandClasses.Configuration, {
		...V.dynamicPropertyAndKeyWithName(
			"paramInformation",
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			(parameter: number, bitMask?: number) => parameter,
			(parameter: number, bitMask?: number) => bitMask,
			({ property, propertyKey }) =>
				typeof property === "number" &&
				(typeof propertyKey === "number" || propertyKey == undefined),
			// Metadata is determined dynamically depending on other factors
			undefined,
			{ supportsEndpoints: false },
		),
	}),
});

export type ConfigurationCCAPISetOptions = {
	parameter: number;
} & (
	| {
			// Variant 1: Normal parameter, defined in a config file
			bitMask?: undefined;
			value: ConfigValue;
	  }
	| {
			// Variant 2: Normal parameter, not defined in a config file
			bitMask?: undefined;
			value: ConfigValue;
			valueSize: 1 | 2 | 4;
			valueFormat: ConfigValueFormat;
	  }
	| {
			// Variant 3: Partial parameter, must be defined in a config file
			bitMask: number;
			value: number;
	  }
);

type NormalizedConfigurationCCAPISetOptions = {
	parameter: number;
	valueSize: 1 | 2 | 4;
	valueFormat: ConfigValueFormat;
} & (
	| { bitMask?: undefined; value: ConfigValue }
	| { bitMask: number; value: number }
);

function createConfigurationCCInstance(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint | IVirtualEndpoint,
): ConfigurationCC {
	return CommandClass.createInstanceUnchecked(
		applHost,
		endpoint.virtual ? endpoint.node.physicalNodes[0] : endpoint,
		ConfigurationCC,
	)!;
}

function normalizeConfigurationCCAPISetOptions(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint | IVirtualEndpoint,
	options: ConfigurationCCAPISetOptions,
): NormalizedConfigurationCCAPISetOptions {
	if ("bitMask" in options && options.bitMask) {
		// Variant 3: Partial param, look it up in the device config
		const ccc = createConfigurationCCInstance(applHost, endpoint);
		const paramInfo = ccc.getParamInformation(
			applHost,
			options.parameter,
			options.bitMask,
		);
		if (!paramInfo.isFromConfig) {
			throw new ZWaveError(
				"Setting a partial configuration parameter requires it to be defined in a device config file!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		return {
			parameter: options.parameter,
			bitMask: options.bitMask,
			value: options.value,
			valueSize: paramInfo.valueSize as any,
			valueFormat: paramInfo.format!,
		};
	} else if ("valueSize" in options) {
		// Variant 2: Normal parameter, not defined in a config file
		return pick(options, [
			"parameter",
			"value",
			"valueSize",
			"valueFormat",
		]);
	} else {
		// Variant 1: Normal parameter, defined in a config file
		const ccc = createConfigurationCCInstance(applHost, endpoint);
		const paramInfo = ccc.getParamInformation(
			applHost,
			options.parameter,
			options.bitMask,
		);
		if (!paramInfo.isFromConfig) {
			throw new ZWaveError(
				"Setting a configuration parameter without specifying a value size and format requires it to be defined in a device config file!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		return {
			parameter: options.parameter,
			value: options.value,
			valueSize: paramInfo.valueSize as any,
			valueFormat: paramInfo.format!,
		};
	}
}

function bulkMergePartialParamValues(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint | IVirtualEndpoint,
	options: NormalizedConfigurationCCAPISetOptions[],
): (NormalizedConfigurationCCAPISetOptions & { bitMask?: undefined })[] {
	// Merge partial parameters before doing anything else. Therefore, take the non-partials, ...
	const allParams = options.filter((o) => o.bitMask == undefined);
	// ... group the partials by parameter
	const unmergedPartials = new Map<
		number,
		NormalizedConfigurationCCAPISetOptions[]
	>();
	for (const partial of options.filter((o) => o.bitMask != undefined)) {
		if (!unmergedPartials.has(partial.parameter)) {
			unmergedPartials.set(partial.parameter, []);
		}
		unmergedPartials.get(partial.parameter)!.push(partial);
	}
	// and push the merged result into the array we'll be working with
	if (unmergedPartials.size) {
		const ccc = createConfigurationCCInstance(applHost, endpoint);
		for (const [parameter, partials] of unmergedPartials) {
			allParams.push({
				parameter,
				value: ccc.composePartialParamValues(
					applHost,
					parameter,
					partials.map((p) => ({
						bitMask: p.bitMask!,
						partialValue: p.value as number,
					})),
				),
				valueSize: partials[0].valueSize,
				valueFormat: partials[0].valueFormat,
			});
		}
	}
	return allParams as any;
}

/** Determines whether a partial parameter needs to be interpreted as signed */
function isSignedPartial(
	bitMask: number,
	format: ConfigValueFormat | undefined,
): boolean {
	// Only treat partial params as signed if they span more than 1 bit.
	// Otherwise we cannot model 0/1 properly.
	return (
		getBitMaskWidth(bitMask) > 1 &&
		(format ?? ConfigValueFormat.SignedInteger) ===
			ConfigValueFormat.SignedInteger
	);
}

function reInterpretSignedValue(
	value: ConfigValue,
	valueSize: number,
	targetFormat: ConfigValueFormat,
): ConfigValue {
	// Re-interpret the value with the new format
	const raw = Buffer.allocUnsafe(valueSize);
	serializeValue(raw, 0, valueSize, ConfigValueFormat.SignedInteger, value);
	return parseValue(raw, valueSize, targetFormat);
}

@API(CommandClasses.Configuration)
export class ConfigurationCCAPI extends CCAPI {
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
	) => {
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

		let ccInstance: ConfigurationCC;
		const applHost = this.applHost;

		if (this.isSinglecast()) {
			ccInstance = createConfigurationCCInstance(
				this.applHost,
				this.endpoint,
			);
		} else if (this.isMulticast()) {
			// Multicast is only possible if the parameter definition is the same on all target nodes
			const nodes = this.endpoint.node.physicalNodes;
			if (
				!nodes.every((node) =>
					node
						.getEndpoint(this.endpoint.index)
						?.supportsCC(CommandClasses.Configuration),
				)
			) {
				throw new ZWaveError(
					`The multicast setValue API for Configuration CC requires all virtual target endpoints to support Configuration CC!`,
					ZWaveErrorCodes.CC_Invalid,
				);
			}
			// Figure out if all the relevant info is the same
			const paramInfos = this.endpoint.node.physicalNodes.map((node) =>
				createConfigurationCCInstance(
					this.applHost,
					node.getEndpoint(this.endpoint.index)!,
				).getParamInformation(this.applHost, property, propertyKey),
			);
			if (
				!paramInfos.length ||
				!paramInfos.every((info, index) => {
					if (index === 0) return true;
					return (
						info.valueSize === paramInfos[0].valueSize &&
						info.format === paramInfos[0].format
					);
				})
			) {
				throw new ZWaveError(
					`The multicast setValue API for Configuration CC requires all virtual target nodes to have the same parameter definition!`,
					ZWaveErrorCodes.CC_Invalid,
				);
			}
			// If it is, just use the first node to create the CC instance
			ccInstance = createConfigurationCCInstance(
				this.applHost,
				this.endpoint,
			);
		} else {
			throw new ZWaveError(
				`The setValue API for Configuration CC is not supported via broadcast!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		let {
			valueSize,
			format: valueFormat = ConfigValueFormat.SignedInteger,
		} = ccInstance.getParamInformation(applHost, property);

		let targetValue: number;
		if (propertyKey) {
			// This is a partial value, we need to update some bits only
			// Find out the correct value size
			if (!valueSize) {
				valueSize = ccInstance.getParamInformation(
					applHost,
					property,
					propertyKey,
				).valueSize;
			}
			// Add the target value to the remaining partial values
			targetValue = ccInstance.composePartialParamValue(
				applHost,
				property,
				propertyKey,
				value,
			);
			// Partial parameters are internally converted to unsigned values - update the valueFormat accordingly
			valueFormat = ConfigValueFormat.UnsignedInteger;
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
			throwInvalidValueError(
				targetValue,
				property,
				valueSize,
				valueFormat,
			);
		}

		const result = await this.set({
			parameter: property,
			value: targetValue,
			valueSize: valueSize as any,
			valueFormat,
		});

		if (
			!supervisedCommandSucceeded(result) &&
			(this as ConfigurationCCAPI).isSinglecast()
		) {
			// Verify the current value after a delay, unless the command was supervised and successful
			(this as ConfigurationCCAPI).schedulePoll(
				{ property, propertyKey },
				targetValue,
				// Configuration changes are instant
				{ transition: "fast" },
			);
		}

		return result;
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
	@validateArgs()
	public async get(
		parameter: number,
		options?: {
			valueBitMask?: number;
			allowUnexpectedResponse?: boolean;
		},
	): Promise<ConfigValue | undefined> {
		// Get-type commands are only possible in singlecast
		this.assertPhysicalEndpoint(this.endpoint);

		// Two-byte parameter numbers can only be read using the BulkGet command
		if (parameter > 255) {
			const result = await this.getBulk([
				{
					parameter,
					bitMask: options?.valueBitMask,
				},
			]);
			return result.find((r) => r.parameter === parameter)?.value;
		}

		this.assertSupportsCommand(
			ConfigurationCommand,
			ConfigurationCommand.Get,
		);

		const { valueBitMask, allowUnexpectedResponse } = options ?? {};

		const cc = new ConfigurationCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
			parameter,
			allowUnexpectedResponse,
		});
		const response = await this.applHost.sendCommand<ConfigurationCCReport>(
			cc,
			this.commandOptions,
		);
		if (!response) return;
		// Nodes may respond with a different parameter, e.g. if we
		// requested a non-existing one
		if (response.parameter === parameter) {
			if (!valueBitMask) return response.value;
			// If a partial parameter was requested, extract that value
			const paramInfo = cc.getParamInformation(
				this.applHost,
				response.parameter,
				valueBitMask,
			);
			return parsePartial(
				response.value as any,
				valueBitMask,
				isSignedPartial(valueBitMask, paramInfo.format),
			);
		}
		this.applHost.controllerLog.logNode(this.endpoint.nodeId, {
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
	 * Requests the current value of the config parameters from the device.
	 * When the node does not respond due to a timeout, the `value` in the returned array will be `undefined`.
	 */
	@validateArgs()
	public async getBulk(
		options: {
			parameter: number;
			bitMask?: number;
		}[],
	): Promise<
		{
			parameter: number;
			bitMask?: number;
			value: ConfigValue | undefined;
		}[]
	> {
		// Get-type commands are only possible in singlecast
		this.assertPhysicalEndpoint(this.endpoint);

		let values: ReadonlyMap<number, ConfigValue>;

		// If the parameters are consecutive, we may use BulkGet
		const distinctParameters = distinct(options.map((o) => o.parameter));
		if (
			this.supportsCommand(ConfigurationCommand.BulkGet) &&
			isConsecutiveArray(distinctParameters)
		) {
			const cc = new ConfigurationCCBulkGet(this.applHost, {
				nodeId: this.endpoint.nodeId,
				// Don't set an endpoint here, Configuration is device specific, not endpoint specific
				parameters: distinctParameters,
			});
			const response =
				await this.applHost.sendCommand<ConfigurationCCBulkReport>(
					cc,
					this.commandOptions,
				);
			if (response) values = response.values;
		} else {
			this.assertSupportsCommand(
				ConfigurationCommand,
				ConfigurationCommand.Get,
			);

			const _values = new Map<number, ConfigValue>();
			for (const parameter of distinctParameters) {
				const cc = new ConfigurationCCGet(this.applHost, {
					nodeId: this.endpoint.nodeId,
					// Don't set an endpoint here, Configuration is device specific, not endpoint specific
					parameter,
				});
				const response =
					await this.applHost.sendCommand<ConfigurationCCReport>(
						cc,
						this.commandOptions,
					);
				if (response) {
					_values.set(response.parameter, response.value);
				}
			}
			values = _values;
		}

		// Combine the returned values with the requested ones
		const cc = createConfigurationCCInstance(this.applHost, this.endpoint);
		return options.map((o) => {
			let value = values.get(o.parameter);
			if (typeof value === "number" && o.bitMask) {
				const paramInfo = cc.getParamInformation(
					this.applHost,
					o.parameter,
					o.bitMask,
				);
				value = parsePartial(
					value,
					o.bitMask,
					isSignedPartial(o.bitMask, paramInfo.format),
				);
			}
			return { ...o, value };
		});
	}

	/**
	 * Sets a new value for a given config parameter of the device.
	 */
	@validateArgs({ strictEnums: true })
	public async set(
		options: ConfigurationCCAPISetOptions,
	): Promise<SupervisionResult | undefined> {
		// Two-byte parameter numbers can only be set using the BulkSet command
		if (options.parameter > 255) {
			return this.setBulk([options]);
		}

		this.assertSupportsCommand(
			ConfigurationCommand,
			ConfigurationCommand.Set,
		);

		const normalized = normalizeConfigurationCCAPISetOptions(
			this.applHost,
			this.endpoint,
			options,
		);
		let value = normalized.value;
		if (normalized.bitMask) {
			const ccc = createConfigurationCCInstance(
				this.applHost,
				this.endpoint,
			);
			value = ccc.composePartialParamValue(
				this.applHost,
				normalized.parameter,
				normalized.bitMask,
				normalized.value,
			);
		}
		const cc = new ConfigurationCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
			resetToDefault: false,
			parameter: normalized.parameter,
			value,
			valueSize: normalized.valueSize,
			valueFormat: normalized.valueFormat,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Sets new values for multiple config parameters of the device. Uses the `BulkSet` command if supported, otherwise falls back to individual `Set` commands.
	 */
	@validateArgs({ strictEnums: true })
	public async setBulk(
		values: ConfigurationCCAPISetOptions[],
	): Promise<SupervisionResult | undefined> {
		// Normalize the values so we can better work with them
		const normalized = values.map((v) =>
			normalizeConfigurationCCAPISetOptions(
				this.applHost,
				this.endpoint,
				v,
			),
		);
		// And merge multiple partials that belong the same "full" value
		const allParams = bulkMergePartialParamValues(
			this.applHost,
			this.endpoint,
			normalized,
		);

		const canUseBulkSet =
			this.supportsCommand(ConfigurationCommand.BulkSet) &&
			// For Bulk Set we need consecutive parameters
			isConsecutiveArray(allParams.map((v) => v.parameter)) &&
			// and identical format
			new Set(allParams.map((v) => v.valueFormat)).size === 1 &&
			// and identical size
			new Set(allParams.map((v) => v.valueSize)).size === 1;

		if (canUseBulkSet) {
			const cc = new ConfigurationCCBulkSet(this.applHost, {
				nodeId: this.endpoint.nodeId,
				// Don't set an endpoint here, Configuration is device specific, not endpoint specific
				parameters: allParams.map((v) => v.parameter),
				valueSize: allParams[0].valueSize,
				valueFormat: allParams[0].valueFormat,
				values: allParams.map((v) => v.value as number),
				handshake: true,
			});
			return this.applHost.sendCommand(cc, this.commandOptions);
		} else {
			this.assertSupportsCommand(
				ConfigurationCommand,
				ConfigurationCommand.Set,
			);
			for (const {
				parameter,
				value,
				valueSize,
				valueFormat,
			} of allParams) {
				const cc = new ConfigurationCCSet(this.applHost, {
					nodeId: this.endpoint.nodeId,
					// Don't set an endpoint here, Configuration is device specific, not endpoint specific
					parameter,
					value,
					valueSize,
					valueFormat,
				});
				// TODO: handle intermediate errors
				await this.applHost.sendCommand(cc, this.commandOptions);
			}
		}
	}

	/**
	 * Resets a configuration parameter to its default value.
	 *
	 * WARNING: This will throw on legacy devices (ConfigurationCC v3 and below)
	 */
	@validateArgs()
	public async reset(
		parameter: number,
	): Promise<SupervisionResult | undefined> {
		// Two-byte parameter numbers can only be reset using the BulkSet command
		if (parameter > 255) {
			return this.resetBulk([parameter]);
		}

		this.assertSupportsCommand(
			ConfigurationCommand,
			ConfigurationCommand.Set,
		);

		const cc = new ConfigurationCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
			parameter,
			resetToDefault: true,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Resets multiple configuration parameters to their default value. Uses BulkSet if supported, otherwise falls back to individual Set commands.
	 *
	 * WARNING: This will throw on legacy devices (ConfigurationCC v3 and below)
	 */
	@validateArgs()
	public async resetBulk(
		parameters: number[],
	): Promise<SupervisionResult | undefined> {
		if (
			isConsecutiveArray(parameters) &&
			this.supportsCommand(ConfigurationCommand.BulkSet)
		) {
			const cc = new ConfigurationCCBulkSet(this.applHost, {
				nodeId: this.endpoint.nodeId,
				// Don't set an endpoint here, Configuration is device specific, not endpoint specific
				parameters,
				resetToDefault: true,
			});
			return this.applHost.sendCommand(cc, this.commandOptions);
		} else {
			this.assertSupportsCommand(
				ConfigurationCommand,
				ConfigurationCommand.Set,
			);
			const CCs = distinct(parameters).map(
				(parameter) =>
					new ConfigurationCCSet(this.applHost, {
						nodeId: this.endpoint.nodeId,
						// Don't set an endpoint here, Configuration is device specific, not endpoint specific
						parameter,
						resetToDefault: true,
					}),
			);
			for (const cc of CCs) {
				await this.applHost.sendCommand(cc, this.commandOptions);
			}
		}
	}

	/** Resets all configuration parameters to their default value */
	public async resetAll(): Promise<void> {
		// This is dangerous - don't allow resetting all parameters via multicast
		this.assertPhysicalEndpoint(this.endpoint);

		this.assertSupportsCommand(
			ConfigurationCommand,
			ConfigurationCommand.DefaultReset,
		);

		const cc = new ConfigurationCCDefaultReset(this.applHost, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getProperties(parameter: number) {
		// Get-type commands are only possible in singlecast
		this.assertPhysicalEndpoint(this.endpoint);

		const cc = new ConfigurationCCPropertiesGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
			parameter,
		});
		const response =
			await this.applHost.sendCommand<ConfigurationCCPropertiesReport>(
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
	@validateArgs()
	public async getName(parameter: number): Promise<string | undefined> {
		// Get-type commands are only possible in singlecast
		this.assertPhysicalEndpoint(this.endpoint);

		const cc = new ConfigurationCCNameGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
			parameter,
		});
		const response =
			await this.applHost.sendCommand<ConfigurationCCNameReport>(
				cc,
				this.commandOptions,
			);
		return response?.name;
	}

	/** Requests usage info for a configuration parameter from the node */
	@validateArgs()
	public async getInfo(parameter: number): Promise<string | undefined> {
		// Get-type commands are only possible in singlecast
		this.assertPhysicalEndpoint(this.endpoint);

		const cc = new ConfigurationCCInfoGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			// Don't set an endpoint here, Configuration is device specific, not endpoint specific
			parameter,
		});
		const response =
			await this.applHost.sendCommand<ConfigurationCCInfoReport>(
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

		// Get-type commands are only possible in singlecast
		this.assertPhysicalEndpoint(this.endpoint);

		// TODO: Reduce the priority of the messages
		this.applHost.controllerLog.logNode(
			this.endpoint.nodeId,
			`Scanning available parameters...`,
		);
		const ccInstance = createConfigurationCCInstance(
			this.applHost,
			this.endpoint,
		);
		for (let param = 1; param <= 255; param++) {
			// Check if the parameter is readable
			let originalValue: ConfigValue | undefined;
			this.applHost.controllerLog.logNode(this.endpoint.nodeId, {
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
    valueSize = ${
		ccInstance.getParamInformation(this.applHost, param).valueSize
	}
    value     = ${originalValue.toString()}`;
					this.applHost.controllerLog.logNode(this.endpoint.nodeId, {
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
@ccValues(ConfigurationCCValues)
export class ConfigurationCC extends CommandClass {
	declare ccCommand: ConfigurationCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Configuration,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		const deviceConfig = applHost.getDeviceConfig?.(node.id);
		const paramInfo = deviceConfig?.paramInformation;
		if (paramInfo) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `${this.constructor.name}: Loading configuration parameters from device config`,
				direction: "none",
			});
			this.deserializeParamInformationFromConfig(applHost, paramInfo);
		}

		if (this.version >= 3) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "finding first configuration parameter...",
				direction: "outbound",
			});
			const param0props = await api.getProperties(0);
			let param: number;
			if (param0props) {
				param = param0props.nextParameter;
				if (param === 0) {
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `didn't report any config params, trying #1 just to be sure...`,
						direction: "inbound",
					});
					param = 1;
				}
			} else {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Finding first configuration parameter timed out, skipping interview...",
					level: "warn",
				});
				return;
			}

			while (param > 0) {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying parameter #${param} information...`,
					direction: "outbound",
				});

				// Query properties and the next param
				const props = await api.getProperties(param);
				if (!props) {
					applHost.controllerLog.logNode(node.id, {
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
					// Query name and info only if the parameter is supported, but skip the query for bugged devices
					let name: string | undefined;
					if (!deviceConfig?.compat?.skipConfigurationNameQuery) {
						name = await api.getName(param);
					}

					// Skip the info query for bugged devices
					if (!deviceConfig?.compat?.skipConfigurationInfoQuery) {
						await api.getInfo(param);
					}

					logMessage = `received information for parameter #${param}:`;
					if (name) {
						logMessage += `
parameter name:      ${name}`;
					}
					logMessage += `
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
				applHost.controllerLog.logNode(node.id, {
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

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Configuration,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		if (this.version < 3) {
			// V1/V2: Query all values defined in the config file
			const paramInfo = applHost.getDeviceConfig?.(
				node.id,
			)?.paramInformation;
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
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `querying parameter #${param.parameter} value...`,
						direction: "outbound",
					});
					// ... at least try to
					const paramValue = await api.get(param.parameter);
					if (typeof paramValue === "number") {
						applHost.controllerLog.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `parameter #${param.parameter} has value: ${paramValue}`,
							direction: "inbound",
						});
					} else if (!paramValue) {
						applHost.controllerLog.logNode(node.id, {
							endpoint: this.endpointIndex,
							message: `received no value for parameter #${param.parameter}`,
							direction: "inbound",
							level: "warn",
						});
					}
				}
			} else {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `${this.constructor.name}: skipping interview because CC version is < 3 and there is no config file`,
					direction: "none",
				});
			}
		} else {
			// V3+: Query the values of discovered parameters
			const parameters = distinct(
				this.getDefinedValueIDs(applHost)
					.map((v) => v.property)
					.filter((p): p is number => typeof p === "number"),
			);
			for (const param of parameters) {
				if (
					this.getParamInformation(applHost, param).readable !== false
				) {
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `querying parameter #${param} value...`,
						direction: "outbound",
					});
					await api.get(param);
				} else {
					applHost.controllerLog.logNode(node.id, {
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
	protected isParamInformationFromConfig(
		applHost: ZWaveApplicationHost,
	): boolean {
		return (
			this.getValue(
				applHost,
				ConfigurationCCValues.isParamInformationFromConfig,
			) === true
		);
	}

	/**
	 * @internal
	 * Stores config parameter metadata for this CC's node
	 */
	public extendParamInformation(
		applHost: ZWaveApplicationHost,
		parameter: number,
		valueBitMask: number | undefined,
		info: Partial<ConfigurationMetadata>,
	): void {
		// Don't trust param information that a node reports if we have already loaded it from a config file
		if (this.isParamInformationFromConfig(applHost)) return;

		const valueDB = this.getValueDB(applHost);
		const valueId = ConfigurationCCValues.paramInformation(
			parameter,
			valueBitMask,
		).id;
		// Retrieve the base metadata
		const metadata = this.getParamInformation(
			applHost,
			parameter,
			valueBitMask,
		);
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
		applHost: ZWaveApplicationHost,
		parameter: number,
		valueBitMask?: number,
	): ConfigurationMetadata {
		return (
			this.getMetadata(
				applHost,
				ConfigurationCCValues.paramInformation(parameter, valueBitMask),
			) ?? {
				...ValueMetadata.Any,
			}
		);
	}

	/**
	 * **INTERNAL:** Returns the param info that was queried for this node. This returns the information that was returned by the node
	 * and does not include partial parameters.
	 */
	public getQueriedParamInfos(
		applHost: ZWaveApplicationHost,
	): Record<number, ConfigurationMetadata> {
		const parameters = distinct(
			this.getDefinedValueIDs(applHost)
				.map((v) => v.property)
				.filter((p): p is number => typeof p === "number"),
		);
		return composeObject(
			parameters.map((p) => [
				p as any,
				this.getParamInformation(applHost, p),
			]),
		);
	}

	/**
	 * Returns stored config parameter metadata for all partial config params addressed with the given parameter number
	 */
	public getPartialParamInfos(
		applHost: ZWaveApplicationHost,
		parameter: number,
	): (ValueID & { metadata: ConfigurationMetadata })[] {
		const valueDB = this.getValueDB(applHost);
		return valueDB.findMetadata(
			(id) =>
				id.commandClass === this.ccId &&
				id.property === parameter &&
				id.propertyKey != undefined,
		) as (ValueID & { metadata: ConfigurationMetadata })[];
	}

	/**
	 * Computes the full value of a parameter after applying a partial param value
	 */
	public composePartialParamValue(
		applHost: ZWaveApplicationHost,
		parameter: number,
		bitMask: number,
		partialValue: number,
	): number {
		return this.composePartialParamValues(applHost, parameter, [
			{ bitMask, partialValue },
		]);
	}

	/**
	 * Computes the full value of a parameter after applying multiple partial param values
	 */
	public composePartialParamValues(
		applHost: ZWaveApplicationHost,
		parameter: number,
		partials: {
			bitMask: number;
			partialValue: number;
		}[],
	): number {
		const valueDB = this.getValueDB(applHost);
		// Add the other values together
		const otherValues = valueDB.findValues(
			(id) =>
				id.commandClass === this.ccId &&
				id.property === parameter &&
				id.propertyKey != undefined &&
				!partials.some((p) => id.propertyKey === p.bitMask),
		);
		let ret = 0;
		for (const {
			propertyKey: bitMask,
			value: partialValue,
		} of otherValues) {
			ret = encodePartial(ret, partialValue as number, bitMask as number);
		}
		for (const { bitMask, partialValue } of partials) {
			ret = encodePartial(ret, partialValue, bitMask);
		}
		return ret;
	}

	/** Deserializes the config parameter info from a config file */
	public deserializeParamInformationFromConfig(
		applHost: ZWaveApplicationHost,
		config: ParamInfoMap,
	): void {
		const valueDB = this.getValueDB(applHost);

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
		this.setValue(
			applHost,
			ConfigurationCCValues.isParamInformationFromConfig,
			false,
		);

		for (const [param, info] of config.entries()) {
			// We need to make the config information compatible with the
			// format that ConfigurationCC reports
			const paramInfo: Partial<ConfigurationMetadata> = stripUndefined({
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
			});
			this.extendParamInformation(
				applHost,
				param.parameter,
				param.valueBitMask,
				paramInfo,
			);
		}

		// Remember that we loaded the param information from a config file
		this.setValue(
			applHost,
			ConfigurationCCValues.isParamInformationFromConfig,
			true,
		);
	}

	public translatePropertyKey(
		applHost: ZWaveApplicationHost,
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
		return super.translateProperty(applHost, property, propertyKey);
	}

	public translateProperty(
		applHost: ZWaveApplicationHost,
		property: string | number,
		propertyKey?: string | number,
	): string {
		// Try to retrieve the configured param label
		if (
			typeof property === "number" &&
			(propertyKey == undefined || typeof propertyKey === "number")
		) {
			const paramInfo = this.getParamInformation(
				applHost,
				property,
				propertyKey,
			);
			if (paramInfo.label) return paramInfo.label;
			// fall back to paramXYZ[_key] if none is defined
			let ret = `param${padStart(property.toString(), 3, "0")}`;
			if (propertyKey != undefined) {
				ret += "_" + propertyKey.toString();
			}
			return ret;
		}
		return super.translateProperty(applHost, property, propertyKey);
	}
}

@CCCommand(ConfigurationCommand.Report)
export class ConfigurationCCReport extends ConfigurationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
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
		// Default to parsing the value as SignedInteger, like the specs say.
		// We try to re-interpret the value in persistValues()
		this._value = parseValue(
			this.payload.slice(2),
			this._valueSize,
			ConfigValueFormat.SignedInteger,
		);
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;
		const valueDB = this.getValueDB(applHost);

		// Check if the initial assumption of SignedInteger holds true
		const oldParamInformation = this.getParamInformation(
			applHost,
			this._parameter,
		);
		if (
			oldParamInformation.format != undefined &&
			oldParamInformation.format !== ConfigValueFormat.SignedInteger
		) {
			// Re-interpret the value with the new format
			this._value = reInterpretSignedValue(
				this._value,
				this._valueSize,
				oldParamInformation.format,
			);
		}

		// Store the parameter size and value
		this.extendParamInformation(applHost, this._parameter, undefined, {
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
				applHost,
				this._parameter,
				undefined,
				getIntegerLimits(this._valueSize as any, isSigned),
			);
		}
		// And store the value itself
		// If we have partial config params defined, we need to split the value
		const partialParams = this.getPartialParamInfos(
			applHost,
			this._parameter,
		);
		if (partialParams.length > 0) {
			for (const param of partialParams) {
				if (typeof param.propertyKey === "number") {
					valueDB.setValue(
						{
							commandClass: this.ccId,
							property: this._parameter,
							propertyKey: param.propertyKey,
						},
						parsePartial(
							this._value as any,
							param.propertyKey,
							isSignedPartial(
								param.propertyKey,
								param.metadata.format,
							),
						),
					);
				}
			}
		} else {
			// This is a single param
			valueDB.setValue(
				{
					commandClass: this.ccId,
					property: this._parameter,
				},
				this._value,
			);
		}
		return true;
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | ConfigurationCCGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
				/** How the value is encoded. Defaults to SignedInteger */
				valueFormat?: ConfigValueFormat;
				value: ConfigValue;
		  }
	);

@CCCommand(ConfigurationCommand.Set)
@useSupervision()
export class ConfigurationCCSet extends ConfigurationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | ConfigurationCCSetOptions,
	) {
		super(host, options);
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
				this.valueFormat =
					options.valueFormat ?? ConfigValueFormat.SignedInteger;
				this.value = options.value;
			}
		}
	}

	public resetToDefault: boolean;
	public parameter: number;
	public valueSize: number | undefined;
	public valueFormat: ConfigValueFormat | undefined;
	public value: ConfigValue | undefined;

	public serialize(): Buffer {
		const valueSize = this.resetToDefault ? 1 : this.valueSize!;
		const payloadLength = 2 + valueSize;
		this.payload = Buffer.alloc(payloadLength, 0);
		this.payload[0] = this.parameter;
		this.payload[1] =
			(this.resetToDefault ? 0b1000_0000 : 0) | (valueSize & 0b111);
		if (!this.resetToDefault) {
			// Make sure that the given value fits into the value size
			if (
				typeof this.value === "number" &&
				!isSafeValue(this.value, valueSize, this.valueFormat!)
			) {
				// If there is a value size configured, check that the given value is compatible
				throwInvalidValueError(
					this.value,
					this.parameter,
					valueSize,
					this.valueFormat!,
				);
			}

			try {
				serializeValue(
					this.payload,
					2,
					valueSize,
					this.valueFormat!,
					this.value!,
				);
			} catch (e) {
				tryCatchOutOfBoundsError(
					e as Error,
					this.value,
					this.parameter,
					valueSize,
					this.valueFormat!,
				);
			}
		}
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"parameter #": this.parameter,
			"reset to default": this.resetToDefault,
		};
		if (this.valueSize != undefined) {
			message["value size"] = this.valueSize;
		}
		if (this.valueFormat != undefined) {
			message["value format"] = getEnumMemberName(
				ConfigValueFormat,
				this.valueFormat,
			);
		}
		if (this.value != undefined) {
			message.value = configValueToString(this.value);
		}
		return {
			...super.toLogEntry(applHost),
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
				valueFormat?: ConfigValueFormat;
				values: number[];
		  }
	);

function getResponseForBulkSet(cc: ConfigurationCCBulkSet) {
	return cc.handshake ? ConfigurationCCBulkReport : undefined;
}

@CCCommand(ConfigurationCommand.BulkSet)
@expectedCCResponse(getResponseForBulkSet)
@useSupervision()
export class ConfigurationCCBulkSet extends ConfigurationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ConfigurationCCBulkSetOptions,
	) {
		super(host, options);
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
				this._valueFormat = ConfigValueFormat.SignedInteger;
				this._values = this._parameters.map(() => 0);
			} else {
				this._valueSize = options.valueSize;
				this._valueFormat =
					options.valueFormat ?? ConfigValueFormat.SignedInteger;
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
	private _valueFormat: ConfigValueFormat;
	public get valueFormat(): ConfigValueFormat {
		return this._valueFormat;
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

				// Make sure that the given value fits into the value size
				if (!isSafeValue(value, valueSize, this._valueFormat)) {
					// If there is a value size configured, check that the given value is compatible
					throwInvalidValueError(
						value,
						param,
						valueSize,
						this._valueFormat,
					);
				}

				try {
					serializeValue(
						this.payload,
						4 + i * valueSize,
						valueSize,
						this._valueFormat,
						value,
					);
				} catch (e) {
					tryCatchOutOfBoundsError(
						e as Error,
						value,
						param,
						valueSize,
						this._valueFormat,
					);
				}
			}
		}
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(ConfigurationCommand.BulkReport)
export class ConfigurationCCBulkReport extends ConfigurationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

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
				// Default to parsing the value as SignedInteger, like the specs say.
				// We try to re-interpret the value in persistValues()
				parseValue(
					this.payload.slice(5 + i * this.valueSize),
					this.valueSize,
					ConfigValueFormat.SignedInteger,
				),
			);
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;
		const valueDB = this.getValueDB(applHost);

		// Store every received parameter
		// eslint-disable-next-line prefer-const
		for (let [parameter, value] of this._values.entries()) {
			// Check if the initial assumption of SignedInteger holds true
			const oldParamInformation = this.getParamInformation(
				applHost,
				parameter,
			);
			if (
				oldParamInformation.format != undefined &&
				oldParamInformation.format !== ConfigValueFormat.SignedInteger
			) {
				// Re-interpret the value with the new format
				value = reInterpretSignedValue(
					value,
					this._valueSize,
					oldParamInformation.format,
				);
				this._values.set(parameter, value);
			}

			valueDB.setValue(
				{
					commandClass: this.ccId,
					property: parameter,
				},
				value,
			);
		}

		return true;
	}

	private _reportsToFollow: number;
	public get reportsToFollow(): number {
		return this._reportsToFollow;
	}

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// We don't expect the applHost to merge CCs but we want to wait until all reports have been received
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ConfigurationCCBulkGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { parameters: this.parameters.join(", ") },
		};
	}
}

export interface ConfigurationCCNameReportOptions extends CCCommandOptions {
	parameter: number;
	name: string;
	reportsToFollow: number;
}

@CCCommand(ConfigurationCommand.NameReport)
export class ConfigurationCCNameReport extends ConfigurationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ConfigurationCCNameReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			// Parameter and # of reports must be present
			validatePayload(this.payload.length >= 3);
			this.parameter = this.payload.readUInt16BE(0);
			this.reportsToFollow = this.payload[2];
			if (this.reportsToFollow > 0) {
				// If more reports follow, the info must at least be one byte
				validatePayload(this.payload.length >= 4);
			}
			this.name = this.payload.slice(3).toString("utf8");
		} else {
			this.parameter = options.parameter;
			this.name = options.name;
			this.reportsToFollow = options.reportsToFollow;
		}
	}

	public readonly parameter: number;
	public name: string;
	public readonly reportsToFollow: number;

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		this.extendParamInformation(applHost, this.parameter, undefined, {
			name: this.name,
		});
		return true;
	}

	public serialize(): Buffer {
		const nameBuffer = Buffer.from(this.name, "utf8");
		this.payload = Buffer.allocUnsafe(3 + nameBuffer.length);
		this.payload.writeUInt16BE(this.parameter, 0);
		this.payload[2] = this.reportsToFollow;
		nameBuffer.copy(this.payload, 3);

		return super.serialize();
	}

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Distinguish sessions by the parameter number
		return { parameter: this.parameter };
	}

	public expectMoreMessages(): boolean {
		return this.reportsToFollow > 0;
	}

	public mergePartialCCs(
		applHost: ZWaveApplicationHost,
		partials: ConfigurationCCNameReport[],
	): void {
		// Concat the name
		this.name = [...partials, this]
			.map((report) => report.name)
			.reduce((prev, cur) => prev + cur, "");
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | ConfigurationCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.parameter = this.payload.readUInt16BE(0);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { "parameter #": this.parameter },
		};
	}
}

@CCCommand(ConfigurationCommand.InfoReport)
export class ConfigurationCCInfoReport extends ConfigurationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
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

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		this.extendParamInformation(applHost, this._parameter, undefined, {
			info: this._info,
		});
		return true;
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

	public mergePartialCCs(
		applHost: ZWaveApplicationHost,
		partials: ConfigurationCCInfoReport[],
	): void {
		// Concat the info
		this._info = [...partials, this]
			.map((report) => report._info)
			.reduce((prev, cur) => prev + cur, "");
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | ConfigurationCCGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: { "parameter #": this.parameter },
		};
	}
}

@CCCommand(ConfigurationCommand.PropertiesReport)
export class ConfigurationCCPropertiesReport extends ConfigurationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

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
			this._nextParameter =
				this.payload.readUInt16BE(nextParameterOffset);

			// Ensure the payload contains a byte for the 2nd option flags
			validatePayload(this.payload.length >= nextParameterOffset + 3);
			const options1 = this.payload[2];
			const options2 = this.payload[3 + 3 * this.valueSize + 2];
			this._altersCapabilities = !!(options1 & 0b1000_0000);
			this._isReadonly = !!(options1 & 0b0100_0000);
			this._isAdvanced = !!(options2 & 0b1);
			this._noBulkSupport = !!(options2 & 0b10);
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

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
			this.extendParamInformation(
				applHost,
				this._parameter,
				undefined,
				paramInfo,
			);
		}

		return true;
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(applHost),
			message,
		};
	}
}

@CCCommand(ConfigurationCommand.PropertiesGet)
@expectedCCResponse(ConfigurationCCPropertiesReport)
export class ConfigurationCCPropertiesGet extends ConfigurationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | ConfigurationCCGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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
