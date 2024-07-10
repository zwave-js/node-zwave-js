import { num2hex } from "@zwave-js/shared/safe";
import {
	type Scale,
	type ScaleDefinition,
	type ScaleGroup,
	getNamedScaleGroup,
} from "./Scales";

export interface SensorDefinition {
	readonly label: string;
	readonly scaleGroupName?: string;
	readonly scales: ScaleGroup;
}

export interface Sensor extends SensorDefinition {
	readonly key: number;
}

function useNamedScales<T extends Parameters<typeof getNamedScaleGroup>[0]>(
	name: T,
): { scaleGroupName: T; scales: ReturnType<typeof getNamedScaleGroup<T>> } {
	return { scaleGroupName: name, scales: getNamedScaleGroup(name) };
}

const sensors = Object.freeze(
	{
		[0x01]: {
			label: "Air temperature",
			...useNamedScales("temperature"),
		},
		[0x02]: {
			label: "General purpose",
			scales: {
				[0x00]: {
					label: "Percentage value",
					unit: "%",
				},
				[0x01]: {
					label: "Dimensionless value",
				},
			},
		},
		[0x03]: {
			label: "Illuminance",
			scales: {
				[0x00]: {
					label: "Percentage value",
					unit: "%",
				},
				[0x01]: {
					label: "Lux",
					unit: "Lux",
				},
			},
		},
		[0x04]: {
			label: "Power",
			scales: {
				[0x00]: {
					label: "Watt",
					unit: "W",
				},
				[0x01]: {
					label: "Btu/h",
					unit: "Btu/h",
				},
			},
		},
		[0x05]: {
			label: "Humidity",
			...useNamedScales("humidity"),
		},
		[0x06]: {
			label: "Velocity",
			scales: {
				[0x00]: {
					label: "m/s",
					unit: "m/s",
				},
				[0x01]: {
					label: "Mph",
					unit: "Mph",
				},
			},
		},
		[0x07]: {
			label: "Direction",
			...useNamedScales("direction"),
		},
		[0x08]: {
			label: "Atmospheric pressure",
			...useNamedScales("airPressure"),
		},
		[0x09]: {
			label: "Barometric pressure",
			...useNamedScales("airPressure"),
		},
		[0x0a]: {
			label: "Solar radiation",
			scales: {
				[0x00]: {
					label: "Watt per square meter",
					unit: "W/m²",
				},
			},
		},
		[0x0b]: {
			label: "Dew point",
			...useNamedScales("temperature"),
		},
		[0x0c]: {
			label: "Rain rate",
			scales: {
				[0x00]: {
					label: "Millimeter/hour",
					unit: "mm/h",
				},
				[0x01]: {
					label: "Inches per hour",
					unit: "in/h",
				},
			},
		},
		[0x0d]: {
			label: "Tide level",
			scales: {
				[0x00]: {
					label: "Meter",
					unit: "m",
				},
				[0x01]: {
					label: "Feet",
					unit: "ft",
				},
			},
		},
		[0x0e]: {
			label: "Weight",
			scales: {
				[0x00]: {
					label: "Kilogram",
					unit: "kg",
				},
				[0x01]: {
					label: "Pounds",
					unit: "lb",
				},
			},
		},
		[0x0f]: {
			label: "Voltage",
			scales: {
				[0x00]: {
					label: "Volt",
					unit: "V",
				},
				[0x01]: {
					label: "Millivolt",
					unit: "mV",
				},
			},
		},
		[0x10]: {
			label: "Current",
			scales: {
				[0x00]: {
					label: "Ampere",
					unit: "A",
				},
				[0x01]: {
					label: "Milliampere",
					unit: "mA",
				},
			},
		},
		[0x11]: {
			label: "Carbon dioxide (CO₂) level",
			scales: {
				[0x00]: {
					label: "Parts/million",
					unit: "ppm",
				},
			},
		},
		[0x12]: {
			label: "Air flow",
			scales: {
				[0x00]: {
					label: "Cubic meter per hour",
					unit: "m³/h",
				},
				[0x01]: {
					label: "Cubic feet per minute",
					unit: "cfm",
				},
			},
		},
		[0x13]: {
			label: "Tank capacity",
			scales: {
				[0x00]: {
					label: "Liter",
					unit: "l",
				},
				[0x01]: {
					label: "Cubic meter",
					unit: "m³",
				},
				[0x02]: {
					label: "Gallons",
					unit: "gallon",
				},
			},
		},
		[0x14]: {
			label: "Distance",
			scales: {
				[0x00]: {
					label: "Meter",
					unit: "m",
				},
				[0x01]: {
					label: "Centimeter",
					unit: "cm",
				},
				[0x02]: {
					label: "Feet",
					unit: "ft",
				},
			},
		},
		[0x15]: {
			label: "Angle position",
			scales: {
				[0x00]: {
					label: "Percentage value",
					unit: "%",
				},
				[0x01]: {
					label:
						"Degrees relative to north pole of standing eye view",
					unit: "°N",
				},
				[0x02]: {
					label:
						"Degrees relative to south pole of standing eye view",
					unit: "°S",
				},
			},
		},
		[0x16]: {
			label: "Rotation",
			scales: {
				[0x00]: {
					label: "Revolutions per minute",
					unit: "rpm",
				},
				[0x01]: {
					label: "Hertz",
					unit: "Hz",
				},
			},
		},
		[0x17]: {
			label: "Water temperature",
			...useNamedScales("temperature"),
		},
		[0x18]: {
			label: "Soil temperature",
			...useNamedScales("temperature"),
		},
		[0x19]: {
			label: "Seismic Intensity",
			scales: {
				[0x00]: {
					label: "Mercalli",
				},
				[0x01]: {
					label: "European Macroseismic",
				},
				[0x02]: {
					label: "Liedu",
				},
				[0x03]: {
					label: "Shindo",
				},
			},
		},
		[0x1a]: {
			label: "Seismic magnitude",
			scales: {
				[0x00]: {
					label: "Local",
				},
				[0x01]: {
					label: "Moment",
				},
				[0x02]: {
					label: "Surface wave",
				},
				[0x03]: {
					label: "Body wave",
				},
			},
		},
		[0x1b]: {
			label: "Ultraviolet",
			scales: {
				[0x00]: {
					label: "UV index",
				},
			},
		},
		[0x1c]: {
			label: "Electrical resistivity",
			scales: {
				[0x00]: {
					label: "Ohm meter",
					unit: "Ωm",
				},
			},
		},
		[0x1d]: {
			label: "Electrical conductivity",
			scales: {
				[0x00]: {
					label: "Siemens per meter",
					unit: "S/m",
				},
			},
		},
		[0x1e]: {
			label: "Loudness",
			scales: {
				[0x00]: {
					label: "Decibel",
					unit: "dB",
				},
				[0x01]: {
					label: "A-weighted decibels",
					unit: "dBA",
				},
			},
		},
		[0x1f]: {
			label: "Moisture",
			scales: {
				[0x00]: {
					label: "Percentage value",
					unit: "%",
				},
				[0x01]: {
					label: "Volume water content",
					unit: "m³/m³",
				},
				[0x02]: {
					label: "Impedance",
					unit: "kΩ",
				},
				[0x03]: {
					label: "Water activity",
					unit: "aw",
				},
			},
		},
		[0x20]: {
			label: "Frequency",
			scales: {
				[0x00]: {
					label: "Hertz",
					unit: "Hz",
					description: "MUST be used until 2.147483647 GHz",
				},
				[0x01]: {
					label: "Kilohertz",
					unit: "kHz",
					description: "MUST be used after 2.147483647 GHz",
				},
			},
		},
		[0x21]: {
			label: "Time",
			scales: {
				[0x00]: {
					label: "Second",
					unit: "s",
				},
			},
		},
		[0x22]: {
			label: "Target temperature",
			...useNamedScales("temperature"),
		},
		[0x23]: {
			label: "Particulate Matter 2.5",
			scales: {
				[0x00]: {
					label: "Mole per cubic meter",
					unit: "mol/m³",
				},
				[0x01]: {
					label: "Microgram per cubic meter",
					unit: "µg/m³",
				},
			},
		},
		[0x24]: {
			label: "Formaldehyde (CH₂O) level",
			scales: {
				[0x00]: {
					label: "Mole per cubic meter",
					unit: "mol/m³",
				},
			},
		},
		[0x25]: {
			label: "Radon concentration",
			scales: {
				[0x00]: {
					label: "Becquerel per cubic meter",
					unit: "bq/m³",
				},
				[0x01]: {
					label: "Picocuries per liter",
					unit: "pCi/l",
				},
			},
		},
		[0x26]: {
			label: "Methane (CH₄) density",
			scales: {
				[0x00]: {
					label: "Mole per cubic meter",
					unit: "mol/m³",
				},
			},
		},
		[0x27]: {
			label: "Volatile Organic Compound level",
			scales: {
				[0x00]: {
					label: "Mole per cubic meter",
					unit: "mol/m³",
				},
				[0x01]: {
					label: "Parts/million",
					unit: "ppm",
				},
			},
		},
		[0x28]: {
			label: "Carbon monoxide (CO) level",
			scales: {
				[0x00]: {
					label: "Mole per cubic meter",
					unit: "mol/m³",
				},
				[0x01]: {
					label: "Parts/million",
					unit: "ppm",
				},
			},
		},
		[0x29]: {
			label: "Soil humidity",
			...useNamedScales("percentage"),
		},
		[0x2a]: {
			label: "Soil reactivity",
			...useNamedScales("acidity"),
		},
		[0x2b]: {
			label: "Soil salinity",
			scales: {
				[0x00]: {
					label: "Mole per cubic meter",
					unit: "mol/m³",
				},
			},
		},
		[0x2c]: {
			label: "Heart rate",
			scales: {
				[0x00]: {
					label: "Beats per minute",
					unit: "bpm",
				},
			},
		},
		[0x2d]: {
			label: "Blood pressure",
			scales: {
				[0x00]: {
					label: "Systolic",
					unit: "mmHg",
				},
				[0x01]: {
					label: "Diastolic",
					unit: "mmHg",
				},
			},
		},
		[0x2e]: {
			label: "Muscle mass",
			...useNamedScales("mass"),
		},
		[0x2f]: {
			label: "Fat mass",
			...useNamedScales("mass"),
		},
		[0x30]: {
			label: "Bone mass",
			...useNamedScales("mass"),
		},
		[0x31]: {
			label: "Total body water (TBW)",
			...useNamedScales("mass"),
		},
		[0x32]: {
			label: "Basis metabolic rate (BMR)",
			scales: {
				[0x00]: {
					label: "Joule",
					unit: "J",
				},
			},
		},
		[0x33]: {
			label: "Body Mass Index (BMI)",
			scales: {
				[0x00]: {
					label: "Body Mass Index",
				},
			},
		},
		[0x34]: {
			label: "Acceleration X-axis",
			...useNamedScales("acceleration"),
		},
		[0x35]: {
			label: "Acceleration Y-axis",
			...useNamedScales("acceleration"),
		},
		[0x36]: {
			label: "Acceleration Z-axis",
			...useNamedScales("acceleration"),
		},
		[0x37]: {
			label: "Smoke density",
			...useNamedScales("percentage"),
		},
		[0x38]: {
			label: "Water flow",
			scales: {
				[0x00]: {
					label: "Liter per hour",
					unit: "l/h",
				},
			},
		},
		[0x39]: {
			label: "Water pressure",
			scales: {
				[0x00]: {
					label: "Kilopascal",
					unit: "kPa",
				},
			},
		},
		[0x3a]: {
			label: "RF signal strength",
			scales: {
				[0x00]: {
					label: "RSSI",
					unit: "%",
				},
				[0x01]: {
					label: "Power Level",
					unit: "dBm",
				},
			},
		},
		[0x3b]: {
			label: "Particulate Matter 10",
			scales: {
				[0x00]: {
					label: "Mole per cubic meter",
					unit: "mol/m³",
				},
				[0x01]: {
					label: "Microgram per cubic meter",
					unit: "µg/m³",
				},
			},
		},
		[0x3c]: {
			label: "Respiratory rate",
			scales: {
				[0x00]: {
					label: "Breaths per minute",
					unit: "bpm",
				},
			},
		},
		[0x3d]: {
			label: "Relative Modulation level",
			...useNamedScales("percentage"),
		},
		[0x3e]: {
			label: "Boiler water temperature",
			...useNamedScales("temperature"),
		},
		[0x3f]: {
			label: "Domestic Hot Water (DHW) temperature",
			...useNamedScales("temperature"),
		},
		[0x40]: {
			label: "Outside temperature",
			...useNamedScales("temperature"),
		},
		[0x41]: {
			label: "Exhaust temperature",
			...useNamedScales("temperature"),
		},
		[0x42]: {
			label: "Water Chlorine level",
			scales: {
				[0x00]: {
					label: "Milligram per liter",
					unit: "mg/l",
				},
			},
		},
		[0x43]: {
			label: "Water acidity",
			...useNamedScales("acidity"),
		},
		[0x44]: {
			label: "Water Oxidation reduction potential",
			scales: {
				[0x00]: {
					label: "Millivolt",
					unit: "mV",
				},
			},
		},
		[0x45]: {
			label: "Heart Rate LF/HF ratio",
			...useNamedScales("unitless"),
		},
		[0x46]: {
			label: "Motion Direction",
			...useNamedScales("direction"),
		},
		[0x47]: {
			label: "Applied force on the sensor",
			scales: {
				[0x00]: {
					label: "Newton",
					unit: "N",
				},
			},
		},
		[0x48]: {
			label: "Return Air temperature",
			...useNamedScales("temperature"),
		},
		[0x49]: {
			label: "Supply Air temperature",
			...useNamedScales("temperature"),
		},
		[0x4a]: {
			label: "Condenser Coil temperature",
			...useNamedScales("temperature"),
		},
		[0x4b]: {
			label: "Evaporator Coil temperature",
			...useNamedScales("temperature"),
		},
		[0x4c]: {
			label: "Liquid Line temperature",
			...useNamedScales("temperature"),
		},
		[0x4d]: {
			label: "Discharge Line temperature",
			...useNamedScales("temperature"),
		},
		[0x4e]: {
			label: "Suction Pressure",
			...useNamedScales("pressure"),
		},
		[0x4f]: {
			label: "Discharge Pressure",
			...useNamedScales("pressure"),
		},
		[0x50]: {
			label: "Defrost temperature",
			...useNamedScales("temperature"),
		},
		[0x51]: {
			label: "Ozone",
			...useNamedScales("density"),
		},
		[0x52]: {
			label: "Sulfur dioxide",
			...useNamedScales("density"),
		},
		[0x53]: {
			label: "Nitrogen dioxide",
			...useNamedScales("density"),
		},
		[0x54]: {
			label: "Ammonia",
			...useNamedScales("density"),
		},
		[0x55]: {
			label: "Lead",
			...useNamedScales("density"),
		},
		[0x56]: {
			label: "Particulate Matter 1",
			...useNamedScales("density"),
		},
		[0x57]: {
			label: "Person counter (entering)",
			...useNamedScales("unitless"),
		},
		[0x58]: {
			label: "Person counter (exiting)",
			...useNamedScales("unitless"),
		},
	} as const satisfies Record<number, SensorDefinition>,
);
export type Sensors = typeof sensors;

