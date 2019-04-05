export declare type SerializedValue = number | string | boolean | Record<string, any>;
export interface CacheValue {
    value: SerializedValue;
    endpoint: number;
    propertyName: string;
}
export declare function serializeCacheValue(value: unknown): SerializedValue;
