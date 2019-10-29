import { MultilevelSensorTypes } from "./MultilevelSensorTypes";

export interface MultilevelSensorScale {
	unit: string | undefined;
	label: string;
	key: number;
}

const multilevelSensorScales: Partial<
	Record<MultilevelSensorTypes, MultilevelSensorScale[]>
> = {
	[MultilevelSensorTypes["Air temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["General purpose"]]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
		},
		{
			label: "Dimensionless value",
			unit: undefined,
			key: 0x01,
		},
	],
	[MultilevelSensorTypes.Illuminance]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
		},
		{ label: "Lux", unit: "Lux", key: 0x01 },
	],
	[MultilevelSensorTypes.Power]: [
		{ label: "Watt", unit: "W", key: 0x00 },
		{ label: "Btu/h", unit: "Btu/h", key: 0x01 },
	],
	[MultilevelSensorTypes.Humidity]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
		},
		{
			label: "Absolute humidity",
			unit: "g/m³",
			key: 0x01,
		},
	],
	[MultilevelSensorTypes.Velocity]: [
		{ label: "m/s", unit: "m/s", key: 0x00 },
		{ label: "Mph", unit: "Mph", key: 0x01 },
	],
	[MultilevelSensorTypes.Direction]: [
		// 0 = no wind, 90 = east, 180 = south, 270 = west  and 360 = north
		{ label: "Degrees", unit: "°", key: 0x00 },
	],
	[MultilevelSensorTypes["Atmospheric pressure"]]: [
		{ label: "Kilopascal", unit: "kPa", key: 0x00 },
		{
			label: "Inches of Mercury",
			unit: "inHg",
			key: 0x01,
		},
	],
	[MultilevelSensorTypes["Barometric pressure"]]: [
		{ label: "Kilopascal", unit: "kPa", key: 0x00 },
		{
			label: "Inches of Mercury",
			unit: "inHg",
			key: 0x01,
		},
	],
	[MultilevelSensorTypes["Solar radiation"]]: [
		{
			label: "Watt per square meter",
			unit: "W/m²",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Dew point"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Rain rate"]]: [
		{
			label: "Millimeter/hour",
			unit: "mm/h",
			key: 0x00,
		},
		{
			label: "Inches per hour",
			unit: "in/h",
			key: 0x01,
		},
	],
	[MultilevelSensorTypes["Tide level"]]: [
		{ label: "Meter", unit: "m", key: 0x00 },
		{ label: "Feet", unit: "ft", key: 0x01 },
	],
	[MultilevelSensorTypes.Weight]: [
		{ label: "Kilogram", unit: "kg", key: 0x00 },
		{ label: "Pounds", unit: "lb", key: 0x01 },
	],
	[MultilevelSensorTypes.Voltage]: [
		{ label: "Volt", unit: "V", key: 0x00 },
		{ label: "Millivolt", unit: "mV", key: 0x01 },
	],
	[MultilevelSensorTypes.Current]: [
		{ label: "Ampere", unit: "A", key: 0x00 },
		{ label: "Milliampere", unit: "mA", key: 0x01 },
	],
	[MultilevelSensorTypes["Carbon dioxide (CO₂) level"]]: [
		{
			label: "Parts/million",
			unit: "ppm",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Air flow"]]: [
		{
			label: "Cubic meter per hour",
			unit: "m³/h",
			key: 0x00,
		},
		{
			label: "Cubic feet per minute",
			unit: "cfm",
			key: 0x01,
		},
	],
	[MultilevelSensorTypes["Tank capacity"]]: [
		{ label: "Liter", unit: "l", key: 0x00 },
		{ label: "Cubic meter", unit: "m³", key: 0x01 },
		{ label: "Gallons", unit: "gallon", key: 0x02 },
	],
	[MultilevelSensorTypes.Distance]: [
		{ label: "Meter", unit: "m", key: 0x00 },
		{ label: "Centimeter", unit: "cm", key: 0x01 },
		{ label: "Feet", unit: "ft", key: 0x02 },
	],
	[MultilevelSensorTypes["Angle position"]]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
		},
		{
			label: "Degrees relative to north pole of standing eye view",
			unit: "°N",
			key: 0x01,
		},
		{
			label: "Degrees relative to south pole of standing eye view",
			unit: "°S",
			key: 0x02,
		},
	],
	[MultilevelSensorTypes.Rotation]: [
		{
			label: "Revolutions per minute",
			unit: "rpm",
			key: 0x00,
		},
		{ label: "Hertz", unit: "Hz", key: 0x01 },
	],
	[MultilevelSensorTypes["Water temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Soil temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Seismic Intensity"]]: [
		{
			label: "Mercalli",
			unit: undefined,
			key: 0x00,
		},
		{
			label: "European Macroseismic",
			unit: undefined,
			key: 0x01,
		},
		{ label: "Liedu", unit: undefined, key: 0x02 },
		{ label: "Shindo", unit: undefined, key: 0x03 },
	],
	[MultilevelSensorTypes["Seismic magnitude"]]: [
		{ label: "Local", unit: undefined, key: 0x00 },
		{ label: "Moment", unit: undefined, key: 0x01 },
		{
			label: "Surface wave",
			unit: undefined,
			key: 0x02,
		},
		{
			label: "Body wave",
			unit: undefined,
			key: 0x03,
		},
	],
	[MultilevelSensorTypes.Ultraviolet]: [
		{
			label: "UV index",
			unit: undefined,
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Electrical resistivity"]]: [
		{ label: "Ohm meter", unit: "Ωm", key: 0x00 },
	],
	[MultilevelSensorTypes["Electrical conductivity"]]: [
		{
			label: "Siemens per meter",
			unit: "S/m",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes.Loudness]: [
		{ label: "Decibel", unit: "dB", key: 0x00 },
		{
			label: "A-weighted decibels",
			unit: "dBA",
			key: 0x01,
		},
	],
	[MultilevelSensorTypes.Moisture]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
		},
		{
			label: "Volume water content",
			unit: "m³/m³",
			key: 0x01,
		},
		{ label: "Impedance", unit: "kΩ", key: 0x02 },
		{
			label: "Water activity",
			unit: "aw",
			key: 0x03,
		},
	],
	[MultilevelSensorTypes.Frequency]: [
		// MUST be used until 2.147483647 GHz
		{ label: "Hertz", unit: "Hz", key: 0x00 },
		// MUST be used after 2.147483647 GHz
		{ label: "Kilohertz", unit: "kHz", key: 0x01 },
	],
	[MultilevelSensorTypes.Time]: [{ label: "Second", unit: "s", key: 0x00 }],
	[MultilevelSensorTypes["Target temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Particulate Matter 2.5"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
		},
		{
			label: "Microgram per cubic meter",
			unit: "µg/m³",
			key: 0x01,
		},
	],
	[MultilevelSensorTypes["Formaldehyde (CH₂O) level"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Radon concentration"]]: [
		{
			label: "Becquerel per cubic meter",
			unit: "bq/m³",
			key: 0x00,
		},
		{
			label: "Picocuries per liter",
			unit: "pCi/l",
			key: 0x01,
		},
	],
	[MultilevelSensorTypes["Methane (CH₄) density"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Volatile Organic Compound level"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
		},
		{
			label: "Parts/million",
			unit: "ppm",
			key: 0x01,
		},
	],
	[MultilevelSensorTypes["Carbon monoxide (CO) level"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
		},
		{
			label: "Parts/million",
			unit: "ppm",
			key: 0x01,
		},
	],
	[MultilevelSensorTypes["Soil humidity"]]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Soil reactivity"]]: [
		{ label: "Acidity", unit: "pH", key: 0x00 },
	],
	[MultilevelSensorTypes["Soil salinity"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Heart rate"]]: [
		{
			label: "Beats per minute",
			unit: "bpm",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Blood pressure"]]: [
		{ label: "Systolic", unit: "mmHg", key: 0x00 },
		{ label: "Diastolic", unit: "mmHg", key: 0x01 },
	],
	[MultilevelSensorTypes["Muscle mass"]]: [
		{ label: "Kilogram", unit: "kg", key: 0x00 },
	],
	[MultilevelSensorTypes["Fat mass"]]: [
		{ label: "Kilogram", unit: "kg", key: 0x00 },
	],
	[MultilevelSensorTypes["Bone mass"]]: [
		{ label: "Kilogram", unit: "kg", key: 0x00 },
	],
	[MultilevelSensorTypes["Total body water (TBW)"]]: [
		{ label: "Kilogram", unit: "kg", key: 0x00 },
	],
	[MultilevelSensorTypes["Basis metabolic rate (BMR)"]]: [
		{ label: "Joule", unit: "J", key: 0x00 },
	],
	[MultilevelSensorTypes["Body Mass Index (BMI)"]]: [
		{
			label: "Body Mass Index",
			unit: undefined,
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Acceleration X-axis"]]: [
		{
			label: "Meter per square second",
			unit: "m/s2",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Acceleration Y-axis"]]: [
		{
			label: "Meter per square second",
			unit: "m/s2",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Acceleration Z-axis"]]: [
		{
			label: "Meter per square second",
			unit: "m/s2",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Smoke density"]]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Water flow"]]: [
		{
			label: "Liter per hour",
			unit: "l/h",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Water pressure"]]: [
		{ label: "Kilopascal", unit: "kPa", key: 0x00 },
	],
	[MultilevelSensorTypes["RF signal strength"]]: [
		{ label: "RSSI", unit: "%", key: 0x00 },
		{ label: "Power Level", unit: "dBm", key: 0x01 },
	],
	[MultilevelSensorTypes["Particulate Matter 10"]]: [
		{
			label: "Mole per cubic meter",
			unit: "mol/m³",
			key: 0x00,
		},
		{
			label: "Microgram per cubic meter",
			unit: "µg/m³",
			key: 0x01,
		},
	],
	[MultilevelSensorTypes["Respiratory rate"]]: [
		{
			label: "Breaths per minute",
			unit: "bpm",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Relative Modulation level"]]: [
		{
			label: "Percentage value",
			unit: "%",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Boiler water temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Domestic Hot Water (DHW) temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Outside temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Exhaust temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Water Chlorine level"]]: [
		{
			label: "Milligram per liter",
			unit: "mg/l",
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Water acidity"]]: [
		{ label: "Acidity", unit: "pH", key: 0x00 },
	],
	[MultilevelSensorTypes["Water Oxidation reduction potential"]]: [
		{ label: "Millivolt", unit: "mV", key: 0x00 },
	],
	[MultilevelSensorTypes["Heart Rate LF/HF ratio"]]: [
		{
			label: "Unitless",
			unit: undefined,
			key: 0x00,
		},
	],
	[MultilevelSensorTypes["Motion Direction"]]: [
		// 0 = no motion detected, 90 = east, 180 = south, 270 = west and 360 = north
		{ label: "Degrees", unit: "°", key: 0x00 },
	],
	[MultilevelSensorTypes["Applied force on the sensor"]]: [
		{ label: "Newton", unit: "N", key: 0x00 },
	],
	[MultilevelSensorTypes["Return Air temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Supply Air temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Condenser Coil temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Evaporator Coil temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Liquid Line temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Discharge Line temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
		{ label: "Fahrenheit", unit: "F", key: 0x01 },
	],
	[MultilevelSensorTypes["Suction Pressure"]]: [
		{ label: "Kilopascal", unit: "kPa", key: 0x00 },
		{
			label: "Pound per square inch",
			unit: "psi",
			key: 0x01,
		},
	],
	[MultilevelSensorTypes["Discharge Pressure"]]: [
		{ label: "Kilopascal", unit: "kPa", key: 0x00 },
		{
			label: "Pound per square inch",
			unit: "psi",
			key: 0x01,
		},
	],
	[MultilevelSensorTypes["Defrost temperature"]]: [
		{ label: "Celcius", unit: "°C", key: 0x00 },
	],
	[MultilevelSensorTypes.Ozone]: [
		{ label: "Density", unit: "µg/m³", key: 0x00 },
	],
	[MultilevelSensorTypes["Sulfur dioxide"]]: [
		{ label: "Density", unit: "µg/m³", key: 0x00 },
	],
	[MultilevelSensorTypes["Nitrogen dioxide"]]: [
		{ label: "Density", unit: "µg/m³", key: 0x00 },
	],
	[MultilevelSensorTypes.Ammonia]: [
		{ label: "Density", unit: "µg/m³", key: 0x00 },
	],
	[MultilevelSensorTypes.Lead]: [
		{ label: "Density", unit: "µg/m³", key: 0x00 },
	],
	[MultilevelSensorTypes["Particulate Matter 1"]]: [
		{ label: "Density", unit: "µg/m³", key: 0x00 },
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
	};
}
