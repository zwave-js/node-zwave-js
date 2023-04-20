export declare class ObjectKeyMap<TKey extends Record<string | number, any>, TValue> {
    constructor(entries?: [TKey, TValue][], defaultKeyProps?: Partial<TKey>);
    private _map;
    private defaultKeyProps;
    has(key: TKey): boolean;
    get(key: TKey): TValue | undefined;
    set(key: TKey, value: TValue): void;
    delete(key: TKey): boolean;
    clear(): void;
    get size(): number;
    forEach(callbackfn: (value: TValue, key: TKey, map: this) => void): void;
    entries(): IterableIterator<[TKey, TValue]>;
    [Symbol.iterator](): IterableIterator<[TKey, TValue]>;
    keys(): IterableIterator<TKey>;
    values(): IterableIterator<TValue>;
    private keyToString;
}
type PickSymbolIterator<T> = T extends {
    [Symbol.iterator]: infer V;
} ? T & {
    [Symbol.iterator]: V;
} : T;
export type ReadonlyObjectKeyMap<TKey extends Record<string | number, any>, TValue> = Pick<ObjectKeyMap<TKey, TValue>, "has" | "get" | "entries" | "keys" | "values" | "size"> & PickSymbolIterator<ObjectKeyMap<TKey, TValue>>;
export {};
//# sourceMappingURL=ObjectKeyMap.d.ts.map