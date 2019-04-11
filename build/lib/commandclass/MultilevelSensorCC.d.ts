/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { CommandClass } from "./CommandClass";
export declare enum MultilevelSensorCommand {
    GetSupportedSensor = 1,
    SupportedSensorReport = 2,
    GetSupportedScale = 3,
    Get = 4,
    Report = 5,
    SupportedScaleReport = 6
}
export declare class MultilevelSensorCC extends CommandClass {
    nodeId: number;
    ccCommand?: MultilevelSensorCommand;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: MultilevelSensorCommand.GetSupportedSensor);
    constructor(driver: IDriver, nodeId: number, ccCommand: MultilevelSensorCommand.GetSupportedScale, sensorType: MultilevelSensorTypes);
    constructor(driver: IDriver, nodeId: number, ccCommand: MultilevelSensorCommand.Get, sensorType?: MultilevelSensorTypes, scale?: number);
    sensorType: MultilevelSensorTypes;
    scale: number;
    value: number;
    private _supportedSensorTypes;
    readonly supportedSensorTypes: MultilevelSensorTypes[];
    private _supportedScales;
    readonly supportedScales: Map<MultilevelSensorTypes, number[]>;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
export declare enum MultilevelSensorTypes {
    "Air temperature" = 1,
    "General purpose" = 2,
    "Illuminance" = 3,
    "Power" = 4,
    "Humidity" = 5,
    "Velocity" = 6,
    "Direction" = 7,
    "Atmospheric pressure" = 8,
    "Barometric pressure" = 9,
    "Solar radiation" = 10,
    "Dew point" = 11,
    "Rain rate" = 12,
    "Tide level" = 13,
    "Weight" = 14,
    "Voltage" = 15,
    "Current" = 16,
    "Carbon dioxide (CO2) level" = 17,
    "Air flow" = 18,
    "Tank capacity" = 19,
    "Distance" = 20,
    "Angle position" = 21,
    "Rotation" = 22,
    "Water temperature" = 23,
    "Soil temperature" = 24,
    "Seismic Intensity" = 25,
    "Seismic magnitude" = 26,
    "Ultraviolet" = 27,
    "Electrical resistivity" = 28,
    "Electrical conductivity" = 29,
    "Loudness" = 30,
    "Moisture" = 31,
    "Frequency" = 32,
    "Time" = 33,
    "Target temperature" = 34,
    "Particulate Matter 2.5" = 35,
    "Formaldehyde (CH2O) level" = 36,
    "Radon concentration" = 37,
    "Methane (CH4) density" = 38,
    "Volatile Organic Compound level" = 39,
    "Carbon monoxide (CO) level" = 40,
    "Soil humidity" = 41,
    "Soil reactivity" = 42,
    "Soil salinity" = 43,
    "Heart rate" = 44,
    "Blood pressure" = 45,
    "Muscle mass" = 46,
    "Fat mass" = 47,
    "Bone mass" = 48,
    "Total body water (TBW)" = 49,
    "Basis metabolic rate (BMR)" = 50,
    "Body Mass Index (BMI)" = 51,
    "Acceleration X-axis" = 52,
    "Acceleration Y-axis" = 53,
    "Acceleration Z-axis" = 54,
    "Smoke density" = 55,
    "Water flow" = 56,
    "Water pressure" = 57,
    "RF signal strength" = 58,
    "Particulate Matter 10" = 59,
    "Respiratory rate" = 60,
    "Relative Modulation level" = 61,
    "Boiler water temperature" = 62,
    "Domestic Hot Water (DHW) temperature" = 63,
    "Outside temperature" = 64,
    "Exhaust temperature" = 65,
    "Water Chlorine level" = 66,
    "Water acidity" = 67,
    "Water Oxidation reduction potential" = 68,
    "Heart Rate LF/HF ratio" = 69,
    "Motion Direction" = 70,
    "Applied force on the sensor" = 71,
    "Return Air temperature" = 72,
    "Supply Air temperature" = 73,
    "Condenser Coil temperature" = 74,
    "Evaporator Coil temperature" = 75,
    "Liquid Line temperature" = 76,
    "Discharge Line temperature" = 77,
    "Suction Pressure" = 78,
    "Discharge Pressure" = 79,
    "Defrost temperature" = 80
}
interface MultilevelSensorScale {
    unit: string | undefined;
    label: string;
    value: number;
    minimumCCVersion: number;
}
/** Looks up a scale definition for a given sensor type */
export declare function getScale(sensorType: MultilevelSensorTypes, scale: number): MultilevelSensorScale | undefined;
export {};
