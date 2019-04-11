"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const ZWaveError_1 = require("../error/ZWaveError");
const Primitive_1 = require("../values/Primitive");
const CommandClass_1 = require("./CommandClass");
const CommandClasses_1 = require("./CommandClasses");
var MultilevelSensorCommand;
(function (MultilevelSensorCommand) {
    MultilevelSensorCommand[MultilevelSensorCommand["GetSupportedSensor"] = 1] = "GetSupportedSensor";
    MultilevelSensorCommand[MultilevelSensorCommand["SupportedSensorReport"] = 2] = "SupportedSensorReport";
    MultilevelSensorCommand[MultilevelSensorCommand["GetSupportedScale"] = 3] = "GetSupportedScale";
    MultilevelSensorCommand[MultilevelSensorCommand["Get"] = 4] = "Get";
    MultilevelSensorCommand[MultilevelSensorCommand["Report"] = 5] = "Report";
    MultilevelSensorCommand[MultilevelSensorCommand["SupportedScaleReport"] = 6] = "SupportedScaleReport";
})(MultilevelSensorCommand = exports.MultilevelSensorCommand || (exports.MultilevelSensorCommand = {}));
// TODO: Define sensor types and scales
let MultilevelSensorCC = class MultilevelSensorCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, ...args) {
        super(driver, nodeId, ccCommand);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        this._supportedScales = new Map();
        if (this.ccCommand === MultilevelSensorCommand.GetSupportedScale) {
            this.sensorType = args[0];
        }
        else if (this.ccCommand === MultilevelSensorCommand.Get) {
            [this.sensorType, this.scale] = args;
        }
    }
    get supportedSensorTypes() {
        return this._supportedSensorTypes;
    }
    get supportedScales() {
        return this._supportedScales;
    }
    serialize() {
        switch (this.ccCommand) {
            case MultilevelSensorCommand.Get:
                if (this.version >= 5 &&
                    this.sensorType != undefined &&
                    this.scale != undefined) {
                    this.payload = Buffer.from([
                        this.sensorType,
                        (this.scale & 0b11) << 3,
                    ]);
                }
                break;
            case MultilevelSensorCommand.GetSupportedSensor:
                // no real payload
                break;
            case MultilevelSensorCommand.GetSupportedScale:
                this.payload = Buffer.from([this.sensorType]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a MultilevelSensor CC with a command other than Get, GetSupportedSensor or GetSupportedScale", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        switch (this.ccCommand) {
            case MultilevelSensorCommand.Report:
                this.sensorType = this.payload[0];
                ({ value: this.value, scale: this.scale } = Primitive_1.parseFloatWithScale(this.payload.slice(1)));
                break;
            case MultilevelSensorCommand.SupportedSensorReport:
                this._supportedSensorTypes = Primitive_1.parseBitMask(this.payload);
                break;
            case MultilevelSensorCommand.SupportedScaleReport: {
                const supportedScales = [];
                const bitMask = this.payload[1] && 0b1111;
                if (!!(bitMask & 0b1))
                    supportedScales.push(1);
                if (!!(bitMask & 0b10))
                    supportedScales.push(2);
                if (!!(bitMask & 0b100))
                    supportedScales.push(3);
                if (!!(bitMask & 0b1000))
                    supportedScales.push(4);
                this._supportedScales.set(this.payload[0], supportedScales);
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a MultilevelSensor CC with a command other than Report, SupportedSensorReport or SupportedScaleReport", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], MultilevelSensorCC.prototype, "sensorType", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], MultilevelSensorCC.prototype, "scale", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], MultilevelSensorCC.prototype, "value", void 0);
MultilevelSensorCC = __decorate([
    CommandClass_1.commandClass(CommandClasses_1.CommandClasses["Multilevel Sensor"]),
    CommandClass_1.implementedVersion(11),
    CommandClass_1.expectedCCResponse(CommandClasses_1.CommandClasses["Multilevel Sensor"]),
    __metadata("design:paramtypes", [Object, Number, Number, Object])
], MultilevelSensorCC);
exports.MultilevelSensorCC = MultilevelSensorCC;
var MultilevelSensorTypes;
(function (MultilevelSensorTypes) {
    MultilevelSensorTypes[MultilevelSensorTypes["Air temperature"] = 1] = "Air temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["General purpose"] = 2] = "General purpose";
    MultilevelSensorTypes[MultilevelSensorTypes["Illuminance"] = 3] = "Illuminance";
    MultilevelSensorTypes[MultilevelSensorTypes["Power"] = 4] = "Power";
    MultilevelSensorTypes[MultilevelSensorTypes["Humidity"] = 5] = "Humidity";
    MultilevelSensorTypes[MultilevelSensorTypes["Velocity"] = 6] = "Velocity";
    MultilevelSensorTypes[MultilevelSensorTypes["Direction"] = 7] = "Direction";
    MultilevelSensorTypes[MultilevelSensorTypes["Atmospheric pressure"] = 8] = "Atmospheric pressure";
    MultilevelSensorTypes[MultilevelSensorTypes["Barometric pressure"] = 9] = "Barometric pressure";
    MultilevelSensorTypes[MultilevelSensorTypes["Solar radiation"] = 10] = "Solar radiation";
    MultilevelSensorTypes[MultilevelSensorTypes["Dew point"] = 11] = "Dew point";
    MultilevelSensorTypes[MultilevelSensorTypes["Rain rate"] = 12] = "Rain rate";
    MultilevelSensorTypes[MultilevelSensorTypes["Tide level"] = 13] = "Tide level";
    MultilevelSensorTypes[MultilevelSensorTypes["Weight"] = 14] = "Weight";
    MultilevelSensorTypes[MultilevelSensorTypes["Voltage"] = 15] = "Voltage";
    MultilevelSensorTypes[MultilevelSensorTypes["Current"] = 16] = "Current";
    MultilevelSensorTypes[MultilevelSensorTypes["Carbon dioxide (CO2) level"] = 17] = "Carbon dioxide (CO2) level";
    MultilevelSensorTypes[MultilevelSensorTypes["Air flow"] = 18] = "Air flow";
    MultilevelSensorTypes[MultilevelSensorTypes["Tank capacity"] = 19] = "Tank capacity";
    MultilevelSensorTypes[MultilevelSensorTypes["Distance"] = 20] = "Distance";
    MultilevelSensorTypes[MultilevelSensorTypes["Angle position"] = 21] = "Angle position";
    MultilevelSensorTypes[MultilevelSensorTypes["Rotation"] = 22] = "Rotation";
    MultilevelSensorTypes[MultilevelSensorTypes["Water temperature"] = 23] = "Water temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["Soil temperature"] = 24] = "Soil temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["Seismic Intensity"] = 25] = "Seismic Intensity";
    MultilevelSensorTypes[MultilevelSensorTypes["Seismic magnitude"] = 26] = "Seismic magnitude";
    MultilevelSensorTypes[MultilevelSensorTypes["Ultraviolet"] = 27] = "Ultraviolet";
    MultilevelSensorTypes[MultilevelSensorTypes["Electrical resistivity"] = 28] = "Electrical resistivity";
    MultilevelSensorTypes[MultilevelSensorTypes["Electrical conductivity"] = 29] = "Electrical conductivity";
    MultilevelSensorTypes[MultilevelSensorTypes["Loudness"] = 30] = "Loudness";
    MultilevelSensorTypes[MultilevelSensorTypes["Moisture"] = 31] = "Moisture";
    MultilevelSensorTypes[MultilevelSensorTypes["Frequency"] = 32] = "Frequency";
    MultilevelSensorTypes[MultilevelSensorTypes["Time"] = 33] = "Time";
    MultilevelSensorTypes[MultilevelSensorTypes["Target temperature"] = 34] = "Target temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["Particulate Matter 2.5"] = 35] = "Particulate Matter 2.5";
    MultilevelSensorTypes[MultilevelSensorTypes["Formaldehyde (CH2O) level"] = 36] = "Formaldehyde (CH2O) level";
    MultilevelSensorTypes[MultilevelSensorTypes["Radon concentration"] = 37] = "Radon concentration";
    MultilevelSensorTypes[MultilevelSensorTypes["Methane (CH4) density"] = 38] = "Methane (CH4) density";
    MultilevelSensorTypes[MultilevelSensorTypes["Volatile Organic Compound level"] = 39] = "Volatile Organic Compound level";
    MultilevelSensorTypes[MultilevelSensorTypes["Carbon monoxide (CO) level"] = 40] = "Carbon monoxide (CO) level";
    MultilevelSensorTypes[MultilevelSensorTypes["Soil humidity"] = 41] = "Soil humidity";
    MultilevelSensorTypes[MultilevelSensorTypes["Soil reactivity"] = 42] = "Soil reactivity";
    MultilevelSensorTypes[MultilevelSensorTypes["Soil salinity"] = 43] = "Soil salinity";
    MultilevelSensorTypes[MultilevelSensorTypes["Heart rate"] = 44] = "Heart rate";
    MultilevelSensorTypes[MultilevelSensorTypes["Blood pressure"] = 45] = "Blood pressure";
    MultilevelSensorTypes[MultilevelSensorTypes["Muscle mass"] = 46] = "Muscle mass";
    MultilevelSensorTypes[MultilevelSensorTypes["Fat mass"] = 47] = "Fat mass";
    MultilevelSensorTypes[MultilevelSensorTypes["Bone mass"] = 48] = "Bone mass";
    MultilevelSensorTypes[MultilevelSensorTypes["Total body water (TBW)"] = 49] = "Total body water (TBW)";
    MultilevelSensorTypes[MultilevelSensorTypes["Basis metabolic rate (BMR)"] = 50] = "Basis metabolic rate (BMR)";
    MultilevelSensorTypes[MultilevelSensorTypes["Body Mass Index (BMI)"] = 51] = "Body Mass Index (BMI)";
    MultilevelSensorTypes[MultilevelSensorTypes["Acceleration X-axis"] = 52] = "Acceleration X-axis";
    MultilevelSensorTypes[MultilevelSensorTypes["Acceleration Y-axis"] = 53] = "Acceleration Y-axis";
    MultilevelSensorTypes[MultilevelSensorTypes["Acceleration Z-axis"] = 54] = "Acceleration Z-axis";
    MultilevelSensorTypes[MultilevelSensorTypes["Smoke density"] = 55] = "Smoke density";
    MultilevelSensorTypes[MultilevelSensorTypes["Water flow"] = 56] = "Water flow";
    MultilevelSensorTypes[MultilevelSensorTypes["Water pressure"] = 57] = "Water pressure";
    MultilevelSensorTypes[MultilevelSensorTypes["RF signal strength"] = 58] = "RF signal strength";
    MultilevelSensorTypes[MultilevelSensorTypes["Particulate Matter 10"] = 59] = "Particulate Matter 10";
    MultilevelSensorTypes[MultilevelSensorTypes["Respiratory rate"] = 60] = "Respiratory rate";
    MultilevelSensorTypes[MultilevelSensorTypes["Relative Modulation level"] = 61] = "Relative Modulation level";
    MultilevelSensorTypes[MultilevelSensorTypes["Boiler water temperature"] = 62] = "Boiler water temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["Domestic Hot Water (DHW) temperature"] = 63] = "Domestic Hot Water (DHW) temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["Outside temperature"] = 64] = "Outside temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["Exhaust temperature"] = 65] = "Exhaust temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["Water Chlorine level"] = 66] = "Water Chlorine level";
    MultilevelSensorTypes[MultilevelSensorTypes["Water acidity"] = 67] = "Water acidity";
    MultilevelSensorTypes[MultilevelSensorTypes["Water Oxidation reduction potential"] = 68] = "Water Oxidation reduction potential";
    MultilevelSensorTypes[MultilevelSensorTypes["Heart Rate LF/HF ratio"] = 69] = "Heart Rate LF/HF ratio";
    MultilevelSensorTypes[MultilevelSensorTypes["Motion Direction"] = 70] = "Motion Direction";
    MultilevelSensorTypes[MultilevelSensorTypes["Applied force on the sensor"] = 71] = "Applied force on the sensor";
    MultilevelSensorTypes[MultilevelSensorTypes["Return Air temperature"] = 72] = "Return Air temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["Supply Air temperature"] = 73] = "Supply Air temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["Condenser Coil temperature"] = 74] = "Condenser Coil temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["Evaporator Coil temperature"] = 75] = "Evaporator Coil temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["Liquid Line temperature"] = 76] = "Liquid Line temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["Discharge Line temperature"] = 77] = "Discharge Line temperature";
    MultilevelSensorTypes[MultilevelSensorTypes["Suction Pressure"] = 78] = "Suction Pressure";
    MultilevelSensorTypes[MultilevelSensorTypes["Discharge Pressure"] = 79] = "Discharge Pressure";
    MultilevelSensorTypes[MultilevelSensorTypes["Defrost temperature"] = 80] = "Defrost temperature";
})(MultilevelSensorTypes = exports.MultilevelSensorTypes || (exports.MultilevelSensorTypes = {}));
const multilevelSensorScales = {
    [MultilevelSensorTypes["Air temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 1 },
        { label: "Fahrenheit", unit: "F", value: 0x01, minimumCCVersion: 1 },
    ],
    [MultilevelSensorTypes["General purpose"]]: [
        {
            label: "Percentage value",
            unit: "%",
            value: 0x00,
            minimumCCVersion: 1,
        },
        {
            label: "Dimensionless value",
            unit: undefined,
            value: 0x01,
            minimumCCVersion: 1,
        },
    ],
    [MultilevelSensorTypes.Illuminance]: [
        {
            label: "Percentage value",
            unit: "%",
            value: 0x00,
            minimumCCVersion: 1,
        },
        { label: "Lux", unit: "Lux", value: 0x01, minimumCCVersion: 1 },
    ],
    [MultilevelSensorTypes.Power]: [
        { label: "Watt", unit: "W", value: 0x00, minimumCCVersion: 2 },
        { label: "Btu/h", unit: "Btu/h", value: 0x01, minimumCCVersion: 2 },
    ],
    [MultilevelSensorTypes.Humidity]: [
        {
            label: "Percentage value",
            unit: "%",
            value: 0x00,
            minimumCCVersion: 2,
        },
        {
            label: "Absolute humidity",
            unit: "g/m³",
            value: 0x01,
            minimumCCVersion: 5,
        },
    ],
    [MultilevelSensorTypes.Velocity]: [
        { label: "m/s", unit: "m/s", value: 0x00, minimumCCVersion: 2 },
        { label: "Mph", unit: "Mph", value: 0x01, minimumCCVersion: 2 },
    ],
    [MultilevelSensorTypes.Direction]: [
        // 0 = no wind, 90 = east, 180 = south, 270 = west  and 360 = north
        { label: "Degrees", unit: "°", value: 0x00, minimumCCVersion: 2 },
    ],
    [MultilevelSensorTypes["Atmospheric pressure"]]: [
        { label: "Kilopascal", unit: "kPa", value: 0x00, minimumCCVersion: 2 },
        {
            label: "Inches of Mercury",
            unit: "inHg",
            value: 0x01,
            minimumCCVersion: 2,
        },
    ],
    [MultilevelSensorTypes["Barometric pressure"]]: [
        { label: "Kilopascal", unit: "kPa", value: 0x00, minimumCCVersion: 2 },
        {
            label: "Inches of Mercury",
            unit: "inHg",
            value: 0x01,
            minimumCCVersion: 2,
        },
    ],
    [MultilevelSensorTypes["Solar radiation"]]: [
        {
            label: "Watt per square meter",
            unit: "W/m²",
            value: 0x00,
            minimumCCVersion: 2,
        },
    ],
    [MultilevelSensorTypes["Dew point"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 1 },
        { label: "Fahrenheit", unit: "F", value: 0x01, minimumCCVersion: 1 },
    ],
    [MultilevelSensorTypes["Rain rate"]]: [
        {
            label: "Millimeter/hour",
            unit: "mm/h",
            value: 0x00,
            minimumCCVersion: 2,
        },
        {
            label: "Inches per hour",
            unit: "in/h",
            value: 0x01,
            minimumCCVersion: 2,
        },
    ],
    [MultilevelSensorTypes["Tide level"]]: [
        { label: "Meter", unit: "m", value: 0x00, minimumCCVersion: 2 },
        { label: "Feet", unit: "ft", value: 0x01, minimumCCVersion: 2 },
    ],
    [MultilevelSensorTypes.Weight]: [
        { label: "Kilogram", unit: "kg", value: 0x00, minimumCCVersion: 3 },
        { label: "Pounds", unit: "lb", value: 0x01, minimumCCVersion: 3 },
    ],
    [MultilevelSensorTypes.Voltage]: [
        { label: "Volt", unit: "V", value: 0x00, minimumCCVersion: 3 },
        { label: "Millivolt", unit: "mV", value: 0x01, minimumCCVersion: 3 },
    ],
    [MultilevelSensorTypes.Current]: [
        { label: "Ampere", unit: "A", value: 0x00, minimumCCVersion: 3 },
        { label: "Milliampere", unit: "mA", value: 0x01, minimumCCVersion: 3 },
    ],
    [MultilevelSensorTypes["Carbon dioxide (CO2) level"]]: [
        {
            label: "Parts/million",
            unit: "ppm",
            value: 0x00,
            minimumCCVersion: 3,
        },
    ],
    [MultilevelSensorTypes["Air flow"]]: [
        {
            label: "Cubic meter per hour",
            unit: "m³/h",
            value: 0x00,
            minimumCCVersion: 3,
        },
        {
            label: "Cubic feet per minute",
            unit: "cfm",
            value: 0x01,
            minimumCCVersion: 3,
        },
    ],
    [MultilevelSensorTypes["Tank capacity"]]: [
        { label: "Liter", unit: "l", value: 0x00, minimumCCVersion: 3 },
        { label: "Cubic meter", unit: "m³", value: 0x01, minimumCCVersion: 3 },
        { label: "Gallons", unit: "gallon", value: 0x02, minimumCCVersion: 3 },
    ],
    [MultilevelSensorTypes.Distance]: [
        { label: "Meter", unit: "m", value: 0x00, minimumCCVersion: 3 },
        { label: "Centimeter", unit: "cm", value: 0x01, minimumCCVersion: 3 },
        { label: "Feet", unit: "ft", value: 0x02, minimumCCVersion: 3 },
    ],
    [MultilevelSensorTypes["Angle position"]]: [
        {
            label: "Percentage value",
            unit: "%",
            value: 0x00,
            minimumCCVersion: 4,
        },
        {
            label: "Degrees relative to north pole of standing eye view",
            unit: "°N",
            value: 0x01,
            minimumCCVersion: 4,
        },
        {
            label: "Degrees relative to south pole of standing eye view",
            unit: "°S",
            value: 0x02,
            minimumCCVersion: 4,
        },
    ],
    [MultilevelSensorTypes.Rotation]: [
        {
            label: "Revolutions per minute",
            unit: "rpm",
            value: 0x00,
            minimumCCVersion: 5,
        },
        { label: "Hertz", unit: "Hz", value: 0x01, minimumCCVersion: 5 },
    ],
    [MultilevelSensorTypes["Water temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 5 },
        { label: "Fahrenheit", unit: "F", value: 0x01, minimumCCVersion: 5 },
    ],
    [MultilevelSensorTypes["Soil temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 5 },
        { label: "Fahrenheit", unit: "F", value: 0x01, minimumCCVersion: 5 },
    ],
    [MultilevelSensorTypes["Seismic Intensity"]]: [
        {
            label: "Mercalli",
            unit: undefined,
            value: 0x00,
            minimumCCVersion: 5,
        },
        {
            label: "European Macroseismic",
            unit: undefined,
            value: 0x01,
            minimumCCVersion: 5,
        },
        { label: "Liedu", unit: undefined, value: 0x02, minimumCCVersion: 5 },
        { label: "Shindo", unit: undefined, value: 0x03, minimumCCVersion: 5 },
    ],
    [MultilevelSensorTypes["Seismic magnitude"]]: [
        { label: "Local", unit: undefined, value: 0x00, minimumCCVersion: 5 },
        { label: "Moment", unit: undefined, value: 0x01, minimumCCVersion: 5 },
        {
            label: "Surface wave",
            unit: undefined,
            value: 0x02,
            minimumCCVersion: 5,
        },
        {
            label: "Body wave",
            unit: undefined,
            value: 0x03,
            minimumCCVersion: 5,
        },
    ],
    [MultilevelSensorTypes.Ultraviolet]: [
        {
            label: "UV index",
            unit: undefined,
            value: 0x00,
            minimumCCVersion: 5,
        },
    ],
    [MultilevelSensorTypes["Electrical resistivity"]]: [
        { label: "Ohm meter", unit: "Ωm", value: 0x00, minimumCCVersion: 5 },
    ],
    [MultilevelSensorTypes["Electrical conductivity"]]: [
        {
            label: "Siemens per meter",
            unit: "S/m",
            value: 0x00,
            minimumCCVersion: 5,
        },
    ],
    [MultilevelSensorTypes.Loudness]: [
        { label: "Decibel", unit: "dB", value: 0x00, minimumCCVersion: 5 },
        {
            label: "A-weighted decibels",
            unit: "dBA",
            value: 0x01,
            minimumCCVersion: 5,
        },
    ],
    [MultilevelSensorTypes.Moisture]: [
        {
            label: "Percentage value",
            unit: "%",
            value: 0x00,
            minimumCCVersion: 5,
        },
        {
            label: "Volume water content",
            unit: "m3/m³",
            value: 0x01,
            minimumCCVersion: 5,
        },
        { label: "Impedance", unit: "kΩ", value: 0x02, minimumCCVersion: 5 },
        {
            label: "Water activity",
            unit: "aw",
            value: 0x03,
            minimumCCVersion: 5,
        },
    ],
    [MultilevelSensorTypes.Frequency]: [
        // MUST be used until 2.147483647 GHz
        { label: "Hertz", unit: "Hz", value: 0x00, minimumCCVersion: 6 },
        // MUST be used after 2.147483647 GHz
        { label: "Kilohertz", unit: "kHz", value: 0x01, minimumCCVersion: 6 },
    ],
    [MultilevelSensorTypes.Time]: [
        { label: "Second", unit: "s", value: 0x00, minimumCCVersion: 6 },
    ],
    [MultilevelSensorTypes["Target temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 6 },
        { label: "Fahrenheit", unit: "F", value: 0x01, minimumCCVersion: 6 },
    ],
    [MultilevelSensorTypes["Particulate Matter 2.5"]]: [
        {
            label: "Mole per cubic meter",
            unit: "mol/m³",
            value: 0x00,
            minimumCCVersion: 7,
        },
        {
            label: "Microgram per cubic meter",
            unit: "µg/m³",
            value: 0x01,
            minimumCCVersion: 7,
        },
    ],
    [MultilevelSensorTypes["Formaldehyde (CH2O) level"]]: [
        {
            label: "Mole per cubic meter",
            unit: "mol/m³",
            value: 0x00,
            minimumCCVersion: 7,
        },
    ],
    [MultilevelSensorTypes["Radon concentration"]]: [
        {
            label: "Becquerel per cubic meter",
            unit: "bq/m³",
            value: 0x00,
            minimumCCVersion: 7,
        },
        {
            label: "Picocuries per liter",
            unit: "pCi/l",
            value: 0x01,
            minimumCCVersion: 7,
        },
    ],
    [MultilevelSensorTypes["Methane (CH4) density"]]: [
        {
            label: "Mole per cubic meter",
            unit: "mol/m³",
            value: 0x00,
            minimumCCVersion: 7,
        },
    ],
    [MultilevelSensorTypes["Volatile Organic Compound level"]]: [
        {
            label: "Mole per cubic meter",
            unit: "mol/m³",
            value: 0x00,
            minimumCCVersion: 7,
        },
        {
            label: "Parts/million",
            unit: "ppm",
            value: 0x01,
            minimumCCVersion: 10,
        },
    ],
    [MultilevelSensorTypes["Carbon monoxide (CO) level"]]: [
        {
            label: "Mole per cubic meter",
            unit: "mol/m³",
            value: 0x00,
            minimumCCVersion: 7,
        },
        {
            label: "Parts/million",
            unit: "ppm",
            value: 0x01,
            minimumCCVersion: 10,
        },
    ],
    [MultilevelSensorTypes["Soil humidity"]]: [
        {
            label: "Percentage value",
            unit: "%",
            value: 0x00,
            minimumCCVersion: 7,
        },
    ],
    [MultilevelSensorTypes["Soil reactivity"]]: [
        { label: "Acidity", unit: "pH", value: 0x00, minimumCCVersion: 7 },
    ],
    [MultilevelSensorTypes["Soil salinity"]]: [
        {
            label: "Mole per cubic meter",
            unit: "mol/m³",
            value: 0x00,
            minimumCCVersion: 7,
        },
    ],
    [MultilevelSensorTypes["Heart rate"]]: [
        {
            label: "Beats per minute",
            unit: "bpm",
            value: 0x00,
            minimumCCVersion: 7,
        },
    ],
    [MultilevelSensorTypes["Blood pressure"]]: [
        { label: "Systolic", unit: "mmHg", value: 0x00, minimumCCVersion: 7 },
        { label: "Diastolic", unit: "mmHg", value: 0x01, minimumCCVersion: 7 },
    ],
    [MultilevelSensorTypes["Muscle mass"]]: [
        { label: "Kilogram", unit: "kg", value: 0x00, minimumCCVersion: 7 },
    ],
    [MultilevelSensorTypes["Fat mass"]]: [
        { label: "Kilogram", unit: "kg", value: 0x00, minimumCCVersion: 7 },
    ],
    [MultilevelSensorTypes["Bone mass"]]: [
        { label: "Kilogram", unit: "kg", value: 0x00, minimumCCVersion: 7 },
    ],
    [MultilevelSensorTypes["Total body water (TBW)"]]: [
        { label: "Kilogram", unit: "kg", value: 0x00, minimumCCVersion: 7 },
    ],
    [MultilevelSensorTypes["Basis metabolic rate (BMR)"]]: [
        { label: "Joule", unit: "J", value: 0x00, minimumCCVersion: 7 },
    ],
    [MultilevelSensorTypes["Body Mass Index (BMI)"]]: [
        {
            label: "Body Mass Index",
            unit: undefined,
            value: 0x00,
            minimumCCVersion: 7,
        },
    ],
    [MultilevelSensorTypes["Acceleration X-axis"]]: [
        {
            label: "Meter per square second",
            unit: "m/s2",
            value: 0x00,
            minimumCCVersion: 8,
        },
    ],
    [MultilevelSensorTypes["Acceleration Y-axis"]]: [
        {
            label: "Meter per square second",
            unit: "m/s2",
            value: 0x00,
            minimumCCVersion: 8,
        },
    ],
    [MultilevelSensorTypes["Acceleration Z-axis"]]: [
        {
            label: "Meter per square second",
            unit: "m/s2",
            value: 0x00,
            minimumCCVersion: 8,
        },
    ],
    [MultilevelSensorTypes["Smoke density"]]: [
        {
            label: "Percentage value",
            unit: "%",
            value: 0x00,
            minimumCCVersion: 8,
        },
    ],
    [MultilevelSensorTypes["Water flow"]]: [
        {
            label: "Liter per hour",
            unit: "l/h",
            value: 0x00,
            minimumCCVersion: 9,
        },
    ],
    [MultilevelSensorTypes["Water pressure"]]: [
        { label: "Kilopascal", unit: "kPa", value: 0x00, minimumCCVersion: 9 },
    ],
    [MultilevelSensorTypes["RF signal strength"]]: [
        { label: "RSSI", unit: "%", value: 0x00, minimumCCVersion: 9 },
        { label: "Power Level", unit: "dBm", value: 0x01, minimumCCVersion: 9 },
    ],
    [MultilevelSensorTypes["Particulate Matter 10"]]: [
        {
            label: "Mole per cubic meter",
            unit: "mol/m³",
            value: 0x00,
            minimumCCVersion: 10,
        },
        {
            label: "Microgram per cubic meter",
            unit: "µg/m³",
            value: 0x01,
            minimumCCVersion: 10,
        },
    ],
    [MultilevelSensorTypes["Respiratory rate"]]: [
        {
            label: "Breaths per minute",
            unit: "bpm",
            value: 0x00,
            minimumCCVersion: 10,
        },
    ],
    [MultilevelSensorTypes["Relative Modulation level"]]: [
        {
            label: "Percentage value",
            unit: "%",
            value: 0x00,
            minimumCCVersion: 11,
        },
    ],
    [MultilevelSensorTypes["Boiler water temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Domestic Hot Water (DHW) temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Outside temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Exhaust temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Water Chlorine level"]]: [
        {
            label: "Milligram per liter",
            unit: "mg/l",
            value: 0x00,
            minimumCCVersion: 11,
        },
    ],
    [MultilevelSensorTypes["Water acidity"]]: [
        { label: "Acidity", unit: "pH", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Water Oxidation reduction potential"]]: [
        { label: "Millivolt", unit: "mV", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Heart Rate LF/HF ratio"]]: [
        {
            label: "Unitless",
            unit: undefined,
            value: 0x00,
            minimumCCVersion: 11,
        },
    ],
    [MultilevelSensorTypes["Motion Direction"]]: [
        // 0 = no motion detected, 90 = east, 180 = south, 270 = west and 360 = north
        { label: "Degrees", unit: "°", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Applied force on the sensor"]]: [
        { label: "Newton", unit: "N", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Return Air temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Supply Air temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Condenser Coil temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Evaporator Coil temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Liquid Line temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Discharge Line temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Suction Pressure"]]: [
        { label: "Kilopascal", unit: "kPa", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Discharge Pressure"]]: [
        { label: "Kilopascal", unit: "kPa", value: 0x00, minimumCCVersion: 11 },
    ],
    [MultilevelSensorTypes["Defrost temperature"]]: [
        { label: "Celcius", unit: "°C", value: 0x00, minimumCCVersion: 11 },
    ],
};
/** Looks up a scale definition for a given sensor type */
function getScale(sensorType, scale) {
    const dict = multilevelSensorScales[sensorType];
    const ret = dict && dict.find(scl => scl.value === scale);
    if (ret)
        return ret;
    return {
        unit: undefined,
        label: "Unknown",
        value: scale,
        minimumCCVersion: 0,
    };
}
exports.getScale = getScale;
