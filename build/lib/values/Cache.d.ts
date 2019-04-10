import { JSONObject } from "../util/misc";
export declare type SerializedValue = number | string | boolean | JSONObject;
export interface CacheValue {
    value: SerializedValue;
    endpoint: number;
    propertyName: string;
}
export declare function serializeCacheValue(value: unknown): SerializedValue;
