import type { CommandClasses } from "../capabilities/CommandClasses";
import type { ValueMetadata } from "./Metadata";
/** Uniquely identifies to which CC, endpoint and property a value belongs to */
export interface ValueID {
    commandClass: CommandClasses;
    endpoint?: number;
    property: string | number;
    propertyKey?: string | number;
}
/** Extends the {@link ValueID} interface with human-readable labels */
export interface TranslatedValueID extends ValueID {
    commandClassName: string;
    propertyName?: string;
    propertyKeyName?: string;
}
export interface ValueUpdatedArgs extends ValueID {
    prevValue: unknown;
    newValue: unknown;
    /**
     * Whether this value update was caused by the driver itself or the node.
     * If not set, it is assumed that the value update was caused by the node.
     */
    source?: "driver" | "node";
}
export interface ValueAddedArgs extends ValueID {
    newValue: unknown;
}
export interface ValueRemovedArgs extends ValueID {
    prevValue: unknown;
}
export interface ValueNotificationArgs extends ValueID {
    value: unknown;
}
export interface MetadataUpdatedArgs extends ValueID {
    metadata: ValueMetadata | undefined;
}
export interface SetValueOptions {
    /** When this is true, no event will be emitted for the value change */
    noEvent?: boolean;
    /** When this is true, trying to set invalid value IDs will not throw an error */
    noThrow?: boolean;
    /**
     * When this is `false`, the value will not be stored and a `value notification` event will be emitted instead (implies `noEvent: false`).
     */
    stateful?: boolean;
    /** Allows defining the source of a value update */
    source?: ValueUpdatedArgs["source"];
    /** Whether the timestamp of the value should be updated. Default: `true` */
    updateTimestamp?: boolean;
}
//# sourceMappingURL=_Types.d.ts.map