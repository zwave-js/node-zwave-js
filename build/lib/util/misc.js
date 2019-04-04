"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Ensures that the values array is consecutive */
function isConsecutiveArray(values) {
    return values.every((v, i, arr) => i === 0 ? true : v - 1 === arr[i - 1]);
}
exports.isConsecutiveArray = isConsecutiveArray;
