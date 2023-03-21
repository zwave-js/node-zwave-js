"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createThrowingMap = void 0;
/**
 * Creates a map which throws when trying to access a non-existent key.
 * @param throwKeyNotFound Will be called when a non-existent key is accessed. Must throw an error.
 */
function createThrowingMap(throwKeyNotFound) {
    const map = new Map();
    map.getOrThrow = function (key) {
        if (!this.has(key)) {
            if (typeof throwKeyNotFound === "function") {
                throwKeyNotFound(key);
            }
            else {
                throw new Error(`Tried to access non-existent key ${String(key)}`);
            }
        }
        return this.get(key);
    }.bind(map);
    return map;
}
exports.createThrowingMap = createThrowingMap;
//# sourceMappingURL=ThrowingMap.js.map