/** Returns the sensor definition for the given sensor type */
export function getSensor<Key extends number>(
	type: Key,
): Key extends keyof Sensors ? Sensors[Key]
	: (Sensor | undefined)
{
	const sensor: SensorDefinition | undefined = (sensors as any)[type];
	// @ts-expect-error Undefined is valid if the sensor type is not found
	if (!sensor) return;

	return {
		key: type,
		...sensor,
	} satisfies Sensor as any;
}

export function getSensorName(sensorType: number): string {
	return getSensor(sensorType)?.label
		?? `UNKNOWN (${num2hex(sensorType)})`;
}

/** Returns all sensor definitions including their scales */
export function getAllSensors(): readonly Sensor[] {
	return Object.entries(sensors)
		.map(([key, value]) => ({ key: parseInt(key, 10), ...value }));
}

/** Returns a scale definition for a scale with known name and key */
export function getSensorScale<
	SensorType extends number,
	ScaleKey extends number,
>(
	type: SensorType,
	scale: ScaleKey,
): SensorType extends keyof Sensors
	? ScaleKey extends keyof Sensors[SensorType]["scales"]
		? ({ key: ScaleKey } & (Sensors[SensorType]["scales"][ScaleKey]))
	: (Scale | undefined)
	: (Scale | undefined)
{
	const sensor = getSensor(type);
	// @ts-expect-error Undefined is valid if the sensor is not found
	if (!sensor) return;

	const scaleDef: ScaleDefinition | undefined =
		(sensor?.scales as any)[scale];
	// @ts-expect-error Undefined is valid if the scale is not found
	if (!scaleDef) return;

	return {
		key: type,
		...scaleDef,
	} satisfies Scale as any;
}

/** Returns all scales of a given sensor */
export function getAllSensorScales(
	sensorType: number,
): readonly Scale[] | undefined {
	const sensor = getSensor(sensorType);
	if (!sensor) return;

	return Object.entries(sensor.scales)
		.map(([key, scale]) => ({ key: parseInt(key, 10), ...scale }));
}
