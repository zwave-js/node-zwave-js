"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objects_1 = require("alcalzone-shared/objects");
const typeguards_1 = require("alcalzone-shared/typeguards");
function serializeCacheValue(value) {
    if (value instanceof Map) {
        return objects_1.composeObject([...value.entries()].map(([k, v]) => [k, serializeCacheValue(v)]));
    }
    else if (typeof value === "number" ||
        typeof value === "string" ||
        typeof value === "boolean" ||
        typeguards_1.isObject(value) ||
        typeguards_1.isArray(value)) {
        return value;
    }
}
exports.serializeCacheValue = serializeCacheValue;
