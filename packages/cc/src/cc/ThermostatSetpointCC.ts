import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type Scale,
	type SupervisionResult,
	ValueMetadata,
	type ValueMetadataNumeric,
	ZWaveError,
	ZWaveErrorCodes,
	encodeBitMask,
	encodeFloatWithScale,
	getNamedScaleGroup,
	getUnknownScale,
	parseBitMask,
	parseFloatWithScale,
	supervisedCommandSucceeded,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	ThermostatSetpointCommand,
	ThermostatSetpointType,
} from "../lib/_Types";

// This array is used to map the advertised supported types (interpretation A)
// to the actual enum values
const thermostatSetpointTypeMap = [
	0x00,
	0x01,
	0x02,
	0x07,
	0x08,
	0x09,
	0x0a,
	0x0b,
	0x0c,
	0x0d,
	0x0e,
	0x0f,
];

const temperatureScale = getNamedScaleGroup("temperature");
function getScale(scale: number): Scale {
	return (temperatureScale as any)[scale] ?? getUnknownScale(scale);
}
function getSetpointUnit(scale: number): string {
	return getScale(scale).unit ?? "";
}

export const ThermostatSetpointCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Thermostat Setpoint"], {
		...V.staticProperty("supportedSetpointTypes", undefined, {
			internal: true,
		}),

		...V.staticProperty("setpointTypesInterpretation", undefined, {
			internal: true,
		}),
	}),

	...V.defineDynamicCCValues(CommandClasses["Thermostat Setpoint"], {
		...V.dynamicPropertyAndKeyWithName(
			"setpoint",
			"setpoint",
			(setpointType: ThermostatSetpointType) => setpointType,
			({ property, propertyKey }) =>
				property === "setpoint" && typeof propertyKey === "number",
			(setpointType: ThermostatSetpointType) => ({
				...ValueMetadata.Number,
				label: `Setpoint (${
					getEnumMemberName(
						ThermostatSetpointType,
						setpointType,
					)
				})`,
				ccSpecific: { setpointType },
			} as const),
		),

		// The setpoint scale is only used internally
		...V.dynamicPropertyAndKeyWithName(
			"setpointScale",
			"setpointScale",
			(setpointType: ThermostatSetpointType) => setpointType,
			({ property, propertyKey }) =>
				property === "setpointScale" && typeof propertyKey === "number",
			undefined,
			{ internal: true },
		),
	}),
});

@API(CommandClasses["Thermostat Setpoint"])
export class ThermostatSetpointCCAPI extends CCAPI {
	public supportsCommand(
		cmd: ThermostatSetpointCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case ThermostatSetpointCommand.Get:
			case ThermostatSetpointCommand.SupportedGet:
				return this.isSinglecast();
			case ThermostatSetpointCommand.Set:
				return true; // This is mandatory
			case ThermostatSetpointCommand.CapabilitiesGet:
				return this.version >= 3 && this.isSinglecast();
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: ThermostatSetpointCCAPI,
			{ property, propertyKey },
			value,
		) {
			if (property !== "setpoint") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (typeof propertyKey !== "number") {
				throw new ZWaveError(
					`${
						CommandClasses[this.ccId]
					}: "${property}" must be further specified by a numeric property key`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			if (typeof value !== "number") {
				throwWrongValueType(
					this.ccId,
					property,
					"number",
					typeof value,
				);
			}

			// SDS14223: The Scale field value MUST be identical to the value received in the Thermostat Setpoint Report for the
			// actual Setpoint Type during the node interview. Fall back to the first scale if none is known
			const preferredScale = this.tryGetValueDB()?.getValue<number>(
				ThermostatSetpointCCValues.setpointScale(propertyKey).endpoint(
					this.endpoint.index,
				),
			);
			const result = await this.set(
				propertyKey,
				value,
				preferredScale ?? 0,
			);

			// Verify the current value after a delay, unless the command was supervised and successful
			if (this.isSinglecast() && !supervisedCommandSucceeded(result)) {
				// TODO: Ideally this would be a short delay, but some thermostats like Remotec ZXT-600
				// aren't able to handle the GET this quickly.
				this.schedulePoll({ property, propertyKey }, value);
			}

			return result;
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: ThermostatSetpointCCAPI,
			{ property, propertyKey },
		) {
			switch (property) {
				case "setpoint":
					if (typeof propertyKey !== "number") {
						throw new ZWaveError(
							`${
								CommandClasses[this.ccId]
							}: "${property}" must be further specified by a numeric property key`,
							ZWaveErrorCodes.Argument_Invalid,
						);
					}

					return (await this.get(propertyKey))?.value;
				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	@validateArgs()
	public async get(
		setpointType: ThermostatSetpointType,
	): Promise<{ value: number; scale: Scale } | undefined> {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.Get,
		);

		const cc = new ThermostatSetpointCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
		});
		const response = await this.applHost.sendCommand<
			ThermostatSetpointCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (!response) return;
		if (response.type !== ThermostatSetpointType["N/A"]) {
			// This is a supported setpoint
			const scale = getScale(response.scale);
			return {
				value: response.value,
				scale,
			};
		}
	}

	@validateArgs()
	public async set(
		setpointType: ThermostatSetpointType,
		value: number,
		scale: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.Set,
		);

		const cc = new ThermostatSetpointCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
			value,
			scale,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getCapabilities(setpointType: ThermostatSetpointType) {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.CapabilitiesGet,
		);

		const cc = new ThermostatSetpointCCCapabilitiesGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
		});
		const response = await this.applHost.sendCommand<
			ThermostatSetpointCCCapabilitiesReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"minValue",
				"maxValue",
				"minValueScale",
				"maxValueScale",
			]);
		}
	}

	/**
	 * Requests the supported setpoint types from the node. Due to inconsistencies it is NOT recommended
	 * to use this method on nodes with CC versions 1 and 2. Instead rely on the information determined
	 * during node interview.
	 */
	public async getSupportedSetpointTypes(): Promise<
		MaybeNotKnown<readonly ThermostatSetpointType[]>
	> {
		this.assertSupportsCommand(
			ThermostatSetpointCommand,
			ThermostatSetpointCommand.SupportedGet,
		);

		const cc = new ThermostatSetpointCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			ThermostatSetpointCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedSetpointTypes;
	}
}

