"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const math_1 = require("alcalzone-shared/math");
const objects_1 = require("alcalzone-shared/objects");
exports.setbackSpecialStateValues = {
    "Frost Protection": 0x79,
    "Energy Saving": 0x7a,
    Unused: 0x7f,
};
/** Encodes a setback state to use in a ThermostatSetbackCC */
function encodeSetbackState(state) {
    if (typeof state === "string")
        return exports.setbackSpecialStateValues[state];
    state = math_1.clamp(state, -12.8, 12);
    return Math.round(state * 10);
}
exports.encodeSetbackState = encodeSetbackState;
/** Decodes a setback state used in a ThermostatSetbackCC */
function decodeSetbackState(val) {
    if (val > 120) {
        // Special state, try to look it up
        const foundEntry = objects_1.entries(exports.setbackSpecialStateValues).find(([, v]) => val === v);
        if (!foundEntry)
            return;
        return foundEntry[0];
    }
    else {
        return val / 10;
    }
}
exports.decodeSetbackState = decodeSetbackState;
