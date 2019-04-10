/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { Duration } from "../values/Duration";
import { Maybe } from "../values/Primitive";
import { CommandClass } from "./CommandClass";
export declare enum MultilevelSwitchCommand {
    Set = 1,
    Get = 2,
    Report = 3,
    StartLevelChange = 4,
    StopLevelChange = 5,
    SupportedGet = 6,
    SupportedReport = 7
}
export declare enum LevelChangeDirection {
    "up" = 0,
    "down" = 1,
    "none" = 3
}
export declare enum SwitchType {
    "not supported" = 0,
    "Off/On" = 1,
    "Down/Up" = 2,
    "Close/Open" = 3,
    "CCW/CW" = 4,
    "Left/Right" = 5,
    "Reverse/Forward" = 6,
    "Pull/Push" = 7
}
export declare class MultilevelSwitchCC extends CommandClass {
    nodeId: number;
    ccCommand?: MultilevelSwitchCommand;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: MultilevelSwitchCommand.Get | MultilevelSwitchCommand.StopLevelChange | MultilevelSwitchCommand.SupportedGet);
    constructor(driver: IDriver, nodeId: number, ccCommand: MultilevelSwitchCommand.Set, targetValue: number, duration?: Duration);
    constructor(driver: IDriver, nodeId: number, ccCommand: MultilevelSwitchCommand.StartLevelChange, direction: keyof typeof LevelChangeDirection, ignoreStartLevel: boolean, startLevel: number, duration?: Duration, secondarySwitchDirection?: keyof typeof LevelChangeDirection);
    targetValue: number;
    duration: Duration;
    currentValue: Maybe<number>;
    ignoreStartLevel: boolean;
    startLevel: number;
    secondarySwitchStepSize: number;
    direction: keyof typeof LevelChangeDirection;
    secondarySwitchDirection: keyof typeof LevelChangeDirection;
    private _primarySwitchType;
    readonly primarySwitchType: SwitchType;
    private _secondarySwitchType;
    readonly secondarySwitchType: SwitchType;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