@commandClass(CommandClasses["Thermostat Setpoint"])
@implementedVersion(3)
@ccValues(ThermostatSetpointCCValues)
export class ThermostatSetpointCC extends CommandClass {
	declare ccCommand: ThermostatSetpointCommand;

	public translatePropertyKey(
		applHost: ZWaveApplicationHost,
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (property === "setpoint") {
			return getEnumMemberName(
				ThermostatSetpointType,
				propertyKey as any,
			);
		} else {
			return super.translatePropertyKey(applHost, property, propertyKey);
		}
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Thermostat Setpoint"],
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

		if (this.version <= 2) {
			let setpointTypes: ThermostatSetpointType[];
			let interpretation: "A" | "B" | undefined;
			// Whether our tests changed the assumed bitmask interpretation
			let interpretationChanged = false;

			// Query the supported setpoint types
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "retrieving supported setpoint types...",
				direction: "outbound",
			});
			const resp = await api.getSupportedSetpointTypes();
			if (!resp) {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Querying supported setpoint types timed out, skipping interview...",
					level: "warn",
				});
				return;
			}
			setpointTypes = [...resp];
			interpretation = undefined; // we don't know yet which interpretation the device uses

			// If necessary, test which interpretation the device follows

			// Assume interpretation B
			// --> If setpoints 3,4,5 or 6 are supported, the assumption is wrong ==> A
			function switchToInterpretationA(): void {
				setpointTypes = setpointTypes.map(
					(i) => thermostatSetpointTypeMap[i],
				);
				interpretation = "A";
				interpretationChanged = true;
			}

			if ([3, 4, 5, 6].some((type) => setpointTypes.includes(type))) {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: "uses Thermostat Setpoint bitmap interpretation A",
					direction: "none",
				});
				switchToInterpretationA();
			} else {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Thermostat Setpoint bitmap interpretation is unknown, assuming B for now",
					direction: "none",
				});
			}

			// Now scan all endpoints. Each type we received a value for gets marked as supported
			const supportedSetpointTypes: ThermostatSetpointType[] = [];
			for (let i = 0; i < setpointTypes.length; i++) {
				const type = setpointTypes[i];
				const setpointName = getEnumMemberName(
					ThermostatSetpointType,
					type,
				);
				// Every time, query the current value
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						`querying current value of setpoint ${setpointName}...`,
					direction: "outbound",
				});

				const setpoint = await api.get(type);
				// If the node did not respond, assume the setpoint type is not supported

				let logMessage: string;
				if (setpoint) {
					// Setpoint supported, remember the type
					supportedSetpointTypes.push(type);
					logMessage =
						`received current value of setpoint ${setpointName}: ${setpoint.value} ${
							setpoint.scale.unit ?? ""
						}`;
				} else if (!interpretation) {
					// The setpoint type is not supported, switch to interpretation A
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message:
							`the setpoint type ${type} is unsupported, switching to interpretation A`,
						direction: "none",
					});
					switchToInterpretationA();
					// retry the current type and scan the remaining types as A
					i--;
					continue;
				} else {
					// We're sure about the interpretation - this should not happen
					logMessage = `Setpoint ${setpointName} is not supported`;
				}
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}

			// If we made an assumption and did not switch to interpretation A,
			// the device adheres to interpretation B
			if (!interpretation && !interpretationChanged) {
				// our assumption about interpretation B was correct
				interpretation = "B";
				interpretationChanged = true;
			}

			// Remember which setpoint types are actually supported, so we don't
			// need to do this guesswork again
			this.setValue(
				applHost,
				ThermostatSetpointCCValues.supportedSetpointTypes,
				supportedSetpointTypes,
			);

			// Also save the bitmap interpretation if we know it now
			if (interpretationChanged) {
				this.setValue(
					applHost,
					ThermostatSetpointCCValues.setpointTypesInterpretation,
					interpretation,
				);
			}
		} else {
			// Versions >= 3 adhere to bitmap interpretation A, so we can rely on getSupportedSetpointTypes

			// Query the supported setpoint types
			let setpointTypes: ThermostatSetpointType[] = [];
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "retrieving supported setpoint types...",
				direction: "outbound",
			});
			const resp = await api.getSupportedSetpointTypes();
			if (resp) {
				setpointTypes = [...resp];
				const logMessage = "received supported setpoint types:\n"
					+ setpointTypes
						.map((type) =>
							getEnumMemberName(ThermostatSetpointType, type)
						)
						.map((name) => `· ${name}`)
						.join("\n");
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			} else {
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						"Querying supported setpoint types timed out, skipping interview...",
					level: "warn",
				});
				return;
			}

			for (const type of setpointTypes) {
				const setpointName = getEnumMemberName(
					ThermostatSetpointType,
					type,
				);
				// Find out the capabilities of this setpoint
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						`retrieving capabilities for setpoint ${setpointName}...`,
					direction: "outbound",
				});
				const setpointCaps = await api.getCapabilities(type);
				if (setpointCaps) {
					const minValueUnit = getSetpointUnit(
						setpointCaps.minValueScale,
					);
					const maxValueUnit = getSetpointUnit(
						setpointCaps.maxValueScale,
					);
					const logMessage =
						`received capabilities for setpoint ${setpointName}:
minimum value: ${setpointCaps.minValue} ${minValueUnit}
maximum value: ${setpointCaps.maxValue} ${maxValueUnit}`;
					applHost.controllerLog.logNode(node.id, {
						endpoint: this.endpointIndex,
						message: logMessage,
						direction: "inbound",
					});
				}
			}

			// Query the current value for all setpoint types
			await this.refreshValues(applHost);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Thermostat Setpoint"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const setpointTypes: ThermostatSetpointType[] = this.getValue(
			applHost,
			ThermostatSetpointCCValues.supportedSetpointTypes,
		) ?? [];

		// Query each setpoint's current value
		for (const type of setpointTypes) {
			const setpointName = getEnumMemberName(
				ThermostatSetpointType,
				type,
			);
			// Every time, query the current value
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`querying current value of setpoint ${setpointName}...`,
				direction: "outbound",
			});
			const setpoint = await api.get(type);
			if (setpoint) {
				const logMessage =
					`received current value of setpoint ${setpointName}: ${setpoint.value} ${
						setpoint.scale.unit ?? ""
					}`;
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});
			}
		}
	}
}

