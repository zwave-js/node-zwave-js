import type { JSONObject } from "@zwave-js/shared";
import type { ValueMetadata } from "./Metadata";
import type { ValueID } from "./_Types";
type SerializedValue = number | string | boolean | JSONObject | undefined;
export interface CacheValue extends Pick<ValueID, "endpoint" | "property" | "propertyKey"> {
    value: SerializedValue;
}
export interface CacheMetadata extends Pick<ValueID, "endpoint" | "property" | "propertyKey"> {
    metadata: ValueMetadata;
}
/** Serializes a value so it can be stored in a JSON object (and later on disk) */
export declare function serializeCacheValue(value: unknown): SerializedValue;
/** Deserializes a value that was serialized by serializeCacheValue */
export declare function deserializeCacheValue(value: SerializedValue): unknown;
export {};
//# sourceMappingURL=Cache.d.ts.map