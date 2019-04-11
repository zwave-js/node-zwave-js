/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { SetbackState } from "../values/SetbackState";
import { CommandClass } from "./CommandClass";
export declare enum ThermostatSetbackCommand {
    Set = 1,
    Get = 2,
    Report = 3
}
export declare enum SetbackType {
    None = 0,
    Temporary = 1,
    Permanent = 2
}
export declare class ThermostatSetbackCC extends CommandClass {
    nodeId: number;
    ccCommand?: ThermostatSetbackCommand;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: ThermostatSetbackCommand.Get);
    constructor(driver: IDriver, nodeId: number, ccCommand: ThermostatSetbackCommand.Set, setbackType: SetbackType, setbackState: SetbackState);
    setbackType: SetbackType;
    /** The offset from the setpoint in 0.1 Kelvin or a special mode */
    setbackState: SetbackState;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
