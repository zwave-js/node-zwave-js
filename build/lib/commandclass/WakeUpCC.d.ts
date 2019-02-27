/// <reference types="node" />
import { CommandClass } from "./CommandClass";
import { Driver } from "../driver/Driver";
export declare enum WakeUpCommand {
    IntervalSet = 4,
    IntervalGet = 5,
    IntervalReport = 6,
    WakeUpNotification = 7,
    NoMoreInformation = 8,
    IntervalCapabilitiesGet = 9,
    IntervalCapabilitiesReport = 10
}
export declare class WakeUpCC extends CommandClass {
    nodeId: number;
    wakeupCommand?: WakeUpCommand;
    wakeupInterval?: number;
    controllerNodeId?: number;
    constructor(driver: Driver, nodeId?: number);
    constructor(driver: Driver, nodeId: number, command: WakeUpCommand.IntervalSet, interval: number, controllerNodeId: number);
    constructor(driver: Driver, nodeId: number, command: WakeUpCommand.IntervalGet | WakeUpCommand.NoMoreInformation | WakeUpCommand.IntervalCapabilitiesGet);
    private _minWakeUpInterval;
    readonly minWakeUpInterval: number;
    private _maxWakeUpInterval;
    readonly maxWakeUpInterval: number;
    private _defaultWakeUpInterval;
    readonly defaultWakeUpInterval: number;
    private _wakeUpIntervalSteps;
    readonly wakeUpIntervalSteps: number;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
    isAwake(): boolean;
    setAwake(awake: boolean): void;
}
