"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const CommandClasses_1 = require("../commandclass/CommandClasses");
const DeviceClass_1 = require("./DeviceClass");
function parseNodeUpdatePayload(nif) {
    return Object.assign({ nodeId: nif[0], 
        // length is byte 1
        basic: nif[2] }, internalParseNodeInformationFrame(nif.slice(3)));
}
exports.parseNodeUpdatePayload = parseNodeUpdatePayload;
function internalParseNodeInformationFrame(nif) {
    const ret = {
        generic: DeviceClass_1.GenericDeviceClass.get(nif[0]),
        specific: DeviceClass_1.SpecificDeviceClass.get(nif[0], nif[1]),
        supportedCCs: [],
        controlledCCs: [],
    };
    // split the CCs into supported/controlled
    // TODO: Support 16bit CCs
    // tslint:disable-next-line:variable-name
    const CCs = [...nif.slice(2)];
    let isAfterMark = false;
    for (const cc of CCs) {
        // CCs before the support/control mark are supported
        // CCs after the support/control mark are controlled
        if (cc === CommandClasses_1.CommandClasses["Support/Control Mark"]) {
            isAfterMark = true;
            continue;
        }
        (isAfterMark
            ? ret.controlledCCs
            : ret.supportedCCs).push(cc);
    }
    return ret;
}
function parseNodeInformationFrame(nif) {
    const _a = internalParseNodeInformationFrame(nif), { controlledCCs } = _a, ret = __rest(_a, ["controlledCCs"]);
    return ret;
}
exports.parseNodeInformationFrame = parseNodeInformationFrame;
