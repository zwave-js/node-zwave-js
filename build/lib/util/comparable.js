"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isComparable(obj) {
    return obj.compareTo != null;
}
exports.isComparable = isComparable;
function compareNumberOrString(a, b) {
    return b > a ? 1 :
        b === a ? 0 :
            -1;
}
exports.compareNumberOrString = compareNumberOrString;
