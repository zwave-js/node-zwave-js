import {
	CommandClasses,
	encodeFloatWithScale,
	enumValuesToMetadataStates,
	parseFloatWithScale,
	validatePayload,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import {
	CCCommand,
	CCCommandOptions,
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";

// All the supported commands
export enum IrrigationCommand {
	SystemInfoGet = 0x01,
	SystemInfoReport = 0x02,
	SystemStatusGet = 0x03,
	SystemStatusReport = 0x04,
	SystemConfigSet = 0x05,
	SystemConfigGet = 0x06,
	SystemConfigReport = 0x07,
	ValveInfoGet = 0x08,
	ValveInfoReport = 0x09,
	ValveConfigSet = 0x0a,
	ValveConfigGet = 0x0b,
	ValveConfigReport = 0x0c,
	ValveRun = 0x0d,
	ValveTableSet = 0x0e,
	ValveTableGet = 0x0f,
	ValveTableReport = 0x10,
	ValveTableRun = 0x11,
	SystemShutoff = 0x12,
}

// @publicAPI
export enum IrrigationSensorPolarity {
	Low = 0,
	High = 1,
}

// @publicAPI
export enum ValveType {
	ZoneValve = 0,
	MasterValve = 1,
}

@commandClass(CommandClasses.Irrigation)
@implementedVersion(1)
export class IrrigationCC extends CommandClass {
	declare ccCommand: IrrigationCommand;
}

@CCCommand(IrrigationCommand.SystemInfoReport)
export class IrrigationCCSystemInfoReport extends IrrigationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 4);
		this.supportsMasterValve = !!(this.payload[0] & 0x01);
		this.numValves = this.payload[1];
		this.numValveTables = this.payload[2];
		this.maxValveTableSize = this.payload[3] & 0b1111;

		this.persistValues();
	}

	@ccValue({ internal: true })
	public readonly numValves: number;

	@ccValue({ internal: true })
	public readonly numValveTables: number;

	@ccValue({ internal: true })
	public readonly supportsMasterValve: boolean;

	@ccValue({ internal: true })
	public readonly maxValveTableSize: number;
}

@CCCommand(IrrigationCommand.SystemInfoGet)
@expectedCCResponse(IrrigationCCSystemInfoReport)
export class IrrigationCCSystemInfoGet extends IrrigationCC {}

@CCCommand(IrrigationCommand.SystemStatusReport)
export class IrrigationCCSystemStatusReport extends IrrigationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 2);
		this.systemVoltage = this.payload[0];
		this.flowSensorActive = !!(this.payload[1] & 0x01);
		this.pressureSensorActive = !!(this.payload[1] & 0x02);
		this.rainSensorActive = !!(this.payload[1] & 0x04);
		this.moistureSensorActive = !!(this.payload[1] & 0x08);

		let offset: number;
		if (!this.flowSensorActive) {
			validatePayload(this.payload[2] === 1);
			offset = 4;
		} else {
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.slice(2),
			);
			validatePayload(scale === 0);
			this.flow = value;
			offset = bytesRead + 2;
		}
		if (!this.pressureSensorActive) {
			validatePayload(this.payload[offset] === 1);
			offset += 2;
		} else {
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.slice(2),
			);
			validatePayload(scale === 0);
			this.pressure = value;
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

		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "System voltage",
		unit: "V",
	})
	public systemVoltage: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Flow sensor active",
	})
	public flowSensorActive: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Pressure sensor active",
	})
	public pressureSensorActive: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Rain sensor attached and active",
	})
	public rainSensorActive: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Moisture sensor attached and active",
	})
	public moistureSensorActive: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyNumber,
		label: "Flow",
		unit: "l/h",
	})
	public flow?: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyNumber,
		label: "Pressure",
		unit: "kPa",
	})
	public pressure?: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Remaining shutoff duration",
		unit: "hours",
	})
	public shutoffDuration: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: device not programmed",
	})
	public errorNotProgrammed: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: emergency shutdown",
	})
	public errorEmergencyShutdown: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: high pressure",
	})
	public errorHighPressure: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: low pressure",
	})
	public errorLowPressure: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: valve reporting error",
	})
	public errorValve: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Master valve is open",
	})
	public masterValveOpen: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyNumber,
		label: "First open zone valve ID",
	})
	public firstOpenZoneId?: number;
}

