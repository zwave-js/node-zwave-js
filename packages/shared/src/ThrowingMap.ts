export type ThrowingMap<K, V> = Map<K, V> & { getOrThrow(key: K): V };
export type ReadonlyThrowingMap<K, V> = ReadonlyMap<K, V> & {
	getOrThrow(key: K): V;
};

/**
 * Creates a map which throws when trying to access a non-existent key.
 * @param throwKeyNotFound Will be called when a non-existent key is accessed. Must throw an error.
 */
export function createThrowingMap<K, V>(
	throwKeyNotFound?: (key: K) => never,
): ThrowingMap<K, V> {
	const map = new Map<K, V>() as ThrowingMap<K, V>;
	map.getOrThrow = function (this: Map<K, V>, key: K) {
		if (!this.has(key)) {
			if (typeof throwKeyNotFound === "function") {
				throwKeyNotFound(key);
			} else {
				throw new Error(
					`Tried to access non-existent key ${String(key)}`,
				);
			}
		}
		return this.get(key)!;
	}.bind(map);
	return map;
}
