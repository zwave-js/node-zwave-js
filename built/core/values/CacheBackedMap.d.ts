import type { JsonlDB } from "@alcalzone/jsonl-db";
export interface CacheBackedMapKeys<K extends string | number> {
    /** The common prefix all keys start with */
    prefix: string;
    /** Converts the internal key suffix to a string used in the underlying map */
    suffixSerializer: (suffix: K) => string;
    /** Converts the key suffix from the underlying map to the one used internally. Returns undefined if the suffix does not match a valid key. */
    suffixDeserializer: (suffix: string) => K | undefined;
}
/** Wrapper class which allows storing a Map as a subset of a JsonlDB */
export declare class CacheBackedMap<K extends string | number, V> implements Map<K, V> {
    private readonly cache;
    private readonly cacheKeys;
    constructor(cache: JsonlDB<any>, cacheKeys: CacheBackedMapKeys<K>);
    private map;
    private keyToCacheKey;
    clear(): void;
    delete(key: K): boolean;
    set(key: K, value: V): this;
    get size(): number;
    get [Symbol.toStringTag](): string;
    forEach: (callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any) => void;
    get: (key: K) => V | undefined;
    has: (key: K) => boolean;
    entries: () => IterableIterator<[K, V]>;
    keys: () => IterableIterator<K>;
    values: () => IterableIterator<V>;
    [Symbol.iterator]: () => IterableIterator<[K, V]>;
}
//# sourceMappingURL=CacheBackedMap.d.ts.map