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
	type HumidityControlSetpointCapabilities,
	HumidityControlSetpointCommand,
	HumidityControlSetpointType,
	type HumidityControlSetpointValue,
} from "../lib/_Types";

export const HumidityControlSetpointCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Humidity Control Setpoint"], {
		...V.staticProperty("supportedSetpointTypes", undefined, {
			internal: true,
		}),
	}),

	...V.defineDynamicCCValues(CommandClasses["Humidity Control Setpoint"], {
		...V.dynamicPropertyAndKeyWithName(
			"setpoint",
			"setpoint",
			(setpointType: number) => setpointType,
			({ property, propertyKey }) =>
				property === "setpoint" && typeof propertyKey === "number",
			(setpointType: number) => ({
				// This is the base metadata that will be extended on the fly
				...ValueMetadata.Number,
				label: `Setpoint (${
					getEnumMemberName(
						HumidityControlSetpointType,
						setpointType,
					)
				})`,
				ccSpecific: { setpointType },
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"setpointScale",
			"setpointScale",
			(setpointType: number) => setpointType,
			({ property, propertyKey }) =>
				property === "setpointScale" && typeof propertyKey === "number",
			(setpointType: number) => ({
				...ValueMetadata.ReadOnlyUInt8,
				label: `Setpoint scale (${
					getEnumMemberName(
						HumidityControlSetpointType,
						setpointType,
					)
				})`,
			} as const),
		),
	}),
});

const humidityScale = getNamedScaleGroup("humidity");
function getScale(scale: number): Scale {
	return (humidityScale as any)[scale] ?? getUnknownScale(scale);
}
function getSetpointUnit(scale: number): string {
	return getScale(scale).unit ?? "";
}

@API(CommandClasses["Humidity Control Setpoint"])
export class HumidityControlSetpointCCAPI extends CCAPI {
	public supportsCommand(
		cmd: HumidityControlSetpointCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case HumidityControlSetpointCommand.Get:
			case HumidityControlSetpointCommand.SupportedGet:
			case HumidityControlSetpointCommand.CapabilitiesGet:
				return this.isSinglecast();
			case HumidityControlSetpointCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: HumidityControlSetpointCCAPI,
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

			const scaleValueId = HumidityControlSetpointCCValues.setpointScale(
				propertyKey,
			).endpoint(this.endpoint.index);
			const preferredScale = this.tryGetValueDB()?.getValue<number>(
				scaleValueId,
			);

			const result = await this.set(
				propertyKey,
				value,
				preferredScale ?? 0,
			);

			// Verify the change after a delay, unless the command was supervised and successful
			if (this.isSinglecast() && !supervisedCommandSucceeded(result)) {
				this.schedulePoll({ property, propertyKey }, value);
			}

			return result;
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: HumidityControlSetpointCCAPI,
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
		setpointType: HumidityControlSetpointType,
	): Promise<MaybeNotKnown<HumidityControlSetpointValue>> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.Get,
		);

		const cc = new HumidityControlSetpointCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
		});
		const response = await this.applHost.sendCommand<
			HumidityControlSetpointCCReport
		>(
			cc,
			this.commandOptions,
		);
		if (!response) return;
		return response.type === HumidityControlSetpointType["N/A"]
			// not supported
			? undefined
			// supported
			: {
				value: response.value,
				scale: response.scale,
			};
	}

	@validateArgs()
	public async set(
		setpointType: HumidityControlSetpointType,
		value: number,
		scale: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.Set,
		);

		const cc = new HumidityControlSetpointCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
			value,
			scale,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getCapabilities(
		setpointType: HumidityControlSetpointType,
	): Promise<MaybeNotKnown<HumidityControlSetpointCapabilities>> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.CapabilitiesGet,
		);

		const cc = new HumidityControlSetpointCCCapabilitiesGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			setpointType,
		});
		const response = await this.applHost.sendCommand<
			HumidityControlSetpointCCCapabilitiesReport
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

	public async getSupportedSetpointTypes(): Promise<
		MaybeNotKnown<readonly HumidityControlSetpointType[]>
	> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.SupportedGet,
		);

		const cc = new HumidityControlSetpointCCSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			HumidityControlSetpointCCSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.supportedSetpointTypes;
	}

	@validateArgs()
	public async getSupportedScales(
		setpointType: HumidityControlSetpointType,
	): Promise<MaybeNotKnown<readonly Scale[]>> {
		this.assertSupportsCommand(
			HumidityControlSetpointCommand,
			HumidityControlSetpointCommand.SupportedGet,
		);

		const cc = new HumidityControlSetpointCCScaleSupportedGet(
			this.applHost,
			{
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
				setpointType,
			},
		);
		const response = await this.applHost.sendCommand<
			HumidityControlSetpointCCScaleSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return response.supportedScales.map((scale) => getScale(scale));
		}
	}
}