@CCCommand(IrrigationCommand.SystemStatusGet)
@expectedCCResponse(IrrigationCCSystemStatusReport)
export class IrrigationCCSystemStatusGet extends IrrigationCC {}

interface IrrigationCCSystemConfigSetOptions extends CCCommandOptions {
	masterValveDelay: number;
	highPressureThreshold: number;
	lowPressureThreshold: number;
	rainSensorPolarity?: IrrigationSensorPolarity;
	moistureSensorPolarity?: IrrigationSensorPolarity;
}

@CCCommand(IrrigationCommand.SystemConfigSet)
export class IrrigationCCSystemConfigSet extends IrrigationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| IrrigationCCSystemConfigSetOptions,
	) {
		super(driver, options);
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
			this.rainSensorPolarity == undefined &&
			this.moistureSensorPolarity == undefined
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
}

@CCCommand(IrrigationCommand.SystemConfigReport)
export class IrrigationCCSystemConfigReport extends IrrigationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 2);
		this.masterValveDelay = this.payload[0];
		let offset = 1;
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.slice(offset),
			);
			validatePayload(scale === 0 /* kPa */);
			this.highPressureThreshold = value;
			offset += bytesRead;
		}
		{
			const { value, scale, bytesRead } = parseFloatWithScale(
				this.payload.slice(offset),
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
			this.moistureSensorPolarity = polarity & 0b10;
		}
		this.persistValues();
	}

	public readonly masterValveDelay: number;
	public readonly highPressureThreshold: number;
	public readonly lowPressureThreshold: number;
	public readonly rainSensorPolarity?: IrrigationSensorPolarity;
	public readonly moistureSensorPolarity?: IrrigationSensorPolarity;
}

@CCCommand(IrrigationCommand.SystemConfigGet)
@expectedCCResponse(IrrigationCCSystemConfigReport)
export class IrrigationCCSystemConfigGet extends IrrigationCC {}

@CCCommand(IrrigationCommand.ValveInfoReport)
export class IrrigationCCValveInfoReport extends IrrigationCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 4);
		this.valveType = this.payload[0] & 0b1;
		this.connected = !!(this.payload[0] & 0b10);
		this.valveId = this.payload[1];
		this.nominalCurrent = this.payload[2];
		this.errorShortCircuit = !!(this.payload[3] & 0b1);
		this.errorHighCurrent = !!(this.payload[3] & 0b10);
		this.errorLowCurrent = !!(this.payload[3] & 0b100);
		if (this.valveType === ValveType.ZoneValve) {
			this.errorMaximumFlow = !!(this.payload[3] & 0b1000);
			this.errorHighFlow = !!(this.payload[3] & 0b1_0000);
			this.errorLowFlow = !!(this.payload[3] & 0b10_0000);
		}
		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyNumber,
		min: ValveType.ZoneValve,
		max: ValveType.MasterValve,
		states: enumValuesToMetadataStates(ValveType),
		label: "Valve type",
	})
	public readonly valveType: ValveType;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Valve connected",
	})
	public readonly connected: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Valve ID",
	})
	public readonly valveId: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Nominal current",
		unit: "10 mA",
	})
	public readonly nominalCurrent: number;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: Short circuit detected",
	})
	public readonly errorShortCircuit: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: Current above high threshold",
	})
	public readonly errorHighCurrent: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: Current below low threshold",
	})
	public readonly errorLowCurrent: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: Maximum flow detected",
	})
	public readonly errorMaximumFlow?: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: Flow above high threshold",
	})
	public readonly errorHighFlow?: boolean;

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyBoolean,
		label: "Error: Flow below low threshold",
	})
	public readonly errorLowFlow?: boolean;
}

type IrrigationCCValveInfoGetOptions =
	| {
			masterValve: true;
			valveId?: undefined;
	  }
	| {
			masterValve: false;
			valveId: number;
	  };

@CCCommand(IrrigationCommand.ValveInfoGet)
@expectedCCResponse(IrrigationCCValveInfoReport)
export class IrrigationCCValveInfoGet extends IrrigationCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (IrrigationCCValveInfoGetOptions & CCCommandOptions),
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.masterValve = options.masterValve;
			this.valveId = options.valveId;
		}
	}

	public masterValve: boolean;
	public valveId?: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.masterValve ? 1 : 0,
			this.masterValve ? 1 : this.valveId || 1,
		]);
		return super.serialize();
	}
}
