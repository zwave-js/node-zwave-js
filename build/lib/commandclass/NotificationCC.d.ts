/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { JSONObject } from "../util/misc";
import { CommandClass } from "./CommandClass";
export declare enum NotificationCommand {
    EventSupportedGet = 1,
    EventSupportedReport = 2,
    Get = 4,
    Report = 5,
    Set = 6,
    SupportedGet = 7,
    SupportedReport = 8
}
export declare enum NotificationType {
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
    HomeHealth = 13
}
export declare class NotificationCC extends CommandClass {
    nodeId: number;
    ccCommand?: NotificationCommand;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: NotificationCommand.Get, alarmType: number, notificationType: NotificationType, notificationEvent?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: NotificationCommand.Set, notificationType: NotificationType, notificationStatus: boolean);
    constructor(driver: IDriver, nodeId: number, ccCommand: NotificationCommand.SupportedGet);
    /** Proprietary V1/V2 alarm type */
    alarmType: number;
    /** Regulated V3+ notification type */
    notificationType: NotificationType;
    notificationStatus: boolean;
    private _notificationEvent;
    readonly notificationEvent: number;
    private _alarmLevel;
    readonly alarmLevel: number;
    private _zensorNetSourceNodeId;
    readonly zensorNetSourceNodeId: number;
    private _eventParameters;
    readonly eventParameters: Buffer;
    private _supportsV1Alarm;
    readonly supportsV1Alarm: boolean;
    private _supportedNotificationTypes;
    readonly supportedNotificationTypes: NotificationType[];
    private _supportedEvents;
    readonly supportedEvents: Map<NotificationType, number[]>;
    private _sequenceNumber;
    readonly sequenceNumber: number;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
    toJSON(): JSONObject;
}
