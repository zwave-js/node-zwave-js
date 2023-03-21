export type ThrowingMap<K, V> = Map<K, V> & {
    getOrThrow(key: K): V;
};
export type ReadonlyThrowingMap<K, V> = ReadonlyMap<K, V> & {
    getOrThrow(key: K): V;
};
/**
 * Creates a map which throws when trying to access a non-existent key.
 * @param throwKeyNotFound Will be called when a non-existent key is accessed. Must throw an error.
 */
export declare function createThrowingMap<K, V>(throwKeyNotFound?: (key: K) => never): ThrowingMap<K, V>;
//# sourceMappingURL=ThrowingMap.d.ts.map