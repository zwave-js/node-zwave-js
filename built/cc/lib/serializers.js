"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeTimezone = exports.parseTimezone = exports.encodeSwitchpoint = exports.decodeSwitchpoint = exports.decodeSetbackState = exports.encodeSetbackState = exports.setbackSpecialStateValues = void 0;
const core_1 = require("@zwave-js/core");
const math_1 = require("alcalzone-shared/math");
exports.setbackSpecialStateValues = {
    "Frost Protection": 0x79,
    "Energy Saving": 0x7a,
    Unused: 0x7f,
};
/**
 * @publicAPI
 * Encodes a setback state to use in a ThermostatSetbackCC
 */
function encodeSetbackState(state) {
    if (typeof state === "string")
        return exports.setbackSpecialStateValues[state];
    state = (0, math_1.clamp)(state, -12.8, 12);
    return Math.round(state * 10);
}
exports.encodeSetbackState = encodeSetbackState;
/**
 * @publicAPI
 * Decodes a setback state used in a ThermostatSetbackCC
 */
function decodeSetbackState(val) {
    if (val > 120) {
        // Special state, try to look it up
        const foundEntry = Object.entries(exports.setbackSpecialStateValues).find(([, v]) => val === v);
        if (!foundEntry)
            return;
        return foundEntry[0];
    }
    else {
        return val / 10;
    }
}
exports.decodeSetbackState = decodeSetbackState;
/**
 * @publicAPI
 * Decodes a switch point used in a ClimateControlScheduleCC
 */
function decodeSwitchpoint(data) {
    return {
        hour: data[0] & 31,
        minute: data[1] & 63,
        state: decodeSetbackState(data[2]),
    };
}
exports.decodeSwitchpoint = decodeSwitchpoint;
/**
 * @publicAPI
 * Encodes a switch point to use in a ClimateControlScheduleCC
 */
function encodeSwitchpoint(point) {
    if (point.state == undefined)
        throw new core_1.ZWaveError("The given Switchpoint is not valid!", core_1.ZWaveErrorCodes.CC_Invalid);
    return Buffer.from([
        point.hour & 31,
        point.minute & 63,
        encodeSetbackState(point.state),
    ]);
}
exports.encodeSwitchpoint = encodeSwitchpoint;
/**
 * @publicAPI
 * Decodes timezone information used in time related CCs
 */
function parseTimezone(data) {
    const hourSign = !!(data[0] & 128);
    const hour = data[0] & 127;
    const minute = data[1];
    const standardOffset = (hourSign ? -1 : 1) * (hour * 60 + minute);
    const deltaSign = !!(data[2] & 128);
    const deltaMinutes = data[2] & 127;
    const dstOffset = standardOffset + (deltaSign ? -1 : 1) * deltaMinutes;
    return {
        standardOffset,
        dstOffset,
    };
}
exports.parseTimezone = parseTimezone;
/**
 * @publicAPI
 * Decodes timezone information used in time related CCs
 */
function encodeTimezone(tz) {
    if (Math.abs(tz.standardOffset) >= 24 * 60 ||
        Math.abs(tz.dstOffset) >= 24 * 60) {
        throw new core_1.ZWaveError("The given timezone is not valid!", core_1.ZWaveErrorCodes.CC_Invalid);
    }
    const minutes = Math.abs(tz.standardOffset) % 60;
    const hour = Math.floor(Math.abs(tz.standardOffset) / 60);
    const hourSign = tz.standardOffset < 0 ? 1 : 0;
    const delta = tz.dstOffset - tz.standardOffset;
    const deltaMinutes = Math.abs(delta);
    const deltaSign = delta < 0 ? 1 : 0;
    return Buffer.from([
        (hourSign << 7) | (hour & 127),
        minutes,
        (deltaSign << 7) | (deltaMinutes & 127),
    ]);
}
exports.encodeTimezone = encodeTimezone;
//# sourceMappingURL=serializers.js.map