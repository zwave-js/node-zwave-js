import type { CommandClasses, CommandClassInfo, ValueID } from "@zwave-js/core/safe";
import { JSONObject } from "@zwave-js/shared/safe";
import { ConditionalItem } from "./ConditionalItem";
import type { DeviceID } from "./shared";
export declare class ConditionalCompatConfig implements ConditionalItem<CompatConfig> {
    private valueIdRegex;
    constructor(filename: string, definition: JSONObject);
    readonly alarmMapping?: readonly CompatMapAlarm[];
    readonly addCCs?: ReadonlyMap<CommandClasses, CompatAddCC>;
    readonly removeCCs?: ReadonlyMap<CommandClasses, "*" | readonly number[]>;
    readonly disableBasicMapping?: boolean;
    readonly disableStrictEntryControlDataValidation?: boolean;
    readonly disableStrictMeasurementValidation?: boolean;
    readonly enableBasicSetMapping?: boolean;
    readonly forceNotificationIdleReset?: boolean;
    readonly forceSceneControllerGroupCount?: number;
    readonly manualValueRefreshDelayMs?: number;
    readonly mapRootReportsToEndpoint?: number;
    readonly overrideFloatEncoding?: {
        size?: number;
        precision?: number;
    };
    readonly preserveRootApplicationCCValueIDs?: boolean;
    readonly preserveEndpoints?: "*" | readonly number[];
    readonly removeEndpoints?: "*" | readonly number[];
    readonly reportTimeout?: number;
    readonly skipConfigurationNameQuery?: boolean;
    readonly skipConfigurationInfoQuery?: boolean;
    readonly treatBasicSetAsEvent?: boolean;
    readonly treatMultilevelSwitchSetAsEvent?: boolean;
    readonly treatDestinationEndpointAsSource?: boolean;
    readonly queryOnWakeup?: readonly [
        string,
        string,
        ...(string | number | boolean | Pick<ValueID, "property" | "propertyKey">)[]
    ][];
    readonly condition?: string | undefined;
    evaluateCondition(deviceId?: DeviceID): CompatConfig | undefined;
}
export type CompatConfig = Omit<ConditionalCompatConfig, "condition" | "evaluateCondition">;
export declare class CompatAddCC {
    constructor(filename: string, definition: JSONObject);
    readonly endpoints: ReadonlyMap<number, Partial<CommandClassInfo>>;
}
export interface CompatMapAlarmFrom {
    alarmType: number;
    alarmLevel?: number;
}
export interface CompatMapAlarmTo {
    notificationType: number;
    notificationEvent: number;
    eventParameters?: Record<string, number | "alarmLevel">;
}
export declare class CompatMapAlarm {
    constructor(filename: string, definition: JSONObject, index: number);
    readonly from: CompatMapAlarmFrom;
    readonly to: CompatMapAlarmTo;
}
//# sourceMappingURL=CompatConfig.d.ts.map