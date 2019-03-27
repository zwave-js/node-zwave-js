"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SetbackState_1 = require("./SetbackState");
function decodeSwitchpoint(data) {
    return {
        hour: data[0] & 31,
        minute: data[1] & 63,
        state: SetbackState_1.decodeSetbackState(data[2]),
    };
}
exports.decodeSwitchpoint = decodeSwitchpoint;
function encodeSwitchpoint(point) {
    return Buffer.from([
        point.hour & 31,
        point.minute & 63,
        SetbackState_1.encodeSetbackState(point.state),
    ]);
}
exports.encodeSwitchpoint = encodeSwitchpoint;