// @publicAPI
export interface ThermostatSetpointCCSetOptions extends CCCommandOptions {
	setpointType: ThermostatSetpointType;
	value: number;
	scale: number;
}

@CCCommand(ThermostatSetpointCommand.Set)
@useSupervision()
export class ThermostatSetpointCCSet extends ThermostatSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.setpointType = this.payload[0] & 0b1111;
			// parseFloatWithScale does its own validation
			const { value, scale } = parseFloatWithScale(
				this.payload.subarray(1),
			);
			this.value = value;
			this.scale = scale;
		} else {
			this.setpointType = options.setpointType;
			this.value = options.value;
			this.scale = options.scale;
		}
	}

	public setpointType: ThermostatSetpointType;
	public value: number;
	public scale: number;

	public serialize(): Buffer {
		// If a config file overwrites how the float should be encoded, use that information
		const override = this.host.getDeviceConfig?.(this.nodeId as number)
			?.compat?.overrideFloatEncoding;
		this.payload = Buffer.concat([
			Buffer.from([this.setpointType & 0b1111]),
			encodeFloatWithScale(this.value, this.scale, override),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const scale = getScale(this.scale);
		return {
			...super.toLogEntry(host),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.setpointType,
				),
				value: `${this.value} ${scale.unit}`,
			},
		};
	}
}

