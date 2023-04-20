"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sliceMapValues = exports.setUnion = exports.setIntersection = exports.sliceSet = void 0;
function sliceSet(set) {
    const items = [];
    set.forEach((value) => items.push(value));
    return items;
}
exports.sliceSet = sliceSet;
function setIntersection(set1, set2) {
    return new Set(sliceSet(set1).filter((x) => set2.has(x)));
}
exports.setIntersection = setIntersection;
function setUnion(set1, set2) {
    return new Set([...sliceSet(set1), ...sliceSet(set2)]);
}
exports.setUnion = setUnion;
function sliceMapValues(map) {
    const items = [];
    map.forEach((value) => items.push(value));
    return items;
}
exports.sliceMapValues = sliceMapValues;
//# sourceMappingURL=utils.js.map