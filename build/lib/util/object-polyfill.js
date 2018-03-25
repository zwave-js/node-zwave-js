"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function entries(obj) {
    return Object.keys(obj)
        .map(key => [key, obj[key]]);
}
exports.entries = entries;
function values(obj) {
    return Object.keys(obj)
        .map(key => obj[key]);
}
exports.values = values;
function filter(obj, predicate) {
    const ret = {};
    for (const [key, val] of entries(obj)) {
        if (predicate(val))
            ret[key] = val;
    }
    return ret;
}
exports.filter = filter;
function composeObject(properties) {
    return properties.reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
    }, {});
}
exports.composeObject = composeObject;
