import { JSONObject } from "@zwave-js/shared/safe";
export type ScaleGroup = ReadonlyMap<number, Scale> & {
    /** The name of the scale group if it is named */
    readonly name?: string;
};
export type NamedScalesGroupMap = ReadonlyMap<string, ScaleGroup>;
export declare function getDefaultScale(scale: number): Scale;
export declare class Scale {
    constructor(key: number, definition: JSONObject);
    readonly key: number;
    readonly unit: string | undefined;
    readonly label: string;
    readonly description: string | undefined;
}
//# sourceMappingURL=Scales.d.ts.map