import type { JsonlDB } from "@alcalzone/jsonl-db";

/** Wrapper class which allows storing a Map as an object in a JsonlDB */
export class CacheBackedMap<K extends string | number, V> implements Map<K, V> {
	constructor(
		private readonly cache: JsonlDB<any>,
		private readonly cacheKey: string,
		readonly numericKeys: boolean = false,
	) {
		const obj = this.cache.get(this.cacheKey) ?? {};
		let entries = Object.entries(obj) as unknown as [K, V][];
		if (numericKeys) {
			entries = entries.map(([key, value]) => [
				Number(key) as unknown as K,
				value,
			]);
		}
		this.map = new Map(entries);
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

	private save(): void {
		const obj = {} as Record<K, V>;
		this.map.forEach((value, key) => {
			obj[key] = value;
		});
		this.cache.set(this.cacheKey, obj);
	}

	clear(): void {
		this.map.clear();
		this.save();
	}
	delete(key: K): boolean {
		const ret = this.map.delete(key);
		if (ret) this.save();
		return ret;
	}
	set(key: K, value: V): this {
		this.map.set(key, value);
		this.save();
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

export interface FlatCacheBackedMapKeys<K extends string | number> {
	/** The common prefix all keys start with */
	prefix: string;
	/** Converts the internal key suffix to a string used in the underlying map */
	suffixSerializer: (suffix: K) => string;
	/** Converts the key suffix from the underlying map to the one used internally. Returns undefined if the suffix does not match a valid key. */
	suffixDeserializer: (suffix: string) => K | undefined;
}

/** Version of {@link CacheBackedMap} where each entry maps to a single cache entry */
export class FlatCacheBackedMap<K extends string | number, V>
	implements Map<K, V>
{
	constructor(
		private readonly cache: JsonlDB<any>,
		private readonly cacheKeys: FlatCacheBackedMapKeys<K>,
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
