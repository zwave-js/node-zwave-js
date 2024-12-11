import type { GetDeviceConfig, ParamInfoMap } from "@zwave-js/config";
import {
	CommandClasses,
	ConfigValueFormat,
	type ConfigurationMetadata,
	type ControlsCC,
	type EndpointId,
	type GetEndpoint,
	type GetNode,
	type GetSupportedCCVersion,
	type GetValueDB,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type NodeId,
	type SupervisionResult,
	SupervisionStatus,
	type SupportsCC,
	type ValueID,
	ValueMetadata,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	encodePartial,
	getBitMaskWidth,
	getIntegerLimits,
	getMinIntegerSize,
	isConsecutiveArray,
	mergeSupervisionResults,
	parsePartial,
	stripUndefined,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core/safe";
import type { CCEncodingContext, CCParsingContext } from "@zwave-js/host/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { distinct } from "alcalzone-shared/arrays";
import {
	CCAPI,
	type CCAPIEndpoint,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
	throwWrongValueType,
} from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
	type PersistValuesContext,
	type RefreshValuesContext,
	getEffectiveCCVersion,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators.js";
import { V } from "../lib/Values.js";
import { type ConfigValue, ConfigurationCommand } from "../lib/_Types.js";

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
				typeof property === "number"
				&& (typeof propertyKey === "number"
					|| propertyKey == undefined),
			// Metadata is determined dynamically depending on other factors
			undefined,
		),
	}),
});

