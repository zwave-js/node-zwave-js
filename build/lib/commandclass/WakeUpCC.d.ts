/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { ZWaveNode } from "../node/Node";
import { CommandClass } from "./CommandClass";
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
    ccCommand?: WakeUpCommand;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: WakeUpCommand.IntervalSet, interval: number, controllerNodeId: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: WakeUpCommand.IntervalGet | WakeUpCommand.NoMoreInformation | WakeUpCommand.IntervalCapabilitiesGet);
    wakeupInterval: number;
    controllerNodeId: number;
    minWakeUpInterval: number;
    maxWakeUpInterval: number;
    defaultWakeUpInterval: number;
    wakeUpIntervalSteps: number;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
    isAwake(): boolean;
    static isAwake(driver: IDriver, node: ZWaveNode): boolean;
    setAwake(awake: boolean): void;
    static setAwake(driver: IDriver, node: ZWaveNode, awake: boolean): void;
}
