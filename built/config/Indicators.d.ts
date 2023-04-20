import type { ValueType } from "@zwave-js/core/safe";
import { JSONObject } from "@zwave-js/shared/safe";
export type IndicatorMap = ReadonlyMap<number, string>;
export type IndicatorPropertiesMap = ReadonlyMap<number, IndicatorProperty>;
export declare class IndicatorProperty {
    constructor(id: number, definition: JSONObject);
    readonly id: number;
    readonly label: string;
    readonly description: string | undefined;
    readonly min: number | undefined;
    readonly max: number | undefined;
    readonly readonly: boolean | undefined;
    readonly type: ValueType | undefined;
}
//# sourceMappingURL=Indicators.d.ts.map