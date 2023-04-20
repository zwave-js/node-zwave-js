"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheBackedMap = void 0;
/** Wrapper class which allows storing a Map as a subset of a JsonlDB */
class CacheBackedMap {
    constructor(cache, cacheKeys) {
        this.cache = cache;
        this.cacheKeys = cacheKeys;
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
    keyToCacheKey(key) {
        return this.cacheKeys.prefix + this.cacheKeys.suffixSerializer(key);
    }
    clear() {
        for (const key of this.map.keys()) {
            this.cache.delete(this.keyToCacheKey(key));
        }
        this.map.clear();
    }
    delete(key) {
        const ret = this.map.delete(key);
        if (ret)
            this.cache.delete(this.keyToCacheKey(key));
        return ret;
    }
    set(key, value) {
        this.map.set(key, value);
        this.cache.set(this.keyToCacheKey(key), value);
        return this;
    }
    get size() {
        return this.map.size;
    }
    get [Symbol.toStringTag]() {
        return "Map";
    }
}
exports.CacheBackedMap = CacheBackedMap;
//# sourceMappingURL=CacheBackedMap.js.map