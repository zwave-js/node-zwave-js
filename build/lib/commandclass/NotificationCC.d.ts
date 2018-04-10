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
export declare enum ZWaveAlarmType {
    General = 0,
    Smoke = 1,
    CarbonMonoxide = 2,
    CarbonDioxide = 3,
    Heat = 4,
    Flood = 5,
    AccessControl = 6,
    Burglar = 7,
    PowerManagement = 8,
    System = 9,
    Emergency = 10,
    Clock = 11,
    Appliance = 12,
    HomeHealth = 13,
}
export declare class NotificationCC extends CommandClass {
    nodeId: number;
    ccCommand: NotificationCommand;
    constructor(nodeId?: number);
    constructor(nodeId: number, ccCommand: NotificationCommand.Get, alarmType: number, zWaveAlarmType: ZWaveAlarmType);
    constructor(nodeId: number, ccCommand: NotificationCommand.Set, zWaveAlarmType: ZWaveAlarmType, zWaveAlarmStatus: number);
    constructor(nodeId: number, ccCommand: NotificationCommand.SupportedGet);
    alarmType: number;
    zWaveAlarmType: ZWaveAlarmType;
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
    readonly supportedZWaveAlarmTypes: ZWaveAlarmType[];
    serialize(): Buffer;
    deserialize(data: Buffer): void;
    toJSON(): Record<string, any>;
}
