import { MultilevelSensorTypes } from "./MultilevelSensorTypes";

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
			unit: "m³/m³",
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
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Domestic Hot Water (DHW) temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Outside temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Exhaust temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 11 },
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
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Supply Air temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Condenser Coil temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Evaporator Coil temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Liquid Line temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Discharge Line temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
		{ label: "Fahrenheit", unit: "F", key: 0x01, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Suction Pressure"]]: [
		{ label: "Kilopascal", unit: "kPa", key: 0x00, minimumCCVersion: 11 },
		{
			label: "Pound per square inch",
			unit: "psi",
			key: 0x01,
			minimumCCVersion: 11,
		},
	],
	[MultilevelSensorTypes["Discharge Pressure"]]: [
		{ label: "Kilopascal", unit: "kPa", key: 0x00, minimumCCVersion: 11 },
		{
			label: "Pound per square inch",
			unit: "psi",
			key: 0x01,
			minimumCCVersion: 11,
		},
	],
	[MultilevelSensorTypes["Defrost temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes.Ozone]: [
		{ label: "Density", unit: "µg/m³", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Sulfur dioxide"]]: [
		{ label: "Density", unit: "µg/m³", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Nitrogen dioxide"]]: [
		{ label: "Density", unit: "µg/m³", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes.Ammonia]: [
		{ label: "Density", unit: "µg/m³", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes.Lead]: [
		{ label: "Density", unit: "µg/m³", key: 0x00, minimumCCVersion: 11 },
	],
	[MultilevelSensorTypes["Particulate Matter 1"]]: [
		{ label: "Density", unit: "µg/m³", key: 0x00, minimumCCVersion: 11 },
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
