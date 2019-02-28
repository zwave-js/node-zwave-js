import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { log } from "../util/logger";
import { num2hex } from "../util/strings";
import { CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

// TODO: encode duration:
// SET:
// 0x00 = instantly
// 0x01..0x7F = 1 to 127 seconds
// 0x80..0xFE = 1 to 127 minutes
// 0xFF = factory default
// ---
// REPORT:
// 0x00 = already at the target value
// 0x01..0x7F = 1 to 127 seconds
// 0x80..0xFD = 1 to 126 minutes
// 0xFE = unknown duration
// 0xFF = reserved

export enum BasicCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	Undefined = 0x04,
	ExtendedReport = 0x05,
}

/* SensorTypes
	TEMPERATURE = 0x01,
	GENERAL = 0x02,
	LUMINANCE = 0x03,
	POWER = 0x04,
	RELATIVE_HUMIDITY = 0x05,
	VELOCITY = 0x06,
	DIRECTION = 0x07,
	ATMOSPHERIC_PRESSURE = 0x08,
	BAROMETRIC_PRESSURE = 0x09,
	SOLAR_RADIATION = 0x0A,
	DEW_POINT = 0x0B,
	RAIN_RATE = 0x0C,
	TIDE_LEVEL = 0x0D,
	WEIGHT = 0x0E,
	VOLTAGE = 0x0F,
	CURRENT = 0x10,
	CO2 = 0x11,
	AIR_FLOW = 0x12,
	TANK_CAPACITY = 0x13,
	DISTANCE = 0x14,
	ANGLE_POSITION = 0x15,
	ROTATION = 0x16,
	WATER_TEMPERATURE = 0x17,
	SOIL_TEMPERATURE = 0x18,
	SEISMIC_INTENSITY = 0x19,
	SEISMIC_MAGNITUDE = 0x1A,
	ULTRAVIOLET = 0x1B,
	ELECTRICAL_RESISTIVITY = 0x1C,
	ELECTRICAL_CONDUCTIVITY = 0x1D,
	LOUDNESS = 0x1E,
	MOISTURE = 0x1F,
	FREQUENCY = 0x20,
	TIME = 0x21,
	TARGET_TEMPERATURE = 0x22,
	PARTICULATE_MATTER = 0x23,
	FORMALDEHYDE_LEVEL = 0x24,
	RADON_CONCENTRATION = 0x25,
	METHANE_DENSITY = 0x26,
	VOLATILE_ORGANIC_COMPOUND = 0x27,
	CARBON_MONOXIDE = 0x28,
	SOIL_HUMIDITY = 0x29,
	SOIL_REACTIVITY = 0x2A,
	SOIL_SALINITY = 0x2B,
	HEART_RATE = 0x2C,
	BLOOD_PRESSURE = 0x2D,
	MUSCLE_MASS = 0x2E,
	FAT_MASS = 0x2F,
	BONE_MASS = 0x30,
	TOTAL_BODY_WATER = 0x31,
	BASIC_METABOLIC_RATE = 0x32,
	BODY_MASS_INDEX = 0x33,
	ACCELERATION_X = 0x34,
	ACCELERATION_Y = 0x35,
	ACCELERATION_Z = 0x36,
	SMOKE_DENSITY = 0x37,
	WATER_FLOW = 0x38,
	WATER_PRESURE = 0x39,
	RF_SIGNAL_STRENGTH = 0x3A,
	PARTICULATE = 0x3B,
	RESPIRATORY_RATE = 0x3C,
	MAX_TYPE = 0x3D,
}
*/
@commandClass(CommandClasses["Multilevel Sensor"])
@implementedVersion(2) // Update tests in CommandClass.test.ts when changing this
@expectedCCResponse(CommandClasses["Multilevel Sensor"])
export class MultiLevelSensorCC extends CommandClass {

	// tslint:disable:unified-signatures
	constructor(nodeId?: number);
	constructor(nodeId: number, ccCommand: BasicCommand.Get);
	constructor(nodeId: number, ccCommand: BasicCommand.Set, targetValue: number);

	constructor(
		public nodeId: number,
		public ccCommand?: BasicCommand,
		targetValue?: number,
	) {
		super(nodeId);
		this._targetValue = targetValue;
	}
	// tslint:enable:unified-signatures

	private _currentValue: number;
	private _sensor: number;
	public get currentValue(): number {
		return this._currentValue;
	}

	private _targetValue: number;
	public get targetValue(): number {
		return this._targetValue;
	}

	private _duration: number;
	public get duration(): number {
		return this._duration;
	}

