/// <reference types="node" />
import { Notification, NotificationValueDefinition } from "@zwave-js/config";
import { CommandClasses, Duration, IZWaveNode, Maybe, MessageOrCCLogEntry, SinglecastCC, SupervisionResult, ValueMetadataNumeric } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { NotificationCommand } from "../lib/_Types";
export declare const NotificationCCValues: Readonly<{
    notificationVariable: ((notificationName: string, variableName: string) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Notification;
            readonly endpoint: number;
            readonly property: string;
            readonly propertyKey: string;
        };
        readonly id: {
            commandClass: CommandClasses.Notification;
            property: string;
            propertyKey: string;
        };
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    unknownNotificationVariable: ((notificationType: number, notificationName: string) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Notification;
            readonly endpoint: number;
            readonly property: string;
            readonly propertyKey: "unknown";
        };
        readonly id: {
            commandClass: CommandClasses.Notification;
            property: string;
            propertyKey: "unknown";
        };
        readonly meta: {
            readonly label: `${string}: Unknown value`;
            readonly ccSpecific: {
                readonly notificationType: number;
            };
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    unknownNotificationType: ((notificationType: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Notification;
            readonly endpoint: number;
            readonly property: string;
        };
        readonly id: {
            commandClass: CommandClasses.Notification;
            property: string;
        };
        readonly meta: {
            readonly label: `Unknown notification (${string})`;
            readonly ccSpecific: {
                readonly notificationType: number;
            };
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    supportedNotificationEvents: ((notificationType: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Notification;
            readonly endpoint: number;
            readonly property: "supportedNotificationEvents";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: CommandClasses.Notification;
            property: "supportedNotificationEvents";
            propertyKey: number;
        };
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly internal: true;
            readonly supportsEndpoints: false;
        };
    };
    alarmLevel: {
        readonly id: {
            commandClass: CommandClasses.Notification;
            property: "alarmLevel";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Notification;
            readonly endpoint: number;
            readonly property: "alarmLevel";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Alarm Level";
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    alarmType: {
        readonly id: {
            commandClass: CommandClasses.Notification;
            property: "alarmType";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Notification;
            readonly endpoint: number;
            readonly property: "alarmType";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Alarm Type";
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    lastRefresh: {
        readonly id: {
            commandClass: CommandClasses.Notification;
            property: "lastRefresh";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Notification;
            readonly endpoint: number;
            readonly property: "lastRefresh";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    notificationMode: {
        readonly id: {
            commandClass: CommandClasses.Notification;
            property: "notificationMode";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Notification;
            readonly endpoint: number;
            readonly property: "notificationMode";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly internal: true;
            readonly supportsEndpoints: false;
        };
    };
    supportedNotificationTypes: {
        readonly id: {
            commandClass: CommandClasses.Notification;
            property: "supportedNotificationTypes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Notification;
            readonly endpoint: number;
            readonly property: "supportedNotificationTypes";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly internal: true;
            readonly supportsEndpoints: false;
        };
    };
    supportsV1Alarm: {
        readonly id: {
            commandClass: CommandClasses.Notification;
            property: "supportsV1Alarm";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Notification;
            readonly endpoint: number;
            readonly property: "supportsV1Alarm";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly internal: true;
            readonly supportsEndpoints: false;
        };
    };
}>;
export declare class NotificationCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: NotificationCommand): Maybe<boolean>;
    sendReport(options: NotificationCCReportOptions): Promise<SupervisionResult | undefined>;
    get(options: NotificationCCGetSpecificOptions): Promise<Pick<NotificationCCReport, "sequenceNumber" | "alarmLevel" | "notificationEvent" | "eventParameters" | "notificationStatus" | "zensorNetSourceNodeId"> | undefined>;
    set(notificationType: number, notificationStatus: boolean): Promise<SupervisionResult | undefined>;
    getSupported(): Promise<Pick<NotificationCCSupportedReport, "supportsV1Alarm" | "supportedNotificationTypes"> | undefined>;
    getSupportedEvents(notificationType: number): Promise<readonly number[] | undefined>;
}
export declare function getNotificationStateValueWithEnum(stateValue: number, enumValue: number): number;
/**
 * Returns the metadata to use for a known notification value.
 * Can be used to extend a previously defined metadata,
 * e.g. for V2 notifications that don't allow discovering supported events.
 */
export declare function getNotificationValueMetadata(previous: ValueMetadataNumeric | undefined, notificationConfig: Notification, valueConfig: NotificationValueDefinition & {
    type: "state";
}): ValueMetadataNumeric;
export declare class NotificationCC extends CommandClass {
    ccCommand: NotificationCommand;
    determineRequiredCCInterviews(): readonly CommandClasses[];
    private determineNotificationMode;
    /** Whether the node implements push or pull notifications */
    static getNotificationMode(applHost: ZWaveApplicationHost, node: IZWaveNode): "push" | "pull" | undefined;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    shouldRefreshValues(this: SinglecastCC<this>, applHost: ZWaveApplicationHost): boolean;
}
interface NotificationCCSetOptions extends CCCommandOptions {
    notificationType: number;
    notificationStatus: boolean;
}
export declare class NotificationCCSet extends NotificationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | NotificationCCSetOptions);
    notificationType: number;
    notificationStatus: boolean;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export type NotificationCCReportOptions = {
    alarmType: number;
    alarmLevel: number;
} | {
    notificationType: number;
    notificationEvent: number;
    eventParameters?: Buffer;
    sequenceNumber?: number;
};
export declare class NotificationCCReport extends NotificationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (NotificationCCReportOptions & CCCommandOptions));
    persistValues(applHost: ZWaveApplicationHost): boolean;
    alarmType: number | undefined;
    alarmLevel: number | undefined;
    notificationType: number | undefined;
    notificationStatus: boolean | number | undefined;
    notificationEvent: number | undefined;
    readonly zensorNetSourceNodeId: number | undefined;
    eventParameters: Buffer | Duration | Record<string, number> | number | undefined;
    sequenceNumber: number | undefined;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
    private parseEventParameters;
    serialize(): Buffer;
}
type NotificationCCGetSpecificOptions = {
    alarmType: number;
} | {
    notificationType: number;
    notificationEvent?: number;
};
type NotificationCCGetOptions = CCCommandOptions & NotificationCCGetSpecificOptions;
export declare class NotificationCCGet extends NotificationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | NotificationCCGetOptions);
    /** Proprietary V1/V2 alarm type */
    alarmType: number | undefined;
    /** Regulated V3+ notification type */
    notificationType: number | undefined;
    notificationEvent: number | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export interface NotificationCCSupportedReportOptions extends CCCommandOptions {
    supportsV1Alarm: boolean;
    supportedNotificationTypes: number[];
}
export declare class NotificationCCSupportedReport extends NotificationCC {
    constructor(host: ZWaveHost, options: NotificationCCSupportedReportOptions | CommandClassDeserializationOptions);
    supportsV1Alarm: boolean;
    supportedNotificationTypes: number[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class NotificationCCSupportedGet extends NotificationCC {
}
export interface NotificationCCEventSupportedReportOptions extends CCCommandOptions {
    notificationType: number;
    supportedEvents: number[];
}
export declare class NotificationCCEventSupportedReport extends NotificationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | NotificationCCEventSupportedReportOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    notificationType: number;
    supportedEvents: number[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface NotificationCCEventSupportedGetOptions extends CCCommandOptions {
    notificationType: number;
}
export declare class NotificationCCEventSupportedGet extends NotificationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | NotificationCCEventSupportedGetOptions);
    notificationType: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=NotificationCC.d.ts.map