// @publicAPI
export interface ThermostatSetpointCCReportOptions extends CCCommandOptions {
	type: ThermostatSetpointType;
	value: number;
	scale: number;
}

@CCCommand(ThermostatSetpointCommand.Report)
export class ThermostatSetpointCCReport extends ThermostatSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.type = this.payload[0] & 0b1111;
			if (this.type === 0) {
				// Not supported
				this.value = 0;
				this.scale = 0;
				return;
			}

			// parseFloatWithScale does its own validation
			const { value, scale } = parseFloatWithScale(
				this.payload.subarray(1),
			);
			this.value = value;
			this.scale = scale;
		} else {
			this.type = options.type;
			this.value = options.value;
			this.scale = options.scale;
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		const scale = getScale(this.scale);

		const setpointValue = ThermostatSetpointCCValues.setpoint(this.type);
		const existingMetadata = this.getMetadata<ValueMetadataNumeric>(
			applHost,
			setpointValue,
		);

		// Update the metadata when it is missing or the unit has changed
		if (existingMetadata?.unit !== scale.unit) {
			this.setMetadata(applHost, setpointValue, {
				...(existingMetadata ?? setpointValue.meta),
				unit: scale.unit,
			});
		}
		this.setValue(applHost, setpointValue, this.value);

		// Remember the device-preferred setpoint scale so it can be used in SET commands
		this.setValue(
			applHost,
			ThermostatSetpointCCValues.setpointScale(this.type),
			scale.key,
		);
		return true;
	}

	public type: ThermostatSetpointType;
	public scale: number;
	public value: number;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.type & 0b1111]),
			encodeFloatWithScale(this.value, this.scale),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const scale = getScale(this.scale);
		return {
			...super.toLogEntry(host),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.type,
				),
				value: `${this.value} ${scale.unit}`,
			},
		};
	}
}

function testResponseForThermostatSetpointGet(
	sent: ThermostatSetpointCCGet,
	received: ThermostatSetpointCCReport,
) {
	// We expect a Thermostat Setpoint Report that matches the requested setpoint type
	return received.type === sent.setpointType;
}

// @publicAPI
export interface ThermostatSetpointCCGetOptions extends CCCommandOptions {
	setpointType: ThermostatSetpointType;
}

@CCCommand(ThermostatSetpointCommand.Get)
@expectedCCResponse(
	ThermostatSetpointCCReport,
	testResponseForThermostatSetpointGet,
)
export class ThermostatSetpointCCGet extends ThermostatSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.setpointType = this.payload[0] & 0b1111;
		} else {
			this.setpointType = options.setpointType;
		}
	}

	public setpointType: ThermostatSetpointType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.setpointType,
				),
			},
		};
	}
}

// @publicAPI
export interface ThermostatSetpointCCCapabilitiesReportOptions
	extends CCCommandOptions
{
	type: ThermostatSetpointType;
	minValue: number;
	minValueScale: number;
	maxValue: number;
	maxValueScale: number;
}

@CCCommand(ThermostatSetpointCommand.CapabilitiesReport)
export class ThermostatSetpointCCCapabilitiesReport
	extends ThermostatSetpointCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCCapabilitiesReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.type = this.payload[0];
			let bytesRead: number;
			// parseFloatWithScale does its own validation
			({
				value: this.minValue,
				scale: this.minValueScale,
				bytesRead,
			} = parseFloatWithScale(this.payload.subarray(1)));
			({ value: this.maxValue, scale: this.maxValueScale } =
				parseFloatWithScale(this.payload.subarray(1 + bytesRead)));
		} else {
			this.type = options.type;
			this.minValue = options.minValue;
			this.minValueScale = options.minValueScale;
			this.maxValue = options.maxValue;
			this.maxValueScale = options.maxValueScale;
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Predefine the metadata
		const setpointValue = ThermostatSetpointCCValues.setpoint(this.type);
		this.setMetadata(applHost, setpointValue, {
			...setpointValue.meta,
			min: this.minValue,
			max: this.maxValue,
			unit: getSetpointUnit(this.minValueScale)
				|| getSetpointUnit(this.maxValueScale),
		});

		return true;
	}

	public type: ThermostatSetpointType;
	public minValue: number;
	public maxValue: number;
	public minValueScale: number;
	public maxValueScale: number;

	public serialize(): Buffer {
		const min = encodeFloatWithScale(this.minValue, this.minValueScale);
		const max = encodeFloatWithScale(this.maxValue, this.maxValueScale);
		this.payload = Buffer.concat([Buffer.from([this.type]), min, max]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const minValueScale = getScale(this.minValueScale);
		const maxValueScale = getScale(this.maxValueScale);
		return {
			...super.toLogEntry(host),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.type,
				),
				"min value": `${this.minValue} ${minValueScale.unit}`,
				"max value": `${this.maxValue} ${maxValueScale.unit}`,
			},
		};
	}
}

