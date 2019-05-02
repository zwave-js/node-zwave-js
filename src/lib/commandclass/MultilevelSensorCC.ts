import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { parseBitMask, parseFloatWithScale } from "../values/Primitive";
import {
	CCCommand,
	CCCommandOptions,
	ccKeyValuePair,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum MultilevelSensorCommand {
	GetSupportedSensor = 0x01,
	SupportedSensorReport = 0x02,
	GetSupportedScale = 0x03,
	Get = 0x04,
	Report = 0x05,
	SupportedScaleReport = 0x06,
}

export interface MultilevelSensorValue {
	value: number;
	/** Look up the corresponding scale with `getScale()` */
	scale: number;
}

@commandClass(CommandClasses["Multilevel Sensor"])
@implementedVersion(11)
export class MultilevelSensorCC extends CommandClass {
	public ccCommand!: MultilevelSensorCommand;
}

@CCCommand(MultilevelSensorCommand.Report)
export class MultilevelSensorCCReport extends MultilevelSensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		const sensorType = this.payload[0];
		const { bytesRead, ...value } = parseFloatWithScale(
			this.payload.slice(1),
		);
		this.values = [sensorType, value];
		this.persistValues();
	}

	@ccKeyValuePair()
	private values: [MultilevelSensorTypes, MultilevelSensorValue];

	public get sensorType(): MultilevelSensorTypes {
		return this.values[0];
	}

	public get scale(): number {
		return this.values[1].scale;
	}

	public get value(): number {
		return this.values[1].value;
	}
}

interface MultilevelSensorCCGetOptions extends CCCommandOptions {
	sensorType?: MultilevelSensorTypes;
	scale?: number; // TODO: expose scales
}

@CCCommand(MultilevelSensorCommand.Get)
@expectedCCResponse(MultilevelSensorCCReport)
export class MultilevelSensorCCGet extends MultilevelSensorCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSensorCCGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.sensorType = options.sensorType;
			this.scale = options.scale;
		}
	}

	public sensorType: MultilevelSensorTypes | undefined;
	public scale: number | undefined;

	public serialize(): Buffer {
		if (
			this.version >= 5 &&
			this.sensorType != undefined &&
			this.scale != undefined
		) {
			this.payload = Buffer.from([
				this.sensorType,
				(this.scale & 0b11) << 3,
			]);
		}
		return super.serialize();
	}
}

@CCCommand(MultilevelSensorCommand.SupportedSensorReport)
export class MultilevelSensorCCSupportedSensorReport extends MultilevelSensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._supportedSensorTypes = parseBitMask(this.payload);
		this.persistValues();
	}

	private _supportedSensorTypes: MultilevelSensorTypes[];
	@ccValue()
	public get supportedSensorTypes(): readonly MultilevelSensorTypes[] {
		return this._supportedSensorTypes;
	}
}

@CCCommand(MultilevelSensorCommand.GetSupportedSensor)
@expectedCCResponse(MultilevelSensorCCSupportedSensorReport)
export class MultilevelSensorCCGetSupportedSensor extends MultilevelSensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

interface MultilevelSensorCCGetSupportedScaleOptions extends CCCommandOptions {
	sensorType: MultilevelSensorTypes;
}

@CCCommand(MultilevelSensorCommand.SupportedScaleReport)
export class MultilevelSensorCCSupportedScaleReport extends MultilevelSensorCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		const sensorType = this.payload[0];
		const supportedScales: number[] = [];
		const bitMask = this.payload[1] && 0b1111;
		if (!!(bitMask & 0b1)) supportedScales.push(1);
		if (!!(bitMask & 0b10)) supportedScales.push(2);
		if (!!(bitMask & 0b100)) supportedScales.push(3);
		if (!!(bitMask & 0b1000)) supportedScales.push(4);
		this.supportedScales = [sensorType, supportedScales];
		this.persistValues();
	}

	@ccKeyValuePair()
	private supportedScales: [MultilevelSensorTypes, number[]];

	public get sensorType(): MultilevelSensorTypes {
		return this.supportedScales[0];
	}

	public get sensorSupportedScales(): readonly number[] {
		return this.supportedScales[1];
	}
}

