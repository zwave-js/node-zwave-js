"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CommandClass_1 = require("../commandclass/CommandClass");
const DeviceClass_1 = require("./DeviceClass");
function parseNodeInformation(nif) {
    const ret = {
        nodeId: nif[0],
        // length is byte 1
        basic: nif[2],
    };
    Object.assign(ret, parseEndpointInformation(nif.slice(3)));
    return ret;
}
exports.parseNodeInformation = parseNodeInformation;
function parseEndpointInformation(eif) {
    const ret = {
        generic: DeviceClass_1.GenericDeviceClass.get(eif[0]),
        specific: DeviceClass_1.SpecificDeviceClass.get(eif[0], eif[1]),
        supportedCCs: [],
        controlledCCs: [],
    };
    // split the CCs into supported/controlled
    // tslint:disable-next-line:variable-name
    const CCs = [...eif.slice(2)];
    let isAfterMark = false;
    for (const cc of CCs) {
        // CCs before the support/control mark are supported
        // CCs after the support/control mark are controlled
        if (cc === CommandClass_1.CommandClasses["Support/Control Mark"]) {
            isAfterMark = true;
            continue;
        }
        (isAfterMark
            ? ret.controlledCCs
            : ret.supportedCCs).push(cc);
    }
    return ret;
}
exports.parseEndpointInformation = parseEndpointInformation;