@commandClass(CommandClasses["Humidity Control Setpoint"])
@implementedVersion(2)
@ccValues(HumidityControlSetpointCCValues)
export class HumidityControlSetpointCC extends CommandClass {
	declare ccCommand: HumidityControlSetpointCommand;

	public translatePropertyKey(
		applHost: ZWaveApplicationHost,
		property: string | number,
		propertyKey: string | number,
	): string | undefined {
		if (property === "setpoint") {
			return getEnumMemberName(
				HumidityControlSetpointType,
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
			CommandClasses["Humidity Control Setpoint"],
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

		// Query the supported setpoint types
		let setpointTypes: HumidityControlSetpointType[] = [];
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
						getEnumMemberName(HumidityControlSetpointType, type)
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
				HumidityControlSetpointType,
				type,
			);
			// Find out the capabilities of this setpoint
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					`retrieving capabilities for setpoint ${setpointName}...`,
				direction: "outbound",
			});
			const setpointScaleSupported = await api.getSupportedScales(type);
			if (setpointScaleSupported) {
				const logMessage =
					`received supported scales for setpoint ${setpointName}: 
${
						setpointScaleSupported
							.map((t) => `\n· ${t.key} ${t.unit} - ${t.label}`)
							.join("")
					}`;
				applHost.controllerLog.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: logMessage,
					direction: "inbound",
				});

				const scaleValue = HumidityControlSetpointCCValues
					.setpointScale(type);
				const states: Record<number, string> = {};
				for (const scale of setpointScaleSupported) {
					if (scale.unit) states[scale.key] = scale.unit;
				}
				this.setMetadata(applHost, scaleValue, {
					...scaleValue.meta,
					states,
				});
			}
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

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Humidity Control Setpoint"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		const setpointTypes: HumidityControlSetpointType[] = this.getValue(
			applHost,
			HumidityControlSetpointCCValues.supportedSetpointTypes,
		) ?? [];

		// Query each setpoint's current value
		for (const type of setpointTypes) {
			const setpointName = getEnumMemberName(
				HumidityControlSetpointType,
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
						getScale(setpoint.scale).unit ?? ""
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
export interface HumidityControlSetpointCCSetOptions extends CCCommandOptions {
	setpointType: HumidityControlSetpointType;
	value: number;
	scale: number;
}

@CCCommand(HumidityControlSetpointCommand.Set)
@useSupervision()
export class HumidityControlSetpointCCSet extends HumidityControlSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| HumidityControlSetpointCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.setpointType = options.setpointType;
			this.value = options.value;
			this.scale = options.scale;
		}
	}

	public setpointType: HumidityControlSetpointType;
	public value: number;
	public scale: number;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.setpointType & 0b1111]),
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
					HumidityControlSetpointType,
					this.setpointType,
				),
				value: `${this.value} ${scale.unit}`,
			},
		};
	}
}

@CCCommand(HumidityControlSetpointCommand.Report)
export class HumidityControlSetpointCCReport extends HumidityControlSetpointCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._type = this.payload[0] & 0b1111;
		// Setpoint type 0 is not defined in the spec, prevent devices from using it.
		if (this._type === 0) {
			// Not supported
			this._value = 0;
			this.scale = 0;
			return;
		}

		// parseFloatWithScale does its own validation
		const { value, scale } = parseFloatWithScale(this.payload.subarray(1));
		this._value = value;
		this.scale = scale;
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		const scale = getScale(this.scale);

		const setpointValue = HumidityControlSetpointCCValues.setpoint(
			this.type,
		);
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
		this.setValue(applHost, setpointValue, this._value);

		// Remember the device-preferred setpoint scale so it can be used in SET commands
		this.setValue(
			applHost,
			HumidityControlSetpointCCValues.setpointScale(this.type),
			this.scale,
		);
		return true;
	}

	private _type: HumidityControlSetpointType;
	public get type(): HumidityControlSetpointType {
		return this._type;
	}

	public readonly scale: number;

	private _value: number;
	public get value(): number {
		return this._value;
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const scale = getScale(this.scale);
		return {
			...super.toLogEntry(host),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.type,
				),
				value: `${this.value} ${scale.unit}`,
			},
		};
	}
}

function testResponseForHumidityControlSetpointGet(
	sent: HumidityControlSetpointCCGet,
	received: HumidityControlSetpointCCReport,
) {
	// We expect a Humidity Control Setpoint Report that matches the requested setpoint type
	return received.type === sent.setpointType;
}

// @publicAPI
export interface HumidityControlSetpointCCGetOptions extends CCCommandOptions {
	setpointType: HumidityControlSetpointType;
}

@CCCommand(HumidityControlSetpointCommand.Get)
@expectedCCResponse(
	HumidityControlSetpointCCReport,
	testResponseForHumidityControlSetpointGet,
)
export class HumidityControlSetpointCCGet extends HumidityControlSetpointCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| HumidityControlSetpointCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.setpointType = options.setpointType;
		}
	}

	public setpointType: HumidityControlSetpointType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.setpointType,
				),
			},
		};
	}
}