@CCCommand(MultilevelSensorCommand.GetSupportedScale)
@expectedCCResponse(MultilevelSensorCCSupportedScaleReport)
export class MultilevelSensorCCGetSupportedScale extends MultilevelSensorCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSensorCCGetSupportedScaleOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.sensorType = options.sensorType;
		}
	}

	public sensorType: MultilevelSensorTypes;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.sensorType]);
		return super.serialize();
	}
}

export enum MultilevelSensorTypes {
	"Air temperature" = 0x01,
	"General purpose", // DEPRECATED by V11
	"Illuminance",
	"Power",
	"Humidity",
	"Velocity",
	"Direction",
	"Atmospheric pressure",
	"Barometric pressure",
	"Solar radiation",
	"Dew point",
	"Rain rate",
	"Tide level",
	"Weight",
	"Voltage",
	"Current",
	"Carbon dioxide (CO2) level",
	"Air flow",
	"Tank capacity",
	"Distance",
	"Angle position", // DEPRECATED by V8
	"Rotation",
	"Water temperature",
	"Soil temperature",
	"Seismic Intensity",
	"Seismic magnitude",
	"Ultraviolet",
	"Electrical resistivity",
	"Electrical conductivity",
	"Loudness",
	"Moisture",
	"Frequency",
	"Time",
	"Target temperature",
	"Particulate Matter 2.5",
	"Formaldehyde (CH2O) level",
	"Radon concentration",
	"Methane (CH4) density",
	"Volatile Organic Compound level",
	"Carbon monoxide (CO) level",
	"Soil humidity",
	"Soil reactivity",
	"Soil salinity",
	"Heart rate",
	"Blood pressure",
	"Muscle mass",
	"Fat mass",
	"Bone mass",
	"Total body water (TBW)",
	"Basis metabolic rate (BMR)",
	"Body Mass Index (BMI)",
	"Acceleration X-axis",
	"Acceleration Y-axis",
	"Acceleration Z-axis",
	"Smoke density",
	"Water flow",
	"Water pressure",
	"RF signal strength",
	"Particulate Matter 10",
	"Respiratory rate",
	"Relative Modulation level",
	"Boiler water temperature",
	"Domestic Hot Water (DHW) temperature",
	"Outside temperature",
	"Exhaust temperature",
	"Water Chlorine level",
	"Water acidity",
	"Water Oxidation reduction potential",
	"Heart Rate LF/HF ratio",
	"Motion Direction",
	"Applied force on the sensor",
	"Return Air temperature",
	"Supply Air temperature",
	"Condenser Coil temperature",
	"Evaporator Coil temperature",
	"Liquid Line temperature",
	"Discharge Line temperature",
	"Suction Pressure", // pump/compressor input
	"Discharge Pressure", // pump/compressor output
	"Defrost temperature", // sensor used to decide when to defrost,
}

export interface MultilevelSensorScale {
	unit: string | undefined;
	label: string;
	key: number;
	minimumCCVersion: number;
}

const multilevelSensorScales: Partial<
	Record<MultilevelSensorTypes, MultilevelSensorScale[]>
