/// <reference types="node" />
import type { Duration } from "@zwave-js/core";
import type { CommandClass } from "./CommandClass";
export interface NotificationEventPayload {
    toNotificationEventParameters(): Buffer | Duration | Record<string, number>;
}
/**
 * Tests if the given message contains a CC
 */
export declare function isNotificationEventPayload<T extends CommandClass>(msg: T): msg is T & NotificationEventPayload;
//# sourceMappingURL=NotificationEventPayload.d.ts.map