@CCCommand(HumidityControlSetpointCommand.SupportedReport)
export class HumidityControlSetpointCCSupportedReport
	extends HumidityControlSetpointCC
{
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this.supportedSetpointTypes = parseBitMask(
			this.payload,
			HumidityControlSetpointType["N/A"],
		);
	}

	@ccValue(HumidityControlSetpointCCValues.supportedSetpointTypes)
	public readonly supportedSetpointTypes:
		readonly HumidityControlSetpointType[];

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"supported setpoint types": this.supportedSetpointTypes
					.map(
						(t) =>
							`\n· ${
								getEnumMemberName(
									HumidityControlSetpointType,
									t,
								)
							}`,
					)
					.join(""),
			},
		};
	}
}

@CCCommand(HumidityControlSetpointCommand.SupportedGet)
@expectedCCResponse(HumidityControlSetpointCCSupportedReport)
export class HumidityControlSetpointCCSupportedGet
	extends HumidityControlSetpointCC
{}

@CCCommand(HumidityControlSetpointCommand.ScaleSupportedReport)
export class HumidityControlSetpointCCScaleSupportedReport
	extends HumidityControlSetpointCC
{
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);

		this.supportedScales = parseBitMask(
			Buffer.from([this.payload[0] & 0b1111]),
			0,
		);
	}

	public readonly supportedScales: readonly number[];

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const supportedScales = this.supportedScales.map((scale) =>
			getScale(scale)
		);
		return {
			...super.toLogEntry(host),
			message: {
				"scale supported": supportedScales
					.map((t) => `\n· ${t.key} ${t.unit} - ${t.label}`)
					.join(""),
			},
		};
	}
}

// @publicAPI
export interface HumidityControlSetpointCCScaleSupportedGetOptions
	extends CCCommandOptions
{
	setpointType: HumidityControlSetpointType;
}

@CCCommand(HumidityControlSetpointCommand.ScaleSupportedGet)
@expectedCCResponse(HumidityControlSetpointCCScaleSupportedReport)
export class HumidityControlSetpointCCScaleSupportedGet
	extends HumidityControlSetpointCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| HumidityControlSetpointCCScaleSupportedGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.setpointType = options.setpointType;
		}
	}

	public setpointType: HumidityControlSetpointType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.setpointType,
				),
			},
		};
	}
}

@CCCommand(HumidityControlSetpointCommand.CapabilitiesReport)
export class HumidityControlSetpointCCCapabilitiesReport
	extends HumidityControlSetpointCC
{
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._type = this.payload[0] & 0b1111;
		let bytesRead: number;
		// parseFloatWithScale does its own validation
		({
			value: this._minValue,
			scale: this._minValueScale,
			bytesRead,
		} = parseFloatWithScale(this.payload.subarray(1)));
		({ value: this._maxValue, scale: this._maxValueScale } =
			parseFloatWithScale(this.payload.subarray(1 + bytesRead)));
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// Predefine the metadata
		const setpointValue = HumidityControlSetpointCCValues.setpoint(
			this.type,
		);
		this.setMetadata(applHost, setpointValue, {
			...setpointValue.meta,
			min: this._minValue,
			max: this._maxValue,
			unit: getSetpointUnit(this._minValueScale)
				|| getSetpointUnit(this._maxValueScale),
		});

		return true;
	}

	private _type: HumidityControlSetpointType;
	public get type(): HumidityControlSetpointType {
		return this._type;
	}

	private _minValue: number;
	public get minValue(): number {
		return this._minValue;
	}

	private _maxValue: number;
	public get maxValue(): number {
		return this._maxValue;
	}

	private _minValueScale: number;
	public get minValueScale(): number {
		return this._minValueScale;
	}

	private _maxValueScale: number;
	public get maxValueScale(): number {
		return this._maxValueScale;
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const minValueScale = getScale(this.minValueScale);
		const maxValueScale = getScale(this.maxValueScale);
		return {
			...super.toLogEntry(host),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.type,
				),
				"min value": `${this.minValue} ${minValueScale.unit}`,
				"max value": `${this.maxValue} ${maxValueScale.unit}`,
			},
		};
	}
}

// @publicAPI
export interface HumidityControlSetpointCCCapabilitiesGetOptions
	extends CCCommandOptions
{
	setpointType: HumidityControlSetpointType;
}

@CCCommand(HumidityControlSetpointCommand.CapabilitiesGet)
@expectedCCResponse(HumidityControlSetpointCCCapabilitiesReport)
export class HumidityControlSetpointCCCapabilitiesGet
	extends HumidityControlSetpointCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| HumidityControlSetpointCCCapabilitiesGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.setpointType = options.setpointType;
		}
	}

	public setpointType: HumidityControlSetpointType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.setpointType & 0b1111]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"setpoint type": getEnumMemberName(
					HumidityControlSetpointType,
					this.setpointType,
				),
			},
		};
	}
}