// @publicAPI
export interface ThermostatSetpointCCCapabilitiesGetOptions
	extends CCCommandOptions
{
	setpointType: ThermostatSetpointType;
}

@CCCommand(ThermostatSetpointCommand.CapabilitiesGet)
@expectedCCResponse(ThermostatSetpointCCCapabilitiesReport)
export class ThermostatSetpointCCCapabilitiesGet extends ThermostatSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCCapabilitiesGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.setpointType = this.payload[0] & 0b1111;
		} else {
			this.setpointType = options.setpointType;
		}
	}

	public setpointType: ThermostatSetpointType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"setpoint type": getEnumMemberName(
					ThermostatSetpointType,
					this.setpointType,
				),
			},
		};
	}
}

// @publicAPI
export interface ThermostatSetpointCCSupportedReportOptions
	extends CCCommandOptions
{
	supportedSetpointTypes: ThermostatSetpointType[];
}

@CCCommand(ThermostatSetpointCommand.SupportedReport)
export class ThermostatSetpointCCSupportedReport extends ThermostatSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ThermostatSetpointCCSupportedReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			const bitMask = this.payload;
			const supported = parseBitMask(
				bitMask,
				ThermostatSetpointType["N/A"],
			);
			if (this.version >= 3) {
				// Interpretation A
				this.supportedSetpointTypes = supported.map(
					(i) => thermostatSetpointTypeMap[i],
				);
			} else {
				// It is unknown which interpretation the device complies to.
				// This must be tested during the interview
				this.supportedSetpointTypes = supported;
			}
			// TODO:
			// Some devices skip the gaps in the ThermostatSetpointType (Interpretation A), some don't (Interpretation B)
			// Devices with V3+ must comply with Interpretation A
			// It is RECOMMENDED that a controlling node determines supported Setpoint Types
			// by sending one Thermostat Setpoint Get Command at a time while incrementing
			// the requested Setpoint Type. If the same Setpoint Type is advertised in the
			// resulting Thermostat Setpoint Report Command, the controlling node MAY conclude
			// that the actual Setpoint Type is supported. If the Setpoint Type 0x00 (type N/A)
			// is advertised in the resulting Thermostat Setpoint Report Command, the controlling
			// node MUST conclude that the actual Setpoint Type is not supported.
		} else {
			if (options.supportedSetpointTypes.length === 0) {
				throw new ZWaveError(
					`At least one setpoint type must be supported`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.supportedSetpointTypes = options.supportedSetpointTypes;
		}
	}

	@ccValue(ThermostatSetpointCCValues.supportedSetpointTypes)
	public readonly supportedSetpointTypes: readonly ThermostatSetpointType[];

	public serialize(): Buffer {
		this.payload = encodeBitMask(
			// Encode as interpretation A
			this.supportedSetpointTypes
				.map((t) => thermostatSetpointTypeMap.indexOf(t))
				.filter((t) => t !== -1),
			undefined,
			ThermostatSetpointType["N/A"],
		);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"supported setpoint types": this.supportedSetpointTypes
					.map(
						(t) =>
							`\n· ${
								getEnumMemberName(
									ThermostatSetpointType,
									t,
								)
							}`,
					)
					.join(""),
			},
		};
	}
}

@CCCommand(ThermostatSetpointCommand.SupportedGet)
@expectedCCResponse(ThermostatSetpointCCSupportedReport)
/**
 * Issues a SupportedGet command to the node. Due to inconsistencies in interpretation,
 * this command should not be used for nodes with CC versions 1 or 2
 */
export class ThermostatSetpointCCSupportedGet extends ThermostatSetpointCC {}
