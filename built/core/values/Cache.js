"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserializeCacheValue = exports.serializeCacheValue = void 0;
const objects_1 = require("alcalzone-shared/objects");
const typeguards_1 = require("alcalzone-shared/typeguards");
const Duration_1 = require("./Duration");
const SPECIAL_TYPE_KEY = "$$type$$";
/** Serializes a value so it can be stored in a JSON object (and later on disk) */
function serializeCacheValue(value) {
    if (value instanceof Map) {
        // We mark maps with a special key, so they can be detected by the deserialization routine
        return {
            ...(0, objects_1.composeObject)([...value.entries()].map(([k, v]) => [
                k,
                serializeCacheValue(v),
            ])),
            [SPECIAL_TYPE_KEY]: "map",
        };
    }
    else if (value instanceof Duration_1.Duration) {
        const valueAsJSON = value.toJSON();
        return {
            ...(typeof valueAsJSON === "string"
                ? { unit: valueAsJSON }
                : valueAsJSON),
            [SPECIAL_TYPE_KEY]: "duration",
        };
    }
    else if (Buffer.isBuffer(value)) {
        return {
            [SPECIAL_TYPE_KEY]: "buffer",
            data: value.toString("hex"),
        };
    }
    else if (typeof value === "number" ||
        typeof value === "string" ||
        typeof value === "boolean" ||
        (0, typeguards_1.isObject)(value) ||
        (0, typeguards_1.isArray)(value)) {
        return value;
    }
}
exports.serializeCacheValue = serializeCacheValue;
/** Deserializes a value that was serialized by serializeCacheValue */
function deserializeCacheValue(value) {
    if ((0, typeguards_1.isObject)(value)) {
        const specialType = value[SPECIAL_TYPE_KEY];
        // Convert objects which used to be a map back to a Map
        if (specialType === "map") {
            const { [SPECIAL_TYPE_KEY]: _, ...rest } = value;
            return new Map(Object.entries(rest)
                // We assume that all keys that resemble a number should be a number
                .map(([k, v]) => [/^\d+$/.test(k) ? parseInt(k, 10) : k, v])
                // recursively deserialize the value
                .map(([k, v]) => [k, deserializeCacheValue(v)]));
        }
        else if (specialType === "duration") {
            return new Duration_1.Duration(value.value ?? 1, value.unit);
        }
        else if (specialType === "buffer") {
            return Buffer.from(value.data, "hex");
        }
    }
    return value;
}
exports.deserializeCacheValue = deserializeCacheValue;
//# sourceMappingURL=Cache.js.map