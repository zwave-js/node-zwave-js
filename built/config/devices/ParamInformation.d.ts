import { type JSONObject } from "@zwave-js/shared/safe";
import { ConditionalItem } from "./ConditionalItem";
import type { ConditionalDeviceConfig } from "./DeviceConfig";
import type { DeviceID } from "./shared";
export declare class ConditionalParamInformation implements ConditionalItem<ParamInformation> {
    constructor(parent: ConditionalDeviceConfig, parameterNumber: number, valueBitMask: number | undefined, definition: JSONObject);
    private parent;
    readonly parameterNumber: number;
    readonly valueBitMask?: number;
    readonly label: string;
    readonly description?: string;
    readonly valueSize: number;
    readonly minValue?: number;
    readonly maxValue?: number;
    readonly unsigned?: boolean;
    readonly defaultValue: number;
    readonly unit?: string;
    readonly readOnly?: true;
    readonly writeOnly?: true;
    readonly allowManualEntry: boolean;
    readonly options: readonly ConditionalConfigOption[];
    readonly condition?: string;
    evaluateCondition(deviceId?: DeviceID): ParamInformation | undefined;
}
export type ParamInformation = Omit<ConditionalParamInformation, "condition" | "evaluateCondition" | "options" | "minValue" | "maxValue"> & {
    options: readonly ConfigOption[];
    minValue: NonNullable<ConditionalParamInformation["minValue"]>;
    maxValue: NonNullable<ConditionalParamInformation["maxValue"]>;
};
export declare class ConditionalConfigOption implements ConditionalItem<ConfigOption> {
    readonly value: number;
    readonly label: string;
    readonly condition?: string | undefined;
    constructor(value: number, label: string, condition?: string | undefined);
    evaluateCondition(deviceId?: DeviceID): ConfigOption | undefined;
}
export interface ConfigOption {
    value: number;
    label: string;
}
//# sourceMappingURL=ParamInformation.d.ts.map