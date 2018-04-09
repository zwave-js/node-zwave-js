/// <reference types="node" />
import { CommandClass } from "./CommandClass";
export declare enum NotificationCommand {
    EventSupportedGet = 1,
    EventSupportedReport = 2,
    Get = 4,
    Report = 5,
    Set = 6,
    SupportedGet = 7,
    SupportedReport = 8,
}
export declare class NotificationCC extends CommandClass {
    nodeId: number;
    ccCommand: NotificationCommand;
    constructor(nodeId?: number);
    constructor(nodeId: number, ccCommand: NotificationCommand.Get, alarmType: number, zWaveAlarmType: number);
    constructor(nodeId: number, ccCommand: NotificationCommand.Set, zWaveAlarmType: number, zWaveAlarmStatus: number);
    constructor(nodeId: number, ccCommand: NotificationCommand.SupportedGet);
    alarmType: number;
    zWaveAlarmType: number;
    zWaveAlarmStatus: number;
    private _zWaveAlarmEvent;
    readonly zWaveAlarmEvent: number;
    private _alarmLevel;
    readonly alarmLevel: number;
    private _zensorNetSourceNodeId;
    readonly zensorNetSourceNodeId: number;
    private _eventParameters;
    readonly eventParameters: number[];
    private _supportsV1Alarm;
    readonly supportsV1Alarm: boolean;
    private _supportedZWaveAlarmTypes;
    readonly supportedZWaveAlarmTypes: number[];
    serialize(): Buffer;
    deserialize(data: Buffer): void;
    toJSON(): Record<string, any>;
}
