import { JSONObject } from "@zwave-js/shared/safe";
import { ConditionalItem } from "./ConditionalItem";
import type { DeviceID } from "./shared";
export declare class ConditionalAssociationConfig implements ConditionalItem<AssociationConfig> {
    constructor(filename: string, groupId: number, definition: JSONObject);
    readonly condition?: string;
    readonly groupId: number;
    readonly label: string;
    readonly description?: string;
    readonly maxNodes: number;
    /**
     * Whether this association group is used to report updates to the controller.
     * While Z-Wave+ defines a single lifeline, older devices may have multiple lifeline associations.
     */
    readonly isLifeline: boolean;
    /**
     * Controls the strategy of setting up lifeline associations:
     *
     * * `true` - Use a multi channel association (if possible)
     * * `false` - Use a node association (if possible)
     * * `"auto"` - Prefer node associations, fall back to multi channel associations
     */
    readonly multiChannel: boolean | "auto";
    evaluateCondition(deviceId?: DeviceID): AssociationConfig | undefined;
}
export type AssociationConfig = Omit<ConditionalAssociationConfig, "condition" | "evaluateCondition">;
//# sourceMappingURL=AssociationConfig.d.ts.map