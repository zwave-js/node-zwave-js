"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectKeyMap = void 0;
const objects_1 = require("alcalzone-shared/objects");
class ObjectKeyMap {
    constructor(entries, defaultKeyProps) {
        this._map = new Map();
        if (entries?.length) {
            for (const [key, value] of entries) {
                this.set(key, value);
            }
        }
        this.defaultKeyProps = defaultKeyProps;
    }
    has(key) {
        return this._map.has(this.keyToString(key));
    }
    get(key) {
        return this._map.get(this.keyToString(key));
    }
    set(key, value) {
        this._map.set(this.keyToString(key), value);
    }
    delete(key) {
        return this._map.delete(this.keyToString(key));
    }
    clear() {
        this._map.clear();
    }
    get size() {
        return this._map.size;
    }
    forEach(callbackfn) {
        this._map.forEach((value, keyAsString) => {
            callbackfn(value, JSON.parse(keyAsString), this);
        });
    }
    entries() {
        const map = this._map;
        return (function* () {
            const _entries = map.entries();
            let entry = _entries.next();
            while (!entry.done) {
                const objKey = JSON.parse(entry.value[0]);
                yield [objKey, entry.value[1]];
                entry = _entries.next();
            }
        })();
    }
    [Symbol.iterator]() {
        return this.entries();
    }
    keys() {
        const map = this._map;
        return (function* () {
            const _keys = map.entries();
            let key = _keys.next();
            while (!key.done) {
                const objKey = JSON.parse(key.value[0]);
                yield objKey;
                key = _keys.next();
            }
        })();
    }
    values() {
        return this._map.values();
    }
    keyToString(key) {
        const filledKey = { ...key };
        if (this.defaultKeyProps) {
            for (const [required, def] of Object.entries(this.defaultKeyProps)) {
                if (!(required in filledKey))
                    filledKey[required] = def;
            }
        }
        const _key = (0, objects_1.composeObject)((0, objects_1.entries)(filledKey)
            .filter(([, value]) => value != undefined)
            .sort(([keyA], [keyB]) => keyA > keyB ? 1 : keyA < keyB ? -1 : 0));
        return JSON.stringify(_key);
    }
}
exports.ObjectKeyMap = ObjectKeyMap;
//# sourceMappingURL=ObjectKeyMap.js.map