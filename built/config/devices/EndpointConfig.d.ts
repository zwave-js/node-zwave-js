import type { JSONObject } from "@zwave-js/shared/safe";
import { ConditionalAssociationConfig, type AssociationConfig } from "./AssociationConfig";
import { ConditionalItem } from "./ConditionalItem";
import type { DeviceID } from "./shared";
export declare class ConditionalEndpointConfig implements ConditionalItem<EndpointConfig> {
    constructor(filename: string, index: number, definition: JSONObject);
    readonly index: number;
    readonly associations?: ReadonlyMap<number, ConditionalAssociationConfig>;
    readonly condition?: string;
    readonly label?: string;
    evaluateCondition(deviceId?: DeviceID): EndpointConfig | undefined;
}
export type EndpointConfig = Omit<ConditionalEndpointConfig, "condition" | "evaluateCondition" | "associations"> & {
    associations?: Map<number, AssociationConfig> | undefined;
};
//# sourceMappingURL=EndpointConfig.d.ts.map