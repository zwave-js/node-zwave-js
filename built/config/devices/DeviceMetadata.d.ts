import { type JSONObject } from "@zwave-js/shared/safe";
import { ConditionalItem } from "./ConditionalItem";
import { ConditionalPrimitive } from "./ConditionalPrimitive";
import type { DeviceID } from "./shared";
export declare class ConditionalDeviceMetadata implements ConditionalItem<DeviceMetadata> {
    constructor(filename: string, definition: JSONObject);
    readonly condition?: string;
    evaluateCondition(deviceId?: DeviceID): DeviceMetadata | undefined;
    /** How to wake up the device manually */
    readonly wakeup?: ConditionalPrimitive<string>;
    /** Inclusion instructions */
    readonly inclusion?: ConditionalPrimitive<string>;
    /** Exclusion instructions */
    readonly exclusion?: ConditionalPrimitive<string>;
    /** Instructions for resetting the device to factory defaults */
    readonly reset?: ConditionalPrimitive<string>;
    /** A link to the device manual */
    readonly manual?: ConditionalPrimitive<string>;
    /** Comments for this device */
    readonly comments?: ConditionalDeviceComment | ConditionalDeviceComment[];
}
export interface DeviceMetadata {
    wakeup?: string;
    inclusion?: string;
    exclusion?: string;
    reset?: string;
    manual?: string;
    comments?: DeviceComment | DeviceComment[];
}
export declare class ConditionalDeviceComment implements ConditionalItem<DeviceComment> {
    readonly level: DeviceComment["level"];
    readonly text: string;
    readonly condition?: string | undefined;
    constructor(level: DeviceComment["level"], text: string, condition?: string | undefined);
    evaluateCondition(deviceId?: DeviceID): DeviceComment | undefined;
}
export interface DeviceComment {
    level: "info" | "warning" | "error";
    text: string;
}
//# sourceMappingURL=DeviceMetadata.d.ts.map