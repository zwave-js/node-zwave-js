import { JSONObject } from "@zwave-js/shared/safe";
import type { ConfigManager } from "./ConfigManager";
import { ScaleGroup } from "./Scales";
export type SensorTypeMap = ReadonlyMap<number, SensorType>;
export declare class SensorType {
    constructor(manager: ConfigManager, key: number, definition: JSONObject);
    readonly key: number;
    readonly label: string;
    readonly scales: ScaleGroup;
}
//# sourceMappingURL=SensorTypes.d.ts.map