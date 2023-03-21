import { JSONObject } from "@zwave-js/shared/safe";
export type MeterMap = ReadonlyMap<number, Meter>;
export declare class Meter {
    constructor(id: number, definition: JSONObject);
    readonly id: number;
    readonly name: string;
    readonly scales: ReadonlyMap<number, MeterScale>;
}
export declare class MeterScale {
    constructor(key: number, definition: string);
    readonly key: number;
    readonly label: string;
}
export declare function getDefaultMeterScale(scale: number): MeterScale;
//# sourceMappingURL=Meters.d.ts.map