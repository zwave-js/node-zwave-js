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
    constructor(driver: IDriver, nodeId: number, ccCommand: MultilevelSensorCommand.GetSupportedScale, sensorType: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: MultilevelSensorCommand.Get, sensorType?: number, // TODO: Define sensor types
    scale?: number);
    sensorType: number;
    scale: number;
    value: number;
    private _supportedSensorTypes;
    readonly supportedSensorTypes: number[];
    private _supportedScales;
    readonly supportedScales: Map<number, number[]>;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
