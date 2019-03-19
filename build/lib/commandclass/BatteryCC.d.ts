/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { CommandClass } from "./CommandClass";
export declare enum BatteryCommand {
    Get = 2,
    Report = 3
}
export declare class BatteryCC extends CommandClass {
    nodeId: number;
    ccCommand?: BatteryCommand;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: BatteryCommand.Get);
    level: number;
    isLow: boolean;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