	private sensorTypes: { [key: number]: any } = {
		0x01: {key: "TEMPERATURE", name: "Temperature"},
		0x02: {uuid: "GENERAL", name: "General"},
		0x03: {uuid: "LUMINANCE", name: "Luminance"},
		0x04: {uuid: "POWER", name: "Power"},
		0x05: {uuid: "RELATIVE_HUMIDITY", name: "RelativeHumidity"},
		0x06: {uuid: "VELOCITY", name: "Velocity"},
		0x07: {uuid: "DIRECTION", name: "Direction"},
		0x08: {uuid: "ATMOSPHERIC_PRESSURE", name: "AtmosphericPressure"},
		0x09: {uuid: "BAROMETRIC_PRESSURE", name: "BarometricPressure"},
		0x0A: {uuid: "SOLAR_RADIATION(", name: "SolarRadiation"},
		0x0B: {uuid: "DEW_POINT", name: "DewPoint"},
		0x0C: {uuid: "RAIN_RATE", name: "RainRate"},
		0x0D: {uuid: "TIDE_LEVEL", name: "TideLevel"},
		0x0E: {uuid: "WEIGHT", name: "Weight"},
		0x0F: {uuid: "VOLTAGE", name: "Voltage"},
		0x10: {uuid: "CURRENT", name: "Current"},
		0x11: {uuid: "CO2", name: "CO2"},
		0x12: {uuid: "AIR_FLOW", name: "AirFlow"},
		0x13: {uuid: "TANK_CAPACITY", name: "TankCapacity"},
		0x14: {uuid: "DISTANCE", name: "Distance"},
		0x15: {uuid: "ANGLE_POSITION", name: "AnglePosition"},
		0x16: {uuid: "ROTATION", name: "Rotation"},
		0x17: {uuid: "WATER_TEMPERATURE", name: "WaterTemperature"},
		0x18: {uuid: "SOIL_TEMPERATURE", name: "SoilTemperature"},
		0x19: {uuid: "SEISMIC_INTENSITY", name: "SeismicIntensity"},
		0x1A: {uuid: "SEISMIC_MAGNITUDE", name: "SeismicMagnitude"},
		0x1B: {uuid: "ULTRAVIOLET", name: "Ultraviolet"},
		0x1C: {uuid: "ELECTRICAL_RESISTIVITY", name: "ElectricalResistivity"},
		0x1D: {uuid: "ELECTRICAL_CONDUCTIVITY", name: "ElectricalConductivity"},
		0x1E: {uuid: "LOUDNESS", name: "Loudness"},
		0x1F: {uuid: "MOISTURE", name: "Moisture"},
		0x20: {uuid: "FREQUENCY", name: "Frequency"},
		0x21: {uuid: "TIME", name: "Time"},
		0x22: {uuid: "TARGET_TEMPERATURE", name: "Target Temperature"},
		0x23: {uuid: "PARTICULATE_MATTER", name: "Particulate Matter"},
		0x24: {uuid: "FORMALDEHYDE_LEVEL", name: "Formaldehyde Level"},
		0x25: {uuid: "RADON_CONCENTRATION", name: "Radon Concentration"},
		0x26: {uuid: "METHANE_DENSITY", name: "Methane Density"},
		0x27: {uuid: "VOLATILE_ORGANIC_COMPOUND", name: "Volatile Organic Compound"},
		0x28: {uuid: "CARBON_MONOXIDE", name: "Carbon Monoxide"},
		0x29: {uuid: "SOIL_HUMIDITY", name: "Soil Humidity"},
		0x2A: {uuid: "SOIL_REACTIVITY", name: "Soil Reactivity"},
		0x2B: {uuid: "SOIL_SALINITY", name: "Soil Salinity"},
		0x2C: {uuid: "HEART_RATE", name: "Heart Rate"},
		0x2D: {uuid: "BLOOD_PRESSURE", name: "Blood Pressure"},
		0x2E: {uuid: "MUSCLE_MASS", name: "Muscle Mass"},
		0x2F: {uuid: "FAT_MASS", name: "Fat Mass"},
		0x30: {uuid: "BONE_MASS", name: "Bone Mass"},
		0x31: {uuid: "TOTAL_BODY_WATER", name: "Total Body Water"},
		0x32: {uuid: "BASIC_METABOLIC_RATE", name: "Basic Metabolic Rate"},
		0x33: {uuid: "BODY_MASS_INDEX", name: "Body Mass Index"},
		0x34: {uuid: "ACCELERATION_X", name: "Accelleration X-Axis"},
		0x35: {uuid: "ACCELERATION_Y", name: "Accelleration Y-Axis"},
		0x36: {uuid: "ACCELERATION_Z", name: "Accelleration Z-Axis"},
		0x37: {uuid: "SMOKE_DENSITY", name: "Smoke Density"},
		0x38: {uuid: "WATER_FLOW", name: "Water Flow"},
		0x39: {uuid: "WATER_PRESURE", name: "Water Pressure"},
		0x3A: {uuid: "RF_SIGNAL_STRENGTH", name: "RF Signal Strength"},
		0x3B: {uuid: "PARTICULATE(", name: "Particulate Matter"},
		0x3C: {uuid: "RESPIRATORY_RATE", name: "Respiratory Rate"},
		0x3D: {uuid: "MAX_TYPE", name: "MaxType"},
	};

	private getSensor(sensorTypeCode: number): any {
		return this.sensorTypes[sensorTypeCode].name;
	}

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case BasicCommand.Get:
				this.payload = Buffer.from([this.ccCommand]);
				// no real payload
				break;
			case BasicCommand.Set:
				this.payload = Buffer.from([
					this.ccCommand,
					this._targetValue,
				]);
				break;
			default:
				throw new ZWaveError(
					"Cannot serialize a Basic CC with a command other than Get or Set",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);
		log("self", `MultiLevelSensor deserialize`, "debug");

		this.ccCommand = this.payload[0];
		switch (this.ccCommand) {
			case BasicCommand.Report:
			case BasicCommand.Undefined:
			case BasicCommand.ExtendedReport:
				// this._currentValue = this.payload[1];
				// starting in V2:
				// this._targetValue = this.payload[2];
				this._currentValue = super.extractValue(2);
				this._sensor = this.getSensor(this.payload[1]);
				log("self", `MultiLevelSensor Report: ${this.nodeId} = ${this._currentValue} = ${this._sensor}`, "info");
				log("controller", `MultiLevelSensor Report: ${this.nodeId} = ${this._currentValue}`, "info");
				this._duration = this.payload[3];
				break;
			default:
				throw new ZWaveError(
					`Cannot deserialize a Basic CC with a command other than Report. Received ${BasicCommand[this.ccCommand]} (${num2hex(this.ccCommand)})`,
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

}
