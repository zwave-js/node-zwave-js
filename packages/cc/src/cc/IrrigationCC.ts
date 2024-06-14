import {
	CommandClasses,
	type IZWaveEndpoint,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SupervisionResult,
	type ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	encodeFloatWithScale,
	enumValuesToMetadataStates,
	parseFloatWithScale,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { padStart } from "alcalzone-shared/strings";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwMissingPropertyKey,
	throwUnsupportedProperty,
	throwUnsupportedPropertyKey,
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
	IrrigationCommand,
	IrrigationSensorPolarity,
	type ValveId,
	type ValveTableEntry,
	ValveType,
} from "../lib/_Types";

export const IrrigationCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses.Irrigation, {
		...V.staticProperty("numValves", undefined, { internal: true }),
		...V.staticProperty("numValveTables", undefined, { internal: true }),
		...V.staticProperty("supportsMasterValve", undefined, {
			internal: true,
		}),
		...V.staticProperty("maxValveTableSize", undefined, { internal: true }),

		...V.staticProperty(
			"systemVoltage",
			{
				...ValueMetadata.ReadOnlyUInt8,
				label: "System voltage",
				unit: "V",
			} as const,
		),

		...V.staticProperty(
			"masterValveDelay",
			{
				...ValueMetadata.UInt8,
				label: "Master valve delay",
				description:
					"The delay between turning on the master valve and turning on any zone valve",
				unit: "seconds",
			} as const,
		),

		...V.staticProperty(
			"flowSensorActive",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Flow sensor active",
			} as const,
		),

		...V.staticProperty(
			"pressureSensorActive",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Pressure sensor active",
			} as const,
		),

		...V.staticProperty(
			"rainSensorActive",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Rain sensor attached and active",
			} as const,
		),

		...V.staticProperty(
			"rainSensorPolarity",
			{
				...ValueMetadata.Number,
				label: "Rain sensor polarity",
				min: 0,
				max: 1,
				states: enumValuesToMetadataStates(IrrigationSensorPolarity),
			} as const,
		),

		...V.staticProperty(
			"moistureSensorActive",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Moisture sensor attached and active",
			} as const,
		),

		...V.staticProperty(
			"moistureSensorPolarity",
			{
				...ValueMetadata.Number,
				label: "Moisture sensor polarity",
				min: 0,
				max: 1,
				states: enumValuesToMetadataStates(IrrigationSensorPolarity),
			} as const,
		),

		...V.staticProperty(
			"flow",
			{
				...ValueMetadata.ReadOnlyNumber,
				label: "Flow",
				unit: "l/h",
			} as const,
		),

		...V.staticProperty(
			"pressure",
			{
				...ValueMetadata.ReadOnlyNumber,
				label: "Pressure",
				unit: "kPa",
			} as const,
		),

		...V.staticProperty(
			"shutoffDuration",
			{
				...ValueMetadata.ReadOnlyUInt8,
				label: "Remaining shutoff duration",
				unit: "hours",
			} as const,
		),

		...V.staticProperty(
			"errorNotProgrammed",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Error: device not programmed",
			} as const,
		),

		...V.staticProperty(
			"errorEmergencyShutdown",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Error: emergency shutdown",
			} as const,
		),

		...V.staticProperty(
			"errorHighPressure",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Error: high pressure",
			} as const,
		),

		...V.staticProperty(
			"highPressureThreshold",
			{
				...ValueMetadata.Number,
				label: "High pressure threshold",
				unit: "kPa",
			} as const,
		),

		...V.staticProperty(
			"errorLowPressure",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Error: low pressure",
			} as const,
		),

		...V.staticProperty(
			"lowPressureThreshold",
			{
				...ValueMetadata.Number,
				label: "Low pressure threshold",
				unit: "kPa",
			} as const,
		),

		...V.staticProperty(
			"errorValve",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Error: valve reporting error",
			} as const,
		),

		...V.staticProperty(
			"masterValveOpen",
			{
				...ValueMetadata.ReadOnlyBoolean,
				label: "Master valve is open",
			} as const,
		),

		...V.staticProperty(
			"firstOpenZoneId",
			{
				...ValueMetadata.ReadOnlyNumber,
				label: "First open zone valve ID",
			} as const,
		),

		...V.staticPropertyWithName(
			"shutoffSystem",
			"shutoff",
			{
				...ValueMetadata.WriteOnlyBoolean,
				label: `Shutoff system`,
				states: {
					true: "Shutoff",
				},
			} as const,
		),
	}),

	...V.defineDynamicCCValues(CommandClasses.Irrigation, {
		...V.dynamicPropertyAndKeyWithName(
			"valveConnected",
			(valveId: ValveId) => valveId,
			"valveConnected",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "valveConnected",
			(valveId: ValveId) => ({
				...ValueMetadata.ReadOnlyBoolean,
				label: `${valveIdToMetadataPrefix(valveId)}: Connected`,
			} as const),
		),
		...V.dynamicPropertyAndKeyWithName(
			"nominalCurrent",
			(valveId: ValveId) => valveId,
			"nominalCurrent",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "nominalCurrent",
			(valveId: ValveId) => ({
				...ValueMetadata.ReadOnlyBoolean,
				label: `${
					valveIdToMetadataPrefix(
						valveId,
					)
				}: Nominal current`,
				unit: "mA",
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"nominalCurrentHighThreshold",
			(valveId: ValveId) => valveId,
			"nominalCurrentHighThreshold",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "nominalCurrentHighThreshold",
			(valveId: ValveId) => ({
				...ValueMetadata.Number,
				label: `${
					valveIdToMetadataPrefix(
						valveId,
					)
				}: Nominal current - high threshold`,
				min: 0,
				max: 2550,
				unit: "mA",
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"nominalCurrentLowThreshold",
			(valveId: ValveId) => valveId,
			"nominalCurrentLowThreshold",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "nominalCurrentLowThreshold",
			(valveId: ValveId) => ({
				...ValueMetadata.Number,
				label: `${
					valveIdToMetadataPrefix(
						valveId,
					)
				}: Nominal current - low threshold`,
				min: 0,
				max: 2550,
				unit: "mA",
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"errorShortCircuit",
			(valveId: ValveId) => valveId,
			"errorShortCircuit",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "errorShortCircuit",
			(valveId: ValveId) => ({
				...ValueMetadata.ReadOnlyBoolean,
				label: `${
					valveIdToMetadataPrefix(
						valveId,
					)
				}: Error - Short circuit detected`,
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"errorHighCurrent",
			(valveId: ValveId) => valveId,
			"errorHighCurrent",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "errorHighCurrent",
			(valveId: ValveId) => ({
				...ValueMetadata.ReadOnlyBoolean,
				label: `${
					valveIdToMetadataPrefix(
						valveId,
					)
				}: Error - Current above high threshold`,
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"errorLowCurrent",
			(valveId: ValveId) => valveId,
			"errorLowCurrent",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "errorLowCurrent",
			(valveId: ValveId) => ({
				...ValueMetadata.ReadOnlyBoolean,
				label: `${
					valveIdToMetadataPrefix(
						valveId,
					)
				}: Error - Current below low threshold`,
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"maximumFlow",
			(valveId: ValveId) => valveId,
			"maximumFlow",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "maximumFlow",
			(valveId: ValveId) => ({
				...ValueMetadata.Number,
				label: `${valveIdToMetadataPrefix(valveId)}: Maximum flow`,
				min: 0,
				unit: "l/h",
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"errorMaximumFlow",
			(valveId: ValveId) => valveId,
			"errorMaximumFlow",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "errorMaximumFlow",
			(valveId: ValveId) => ({
				...ValueMetadata.ReadOnlyBoolean,
				label: `${
					valveIdToMetadataPrefix(
						valveId,
					)
				}: Error - Maximum flow detected`,
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"highFlowThreshold",
			(valveId: ValveId) => valveId,
			"highFlowThreshold",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "highFlowThreshold",
			(valveId: ValveId) => ({
				...ValueMetadata.Number,
				label: `${
					valveIdToMetadataPrefix(
						valveId,
					)
				}: High flow threshold`,
				min: 0,
				unit: "l/h",
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"errorHighFlow",
			(valveId: ValveId) => valveId,
			"errorHighFlow",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "errorHighFlow",
			(valveId: ValveId) => ({
				...ValueMetadata.ReadOnlyBoolean,
				label: `${
					valveIdToMetadataPrefix(
						valveId,
					)
				}: Error - Flow above high threshold`,
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"lowFlowThreshold",
			(valveId: ValveId) => valveId,
			"lowFlowThreshold",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "lowFlowThreshold",
			(valveId: ValveId) => ({
				...ValueMetadata.Number,
				label: `${
					valveIdToMetadataPrefix(
						valveId,
					)
				}: Low flow threshold`,
				min: 0,
				unit: "l/h",
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"errorLowFlow",
			(valveId: ValveId) => valveId,
			"errorLowFlow",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "errorLowFlow",
			(valveId: ValveId) => ({
				...ValueMetadata.ReadOnlyBoolean,
				label: `${
					valveIdToMetadataPrefix(
						valveId,
					)
				}: Error - Flow below high threshold`,
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"useRainSensor",
			(valveId: ValveId) => valveId,
			"useRainSensor",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "useRainSensor",
			(valveId: ValveId) => ({
				...ValueMetadata.Boolean,
				label: `${
					valveIdToMetadataPrefix(
						valveId,
					)
				}: Use rain sensor`,
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"useMoistureSensor",
			(valveId: ValveId) => valveId,
			"useMoistureSensor",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "useMoistureSensor",
			(valveId: ValveId) => ({
				...ValueMetadata.Boolean,
				label: `${
					valveIdToMetadataPrefix(
						valveId,
					)
				}: Use moisture sensor`,
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"valveRunDuration",
			(valveId: ValveId) => valveId,
			"duration",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "duration",
			(valveId: ValveId) => ({
				...ValueMetadata.UInt16,
				label: `${valveIdToMetadataPrefix(valveId)}: Run duration`,
				min: 1,
				unit: "s",
			} as const),
		),

		...V.dynamicPropertyAndKeyWithName(
			"valveRunStartStop",
			(valveId: ValveId) => valveId,
			"startStop",
			({ property, propertyKey }) =>
				(typeof property === "number" || property === "master")
				&& propertyKey === "startStop",
			(valveId: ValveId) => ({
				...ValueMetadata.Boolean,
				label: `${valveIdToMetadataPrefix(valveId)}: Start/Stop`,
				states: {
					true: "Start",
					false: "Stop",
				},
			} as const),
		),
	}),
});

function valveIdToMetadataPrefix(valveId: ValveId): string {
	if (valveId === "master") return "Master valve";
	return `Valve ${padStart(valveId.toString(), 3, "0")}`;
}

const systemConfigProperties = [
	"masterValveDelay",
	"highPressureThreshold",
	"lowPressureThreshold",
	"rainSensorPolarity",
	"moistureSensorPolarity",
] as const;

const valveConfigPropertyKeys = [
	"nominalCurrentHighThreshold",
	"nominalCurrentLowThreshold",
	"maximumFlow",
	"highFlowThreshold",
	"lowFlowThreshold",
	"useRainSensor",
	"useMoistureSensor",
] as const;

@API(CommandClasses.Irrigation)
export class IrrigationCCAPI extends CCAPI {
	public supportsCommand(cmd: IrrigationCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case IrrigationCommand.SystemInfoGet:
			case IrrigationCommand.SystemStatusGet:
			case IrrigationCommand.SystemConfigSet:
			case IrrigationCommand.SystemConfigGet:
			case IrrigationCommand.ValveInfoGet:
			case IrrigationCommand.ValveConfigSet:
			case IrrigationCommand.ValveConfigGet:
			case IrrigationCommand.ValveRun:
			case IrrigationCommand.ValveTableSet:
			case IrrigationCommand.ValveTableGet:
			case IrrigationCommand.ValveTableRun:
			case IrrigationCommand.SystemShutoff:
				// These are all mandatory in V1
				return true;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSystemInfo() {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.SystemInfoGet,
		);

		const cc = new IrrigationCCSystemInfoGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			IrrigationCCSystemInfoReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"numValves",
				"numValveTables",
				"supportsMasterValve",
				"maxValveTableSize",
			]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSystemStatus() {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.SystemStatusGet,
		);

		const cc = new IrrigationCCSystemStatusGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			IrrigationCCSystemStatusReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"systemVoltage",
				"flowSensorActive",
				"pressureSensorActive",
				"rainSensorActive",
				"moistureSensorActive",
				"flow",
				"pressure",
				"shutoffDuration",
				"errorNotProgrammed",
				"errorEmergencyShutdown",
				"errorHighPressure",
				"errorLowPressure",
				"errorValve",
				"masterValveOpen",
				"firstOpenZoneId",
			]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSystemConfig() {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.SystemConfigGet,
		);

		const cc = new IrrigationCCSystemConfigGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			IrrigationCCSystemConfigReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"masterValveDelay",
				"highPressureThreshold",
				"lowPressureThreshold",
				"rainSensorPolarity",
				"moistureSensorPolarity",
			]);
		}
	}

	@validateArgs({ strictEnums: true })
	public async setSystemConfig(
		config: IrrigationCCSystemConfigSetOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.SystemConfigSet,
		);

		const cc = new IrrigationCCSystemConfigSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...config,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getValveInfo(valveId: ValveId) {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveInfoGet,
		);

		const cc = new IrrigationCCValveInfoGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			valveId,
		});
		const response = await this.applHost.sendCommand<
			IrrigationCCValveInfoReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"connected",
				"nominalCurrent",
				"errorShortCircuit",
				"errorHighCurrent",
				"errorLowCurrent",
				"errorMaximumFlow",
				"errorHighFlow",
				"errorLowFlow",
			]);
		}
	}

	@validateArgs()
	public async setValveConfig(
		options: IrrigationCCValveConfigSetOptions,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveConfigSet,
		);

		const cc = new IrrigationCCValveConfigSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getValveConfig(valveId: ValveId) {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveConfigGet,
		);

		const cc = new IrrigationCCValveConfigGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			valveId,
		});
		const response = await this.applHost.sendCommand<
			IrrigationCCValveConfigReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"nominalCurrentHighThreshold",
				"nominalCurrentLowThreshold",
				"maximumFlow",
				"highFlowThreshold",
				"lowFlowThreshold",
				"useRainSensor",
				"useMoistureSensor",
			]);
		}
	}

	@validateArgs()
	public async runValve(
		valveId: ValveId,
		duration: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveRun,
		);

		const cc = new IrrigationCCValveRun(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			valveId,
			duration,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public shutoffValve(
		valveId: ValveId,
	): Promise<SupervisionResult | undefined> {
		return this.runValve(valveId, 0);
	}

	@validateArgs()
	public async setValveTable(
		tableId: number,
		entries: ValveTableEntry[],
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveTableSet,
		);

		if (!this.endpoint.virtual) {
			const maxValveTableSize = IrrigationCC.getMaxValveTableSizeCached(
				this.applHost,
				this.endpoint,
			);
			if (
				maxValveTableSize != undefined
				&& entries.length > maxValveTableSize
			) {
				throw new ZWaveError(
					`The number of valve table entries must not exceed ${maxValveTableSize}.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}

		const cc = new IrrigationCCValveTableSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			tableId,
			entries,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async getValveTable(
		tableId: number,
	): Promise<MaybeNotKnown<ValveTableEntry[]>> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveTableGet,
		);

		const cc = new IrrigationCCValveTableGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			tableId,
		});
		const response = await this.applHost.sendCommand<
			IrrigationCCValveTableReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return response?.entries;
		}
	}

	@validateArgs()
	public async runTables(
		tableIDs: number[],
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.ValveTableRun,
		);

		const cc = new IrrigationCCValveTableRun(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			tableIDs,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Shuts off the entire system for the given duration.
	 * @param duration Shutoff duration in hours. A value of 255 will shut off the entire system permanently and prevents schedules from running.
	 */
	@validateArgs()
	public async shutoffSystem(
		duration: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			IrrigationCommand,
			IrrigationCommand.SystemShutoff,
		);

		const cc = new IrrigationCCSystemShutoff(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			duration,
		});

		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	/** Shuts off the entire system permanently and prevents schedules from running */
	public shutoffSystemPermanently(): Promise<SupervisionResult | undefined> {
		return this.shutoffSystem(255);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(
			this: IrrigationCCAPI,
			{ property, propertyKey },
			value,
		) {
			const valueDB = this.getValueDB();

			if (systemConfigProperties.includes(property as any)) {
				const options = {} as IrrigationCCSystemConfigSetOptions;
				for (const prop of systemConfigProperties) {
					if (prop === property) continue;
					const valueId: ValueID = {
						commandClass: this.ccId,
						endpoint: this.endpoint.index,
						property: prop as any,
					};
					const cachedVal = valueDB.getValue<any>(valueId);
					if (cachedVal == undefined) {
						throw new ZWaveError(
							`The "${property}" property cannot be changed before ${prop} is known!`,
							ZWaveErrorCodes.Argument_Invalid,
						);
					}
					options[prop] = cachedVal;
				}
				options[property as keyof IrrigationCCSystemConfigSetOptions] =
					value as any;

				return this.setSystemConfig(options);
			} else if (property === "shutoff") {
				return this.shutoffSystem(0);
			} else if (
				property === "master"
				|| (typeof property === "number" && property >= 1)
			) {
				// This is a value of a valve
				if (propertyKey == undefined) {
					throwMissingPropertyKey(this.ccId, property);
				}

				if (valveConfigPropertyKeys.includes(propertyKey as any)) {
					const options = {
						valveId: property,
					} as IrrigationCCValveConfigSetOptions;

					for (const prop of valveConfigPropertyKeys) {
						if (prop === propertyKey) continue;
						const valueId: ValueID = {
							commandClass: this.ccId,
							endpoint: this.endpoint.index,
							property,
							propertyKey: prop as any,
						};
						const cachedVal = valueDB.getValue<any>(valueId);
						if (cachedVal == undefined) {
							throw new ZWaveError(
								`The "${property}_${propertyKey}" property cannot be changed before ${property}_${prop} is known!`,
								ZWaveErrorCodes.Argument_Invalid,
							);
						}
						(options as any)[prop] = cachedVal;
					}
					(options as any)[propertyKey] = value;

					return this.setValveConfig(options);
				} else if (propertyKey === "duration") {
					// The run duration needs to be set separately from triggering the run
					// So this is okay
					return;
				} else if (propertyKey === "startStop") {
					// Trigger or stop a valve run, depending on the value
					if (typeof value !== "boolean") {
						throwWrongValueType(
							this.ccId,
							property,
							"boolean",
							typeof value,
						);
					}

					if (value) {
						// Start a valve run
						const duration = valueDB.getValue<number>(
							IrrigationCCValues.valveRunDuration(
								property,
							).endpoint(this.endpoint.index),
						);
						if (duration == undefined) {
							throw new ZWaveError(
								`Cannot start a valve run without specifying a duration first!`,
								ZWaveErrorCodes.Argument_Invalid,
							);
						}
						return this.runValve(property, duration);
					} else {
						// Stop a valve run
						return this.shutoffValve(property);
					}
				} else {
					throwUnsupportedPropertyKey(
						this.ccId,
						property,
						propertyKey,
					);
				}
			}
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(
			this: IrrigationCCAPI,
			{ property, propertyKey },
		) {
			switch (property) {
				case "systemVoltage":
				case "flowSensorActive":
				case "pressureSensorActive":
				case "rainSensorActive":
				case "moistureSensorActive":
				case "flow":
				case "pressure":
				case "shutoffDuration":
				case "errorNotProgrammed":
				case "errorEmergencyShutdown":
				case "errorHighPressure":
				case "errorLowPressure":
				case "errorValve":
				case "masterValveOpen":
				case "firstOpenZoneId":
					return (await this.getSystemStatus())?.[property];

				case "masterValveDelay":
				case "highPressureThreshold":
				case "lowPressureThreshold":
				case "rainSensorPolarity":
				case "moistureSensorPolarity":
					return (await this.getSystemConfig())?.[property];
			}

			if (
				property === "master"
				|| (typeof property === "number" && property >= 1)
			) {
				// This is a value of a valve
				switch (propertyKey) {
					case "connected":
					case "nominalCurrent":
					case "errorShortCircuit":
					case "errorHighCurrent":
					case "errorLowCurrent":
					case "errorMaximumFlow":
					case "errorHighFlow":
					case "errorLowFlow":
						return (await this.getValveInfo(property))?.[
							propertyKey
						];

					case "nominalCurrentHighThreshold":
					case "nominalCurrentLowThreshold":
					case "maximumFlow":
					case "highFlowThreshold":
					case "lowFlowThreshold":
					case "useRainSensor":
					case "useMoistureSensor":
						return (await this.getValveConfig(property))?.[
							propertyKey
						];

					case undefined:
						throwMissingPropertyKey(this.ccId, property);
					default:
						throwUnsupportedPropertyKey(
							this.ccId,
							property,
							propertyKey,
						);
				}
			}
			throwUnsupportedProperty(this.ccId, property);
		};
	}
}

@commandClass(CommandClasses.Irrigation)
@implementedVersion(1)
@ccValues(IrrigationCCValues)
export class IrrigationCC extends CommandClass {
	declare ccCommand: IrrigationCommand;

	/**
	 * Returns the maximum number of valve table entries reported by the node.
	 * This only works AFTER the node has been interviewed.
	 */
	public static getMaxValveTableSizeCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): MaybeNotKnown<number> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				IrrigationCCValues.maxValveTableSize.endpoint(endpoint.index),
			);
	}

	/**
	 * Returns the number of zone valves reported by the node.
	 * This only works AFTER the node has been interviewed.
	 */
	public static getNumValvesCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): MaybeNotKnown<number> {
		return applHost
			.getValueDB(endpoint.nodeId)
			.getValue(IrrigationCCValues.numValves.endpoint(endpoint.index));
	}

	/**
	 * Returns whether the node supports a master valve
	 * This only works AFTER the node has been interviewed.
	 */
	public static supportsMasterValveCached(
		applHost: ZWaveApplicationHost,
		endpoint: IZWaveEndpoint,
	): boolean {
		return !!applHost
			.getValueDB(endpoint.nodeId)
			.getValue(
				IrrigationCCValues.supportsMasterValve.endpoint(endpoint.index),
			);
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Irrigation,
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

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "Querying irrigation system info...",
			direction: "outbound",
		});
		const systemInfo = await api.getSystemInfo();
		if (!systemInfo) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Time out while querying irrigation system info, skipping interview...",
				level: "warn",
			});
			return;
		}
		const logMessage = `received irrigation system info:
supports master valve: ${systemInfo.supportsMasterValve}
no. of valves:         ${systemInfo.numValves}
no. of valve tables:   ${systemInfo.numValveTables}
max. valve table size: ${systemInfo.maxValveTableSize}`;
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: logMessage,
			direction: "inbound",
		});

		// For each valve, create the values to start/stop a run
		for (let i = 1; i <= systemInfo.numValves; i++) {
			this.ensureMetadata(
				applHost,
				IrrigationCCValues.valveRunDuration(i),
			);
			this.ensureMetadata(
				applHost,
				IrrigationCCValues.valveRunStartStop(i),
			);
		}
		// And create a shutoff value
		this.ensureMetadata(applHost, IrrigationCCValues.shutoffSystem);

		// Query current values
		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Irrigation,
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		// Query the current system config
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "Querying irrigation system configuration...",
			direction: "outbound",
		});
		const systemConfig = await api.getSystemConfig();
		if (systemConfig) {
			let logMessage = `received irrigation system configuration:
master valve delay:       ${systemConfig.masterValveDelay} seconds
high pressure threshold:  ${systemConfig.highPressureThreshold} kPa
low pressure threshold:   ${systemConfig.lowPressureThreshold} kPa`;
			if (systemConfig.rainSensorPolarity != undefined) {
				logMessage += `
rain sensor polarity:     ${
					getEnumMemberName(
						IrrigationSensorPolarity,
						systemConfig.rainSensorPolarity,
					)
				}`;
			}
			if (systemConfig.moistureSensorPolarity != undefined) {
				logMessage += `
moisture sensor polarity: ${
					getEnumMemberName(
						IrrigationSensorPolarity,
						systemConfig.moistureSensorPolarity,
					)
				}`;
			}
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		}

		// and status
		// Query the current system config
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "Querying irrigation system status...",
			direction: "outbound",
		});
		await api.getSystemStatus();

		// for each valve, query the current status and configuration
		if (IrrigationCC.supportsMasterValveCached(applHost, endpoint)) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "Querying master valve configuration...",
				direction: "outbound",
			});
			await api.getValveConfig("master");

			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "Querying master valve status...",
				direction: "outbound",
			});
			await api.getValveInfo("master");
		}

		for (
			let i = 1;
			i <= (IrrigationCC.getNumValvesCached(applHost, endpoint) ?? 0);
			i++
		) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `Querying configuration for valve ${
					padStart(
						i.toString(),
						3,
						"0",
					)
				}...`,
				direction: "outbound",
			});
			await api.getValveConfig(i);

			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: `Querying status for valve ${
					padStart(
						i.toString(),
						3,
						"0",
					)
				}...`,
				direction: "outbound",
			});
			await api.getValveInfo(i);
		}
	}

	public translateProperty(
		applHost: ZWaveApplicationHost,
		property: string | number,
		propertyKey?: string | number,
	): string {
		if (property === "master") {
			return "Master valve";
		} else if (typeof property === "number") {
			return `Valve ${padStart(property.toString(), 3, "0")}`;
		}
		return super.translateProperty(applHost, property, propertyKey);
	}
}

@CCCommand(IrrigationCommand.SystemInfoReport)
export class IrrigationCCSystemInfoReport extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 4);
		this.supportsMasterValve = !!(this.payload[0] & 0x01);
		this.numValves = this.payload[1];
		this.numValveTables = this.payload[2];
		this.maxValveTableSize = this.payload[3] & 0b1111;
	}

	@ccValue(IrrigationCCValues.numValves)
	public readonly numValves: number;

	@ccValue(IrrigationCCValues.numValveTables)
	public readonly numValveTables: number;

	@ccValue(IrrigationCCValues.supportsMasterValve)
	public readonly supportsMasterValve: boolean;

	@ccValue(IrrigationCCValues.maxValveTableSize)
	public readonly maxValveTableSize: number;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"supports master valve": this.supportsMasterValve,
				"no. of valves": this.numValves,
				"no. of valve tables": this.numValveTables,
				"max. valve table size": this.maxValveTableSize,
			},
		};
	}
}

@CCCommand(IrrigationCommand.SystemInfoGet)
@expectedCCResponse(IrrigationCCSystemInfoReport)
export class IrrigationCCSystemInfoGet extends IrrigationCC {}

@CCCommand(IrrigationCommand.SystemStatusReport)
export class IrrigationCCSystemStatusReport extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 2);
		this.systemVoltage = this.payload[0];
		this.flowSensorActive = !!(this.payload[1] & 0x01);
		this.pressureSensorActive = !!(this.payload[1] & 0x02);
		this.rainSensorActive = !!(this.payload[1] & 0x04);
		this.moistureSensorActive = !!(this.payload[1] & 0x08);

		let offset = 2;
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.subarray(offset),
			);
			validatePayload(scale === 0);
			if (this.flowSensorActive) this.flow = value;
			offset += bytesRead;
		}
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.subarray(offset),
			);
			validatePayload(scale === 0);
			if (this.pressureSensorActive) this.pressure = value;
			offset += bytesRead;
		}

		validatePayload(this.payload.length >= offset + 4);
		this.shutoffDuration = this.payload[offset];
		this.errorNotProgrammed = !!(this.payload[offset + 1] & 0x01);
		this.errorEmergencyShutdown = !!(this.payload[offset + 1] & 0x02);
		this.errorHighPressure = !!(this.payload[offset + 1] & 0x04);
		this.errorLowPressure = !!(this.payload[offset + 1] & 0x08);
		this.errorValve = !!(this.payload[offset + 1] & 0x10);
		this.masterValveOpen = !!(this.payload[offset + 2] & 0x01);
		if (this.payload[offset + 3]) {
			this.firstOpenZoneId = this.payload[offset + 3];
		}
	}

	@ccValue(IrrigationCCValues.systemVoltage)
	public systemVoltage: number;

	@ccValue(IrrigationCCValues.flowSensorActive)
	public flowSensorActive: boolean;

	@ccValue(IrrigationCCValues.pressureSensorActive)
	public pressureSensorActive: boolean;

	@ccValue(IrrigationCCValues.rainSensorActive)
	public rainSensorActive: boolean;

	@ccValue(IrrigationCCValues.moistureSensorActive)
	public moistureSensorActive: boolean;

	@ccValue(IrrigationCCValues.flow)
	public flow?: number;

	@ccValue(IrrigationCCValues.pressure)
	public pressure?: number;

	@ccValue(IrrigationCCValues.shutoffDuration)
	public shutoffDuration: number;

	@ccValue(IrrigationCCValues.errorNotProgrammed)
	public errorNotProgrammed: boolean;

	@ccValue(IrrigationCCValues.errorEmergencyShutdown)
	public errorEmergencyShutdown: boolean;

	@ccValue(IrrigationCCValues.errorHighPressure)
	public errorHighPressure: boolean;

	@ccValue(IrrigationCCValues.errorLowPressure)
	public errorLowPressure: boolean;

	@ccValue(IrrigationCCValues.errorValve)
	public errorValve: boolean;

	@ccValue(IrrigationCCValues.masterValveOpen)
	public masterValveOpen: boolean;

	@ccValue(IrrigationCCValues.firstOpenZoneId)
	public firstOpenZoneId?: number;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"system voltage": `${this.systemVoltage} V`,
			"active sensors": [
				this.flowSensorActive ? "flow" : undefined,
				this.pressureSensorActive ? "pressure" : undefined,
				this.rainSensorActive ? "rain" : undefined,
				this.moistureSensorActive ? "moisture" : undefined,
			]
				.filter(Boolean)
				.join(", "),
		};
		if (this.flow != undefined) {
			message.flow = `${this.flow} l/h`;
		}
		if (this.pressure != undefined) {
			message.pressure = `${this.pressure} kPa`;
		}
		message["remaining shutoff duration"] = `${this.shutoffDuration} hours`;
		message["master valve status"] = this.masterValveOpen
			? "open"
			: "closed";
		message["first open zone valve"] = this.firstOpenZoneId || "none";
		const errors = [
			this.errorNotProgrammed ? "device not programmed" : undefined,
			this.errorEmergencyShutdown ? "emergency shutdown" : undefined,
			this.errorHighPressure
				? "high pressure threshold triggered"
				: undefined,
			this.errorLowPressure
				? "low pressure threshold triggered"
				: undefined,
			this.errorValve
				? "a valve or the master valve has an error"
				: undefined,
		].filter(Boolean);
		if (errors.length > 0) {
			message.errors = errors.map((e) => `\n· ${e}`).join("");
		}

		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(IrrigationCommand.SystemStatusGet)
@expectedCCResponse(IrrigationCCSystemStatusReport)
export class IrrigationCCSystemStatusGet extends IrrigationCC {}

// @publicAPI
export type IrrigationCCSystemConfigSetOptions = {
	masterValveDelay: number;
	highPressureThreshold: number;
	lowPressureThreshold: number;
	rainSensorPolarity?: IrrigationSensorPolarity;
	moistureSensorPolarity?: IrrigationSensorPolarity;
};

@CCCommand(IrrigationCommand.SystemConfigSet)
@useSupervision()
export class IrrigationCCSystemConfigSet extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (IrrigationCCSystemConfigSetOptions & CCCommandOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.masterValveDelay = options.masterValveDelay;
			this.highPressureThreshold = options.highPressureThreshold;
			this.lowPressureThreshold = options.lowPressureThreshold;
			this.rainSensorPolarity = options.rainSensorPolarity;
			this.moistureSensorPolarity = options.moistureSensorPolarity;
		}
	}

	public masterValveDelay: number;
	public highPressureThreshold: number;
	public lowPressureThreshold: number;
	public rainSensorPolarity?: IrrigationSensorPolarity;
	public moistureSensorPolarity?: IrrigationSensorPolarity;

	public serialize(): Buffer {
		let polarity = 0;
		if (this.rainSensorPolarity != undefined) polarity |= 0b1;
		if (this.moistureSensorPolarity != undefined) polarity |= 0b10;
		if (
			this.rainSensorPolarity == undefined
			&& this.moistureSensorPolarity == undefined
		) {
			// Valid bit
			polarity |= 0b1000_0000;
		}
		this.payload = Buffer.concat([
			Buffer.from([this.masterValveDelay]),
			encodeFloatWithScale(this.highPressureThreshold, 0 /* kPa */),
			encodeFloatWithScale(this.lowPressureThreshold, 0 /* kPa */),
			Buffer.from([polarity]),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"master valve delay": `${this.masterValveDelay} s`,
			"high pressure threshold": `${this.highPressureThreshold} kPa`,
			"low pressure threshold": `${this.lowPressureThreshold} kPa`,
		};
		if (this.rainSensorPolarity != undefined) {
			message["rain sensor polarity"] = getEnumMemberName(
				IrrigationSensorPolarity,
				this.rainSensorPolarity,
			);
		}
		if (this.moistureSensorPolarity != undefined) {
			message["moisture sensor polarity"] = getEnumMemberName(
				IrrigationSensorPolarity,
				this.moistureSensorPolarity,
			);
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(IrrigationCommand.SystemConfigReport)
export class IrrigationCCSystemConfigReport extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 2);
		this.masterValveDelay = this.payload[0];
		let offset = 1;
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.subarray(offset),
			);
			validatePayload(scale === 0 /* kPa */);
			this.highPressureThreshold = value;
			offset += bytesRead;
		}
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.subarray(offset),
			);
			validatePayload(scale === 0 /* kPa */);
			this.lowPressureThreshold = value;
			offset += bytesRead;
		}
		validatePayload(this.payload.length >= offset + 1);
		const polarity = this.payload[offset];
		if (!!(polarity & 0b1000_0000)) {
			// The valid bit is set
			this.rainSensorPolarity = polarity & 0b1;
			this.moistureSensorPolarity = (polarity & 0b10) >>> 1;
		}
	}

	@ccValue(IrrigationCCValues.masterValveDelay)
	public readonly masterValveDelay: number;

	@ccValue(IrrigationCCValues.highPressureThreshold)
	public readonly highPressureThreshold: number;

	@ccValue(IrrigationCCValues.lowPressureThreshold)
	public readonly lowPressureThreshold: number;

	@ccValue(IrrigationCCValues.rainSensorPolarity)
	public readonly rainSensorPolarity?: IrrigationSensorPolarity;

	@ccValue(IrrigationCCValues.moistureSensorPolarity)
	public readonly moistureSensorPolarity?: IrrigationSensorPolarity;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"master valve delay": `${this.masterValveDelay} s`,
			"high pressure threshold": `${this.highPressureThreshold} kPa`,
			"low pressure threshold": `${this.lowPressureThreshold} kPa`,
		};
		if (this.rainSensorPolarity != undefined) {
			message["rain sensor polarity"] = getEnumMemberName(
				IrrigationSensorPolarity,
				this.rainSensorPolarity,
			);
		}
		if (this.moistureSensorPolarity != undefined) {
			message["moisture sensor polarity"] = getEnumMemberName(
				IrrigationSensorPolarity,
				this.moistureSensorPolarity,
			);
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(IrrigationCommand.SystemConfigGet)
@expectedCCResponse(IrrigationCCSystemConfigReport)
export class IrrigationCCSystemConfigGet extends IrrigationCC {}

@CCCommand(IrrigationCommand.ValveInfoReport)
export class IrrigationCCValveInfoReport extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 4);
		if ((this.payload[0] & 0b1) === ValveType.MasterValve) {
			this.valveId = "master";
		} else {
			this.valveId = this.payload[1];
		}

		this.connected = !!(this.payload[0] & 0b10);
		this.nominalCurrent = 10 * this.payload[2];
		this.errorShortCircuit = !!(this.payload[3] & 0b1);
		this.errorHighCurrent = !!(this.payload[3] & 0b10);
		this.errorLowCurrent = !!(this.payload[3] & 0b100);
		if (this.valveId === "master") {
			this.errorMaximumFlow = !!(this.payload[3] & 0b1000);
			this.errorHighFlow = !!(this.payload[3] & 0b1_0000);
			this.errorLowFlow = !!(this.payload[3] & 0b10_0000);
		}
	}

	public readonly valveId: ValveId;

	public readonly connected: boolean;
	public readonly nominalCurrent: number;
	public readonly errorShortCircuit: boolean;
	public readonly errorHighCurrent: boolean;
	public readonly errorLowCurrent: boolean;
	public readonly errorMaximumFlow?: boolean;
	public readonly errorHighFlow?: boolean;
	public readonly errorLowFlow?: boolean;

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// connected
		const valveConnectedValue = IrrigationCCValues.valveConnected(
			this.valveId,
		);
		this.ensureMetadata(applHost, valveConnectedValue);
		this.setValue(applHost, valveConnectedValue, this.connected);

		// nominalCurrent
		const nominalCurrentValue = IrrigationCCValues.nominalCurrent(
			this.valveId,
		);
		this.ensureMetadata(applHost, nominalCurrentValue);
		this.setValue(applHost, nominalCurrentValue, this.nominalCurrent);

		// errorShortCircuit
		const errorShortCircuitValue = IrrigationCCValues.errorShortCircuit(
			this.valveId,
		);
		this.ensureMetadata(applHost, errorShortCircuitValue);
		this.setValue(applHost, errorShortCircuitValue, this.errorShortCircuit);

		// errorHighCurrent
		const errorHighCurrentValue = IrrigationCCValues.errorHighCurrent(
			this.valveId,
		);
		this.ensureMetadata(applHost, errorHighCurrentValue);
		this.setValue(applHost, errorHighCurrentValue, this.errorHighCurrent);

		// errorLowCurrent
		const errorLowCurrentValue = IrrigationCCValues.errorLowCurrent(
			this.valveId,
		);
		this.ensureMetadata(applHost, errorLowCurrentValue);
		this.setValue(applHost, errorLowCurrentValue, this.errorLowCurrent);

		if (this.errorMaximumFlow != undefined) {
			const errorMaximumFlowValue = IrrigationCCValues.errorMaximumFlow(
				this.valveId,
			);
			this.ensureMetadata(applHost, errorMaximumFlowValue);
			this.setValue(
				applHost,
				errorMaximumFlowValue,
				this.errorMaximumFlow,
			);
		}

		if (this.errorHighFlow != undefined) {
			const errorHighFlowValue = IrrigationCCValues.errorHighFlow(
				this.valveId,
			);
			this.ensureMetadata(applHost, errorHighFlowValue);
			this.setValue(applHost, errorHighFlowValue, this.errorHighFlow);
		}

		if (this.errorLowFlow != undefined) {
			const errorLowFlowValue = IrrigationCCValues.errorLowFlow(
				this.valveId,
			);
			this.ensureMetadata(applHost, errorLowFlowValue);
			this.setValue(applHost, errorLowFlowValue, this.errorLowFlow);
		}

		return true;
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"valve ID": this.valveId,
			connected: this.connected,
			"nominal current": `${this.nominalCurrent} mA`,
		};
		const errors = [
			this.errorShortCircuit ? "short circuit" : undefined,
			this.errorHighCurrent ? "current above high threshold" : undefined,
			this.errorLowCurrent ? "current below low threshold" : undefined,
			this.errorMaximumFlow ? "maximum flow" : undefined,
			this.errorHighFlow ? "flow above high threshold" : undefined,
			this.errorLowFlow ? "flow below low threshold" : undefined,
		].filter(Boolean);
		if (errors.length > 0) {
			message.errors = errors.map((e) => `\n· ${e}`).join("");
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export interface IrrigationCCValveInfoGetOptions extends CCCommandOptions {
	valveId: ValveId;
}

function testResponseForIrrigationCommandWithValveId(
	sent: {
		valveId: ValveId;
	},
	received: {
		valveId: ValveId;
	},
) {
	return received.valveId === sent.valveId;
}

@CCCommand(IrrigationCommand.ValveInfoGet)
@expectedCCResponse(
	IrrigationCCValveInfoReport,
	testResponseForIrrigationCommandWithValveId as any,
)
export class IrrigationCCValveInfoGet extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCValveInfoGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.valveId = options.valveId;
		}
	}

	public valveId: ValveId;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.valveId === "master" ? 1 : 0,
			this.valveId === "master" ? 1 : this.valveId || 1,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"valve ID": this.valveId,
			},
		};
	}
}

// @publicAPI
export type IrrigationCCValveConfigSetOptions = {
	valveId: ValveId;
	nominalCurrentHighThreshold: number;
	nominalCurrentLowThreshold: number;
	maximumFlow: number;
	highFlowThreshold: number;
	lowFlowThreshold: number;
	useRainSensor: boolean;
	useMoistureSensor: boolean;
};

@CCCommand(IrrigationCommand.ValveConfigSet)
@useSupervision()
export class IrrigationCCValveConfigSet extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (IrrigationCCValveConfigSetOptions & CCCommandOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.valveId = options.valveId;
			this.nominalCurrentHighThreshold =
				options.nominalCurrentHighThreshold;
			this.nominalCurrentLowThreshold =
				options.nominalCurrentLowThreshold;
			this.maximumFlow = options.maximumFlow;
			this.highFlowThreshold = options.highFlowThreshold;
			this.lowFlowThreshold = options.lowFlowThreshold;
			this.useRainSensor = options.useRainSensor;
			this.useMoistureSensor = options.useMoistureSensor;
		}
	}

	public valveId: ValveId;
	public nominalCurrentHighThreshold: number;
	public nominalCurrentLowThreshold: number;
	public maximumFlow: number;
	public highFlowThreshold: number;
	public lowFlowThreshold: number;
	public useRainSensor: boolean;
	public useMoistureSensor: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([
				this.valveId === "master" ? 1 : 0,
				this.valveId === "master" ? 1 : this.valveId || 1,
				Math.floor(this.nominalCurrentHighThreshold / 10),
				Math.floor(this.nominalCurrentLowThreshold / 10),
			]),
			encodeFloatWithScale(this.maximumFlow, 0 /* l/h */),
			encodeFloatWithScale(this.highFlowThreshold, 0 /* l/h */),
			encodeFloatWithScale(this.lowFlowThreshold, 0 /* l/h */),
			Buffer.from([
				(this.useRainSensor ? 0b1 : 0)
				| (this.useMoistureSensor ? 0b10 : 0),
			]),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"valve ID": this.valveId,
				"nominal current high threshold":
					`${this.nominalCurrentHighThreshold} mA`,
				"nominal current low threshold":
					`${this.nominalCurrentLowThreshold} mA`,
				"maximum flow": `${this.maximumFlow} l/h`,
				"high flow threshold": `${this.highFlowThreshold} l/h`,
				"low flow threshold": `${this.lowFlowThreshold} l/h`,
				"use rain sensor": this.useRainSensor,
				"use moisture sensor": this.useMoistureSensor,
			},
		};
	}
}

@CCCommand(IrrigationCommand.ValveConfigReport)
export class IrrigationCCValveConfigReport extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 4);
		if ((this.payload[0] & 0b1) === ValveType.MasterValve) {
			this.valveId = "master";
		} else {
			this.valveId = this.payload[1];
		}
		this.nominalCurrentHighThreshold = 10 * this.payload[2];
		this.nominalCurrentLowThreshold = 10 * this.payload[3];

		let offset = 4;
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.subarray(offset),
			);
			validatePayload(scale === 0 /* l/h */);
			this.maximumFlow = value;
			offset += bytesRead;
		}
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.subarray(offset),
			);
			validatePayload(scale === 0 /* l/h */);
			this.highFlowThreshold = value;
			offset += bytesRead;
		}
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.subarray(offset),
			);
			validatePayload(scale === 0 /* l/h */);
			this.lowFlowThreshold = value;
			offset += bytesRead;
		}
		validatePayload(this.payload.length >= offset + 1);
		this.useRainSensor = !!(this.payload[offset] & 0b1);
		this.useMoistureSensor = !!(this.payload[offset] & 0b10);
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		if (!super.persistValues(applHost)) return false;

		// nominalCurrentHighThreshold
		const nominalCurrentHighThresholdValue = IrrigationCCValues
			.nominalCurrentHighThreshold(this.valveId);
		this.ensureMetadata(applHost, nominalCurrentHighThresholdValue);
		this.setValue(
			applHost,
			nominalCurrentHighThresholdValue,
			this.nominalCurrentHighThreshold,
		);

		// nominalCurrentLowThreshold
		const nominalCurrentLowThresholdValue = IrrigationCCValues
			.nominalCurrentLowThreshold(this.valveId);
		this.ensureMetadata(applHost, nominalCurrentLowThresholdValue);
		this.setValue(
			applHost,
			nominalCurrentLowThresholdValue,
			this.nominalCurrentLowThreshold,
		);

		// maximumFlow
		const maximumFlowValue = IrrigationCCValues.maximumFlow(this.valveId);
		this.ensureMetadata(applHost, maximumFlowValue);
		this.setValue(applHost, maximumFlowValue, this.maximumFlow);

		// highFlowThreshold
		const highFlowThresholdValue = IrrigationCCValues.highFlowThreshold(
			this.valveId,
		);
		this.ensureMetadata(applHost, highFlowThresholdValue);
		this.setValue(applHost, highFlowThresholdValue, this.highFlowThreshold);

		// lowFlowThreshold
		const lowFlowThresholdValue = IrrigationCCValues.lowFlowThreshold(
			this.valveId,
		);
		this.ensureMetadata(applHost, lowFlowThresholdValue);
		this.setValue(applHost, lowFlowThresholdValue, this.lowFlowThreshold);

		// useRainSensor
		const useRainSensorValue = IrrigationCCValues.useRainSensor(
			this.valveId,
		);
		this.ensureMetadata(applHost, useRainSensorValue);
		this.setValue(applHost, useRainSensorValue, this.useRainSensor);

		// useMoistureSensor
		const useMoistureSensorValue = IrrigationCCValues.useMoistureSensor(
			this.valveId,
		);
		this.ensureMetadata(applHost, useMoistureSensorValue);
		this.setValue(applHost, useMoistureSensorValue, this.useMoistureSensor);

		return true;
	}

	public valveId: ValveId;
	public nominalCurrentHighThreshold: number;
	public nominalCurrentLowThreshold: number;
	public maximumFlow: number;
	public highFlowThreshold: number;
	public lowFlowThreshold: number;
	public useRainSensor: boolean;
	public useMoistureSensor: boolean;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"valve ID": this.valveId,
				"nominal current high threshold":
					`${this.nominalCurrentHighThreshold} mA`,
				"nominal current low threshold":
					`${this.nominalCurrentLowThreshold} mA`,
				"maximum flow": `${this.maximumFlow} l/h`,
				"high flow threshold": `${this.highFlowThreshold} l/h`,
				"low flow threshold": `${this.lowFlowThreshold} l/h`,
				"use rain sensor": this.useRainSensor,
				"use moisture sensor": this.useMoistureSensor,
			},
		};
	}
}

// @publicAPI
export interface IrrigationCCValveConfigGetOptions extends CCCommandOptions {
	valveId: ValveId;
}

@CCCommand(IrrigationCommand.ValveConfigGet)
@expectedCCResponse(
	IrrigationCCValveConfigReport,
	testResponseForIrrigationCommandWithValveId as any,
)
export class IrrigationCCValveConfigGet extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCValveConfigGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.valveId = options.valveId;
		}
	}

	public valveId: ValveId;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.valveId === "master" ? 1 : 0,
			this.valveId === "master" ? 1 : this.valveId || 1,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"valve ID": this.valveId,
			},
		};
	}
}

// @publicAPI
export interface IrrigationCCValveRunOptions extends CCCommandOptions {
	valveId: ValveId;
	duration: number;
}

@CCCommand(IrrigationCommand.ValveRun)
@useSupervision()
export class IrrigationCCValveRun extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCValveRunOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.valveId = options.valveId;
			this.duration = options.duration;
		}
	}

	public valveId: ValveId;
	public duration: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.valveId === "master" ? 1 : 0,
			this.valveId === "master" ? 1 : this.valveId || 1,
			0,
			0,
		]);
		this.payload.writeUInt16BE(this.duration, 2);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"valve ID": this.valveId,
		};
		if (this.duration) {
			message.duration = `${this.duration} s`;
		} else {
			message.action = "turn off";
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export interface IrrigationCCValveTableSetOptions extends CCCommandOptions {
	tableId: number;
	entries: ValveTableEntry[];
}

@CCCommand(IrrigationCommand.ValveTableSet)
@useSupervision()
export class IrrigationCCValveTableSet extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCValveTableSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.tableId = options.tableId;
			this.entries = options.entries;
		}
	}

	public tableId: number;
	public entries: ValveTableEntry[];

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(1 + this.entries.length * 3);
		this.payload[0] = this.tableId;
		for (let i = 0; i < this.entries.length; i++) {
			const entry = this.entries[i];
			const offset = 1 + i * 3;
			this.payload[offset] = entry.valveId;
			this.payload.writeUInt16BE(entry.duration, offset + 1);
		}
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"table ID": this.tableId,
		};
		for (let i = 0; i < this.entries.length; i++) {
			const entry = this.entries[i];
			const valveLabel = padStart(entry.valveId.toString(), 3, "0");
			if (entry.duration) {
				message[`valve ${valveLabel} duration`] = `${entry.duration} s`;
			} else {
				message[`valve ${valveLabel} action`] = `turn off`;
			}
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(IrrigationCommand.ValveTableReport)
export class IrrigationCCValveTableReport extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload((this.payload.length - 1) % 3 === 0);
		this.tableId = this.payload[0];
		this.entries = [];
		for (let offset = 1; offset < this.payload.length; offset += 3) {
			this.entries.push({
				valveId: this.payload[offset],
				duration: this.payload.readUInt16BE(offset + 1),
			});
		}
	}

	public readonly tableId: number;
	public readonly entries: ValveTableEntry[];

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"table ID": this.tableId,
		};
		for (let i = 0; i < this.entries.length; i++) {
			const entry = this.entries[i];
			const valveLabel = padStart(entry.valveId.toString(), 3, "0");
			if (entry.duration) {
				message[`valve ${valveLabel} duration`] = `${entry.duration} s`;
			} else {
				message[`valve ${valveLabel} action`] = `turn off`;
			}
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export interface IrrigationCCValveTableGetOptions extends CCCommandOptions {
	tableId: number;
}

function testResponseForIrrigationValveTableGet(
	sent: IrrigationCCValveTableGet,
	received: IrrigationCCValveTableReport,
) {
	return received.tableId === sent.tableId;
}

@CCCommand(IrrigationCommand.ValveTableGet)
@expectedCCResponse(
	IrrigationCCValveTableReport,
	testResponseForIrrigationValveTableGet,
)
export class IrrigationCCValveTableGet extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCValveTableGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.tableId = options.tableId;
		}
	}

	public tableId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.tableId]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"table ID": this.tableId,
			},
		};
	}
}

// @publicAPI
export interface IrrigationCCValveTableRunOptions extends CCCommandOptions {
	tableIDs: number[];
}

@CCCommand(IrrigationCommand.ValveTableRun)
@useSupervision()
export class IrrigationCCValveTableRun extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCValveTableRunOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.tableIDs = options.tableIDs;
			if (this.tableIDs.length < 1) {
				throw new ZWaveError(
					`${this.constructor.name}: At least one table ID must be specified.`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
		}
	}

	public tableIDs: number[];

	public serialize(): Buffer {
		this.payload = Buffer.from(this.tableIDs);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"table IDs": this.tableIDs
					.map((id) => padStart(id.toString(), 3, "0"))
					.join(", "),
			},
		};
	}
}

// @publicAPI
export interface IrrigationCCSystemShutoffOptions extends CCCommandOptions {
	/**
	 * The duration in minutes the system must stay off.
	 * 255 or `undefined` will prevent schedules from running.
	 */
	duration?: number;
}

@CCCommand(IrrigationCommand.SystemShutoff)
@useSupervision()
export class IrrigationCCSystemShutoff extends IrrigationCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCSystemShutoffOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.duration = options.duration;
		}
	}

	public duration?: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.duration ?? 255]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				duration: this.duration === 0
					? "temporarily"
					: this.duration === 255 || this.duration === undefined
					? "permanently"
					: `${this.duration} hours`,
			},
		};
	}
}
