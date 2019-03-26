/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { CommandClass } from "./CommandClass";
export declare enum ThermostatSetpointCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    SupportedGet = 4,
    SupportedReport = 5,
    CapabilitiesGet = 9,
    CapabilitiesReport = 10
}
export declare enum ThermostatSetpointType {
    "N/A" = 0,
    "Heating" = 1,
    "Cooling" = 2,
    "Furnace" = 7,
    "Dry Air" = 8,
    "Moist Air" = 9,
    "Auto Changeover" = 10,
    "Energy Save Heating" = 11,
    "Energy Save Cooling" = 12,
    "Away Heating" = 13,
    "Away Cooling" = 14,
    "Full Power" = 15
}
export declare enum ThermostatSetpointScale {
    Celsius = 0,
    Fahrenheit = 1
}
export declare class ThermostatSetpointCC extends CommandClass {
    nodeId: number;
    ccCommand?: ThermostatSetpointCommand;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: ThermostatSetpointCommand.SupportedGet);
    constructor(driver: IDriver, nodeId: number, ccCommand: ThermostatSetpointCommand.Get | ThermostatSetpointCommand.CapabilitiesGet, setpointType: ThermostatSetpointType);
    constructor(driver: IDriver, nodeId: number, ccCommand: ThermostatSetpointCommand.Set, setpointType: ThermostatSetpointType, value: number);
    value: number;
    scale: ThermostatSetpointScale;
    minValue: number;
    maxValue: number;
    minValueScale: ThermostatSetpointScale;
    maxValueScale: ThermostatSetpointScale;
    setpointType: ThermostatSetpointType;
    supportedSetpointTypes: ThermostatSetpointType[];
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