/** @publicAPI */
export type ConfigurationCCAPISetOptions =
	& {
		parameter: number;
	}
	& (
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

type NormalizedConfigurationCCAPISetOptions =
	& {
		parameter: number;
		valueSize: 1 | 2 | 4;
		valueFormat: ConfigValueFormat;
	}
	& (
		| { bitMask?: undefined; value: ConfigValue }
		| { bitMask: number; value: number }
	);

function createConfigurationCCInstance(
	endpoint: CCAPIEndpoint,
): ConfigurationCC {
	return CommandClass.createInstanceUnchecked(
		endpoint.virtual ? endpoint.node.physicalNodes[0] : endpoint,
		ConfigurationCC,
	)!;
}

function normalizeConfigurationCCAPISetOptions(
	ctx: GetValueDB,
	endpoint: CCAPIEndpoint,
	options: ConfigurationCCAPISetOptions,
): NormalizedConfigurationCCAPISetOptions {
	if ("bitMask" in options && options.bitMask) {
		// Variant 3: Partial param, look it up in the device config
		const ccc = createConfigurationCCInstance(endpoint);
		const paramInfo = ccc.getParamInformation(
			ctx,
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
		const ccc = createConfigurationCCInstance(endpoint);
		const paramInfo = ccc.getParamInformation(
			ctx,
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
	ctx: GetValueDB,
	endpoint: CCAPIEndpoint,
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
		const ccc = createConfigurationCCInstance(endpoint);
		for (const [parameter, partials] of unmergedPartials) {
			allParams.push({
				parameter,
				value: ccc.composePartialParamValues(
					ctx,
					parameter,
					partials.map((p) => ({
						bitMask: p.bitMask!,
						partialValue: p.value,
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
		getBitMaskWidth(bitMask) > 1
		&& (format ?? ConfigValueFormat.SignedInteger)
			=== ConfigValueFormat.SignedInteger
	);
}

function reInterpretSignedValue(
	value: ConfigValue,
	valueSize: number,
	targetFormat: ConfigValueFormat,
): ConfigValue {
	// Re-interpret the value with the new format
	const raw = new Bytes(valueSize);
	serializeValue(raw, 0, valueSize, ConfigValueFormat.SignedInteger, value);
	return parseValue(raw, valueSize, targetFormat);
}

function getParamInformationFromConfigFile(
	ctx: GetDeviceConfig,
	nodeId: number,
	endpointIndex: number,
): ParamInfoMap | undefined {
	const deviceConfig = ctx.getDeviceConfig?.(nodeId);
	if (endpointIndex === 0) {
		return (
			deviceConfig?.paramInformation
				?? deviceConfig?.endpoints?.get(0)?.paramInformation
		);
	} else {
		return deviceConfig?.endpoints?.get(endpointIndex)?.paramInformation;
	}
}

@API(CommandClasses.Configuration)
export class ConfigurationCCAPI extends CCAPI {
	public supportsCommand(cmd: ConfigurationCommand): MaybeNotKnown<boolean> {
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

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: ConfigurationCCAPI,
			{ property, propertyKey },
			value,
		) {
			// Config parameters are addressed with numeric properties/keys
			if (typeof property !== "number") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (propertyKey != undefined && typeof propertyKey !== "number") {
				throwUnsupportedPropertyKey(this.ccId, property, propertyKey);
			}
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}

			let ccInstance: ConfigurationCC;
			const applHost = this.host;

			if (this.isSinglecast()) {
				ccInstance = createConfigurationCCInstance(this.endpoint);
			} else if (this.isMulticast()) {
				// Multicast is only possible if the parameter definition is the same on all target nodes
				const nodes = this.endpoint.node.physicalNodes;
				if (
					!nodes.every((node) =>
						node
							.getEndpoint(this.endpoint.index)
							?.supportsCC(CommandClasses.Configuration)
					)
				) {
					throw new ZWaveError(
						`The multicast setValue API for Configuration CC requires all virtual target endpoints to support Configuration CC!`,
						ZWaveErrorCodes.CC_Invalid,
					);
				}
				// Figure out if all the relevant info is the same
				const paramInfos = this.endpoint.node.physicalNodes.map(
					(node) =>
						createConfigurationCCInstance(
							node.getEndpoint(this.endpoint.index)!,
						).getParamInformation(
							this.host,
							property,
							propertyKey,
						),
				);
				if (
					!paramInfos.length
					|| !paramInfos.every((info, index) => {
						if (index === 0) return true;
						return (
							info.valueSize === paramInfos[0].valueSize
							&& info.format === paramInfos[0].format
						);
					})
				) {
					throw new ZWaveError(
						`The multicast setValue API for Configuration CC requires all virtual target nodes to have the same parameter definition!`,
						ZWaveErrorCodes.CC_Invalid,
					);
				}
				// If it is, just use the first node to create the CC instance
				ccInstance = createConfigurationCCInstance(this.endpoint);
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
				!supervisedCommandSucceeded(result)
				&& (this as ConfigurationCCAPI).isSinglecast()
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
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: ConfigurationCCAPI,
			{ property, propertyKey },
		) {
			// Config parameters are addressed with numeric properties/keys
			if (typeof property !== "number") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (propertyKey != undefined && typeof propertyKey !== "number") {
				throwUnsupportedPropertyKey(this.ccId, property, propertyKey);
			}

			return this.get(property, { valueBitMask: propertyKey });
		};
	}

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
	): Promise<MaybeNotKnown<ConfigValue>> {
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

		const cc = new ConfigurationCCGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			parameter,
			allowUnexpectedResponse,
		});
		const response = await this.host.sendCommand<ConfigurationCCReport>(
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
				this.host,
				response.parameter,
				valueBitMask,
			);
			return parsePartial(
				response.value as any,
				valueBitMask,
				isSignedPartial(valueBitMask, paramInfo.format),
			);
		}
		this.host.logNode(this.endpoint.nodeId, {
			endpoint: this.endpoint.index,
			message:
				`Received unexpected ConfigurationReport (param = ${response.parameter}, value = ${response.value.toString()})`,
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
			value: MaybeNotKnown<ConfigValue>;
		}[]
	> {
		// Get-type commands are only possible in singlecast
		this.assertPhysicalEndpoint(this.endpoint);

		let values: ReadonlyMap<number, ConfigValue> | undefined;

		// If the parameters are consecutive, we may use BulkGet
		const distinctParameters = distinct(options.map((o) => o.parameter));
		if (
			this.supportsCommand(ConfigurationCommand.BulkGet)
			&& isConsecutiveArray(distinctParameters)
		) {
			const cc = new ConfigurationCCBulkGet({
				nodeId: this.endpoint.nodeId,
				endpointIndex: this.endpoint.index,
				parameters: distinctParameters,
			});
			const response = await this.host.sendCommand<
				ConfigurationCCBulkReport
			>(
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
				const cc = new ConfigurationCCGet({
					nodeId: this.endpoint.nodeId,
					endpointIndex: this.endpoint.index,
					parameter,
				});
				const response = await this.host.sendCommand<
					ConfigurationCCReport
				>(
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
		const cc = createConfigurationCCInstance(this.endpoint);
		return options.map((o) => {
			let value = values?.get(o.parameter);
			if (typeof value === "number" && o.bitMask) {
				const paramInfo = cc.getParamInformation(
					this.host,
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
			this.host,
			this.endpoint,
			options,
		);
		let value = normalized.value;
		if (normalized.bitMask) {
			const ccc = createConfigurationCCInstance(this.endpoint);
			value = ccc.composePartialParamValue(
				this.host,
				normalized.parameter,
				normalized.bitMask,
				normalized.value,
			);
		}
		const cc = new ConfigurationCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			resetToDefault: false,
			parameter: normalized.parameter,
			value,
			valueSize: normalized.valueSize,
			valueFormat: normalized.valueFormat,
		});

		return this.host.sendCommand(cc, this.commandOptions);
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
				this.host,
				this.endpoint,
				v,
			)
		);
		// And merge multiple partials that belong the same "full" value
		const allParams = bulkMergePartialParamValues(
			this.host,
			this.endpoint,
			normalized,
		);

		const canUseBulkSet = this.supportsCommand(ConfigurationCommand.BulkSet)
			// For Bulk Set we need consecutive parameters
			&& isConsecutiveArray(allParams.map((v) => v.parameter))
			// and identical format
			&& new Set(allParams.map((v) => v.valueFormat)).size === 1
			// and identical size
			&& new Set(allParams.map((v) => v.valueSize)).size === 1;

		if (canUseBulkSet) {
			const cc = new ConfigurationCCBulkSet({
				nodeId: this.endpoint.nodeId,
				endpointIndex: this.endpoint.index,
				parameters: allParams.map((v) => v.parameter),
				valueSize: allParams[0].valueSize,
				valueFormat: allParams[0].valueFormat,
				values: allParams.map((v) => v.value),
				handshake: true,
			});
			// The handshake flag is set, so we expect a BulkReport in response
			const result = await this.host.sendCommand<
				ConfigurationCCBulkReport
			>(
				cc,
				this.commandOptions,
			);

			// If we did receive a response, we also received the updated parameters,
			// so if any one was not accepted, we know by looking at the values.
			// Translate the result into a SupervisionResult by comparing the values
			if (result) {
				const sentValues = cc.values;
				const receivedValues = [...result.values.values()];
				const success = sentValues.length === receivedValues.length
					&& sentValues.every((v, i) => v === receivedValues[i]);
				return {
					status: success
						? SupervisionStatus.Success
						: SupervisionStatus.Fail,
				};
			} else {
				return undefined;
			}
		} else {
			this.assertSupportsCommand(
				ConfigurationCommand,
				ConfigurationCommand.Set,
			);

			const supervisionResults: (SupervisionResult | undefined)[] = [];
			for (
				const {
					parameter,
					value,
					valueSize,
					valueFormat,
				} of allParams
			) {
				const cc = new ConfigurationCCSet({
					nodeId: this.endpoint.nodeId,
					endpointIndex: this.endpoint.index,
					parameter,
					value,
					valueSize,
					valueFormat,
				});
				supervisionResults.push(
					await this.host.sendCommand(cc, this.commandOptions),
				);
			}
			return mergeSupervisionResults(supervisionResults);
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

		// According to SDS14223 this flag SHOULD NOT be set
		// Because we don't want to test the behavior, we enforce that it MUST not be set
		// on legacy nodes
		if (this.version <= 3) {
			throw new ZWaveError(
				`Resetting configuration parameters to default MUST not be done on nodes implementing ConfigurationCC V3 or below!`,
				ZWaveErrorCodes
					.ConfigurationCC_NoResetToDefaultOnLegacyDevices,
			);
		}

		this.assertSupportsCommand(
			ConfigurationCommand,
			ConfigurationCommand.Set,
		);

		const cc = new ConfigurationCCSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			parameter,
			resetToDefault: true,
		});
		return this.host.sendCommand(cc, this.commandOptions);
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
			isConsecutiveArray(parameters)
			&& this.supportsCommand(ConfigurationCommand.BulkSet)
		) {
			const cc = new ConfigurationCCBulkSet({
				nodeId: this.endpoint.nodeId,
				endpointIndex: this.endpoint.index,
				parameters,
				resetToDefault: true,
			});
			return this.host.sendCommand(cc, this.commandOptions);
		} else {
			this.assertSupportsCommand(
				ConfigurationCommand,
				ConfigurationCommand.Set,
			);
			const CCs = distinct(parameters).map(
				(parameter) =>
					new ConfigurationCCSet({
						nodeId: this.endpoint.nodeId,
						endpointIndex: this.endpoint.index,
						parameter,
						resetToDefault: true,
					}),
			);
			for (const cc of CCs) {
				await this.host.sendCommand(cc, this.commandOptions);
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

		const cc = new ConfigurationCCDefaultReset({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getProperties(parameter: number) {
		// Get-type commands are only possible in singlecast
		this.assertPhysicalEndpoint(this.endpoint);

		const cc = new ConfigurationCCPropertiesGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			parameter,
		});
		const response = await this.host.sendCommand<
			ConfigurationCCPropertiesReport
		>(
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
	public async getName(parameter: number): Promise<MaybeNotKnown<string>> {
		// Get-type commands are only possible in singlecast
		this.assertPhysicalEndpoint(this.endpoint);

		const cc = new ConfigurationCCNameGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			parameter,
		});
		const response = await this.host.sendCommand<
			ConfigurationCCNameReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.name;
	}

	/** Requests usage info for a configuration parameter from the node */
	@validateArgs()
	public async getInfo(parameter: number): Promise<MaybeNotKnown<string>> {
		// Get-type commands are only possible in singlecast
		this.assertPhysicalEndpoint(this.endpoint);

		const cc = new ConfigurationCCInfoGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			parameter,
		});
		const response = await this.host.sendCommand<
			ConfigurationCCInfoReport
		>(
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
		this.host.logNode(this.endpoint.nodeId, {
			endpoint: this.endpoint.index,
			message: `Scanning available parameters...`,
		});
		const ccInstance = createConfigurationCCInstance(this.endpoint);
		for (let param = 1; param <= 255; param++) {
			// Check if the parameter is readable
			let originalValue: ConfigValue | undefined;
			this.host.logNode(this.endpoint.nodeId, {
				endpoint: this.endpoint.index,
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
						ccInstance.getParamInformation(this.host, param)
							.valueSize
					}
    value     = ${originalValue.toString()}`;
					this.host.logNode(this.endpoint.nodeId, {
						endpoint: this.endpoint.index,
						message: logMessage,
						direction: "inbound",
					});
				}
			} catch (e) {
				if (
					e instanceof ConfigurationCCError
					&& e.code
						=== ZWaveErrorCodes.ConfigurationCC_FirstParameterNumber
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

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses.Configuration,
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		const deviceConfig = ctx.getDeviceConfig?.(node.id);
		const paramInfo = getParamInformationFromConfigFile(
			ctx,
			node.id,
			this.endpointIndex,
		);
		if (paramInfo) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`${this.constructor.name}: Loading configuration parameters from device config`,
				direction: "none",
			});
			this.deserializeParamInformationFromConfig(ctx, paramInfo);
		}
		const documentedParamNumbers = new Set(
			Array.from(paramInfo?.keys() ?? []).map((k) => k.parameter),
		);

		if (api.version >= 3) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "finding first configuration parameter...",
				direction: "outbound",
			});
			const param0props = await api.getProperties(0);
			let param: number;
			if (param0props) {
				param = param0props.nextParameter;
				if (param === 0) {
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							`didn't report any config params, trying #1 just to be sure...`,
						direction: "inbound",
					});
					param = 1;
				}
			} else {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Finding first configuration parameter timed out, skipping interview...",
					level: "warn",
				});
				return;
			}

			while (param > 0) {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: `querying parameter #${param} information...`,
					direction: "outbound",
				});

				// Query properties and the next param
				const props = await api.getProperties(param).catch(
					// If querying the properties fails, don't abort the entire interview
					() => undefined,
				);
				if (!props) {
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							`Querying parameter #${param} information timed out, skipping scan...`,
						level: "warn",
					});
					break;
				}
				const { nextParameter, ...properties } = props;

				let logMessage: string;
				if (properties.valueSize === 0) {
					logMessage =
						`Parameter #${param} is unsupported. Next parameter: ${nextParameter}`;
				} else {
					let name: string | undefined;
					// Query the name and info for parameters that are NOT defined in a config file
					if (!documentedParamNumbers.has(param)) {
						// Skip the name query for bugged devices
						if (!deviceConfig?.compat?.skipConfigurationNameQuery) {
							name = await api.getName(param).catch(
								// If querying the name fails, don't abort the entire interview
								() => undefined,
							);
						}

						// Skip the info query for bugged devices
						if (!deviceConfig?.compat?.skipConfigurationInfoQuery) {
							await api.getInfo(param).catch(
								// If querying the info fails, don't abort the entire interview
								() => undefined,
							);
						}
					}

					logMessage =
						`received information for parameter #${param}:`;
					if (name) {
						logMessage += `
parameter name:      ${name}`;
					}
					logMessage += `
value format:        ${
						getEnumMemberName(
							ConfigValueFormat,
							properties.valueFormat,
						)
					}
value size:          ${properties.valueSize} bytes
min value:           ${properties.minValue?.toString() ?? "undefined"}
max value:           ${properties.maxValue?.toString() ?? "undefined"}
default value:       ${properties.defaultValue?.toString() ?? "undefined"}
is read-only:        ${!!properties.isReadonly}
is advanced (UI):    ${!!properties.isAdvanced}
has bulk support:    ${!properties.noBulkSupport}
alters capabilities: ${!!properties.altersCapabilities}`;
				}
				ctx.logNode(node.id, {
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

		await this.refreshValues(ctx);

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	public async refreshValues(
		ctx: RefreshValuesContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses.Configuration,
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		if (api.version < 3) {
			// V1/V2: Query all values defined in the config file
			const paramInfo = getParamInformationFromConfigFile(
				ctx,
				node.id,
				this.endpointIndex,
			);
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
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							`querying parameter #${param.parameter} value...`,
						direction: "outbound",
					});
					// ... at least try to
					const paramValue = await api.get(param.parameter);
					if (typeof paramValue === "number") {
						ctx.logNode(node.id, {
							endpoint: this.endpointIndex,
							message:
								`parameter #${param.parameter} has value: ${paramValue}`,
							direction: "inbound",
						});
					} else if (!paramValue) {
						ctx.logNode(node.id, {
							endpoint: this.endpointIndex,
							message:
								`received no value for parameter #${param.parameter}`,
							direction: "inbound",
							level: "warn",
						});
					}
				}
			} else {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						`${this.constructor.name}: skipping interview because CC version is < 3 and there is no config file`,
					direction: "none",
				});
			}
		} else {
			// V3+: Query the values of discovered parameters
			const parameters = distinct(
				this.getDefinedValueIDs(ctx)
					.map((v) => v.property)
					.filter((p) => typeof p === "number"),
			);
			for (const param of parameters) {
				if (
					this.getParamInformation(ctx, param).readable !== false
				) {
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: `querying parameter #${param} value...`,
						direction: "outbound",
					});
					await api.get(param);
				} else {
					ctx.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							`not querying parameter #${param} value, because it is writeonly`,
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
	protected paramExistsInConfigFile(
		ctx: GetValueDB & GetDeviceConfig,
		parameter: number,
		valueBitMask?: number,
	): boolean {
		if (
			this.getValue(
				ctx,
				ConfigurationCCValues.isParamInformationFromConfig,
			) !== true
		) {
			return false;
		}
		const paramInformation = getParamInformationFromConfigFile(
			ctx,
			this.nodeId as number,
			this.endpointIndex,
		);
		if (!paramInformation) return false;

		// Check if the param is defined in the config file, either as a normal param or a partial
		if (paramInformation.has({ parameter, valueBitMask })) {
			return true;
		} else if (valueBitMask == undefined) {
			// Also consider partials when looking for plain params
			for (const key of paramInformation.keys()) {
				if (key.parameter === parameter) return true;
			}
		}

		return false;
	}

	/**
	 * @internal
	 * Stores config parameter metadata for this CC's node
	 */
	public extendParamInformation(
		ctx: GetValueDB & GetDeviceConfig,
		parameter: number,
		valueBitMask: number | undefined,
		info: Partial<ConfigurationMetadata>,
	): void {
		// Don't trust param information that a node reports if we have already loaded it from a config file
		if (
			valueBitMask === undefined
			&& this.paramExistsInConfigFile(ctx, parameter)
		) {
			return;
		}

		// Retrieve the base metadata
		const metadata = this.getParamInformation(
			ctx,
			parameter,
			valueBitMask,
		);
		// Override it with new data
		Object.assign(metadata, info);
		// And store it back
		this.setMetadata(
			ctx,
			ConfigurationCCValues.paramInformation(parameter, valueBitMask),
			metadata,
		);
	}

	/**
	 * @internal
	 * Returns stored config parameter metadata for this CC's node
	 */
	public getParamInformation(
		ctx: GetValueDB,
		parameter: number,
		valueBitMask?: number,
	): ConfigurationMetadata {
		return (
			this.getMetadata(
				ctx,
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
		ctx:
			& GetValueDB
			& GetSupportedCCVersion
			& GetDeviceConfig
			& GetNode<
				NodeId & GetEndpoint<EndpointId & SupportsCC & ControlsCC>
			>,
	): Record<number, ConfigurationMetadata> {
		const parameters = distinct(
			this.getDefinedValueIDs(ctx)
				.map((v) => v.property)
				.filter((p) => typeof p === "number"),
		);
		return Object.fromEntries(
			parameters.map((p) => [
				p as any,
				this.getParamInformation(ctx, p),
			]),
		);
	}

	/**
	 * Returns stored config parameter metadata for all partial config params addressed with the given parameter number
	 */
	public getPartialParamInfos(
		ctx: GetValueDB,
		parameter: number,
	): (ValueID & { metadata: ConfigurationMetadata })[] {
		const valueDB = this.getValueDB(ctx);
		return valueDB.findMetadata(
			(id) =>
				id.commandClass === this.ccId
				&& (id.endpoint ?? 0) === this.endpointIndex
				&& id.property === parameter
				&& id.propertyKey != undefined,
		) as (ValueID & { metadata: ConfigurationMetadata })[];
	}

	/**
	 * Computes the full value of a parameter after applying a partial param value
	 */
	public composePartialParamValue(
		ctx: GetValueDB,
		parameter: number,
		bitMask: number,
		partialValue: number,
	): number {
		return this.composePartialParamValues(ctx, parameter, [
			{ bitMask, partialValue },
		]);
	}

	/**
	 * Computes the full value of a parameter after applying multiple partial param values
	 */
	public composePartialParamValues(
		ctx: GetValueDB,
		parameter: number,
		partials: {
			bitMask: number;
			partialValue: number;
		}[],
	): number {
		const valueDB = this.getValueDB(ctx);
		// Add the other values together
		const otherValues = valueDB.findValues(
			(id) =>
				id.commandClass === this.ccId
				&& (id.endpoint ?? 0) === this.endpointIndex
				&& id.property === parameter
				&& id.propertyKey != undefined
				&& !partials.some((p) => id.propertyKey === p.bitMask),
		);
		let ret = 0;
		for (
			const {
				propertyKey: bitMask,
				value: partialValue,
			} of otherValues
		) {
			ret = encodePartial(ret, partialValue as number, bitMask as number);
		}
		for (const { bitMask, partialValue } of partials) {
			ret = encodePartial(ret, partialValue, bitMask);
		}
		return ret;
	}

	/** Deserializes the config parameter info from a config file */
	public deserializeParamInformationFromConfig(
		ctx: GetValueDB & GetDeviceConfig,
		config: ParamInfoMap,
	): void {
		const valueDB = this.getValueDB(ctx);

		// Clear old param information
		for (const meta of valueDB.getAllMetadata(this.ccId)) {
			if (
				typeof meta.property === "number"
				&& (meta.endpoint ?? 0) === this.endpointIndex
			) {
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
			ctx,
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
				states: info.options.length > 0
					? Object.fromEntries(
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
				ctx,
				param.parameter,
				param.valueBitMask,
				paramInfo,
			);
		}

		// Remember that we loaded the param information from a config file
		this.setValue(
			ctx,
			ConfigurationCCValues.isParamInformationFromConfig,
			true,
		);
	}

	public translatePropertyKey(
		ctx: GetValueDB,
		property: string | number,
		propertyKey?: string | number,
	): string | undefined {
		if (
			typeof property === "number"
			&& (propertyKey == undefined || typeof propertyKey === "number")
		) {
			// This CC names all configuration parameters differently,
			// so no name for the property key is required
			return undefined;
		}
		return super.translateProperty(ctx, property, propertyKey);
	}

	public translateProperty(
		ctx: GetValueDB,
		property: string | number,
		propertyKey?: string | number,
	): string {
		// Try to retrieve the configured param label
		if (
			typeof property === "number"
			&& (propertyKey == undefined || typeof propertyKey === "number")
		) {
			const paramInfo = this.getParamInformation(
				ctx,
				property,
				propertyKey,
			);
			if (paramInfo.label) return paramInfo.label;
			// fall back to paramXYZ[_key] if none is defined
			let ret = `param${property.toString().padStart(3, "0")}`;
			if (propertyKey != undefined) {
				ret += "_" + propertyKey.toString();
			}
			return ret;
		}
		return super.translateProperty(ctx, property, propertyKey);
	}
}

/** @publicAPI */
export interface ConfigurationCCReportOptions {
	parameter: number;
	value: ConfigValue;
	valueSize: number;
	valueFormat?: ConfigValueFormat;
}

@CCCommand(ConfigurationCommand.Report)
export class ConfigurationCCReport extends ConfigurationCC {
	public constructor(
		options: WithAddress<ConfigurationCCReportOptions>,
	) {
		super(options);

		this.parameter = options.parameter;
		this.value = options.value;
		this.valueSize = options.valueSize;
		this.valueFormat = options.valueFormat;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ConfigurationCCReport {
		// All fields must be present
		validatePayload(raw.payload.length > 2);
		const parameter = raw.payload[0];
		const valueSize = raw.payload[1] & 0b111;

		// Ensure we received a valid report
		validatePayload(
			valueSize >= 1,
			valueSize <= 4,
			raw.payload.length >= 2 + valueSize,
		);
		// Default to parsing the value as SignedInteger, like the specs say.
		// We try to re-interpret the value in persistValues()
		const value = parseValue(
			raw.payload.subarray(2),
			valueSize,
			ConfigValueFormat.SignedInteger,
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			parameter,
			valueSize,
			value,
		});
	}

	public parameter: number;
	public value: ConfigValue;
	public valueSize: number;
	private valueFormat?: ConfigValueFormat; // only used for serialization

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		const ccVersion = getEffectiveCCVersion(ctx, this);

		// This parameter may be a partial param in the following cases:
		// * a config file defines it as such
		// * it was reported by the device as a bit field
		const partialParams = this.getPartialParamInfos(
			ctx,
			this.parameter,
		);

		let cachedValueFormat: ConfigValueFormat | undefined;

		if (partialParams.length > 0) {
			// This is a partial param. All definitions should have the same format, so we just take the first one
			cachedValueFormat = partialParams[0].metadata.format;
		} else {
			// Check if the initial assumption of SignedInteger holds true
			const oldParamInformation = this.getParamInformation(
				ctx,
				this.parameter,
			);
			cachedValueFormat = oldParamInformation.format;

			// On older CC versions, these reports may be the only way we can retrieve the value size
			// Therefore we store it here
			this.extendParamInformation(ctx, this.parameter, undefined, {
				valueSize: this.valueSize,
			});
			if (
				ccVersion < 3
				&& !this.paramExistsInConfigFile(ctx, this.parameter)
				&& oldParamInformation.min == undefined
				&& oldParamInformation.max == undefined
			) {
				const isSigned = oldParamInformation.format == undefined
					|| oldParamInformation.format
						=== ConfigValueFormat.SignedInteger;
				this.extendParamInformation(
					ctx,
					this.parameter,
					undefined,
					getIntegerLimits(this.valueSize as any, isSigned),
				);
			}
		}

		// We may have to re-interpret the value as unsigned, depending on the cached value format
		if (
			cachedValueFormat != undefined
			&& cachedValueFormat !== ConfigValueFormat.SignedInteger
		) {
			// Re-interpret the value with the new format
			this.value = reInterpretSignedValue(
				this.value,
				this.valueSize,
				cachedValueFormat,
			);
		}

		// And store the value itself
		// If we have partial config params defined, we need to split the value
		if (partialParams.length > 0) {
			for (const param of partialParams) {
				if (typeof param.propertyKey === "number") {
					this.setValue(
						ctx,
						ConfigurationCCValues.paramInformation(
							this.parameter,
							param.propertyKey,
						),
						parsePartial(
							this.value as any,
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
			this.setValue(
				ctx,
				ConfigurationCCValues.paramInformation(this.parameter),
				this.value,
			);
		}
		return true;
	}

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.concat([
			Bytes.from([this.parameter, this.valueSize & 0b111]),
			new Bytes(this.valueSize),
		]);
		serializeValue(
			this.payload,
			2,
			this.valueSize,
			this.valueFormat ?? ConfigValueFormat.SignedInteger,
			this.value,
		);

		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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

// @publicAPI
export interface ConfigurationCCGetOptions {
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
		options: WithAddress<ConfigurationCCGetOptions>,
	) {
		super(options);
		this.parameter = options.parameter;
		this.allowUnexpectedResponse = options.allowUnexpectedResponse
			?? false;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): ConfigurationCCGet {
		validatePayload(raw.payload.length >= 1);
		const parameter = raw.payload[0];

		return new this({
			nodeId: ctx.sourceNodeId,
			parameter,
		});
	}

	public parameter: number;
	public allowUnexpectedResponse: boolean;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = Bytes.from([this.parameter]);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "parameter #": this.parameter },
		};
	}
}

// @publicAPI
export type ConfigurationCCSetOptions =
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
	};

@CCCommand(ConfigurationCommand.Set)
@useSupervision()
export class ConfigurationCCSet extends ConfigurationCC {
	public constructor(
		options: WithAddress<ConfigurationCCSetOptions>,
	) {
		super(options);
		this.parameter = options.parameter;
		this.resetToDefault = !!options.resetToDefault;
		if (!options.resetToDefault) {
			// TODO: Default to the stored value size
			this.valueSize = options.valueSize;
			this.valueFormat = options.valueFormat
				?? ConfigValueFormat.SignedInteger;
			this.value = options.value;
		}
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): ConfigurationCCSet {
		validatePayload(raw.payload.length >= 2);
		const parameter = raw.payload[0];
		const resetToDefault = !!(raw.payload[1] & 0b1000_0000);
		const valueSize: number | undefined = raw.payload[1] & 0b111;

		// Ensure we received a valid report
		validatePayload(
			valueSize >= 1,
			valueSize <= 4,
			raw.payload.length >= 2 + valueSize,
		);
		// Parse the value as signed integer. We don't know the format here.
		const value: number | undefined = parseValue(
			raw.payload.subarray(2),
			valueSize,
			ConfigValueFormat.SignedInteger,
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			parameter,
			resetToDefault,
			valueSize,
			value,
		});
	}

	public resetToDefault: boolean;
	public parameter: number;
	public valueSize: number | undefined;
	public valueFormat: ConfigValueFormat | undefined;
	public value: ConfigValue | undefined;

	public serialize(ctx: CCEncodingContext): Bytes {
		const valueSize = this.resetToDefault ? 1 : this.valueSize!;
		const payloadLength = 2 + valueSize;
		this.payload = Bytes.alloc(payloadLength, 0);
		this.payload[0] = this.parameter;
		this.payload[1] = (this.resetToDefault ? 0b1000_0000 : 0)
			| (valueSize & 0b111);
		if (!this.resetToDefault) {
			// Make sure that the given value fits into the value size
			if (
				typeof this.value === "number"
				&& !isSafeValue(this.value, valueSize, this.valueFormat!)
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
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export type ConfigurationCCBulkSetOptions =
	& {
		parameters: number[];
		handshake?: boolean;
	}
	& (
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
		options: WithAddress<ConfigurationCCBulkSetOptions>,
	) {
		super(options);
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
			this._valueFormat = options.valueFormat
				?? ConfigValueFormat.SignedInteger;
			this._values = options.values;
		}
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): ConfigurationCCBulkSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ConfigurationCCBulkSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
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

	public serialize(ctx: CCEncodingContext): Bytes {
		const valueSize = this._resetToDefault ? 1 : this.valueSize;
		const payloadLength = 4 + valueSize * this.parameters.length;
		this.payload = Bytes.alloc(payloadLength, 0);
		this.payload.writeUInt16BE(this.parameters[0], 0);
		this.payload[2] = this.parameters.length;
		this.payload[3] = (this._resetToDefault ? 0b1000_0000 : 0)
			| (this.handshake ? 0b0100_0000 : 0)
			| (valueSize & 0b111);
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
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			handshake: this.handshake,
			"reset to default": this.resetToDefault,
			"value size": this.valueSize,
		};
		if (this._values.length > 0) {
			message.values = this._values
				.map(
					(value, i) =>
						`\n· #${this._parameters[i]}: ${
							configValueToString(
								value,
							)
						}`,
				)
				.join("");
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface ConfigurationCCBulkReportOptions {
	reportsToFollow: number;
	defaultValues: boolean;
	isHandshakeResponse: boolean;
	valueSize: number;
	values: Record<number, ConfigValue>;
}

@CCCommand(ConfigurationCommand.BulkReport)
export class ConfigurationCCBulkReport extends ConfigurationCC {
	public constructor(
		options: WithAddress<ConfigurationCCBulkReportOptions>,
	) {
		super(options);

		// TODO: Check implementation:
		this.reportsToFollow = options.reportsToFollow;
		this.defaultValues = options.defaultValues;
		this.isHandshakeResponse = options.isHandshakeResponse;
		this.valueSize = options.valueSize;
		for (const [param, value] of Object.entries(options.values)) {
			this._values.set(parseInt(param), value);
		}
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ConfigurationCCBulkReport {
		// Ensure we received enough bytes for the preamble
		validatePayload(raw.payload.length >= 5);
		const firstParameter = raw.payload.readUInt16BE(0);
		const numParams = raw.payload[2];
		const reportsToFollow = raw.payload[3];
		const defaultValues = !!(raw.payload[4] & 0b1000_0000);
		const isHandshakeResponse = !!(raw.payload[4] & 0b0100_0000);
		const valueSize = raw.payload[4] & 0b111;
		// Ensure the payload is long enough for all reported values
		validatePayload(raw.payload.length >= 5 + numParams * valueSize);
		const values: Record<number, ConfigValue> = {};
		for (let i = 0; i < numParams; i++) {
			const param = firstParameter + i;
			// Default to parsing the value as SignedInteger, like the specs say.
			// We try to re-interpret the value in persistValues()
			values[param] = parseValue(
				raw.payload.subarray(5 + i * valueSize),
				valueSize,
				ConfigValueFormat.SignedInteger,
			);
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			reportsToFollow,
			defaultValues,
			isHandshakeResponse,
			valueSize,
			values,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Store every received parameter
		// eslint-disable-next-line prefer-const
		for (let [parameter, value] of this._values.entries()) {
			// Check if the initial assumption of SignedInteger holds true
			const oldParamInformation = this.getParamInformation(
				ctx,
				parameter,
			);
			if (
				oldParamInformation.format != undefined
				&& oldParamInformation.format
					!== ConfigValueFormat.SignedInteger
			) {
				// Re-interpret the value with the new format
				value = reInterpretSignedValue(
					value,
					this.valueSize,
					oldParamInformation.format,
				);
				this._values.set(parameter, value);
			}

			this.setValue(
				ctx,
				ConfigurationCCValues.paramInformation(parameter),
				value,
			);
		}

		return true;
	}

	public reportsToFollow: number;
	public defaultValues: boolean;
	public isHandshakeResponse: boolean;
	public valueSize: number;

	private _values = new Map<number, ConfigValue>();
	public get values(): ReadonlyMap<number, ConfigValue> {
		return this._values;
	}

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// We don't expect the applHost to merge CCs but we want to wait until all reports have been received
		return {};
	}

	public expectMoreMessages(): boolean {
		return this.reportsToFollow > 0;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"handshake response": this.isHandshakeResponse,
			"default values": this.defaultValues,
			"value size": this.valueSize,
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface ConfigurationCCBulkGetOptions {
	parameters: number[];
}

@CCCommand(ConfigurationCommand.BulkGet)
@expectedCCResponse(ConfigurationCCBulkReport)
export class ConfigurationCCBulkGet extends ConfigurationCC {
	public constructor(
		options: WithAddress<ConfigurationCCBulkGetOptions>,
	) {
		super(options);
		this._parameters = options.parameters.sort();
		if (!isConsecutiveArray(this.parameters)) {
			throw new ZWaveError(
				`A ConfigurationCC.BulkGet can only be used for consecutive parameters`,
				ZWaveErrorCodes.CC_Invalid,
			);
		}
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): ConfigurationCCBulkGet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ConfigurationCCBulkGet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	private _parameters: number[];
	public get parameters(): number[] {
		return this._parameters;
	}

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = new Bytes(3);
		this.payload.writeUInt16BE(this.parameters[0], 0);
		this.payload[2] = this.parameters.length;
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { parameters: this.parameters.join(", ") },
		};
	}
}

/** @publicAPI */
export interface ConfigurationCCNameReportOptions {
	parameter: number;
	name: string;
	reportsToFollow: number;
}

@CCCommand(ConfigurationCommand.NameReport)
export class ConfigurationCCNameReport extends ConfigurationCC {
	public constructor(
		options: WithAddress<ConfigurationCCNameReportOptions>,
	) {
		super(options);

		this.parameter = options.parameter;
		this.name = options.name;
		this.reportsToFollow = options.reportsToFollow;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ConfigurationCCNameReport {
		// Parameter and # of reports must be present
		validatePayload(raw.payload.length >= 3);
		const parameter = raw.payload.readUInt16BE(0);
		const reportsToFollow = raw.payload[2];

		if (reportsToFollow > 0) {
			// If more reports follow, the info must at least be one byte
			validatePayload(raw.payload.length >= 4);
		}
		const name: string = raw.payload.subarray(3).toString("utf8");

		return new this({
			nodeId: ctx.sourceNodeId,
			parameter,
			reportsToFollow,
			name,
		});
	}

	public readonly parameter: number;
	public name: string;
	public readonly reportsToFollow: number;

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Bitfield parameters that are not documented in a config file
		// are split into multiple partial parameters. We need to set the name for
		// all of them.
		const partialParams = this.getPartialParamInfos(
			ctx,
			this.parameter,
		);

		if (partialParams.length === 0) {
			this.extendParamInformation(ctx, this.parameter, undefined, {
				label: this.name,
			});
		} else {
			for (const param of partialParams) {
				const paramNumber = param.property as number;
				const bitMask = param.propertyKey as number;
				const bitNumber = Math.log2(bitMask) % 1 === 0
					? Math.log2(bitMask)
					: undefined;

				let label = `${this.name} - ${bitMask}`;
				if (bitNumber != undefined) {
					label += ` (bit ${bitNumber})`;
				}
				this.extendParamInformation(ctx, paramNumber, bitMask, {
					label,
				});
			}
		}

		return true;
	}

	public serialize(ctx: CCEncodingContext): Bytes {
		const nameBuffer = Bytes.from(this.name, "utf8");
		this.payload = new Bytes(3 + nameBuffer.length);
		this.payload.writeUInt16BE(this.parameter, 0);
		this.payload[2] = this.reportsToFollow;
		this.payload.set(nameBuffer, 3);

		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Distinguish sessions by the parameter number
		return { parameter: this.parameter };
	}

	public expectMoreMessages(): boolean {
		return this.reportsToFollow > 0;
	}

	/** @deprecated Use {@link mergePartialCCsAsync} instead */
	public mergePartialCCs(
		partials: ConfigurationCCNameReport[],
		_ctx: CCParsingContext,
	): void {
		// Concat the name
		this.name = [...partials, this]
			.map((report) => report.name)
			.reduce((prev, cur) => prev + cur, "");
	}

	public mergePartialCCsAsync(
		partials: ConfigurationCCNameReport[],
		_ctx: CCParsingContext,
	): Promise<void> {
		// Concat the name
		this.name = [...partials, this]
			.map((report) => report.name)
			.reduce((prev, cur) => prev + cur, "");
		return Promise.resolve();
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
		options: WithAddress<ConfigurationCCGetOptions>,
	) {
		super(options);
		this.parameter = options.parameter;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ConfigurationCCNameGet {
		validatePayload(raw.payload.length >= 2);
		const parameter = raw.payload.readUInt16BE(0);

		return new this({
			nodeId: ctx.sourceNodeId,
			parameter,
		});
	}

	public parameter: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = new Bytes(2);
		this.payload.writeUInt16BE(this.parameter, 0);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "parameter #": this.parameter },
		};
	}
}

/** @publicAPI */
export interface ConfigurationCCInfoReportOptions {
	parameter: number;
	info: string;
	reportsToFollow: number;
}

@CCCommand(ConfigurationCommand.InfoReport)
export class ConfigurationCCInfoReport extends ConfigurationCC {
	public constructor(
		options: WithAddress<ConfigurationCCInfoReportOptions>,
	) {
		super(options);

		this.parameter = options.parameter;
		this.info = options.info;
		this.reportsToFollow = options.reportsToFollow;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ConfigurationCCInfoReport {
		// Parameter and # of reports must be present
		validatePayload(raw.payload.length >= 3);
		const parameter = raw.payload.readUInt16BE(0);
		const reportsToFollow = raw.payload[2];

		if (reportsToFollow > 0) {
			// If more reports follow, the info must at least be one byte
			validatePayload(raw.payload.length >= 4);
		}
		const info: string = raw.payload.subarray(3).toString("utf8");

		return new this({
			nodeId: ctx.sourceNodeId,
			parameter,
			reportsToFollow,
			info,
		});
	}

	public readonly parameter: number;
	public info: string;
	public readonly reportsToFollow: number;

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// Bitfield parameters that are not documented in a config file
		// are split into multiple partial parameters. We need to set the description for
		// all of them. However, these can get very long, so we put the reported
		// description on the first partial param, and refer to it from the others
		const partialParams = this.getPartialParamInfos(
			ctx,
			this.parameter,
		).sort(
			(a, b) =>
				((a.propertyKey as number) ?? 0)
				- ((b.propertyKey as number) ?? 0),
		);

		if (partialParams.length === 0) {
			this.extendParamInformation(ctx, this.parameter, undefined, {
				description: this.info,
			});
		} else {
			let firstParamLabel: string | undefined;

			for (const param of partialParams) {
				const paramNumber = param.property as number;
				const bitMask = param.propertyKey as number;

				// We put the description on the first partial param
				const description = firstParamLabel
					? `Refer to ${firstParamLabel}`
					: this.info;

				this.extendParamInformation(ctx, paramNumber, bitMask, {
					description,
				});

				// Then we store the name of the first param to refer to it on the
				// following partial params
				if (firstParamLabel == undefined) {
					firstParamLabel =
						this.getParamInformation(ctx, paramNumber, bitMask)
							.label ?? `parameter ${paramNumber} - ${bitMask}`;
				}
			}
		}

		return true;
	}

	public serialize(ctx: CCEncodingContext): Bytes {
		const infoBuffer = Bytes.from(this.info, "utf8");
		this.payload = new Bytes(3 + infoBuffer.length);
		this.payload.writeUInt16BE(this.parameter, 0);
		this.payload[2] = this.reportsToFollow;
		this.payload.set(infoBuffer, 3);

		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Distinguish sessions by the parameter number
		return { parameter: this.parameter };
	}

	public expectMoreMessages(): boolean {
		return this.reportsToFollow > 0;
	}

	/** @deprecated Use {@link mergePartialCCsAsync} instead */
	public mergePartialCCs(
		partials: ConfigurationCCInfoReport[],
		_ctx: CCParsingContext,
	): void {
		// Concat the info
		this.info = [...partials, this]
			.map((report) => report.info)
			.reduce((prev, cur) => prev + cur, "");
	}

	public mergePartialCCsAsync(
		partials: ConfigurationCCInfoReport[],
		_ctx: CCParsingContext,
	): Promise<void> {
		// Concat the info
		this.info = [...partials, this]
			.map((report) => report.info)
			.reduce((prev, cur) => prev + cur, "");
		return Promise.resolve();
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
		options: WithAddress<ConfigurationCCGetOptions>,
	) {
		super(options);
		this.parameter = options.parameter;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ConfigurationCCInfoGet {
		validatePayload(raw.payload.length >= 2);
		const parameter = raw.payload.readUInt16BE(0);

		return new this({
			nodeId: ctx.sourceNodeId,
			parameter,
		});
	}

	public parameter: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = new Bytes(2);
		this.payload.writeUInt16BE(this.parameter, 0);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "parameter #": this.parameter },
		};
	}
}

/** @publicAPI */
export interface ConfigurationCCPropertiesReportOptions {
	parameter: number;
	valueSize: number;
	valueFormat: ConfigValueFormat;
	minValue?: ConfigValue;
	maxValue?: ConfigValue;
	defaultValue?: ConfigValue;
	nextParameter: number;
	altersCapabilities?: boolean;
	isReadonly?: boolean;
	isAdvanced?: boolean;
	noBulkSupport?: boolean;
}

@CCCommand(ConfigurationCommand.PropertiesReport)
export class ConfigurationCCPropertiesReport extends ConfigurationCC {
	public constructor(
		options: WithAddress<ConfigurationCCPropertiesReportOptions>,
	) {
		super(options);

		this.parameter = options.parameter;
		this.valueSize = options.valueSize;
		this.valueFormat = options.valueFormat;
		if (this.valueSize > 0) {
			if (options.minValue == undefined) {
				throw new ZWaveError(
					"The minimum value must be set when the value size is non-zero",
					ZWaveErrorCodes.Argument_Invalid,
				);
			} else if (options.maxValue == undefined) {
				throw new ZWaveError(
					"The maximum value must be set when the value size is non-zero",
					ZWaveErrorCodes.Argument_Invalid,
				);
			} else if (options.defaultValue == undefined) {
				throw new ZWaveError(
					"The default value must be set when the value size is non-zero",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.minValue = options.minValue;
			this.maxValue = options.maxValue;
			this.defaultValue = options.defaultValue;
		}
		this.nextParameter = options.nextParameter;
		this.altersCapabilities = options.altersCapabilities;
		this.isReadonly = options.isReadonly;
		this.isAdvanced = options.isAdvanced;
		this.noBulkSupport = options.noBulkSupport;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ConfigurationCCPropertiesReport {
		validatePayload(raw.payload.length >= 3);
		const parameter = raw.payload.readUInt16BE(0);
		const valueFormat: ConfigValueFormat = (raw.payload[2] & 0b111000)
			>>> 3;
		const valueSize = raw.payload[2] & 0b111;

		// GH#1309 Some devices don't tell us the first parameter if we query #0
		// Instead, they contain 0x000000
		let nextParameter;

		if (valueSize === 0 && raw.payload.length < 5) {
			nextParameter = 0;
			return new this({
				nodeId: ctx.sourceNodeId,
				parameter,
				valueFormat,
				valueSize,
				nextParameter,
			});
		}

		// Ensure the payload contains the two bytes for next parameter
		const nextParameterOffset = 3 + 3 * valueSize;
		validatePayload(raw.payload.length >= nextParameterOffset + 2);

		let minValue: MaybeNotKnown<number>;
		let maxValue: MaybeNotKnown<number>;
		let defaultValue: MaybeNotKnown<number>;

		if (valueSize > 0) {
			if (valueFormat === ConfigValueFormat.BitField) {
				minValue = 0;
			} else {
				minValue = parseValue(
					raw.payload.subarray(3),
					valueSize,
					valueFormat,
				);
			}
			maxValue = parseValue(
				raw.payload.subarray(3 + valueSize),
				valueSize,
				valueFormat,
			);
			defaultValue = parseValue(
				raw.payload.subarray(3 + 2 * valueSize),
				valueSize,
				valueFormat,
			);
		}

		nextParameter = raw.payload.readUInt16BE(
			nextParameterOffset,
		);

		let altersCapabilities: MaybeNotKnown<boolean>;
		let isReadonly: MaybeNotKnown<boolean>;
		let isAdvanced: MaybeNotKnown<boolean>;
		let noBulkSupport: MaybeNotKnown<boolean>;

		if (raw.payload.length >= nextParameterOffset + 3) {
			// V4 adds an options byte after the next parameter and two bits in byte 2
			const options1 = raw.payload[2];
			const options2 = raw.payload[3 + 3 * valueSize + 2];
			altersCapabilities = !!(options1 & 0b1000_0000);
			isReadonly = !!(options1 & 0b0100_0000);
			isAdvanced = !!(options2 & 0b1);
			noBulkSupport = !!(options2 & 0b10);
		}

		return new this({
			nodeId: ctx.sourceNodeId,
			parameter,
			valueFormat,
			valueSize,
			nextParameter,
			minValue,
			maxValue,
			defaultValue,
			altersCapabilities,
			isReadonly,
			isAdvanced,
			noBulkSupport,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		if (!super.persistValues(ctx)) return false;

		// If we actually received parameter info, store it
		if (this.valueSize > 0) {
			const baseInfo = {
				type: "number",
				format: this.valueFormat,
				valueSize: this.valueSize,
				requiresReInclusion: this.altersCapabilities,
				readable: true,
				writeable: !this.isReadonly,
				allowManualEntry: true,
				isAdvanced: this.isAdvanced,
				noBulkSupport: this.noBulkSupport,
				isFromConfig: false,
			} as const;

			if (this.valueFormat !== ConfigValueFormat.BitField) {
				// Do not override param information from a config file
				if (!this.paramExistsInConfigFile(ctx, this.parameter)) {
					const paramInfo = stripUndefined(
						{
							...baseInfo,
							min: this.minValue,
							max: this.maxValue,
							default: this.defaultValue,
						} as const satisfies ConfigurationMetadata,
					);

					this.extendParamInformation(
						ctx,
						this.parameter,
						undefined,
						paramInfo,
					);
				}
			} else {
				// Bit fields are split into multiple single-bit partial parameters
				const bits = this.maxValue!;
				let mask = 1;
				while (mask <= bits) {
					if (
						// Only create partials that exist
						!!(mask & bits)
						// Do not override param information from a config file
						&& !this.paramExistsInConfigFile(
							ctx,
							this.parameter,
							mask,
						)
					) {
						const paramInfo = stripUndefined(
							{
								...baseInfo,
								min: 0,
								max: 1,
								default: this.defaultValue! & mask ? 1 : 0,
							} as const satisfies ConfigurationMetadata,
						);

						this.extendParamInformation(
							ctx,
							this.parameter,
							mask,
							paramInfo,
						);
					}

					// We must use multiplication here, as bitwise shifting works on signed 32-bit integers in JS
					// which would create an infinite loop if maxValue === 0xffff_ffff
					mask *= 2;
				}
			}
		}

		return true;
	}

	public parameter: number;
	public valueSize: number;
	public valueFormat: ConfigValueFormat;
	public minValue: MaybeNotKnown<ConfigValue>;
	public maxValue: MaybeNotKnown<ConfigValue>;
	public defaultValue: MaybeNotKnown<ConfigValue>;
	public nextParameter: number;
	public altersCapabilities: MaybeNotKnown<boolean>;
	public isReadonly: MaybeNotKnown<boolean>;
	public isAdvanced: MaybeNotKnown<boolean>;
	public noBulkSupport: MaybeNotKnown<boolean>;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = new Bytes(
			3 // preamble
				+ 3 * this.valueSize // min, max, default value
				+ 2 // next parameter
				+ 1, // options2
		);
		this.payload.writeUInt16BE(this.parameter, 0);
		const options1 = (this.altersCapabilities ? 0b1000_0000 : 0)
			| (this.isReadonly ? 0b0100_0000 : 0)
			| ((this.valueFormat & 0b111) << 3)
			| (this.valueSize & 0b111);
		this.payload[2] = options1;

		let offset = 3;
		if (this.valueSize > 0) {
			serializeValue(
				this.payload,
				offset,
				this.valueSize,
				this.valueFormat,
				this.minValue!,
			);
			offset += this.valueSize;
			serializeValue(
				this.payload,
				offset,
				this.valueSize,
				this.valueFormat,
				this.maxValue!,
			);
			offset += this.valueSize;
			serializeValue(
				this.payload,
				offset,
				this.valueSize,
				this.valueFormat,
				this.defaultValue!,
			);
			offset += this.valueSize;
		}
		this.payload.writeUInt16BE(this.nextParameter, offset);
		offset += 2;

		const options2 = (this.isAdvanced ? 0b1 : 0)
			| (this.noBulkSupport ? 0b10 : 0);
		this.payload[offset] = options2;

		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"parameter #": this.parameter,
			"next param #": this.nextParameter,
			"value size": this.valueSize,
			"value format": getEnumMemberName(
				ConfigValueFormat,
				this.valueFormat,
			),
		};
		if (this.minValue != undefined) {
			message["min value"] = configValueToString(this.minValue);
		}
		if (this.maxValue != undefined) {
			message["max value"] = configValueToString(this.maxValue);
		}
		if (this.defaultValue != undefined) {
			message["default value"] = configValueToString(this.defaultValue);
		}
		if (this.altersCapabilities != undefined) {
			message["alters capabilities"] = this.altersCapabilities;
		}
		if (this.isReadonly != undefined) {
			message.readonly = this.isReadonly;
		}
		if (this.isAdvanced != undefined) {
			message.advanced = this.isAdvanced;
		}
		if (this.noBulkSupport != undefined) {
			message["bulk support"] = !this.noBulkSupport;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(ConfigurationCommand.PropertiesGet)
@expectedCCResponse(ConfigurationCCPropertiesReport)
export class ConfigurationCCPropertiesGet extends ConfigurationCC {
	public constructor(
		options: WithAddress<ConfigurationCCGetOptions>,
	) {
		super(options);
		this.parameter = options.parameter;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ConfigurationCCPropertiesGet {
		validatePayload(raw.payload.length >= 2);
		const parameter = raw.payload.readUInt16BE(0);

		return new this({
			nodeId: ctx.sourceNodeId,
			parameter,
		});
	}

	public parameter: number;

	public serialize(ctx: CCEncodingContext): Bytes {
		this.payload = new Bytes(2);
		this.payload.writeUInt16BE(this.parameter, 0);
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
		case ConfigValueFormat.BitField:
			minValue = 0;
			maxValue = Math.pow(2, 8 * size);
			break;
		default:
			throw new Error("not implemented");
	}
	return minValue <= value && value <= maxValue;
}

/** Interprets values from the payload depending on the value format */
function parseValue(
	raw: Bytes,
	size: number,
	format: ConfigValueFormat,
): ConfigValue {
	switch (format) {
		case ConfigValueFormat.SignedInteger:
			return raw.readIntBE(0, size);
		case ConfigValueFormat.UnsignedInteger:
		case ConfigValueFormat.Enumerated:
		case ConfigValueFormat.BitField:
			return raw.readUIntBE(0, size);
	}
}

function throwInvalidValueError(
	value: any,
	parameter: number,
	valueSize: number,
	valueFormat: ConfigValueFormat,
): never {
	throw new ZWaveError(
		`The value ${value} is invalid for configuration parameter ${parameter} (size = ${valueSize}, format = ${
			getEnumMemberName(
				ConfigValueFormat,
				valueFormat,
			)
		})!`,
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
	payload: Bytes,
	offset: number,
	size: number,
	format: ConfigValueFormat,
	value: ConfigValue,
): void {
	switch (format) {
		case ConfigValueFormat.SignedInteger:
			payload.writeIntBE(value, offset, size);
			return;
		case ConfigValueFormat.UnsignedInteger:
		case ConfigValueFormat.Enumerated:
		case ConfigValueFormat.BitField:
			payload.writeUIntBE(value, offset, size);
			return;
	}
}
