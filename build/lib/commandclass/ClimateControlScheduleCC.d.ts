/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { Switchpoint } from "../values/Switchpoint";
import { CommandClass } from "./CommandClass";
export declare enum ClimateControlScheduleCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    ChangedGet = 4,
    ChangedReport = 5,
    OverrideSet = 6,
    OverrideGet = 7,
    OverrideReport = 8
}
export declare enum Weekday {
    Monday = 1,
    Tuesday = 2,
    Wednesday = 3,
    Thursday = 4,
    Friday = 5,
    Saturday = 6,
    Sunday = 7
}
export declare class ClimateControlScheduleCC extends CommandClass {
    nodeId: number;
    ccCommand?: ClimateControlScheduleCommand;
    constructor(driver: IDriver, nodeId?: number);
    weekday: Weekday;
    switchPoints: Switchpoint[];
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
