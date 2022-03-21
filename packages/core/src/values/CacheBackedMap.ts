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
export class CacheBackedMap<K extends string | number, V> implements Map<K, V> {
	constructor(
		private readonly cache: JsonlDB<any>,
		private readonly cacheKeys: CacheBackedMapKeys<K>,
	) {
		this.map = new Map();
		for (const [key, value] of this.cache.entries()) {
			if (key.startsWith(this.cacheKeys.prefix)) {
				const suffix = key.substring(this.cacheKeys.prefix.length);
				const suffixKey = this.cacheKeys.suffixDeserializer(suffix);
				if (suffixKey !== undefined) {
					this.map.set(suffixKey, value);
				}
			}
		}

		// Bind all map properties we can use directly
		this.forEach = this.map.forEach.bind(this.map);
		this.get = this.map.get.bind(this.map);
		this.has = this.map.has.bind(this.map);
		this.entries = this.map.entries.bind(this.map);
		this.keys = this.map.keys.bind(this.map);
		this.values = this.map.values.bind(this.map);
		this[Symbol.iterator] = this.map[Symbol.iterator].bind(this.map);
	}

	private map: Map<K, V>;
	private keyToCacheKey(key: K): string {
		return this.cacheKeys.prefix + this.cacheKeys.suffixSerializer(key);
	}

	clear(): void {
		for (const key of this.map.keys()) {
			this.cache.delete(this.keyToCacheKey(key));
		}
		this.map.clear();
	}

	delete(key: K): boolean {
		const ret = this.map.delete(key);
		if (ret) this.cache.delete(this.keyToCacheKey(key));
		return ret;
	}

	set(key: K, value: V): this {
		this.map.set(key, value);
		this.cache.set(this.keyToCacheKey(key), value);
		return this;
	}

	get size(): number {
		return this.map.size;
	}

	get [Symbol.toStringTag](): string {
		return "Map";
	}

	declare forEach: (
		callbackfn: (value: V, key: K, map: Map<K, V>) => void,
		thisArg?: any,
	) => void;
	declare get: (key: K) => V | undefined;
	declare has: (key: K) => boolean;
	declare entries: () => IterableIterator<[K, V]>;
	declare keys: () => IterableIterator<K>;
	declare values: () => IterableIterator<V>;
	declare [Symbol.iterator]: () => IterableIterator<[K, V]>;
}