> = {
	[MultilevelSensorTypes["Air temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 1 },
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 1 },
	],
	[MultilevelSensorTypes["General purpose"]]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
			minimumCCVersion: 1,
		},
		{
			label: "Dimensionless value",
			unit: undefined,
			key: 0x01,
			minimumCCVersion: 1,
		},
	],
	[MultilevelSensorTypes.Illuminance]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
			minimumCCVersion: 1,
		},
		{ label: "Lux", unit: "Lux", key: 0x01, minimumCCVersion: 1 },
	],
	[MultilevelSensorTypes.Power]: [
		{ label: "Watt", unit: "W", key: 0x00, minimumCCVersion: 2 },
		{ label: "Btu/h", unit: "Btu/h", key: 0x01, minimumCCVersion: 2 },
	],
	[MultilevelSensorTypes.Humidity]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
			minimumCCVersion: 2,
		},
		{
			label: "Absolute humidity",
			unit: "g/m³",
			key: 0x01,
			minimumCCVersion: 5,
		},
	],
	[MultilevelSensorTypes.Velocity]: [
		{ label: "m/s", unit: "m/s", key: 0x00, minimumCCVersion: 2 },
		{ label: "Mph", unit: "Mph", key: 0x01, minimumCCVersion: 2 },
	],
	[MultilevelSensorTypes.Direction]: [
		// 0 = no wind, 90 = east, 180 = south, 270 = west  and 360 = north
		{ label: "Degrees", unit: "°", key: 0x00, minimumCCVersion: 2 },
	],
	[MultilevelSensorTypes["Atmospheric pressure"]]: [
		{ label: "Kilopascal", unit: "kPa", key: 0x00, minimumCCVersion: 2 },
		{
			label: "Inches of Mercury",
			unit: "inHg",
			key: 0x01,
			minimumCCVersion: 2,
		},
	],
	[MultilevelSensorTypes["Barometric pressure"]]: [
		{ label: "Kilopascal", unit: "kPa", key: 0x00, minimumCCVersion: 2 },
		{
			label: "Inches of Mercury",
			unit: "inHg",
			key: 0x01,
			minimumCCVersion: 2,
		},
	],
	[MultilevelSensorTypes["Solar radiation"]]: [
		{
			label: "Watt per square meter",
			unit: "W/m²",
			key: 0x00,
			minimumCCVersion: 2,
		},
	],
	[MultilevelSensorTypes["Dew point"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 1 },
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 1 },
	],
	[MultilevelSensorTypes["Rain rate"]]: [
		{
			label: "Millimeter/hour",
			unit: "mm/h",
			key: 0x00,
			minimumCCVersion: 2,
		},
		{
			label: "Inches per hour",
			unit: "in/h",
			key: 0x01,
			minimumCCVersion: 2,
		},
	],
	[MultilevelSensorTypes["Tide level"]]: [
		{ label: "Meter", unit: "m", key: 0x00, minimumCCVersion: 2 },
		{ label: "Feet", unit: "ft", key: 0x01, minimumCCVersion: 2 },
	],
	[MultilevelSensorTypes.Weight]: [
		{ label: "Kilogram", unit: "kg", key: 0x00, minimumCCVersion: 3 },
		{ label: "Pounds", unit: "lb", key: 0x01, minimumCCVersion: 3 },
	],
	[MultilevelSensorTypes.Voltage]: [
		{ label: "Volt", unit: "V", key: 0x00, minimumCCVersion: 3 },
		{ label: "Millivolt", unit: "mV", key: 0x01, minimumCCVersion: 3 },
	],
	[MultilevelSensorTypes.Current]: [
		{ label: "Ampere", unit: "A", key: 0x00, minimumCCVersion: 3 },
		{ label: "Milliampere", unit: "mA", key: 0x01, minimumCCVersion: 3 },
	],
	[MultilevelSensorTypes["Carbon dioxide (CO2) level"]]: [
		{
			label: "Parts/million",
			unit: "ppm",
			key: 0x00,
			minimumCCVersion: 3,
		},
	],
	[MultilevelSensorTypes["Air flow"]]: [
		{
			label: "Cubic meter per hour",
			unit: "m³/h",
			key: 0x00,
			minimumCCVersion: 3,
		},
		{
			label: "Cubic feet per minute",
			unit: "cfm",
			key: 0x01,
			minimumCCVersion: 3,
		},
	],
	[MultilevelSensorTypes["Tank capacity"]]: [
		{ label: "Liter", unit: "l", key: 0x00, minimumCCVersion: 3 },
		{ label: "Cubic meter", unit: "m³", key: 0x01, minimumCCVersion: 3 },
		{ label: "Gallons", unit: "gallon", key: 0x02, minimumCCVersion: 3 },
	],
	[MultilevelSensorTypes.Distance]: [
		{ label: "Meter", unit: "m", key: 0x00, minimumCCVersion: 3 },
		{ label: "Centimeter", unit: "cm", key: 0x01, minimumCCVersion: 3 },
		{ label: "Feet", unit: "ft", key: 0x02, minimumCCVersion: 3 },
	],
	[MultilevelSensorTypes["Angle position"]]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
			minimumCCVersion: 4,
		},
		{
			label: "Degrees relative to north pole of standing eye view",
			unit: "°N",
			key: 0x01,
			minimumCCVersion: 4,
		},
		{
			label: "Degrees relative to south pole of standing eye view",
			unit: "°S",
			key: 0x02,
			minimumCCVersion: 4,
		},
	],
	[MultilevelSensorTypes.Rotation]: [
		{
			label: "Revolutions per minute",
			unit: "rpm",
			key: 0x00,
			minimumCCVersion: 5,
		},
		{ label: "Hertz", unit: "Hz", key: 0x01, minimumCCVersion: 5 },
	],
	[MultilevelSensorTypes["Water temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 5 },
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 5 },
	],
	[MultilevelSensorTypes["Soil temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 5 },
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 5 },
	],
	[MultilevelSensorTypes["Seismic Intensity"]]: [
		{
			label: "Mercalli",
			unit: undefined,
			key: 0x00,
			minimumCCVersion: 5,
		},
		{
			label: "European Macroseismic",
			unit: undefined,
			key: 0x01,
			minimumCCVersion: 5,
		},
		{ label: "Liedu", unit: undefined, key: 0x02, minimumCCVersion: 5 },
		{ label: "Shindo", unit: undefined, key: 0x03, minimumCCVersion: 5 },
	],
	[MultilevelSensorTypes["Seismic magnitude"]]: [
		{ label: "Local", unit: undefined, key: 0x00, minimumCCVersion: 5 },
		{ label: "Moment", unit: undefined, key: 0x01, minimumCCVersion: 5 },
		{
			label: "Surface wave",
			unit: undefined,
			key: 0x02,
			minimumCCVersion: 5,
		},
		{
			label: "Body wave",
			unit: undefined,
			key: 0x03,
			minimumCCVersion: 5,
		},
	],
	[MultilevelSensorTypes.Ultraviolet]: [
		{
			label: "UV index",
			unit: undefined,
			key: 0x00,
			minimumCCVersion: 5,
		},
	],
	[MultilevelSensorTypes["Electrical resistivity"]]: [
		{ label: "Ohm meter", unit: "Ωm", key: 0x00, minimumCCVersion: 5 },
	],
	[MultilevelSensorTypes["Electrical conductivity"]]: [
		{
			label: "Siemens per meter",
			unit: "S/m",
			key: 0x00,
			minimumCCVersion: 5,
		},
	],
	[MultilevelSensorTypes.Loudness]: [
		{ label: "Decibel", unit: "dB", key: 0x00, minimumCCVersion: 5 },
		{
			label: "A-weighted decibels",
			unit: "dBA",
			key: 0x01,
			minimumCCVersion: 5,
		},
	],
	[MultilevelSensorTypes.Moisture]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
			minimumCCVersion: 5,
		},
		{
			label: "Volume water content",
			unit: "m3/m³",
			key: 0x01,
			minimumCCVersion: 5,
		},
		{ label: "Impedance", unit: "kΩ", key: 0x02, minimumCCVersion: 5 },
		{
			label: "Water activity",
			unit: "aw",
			key: 0x03,
			minimumCCVersion: 5,
		},
	],
	[MultilevelSensorTypes.Frequency]: [
		// MUST be used until 2.147483647 GHz
		{ label: "Hertz", unit: "Hz", key: 0x00, minimumCCVersion: 6 },
		// MUST be used after 2.147483647 GHz
		{ label: "Kilohertz", unit: "kHz", key: 0x01, minimumCCVersion: 6 },
	],
	[MultilevelSensorTypes.Time]: [
		{ label: "Second", unit: "s", key: 0x00, minimumCCVersion: 6 },
	],
	[MultilevelSensorTypes["Target temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 6 },
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 6 },
	],
	[MultilevelSensorTypes["Particulate Matter 2.5"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
			minimumCCVersion: 7,
		},
		{
			label: "Microgram per cubic meter",
			unit: "µg/m³",
			key: 0x01,
			minimumCCVersion: 7,
		},
	],
	[MultilevelSensorTypes["Formaldehyde (CH2O) level"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
			minimumCCVersion: 7,
		},
	],
	[MultilevelSensorTypes["Radon concentration"]]: [
		{
			label: "Becquerel per cubic meter",
			unit: "bq/m³",
			key: 0x00,
			minimumCCVersion: 7,
		},
		{
			label: "Picocuries per liter",
			unit: "pCi/l",
			key: 0x01,
			minimumCCVersion: 7,
		},
	],
	[MultilevelSensorTypes["Methane (CH4) density"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
			minimumCCVersion: 7,
		},
	],
	[MultilevelSensorTypes["Volatile Organic Compound level"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
			minimumCCVersion: 7,
		},
		{
			label: "Parts/million",
			unit: "ppm",
			key: 0x01,
			minimumCCVersion: 10,
		},
	],
	[MultilevelSensorTypes["Carbon monoxide (CO) level"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
			minimumCCVersion: 7,
		},
		{
			label: "Parts/million",
			unit: "ppm",
			key: 0x01,
			minimumCCVersion: 10,
		},
	],
	[MultilevelSensorTypes["Soil humidity"]]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
			minimumCCVersion: 7,
		},
	],
	[MultilevelSensorTypes["Soil reactivity"]]: [
		{ label: "Acidity", unit: "pH", key: 0x00, minimumCCVersion: 7 },
	],
	[MultilevelSensorTypes["Soil salinity"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
			minimumCCVersion: 7,
		},
	],
	[MultilevelSensorTypes["Heart rate"]]: [
		{
			label: "Beats per minute",
			unit: "bpm",
			key: 0x00,
			minimumCCVersion: 7,
		},
	],
	[MultilevelSensorTypes["Blood pressure"]]: [
		{ label: "Systolic", unit: "mmHg", key: 0x00, minimumCCVersion: 7 },
		{ label: "Diastolic", unit: "mmHg", key: 0x01, minimumCCVersion: 7 },
	],
	[MultilevelSensorTypes["Muscle mass"]]: [
		{ label: "Kilogram", unit: "kg", key: 0x00, minimumCCVersion: 7 },
	],
	[MultilevelSensorTypes["Fat mass"]]: [
		{ label: "Kilogram", unit: "kg", key: 0x00, minimumCCVersion: 7 },
	],
	[MultilevelSensorTypes["Bone mass"]]: [
		{ label: "Kilogram", unit: "kg", key: 0x00, minimumCCVersion: 7 },
	],
	[MultilevelSensorTypes["Total body water (TBW)"]]: [
		{ label: "Kilogram", unit: "kg", key: 0x00, minimumCCVersion: 7 },
	],
	[MultilevelSensorTypes["Basis metabolic rate (BMR)"]]: [
		{ label: "Joule", unit: "J", key: 0x00, minimumCCVersion: 7 },
	],
	[MultilevelSensorTypes["Body Mass Index (BMI)"]]: [
		{
			label: "Body Mass Index",
			unit: undefined,
			key: 0x00,
			minimumCCVersion: 7,
		},
	],
	[MultilevelSensorTypes["Acceleration X-axis"]]: [
		{
			label: "Meter per square second",
			unit: "m/s2",
			key: 0x00,
			minimumCCVersion: 8,
		},
	],
	[MultilevelSensorTypes["Acceleration Y-axis"]]: [
		{
			label: "Meter per square second",
			unit: "m/s2",
			key: 0x00,
			minimumCCVersion: 8,
		},
	],
	[MultilevelSensorTypes["Acceleration Z-axis"]]: [
		{
			label: "Meter per square second",
			unit: "m/s2",
			key: 0x00,
			minimumCCVersion: 8,
		},
	],
	[MultilevelSensorTypes["Smoke density"]]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
			minimumCCVersion: 8,
		},
	],
	[MultilevelSensorTypes["Water flow"]]: [
		{
			label: "Liter per hour",
			unit: "l/h",
			key: 0x00,
			minimumCCVersion: 9,
		},
	],
	[MultilevelSensorTypes["Water pressure"]]: [
		{ label: "Kilopascal", unit: "kPa", key: 0x00, minimumCCVersion: 9 },
	],
	[MultilevelSensorTypes["RF signal strength"]]: [
		{ label: "RSSI", unit: "%", key: 0x00, minimumCCVersion: 9 },
		{ label: "Power Level", unit: "dBm", key: 0x01, minimumCCVersion: 9 },
	],
	[MultilevelSensorTypes["Particulate Matter 10"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
			minimumCCVersion: 10,
		},
		{
			label: "Microgram per cubic meter",
			unit: "µg/m³",
			key: 0x01,
			minimumCCVersion: 10,
		},
	],
	[MultilevelSensorTypes["Respiratory rate"]]: [
		{
			label: "Breaths per minute",
			unit: "bpm",
			key: 0x00,
			minimumCCVersion: 10,
		},
	],
	[MultilevelSensorTypes["Relative Modulation level"]]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
			minimumCCVersion: 11,
		},
	],
	[MultilevelSensorTypes["Boiler water temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Domestic Hot Water (DHW) temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Outside temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Exhaust temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Water Chlorine level"]]: [
		{
			label: "Milligram per liter",
			unit: "mg/l",
			key: 0x00,
			minimumCCVersion: 11,
		},
	],
	[MultilevelSensorTypes["Water acidity"]]: [
		{ label: "Acidity", unit: "pH", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Water Oxidation reduction potential"]]: [
		{ label: "Millivolt", unit: "mV", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Heart Rate LF/HF ratio"]]: [
		{
			label: "Unitless",
			unit: undefined,
			key: 0x00,
			minimumCCVersion: 11,
		},
	],
	[MultilevelSensorTypes["Motion Direction"]]: [
		// 0 = no motion detected, 90 = east, 180 = south, 270 = west and 360 = north
		{ label: "Degrees", unit: "°", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Applied force on the sensor"]]: [
		{ label: "Newton", unit: "N", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Return Air temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Supply Air temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Condenser Coil temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Evaporator Coil temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Liquid Line temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Discharge Line temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Suction Pressure"]]: [
		{ label: "Kilopascal", unit: "kPa", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Discharge Pressure"]]: [
		{ label: "Kilopascal", unit: "kPa", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Defrost temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
	],
};

/** Looks up a scale definition for a given sensor type */
export function getScale(
	sensorType: MultilevelSensorTypes,
	scale: number,
): MultilevelSensorScale {
	const dict = multilevelSensorScales[sensorType];
	const ret = dict && dict.find(scl => scl.key === scale);
	if (ret) return ret;
	return {
		unit: undefined,
		label: "Unknown",
		key: scale,
		minimumCCVersion: 0,
	};
}
