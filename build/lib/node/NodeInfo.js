"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CommandClass_1 = require("../commandclass/CommandClass");
const DeviceClass_1 = require("./DeviceClass");
function parseNodeInformation(nif) {
    const ret = {
        nodeId: nif[0],
        // length is byte 1
        basic: nif[2],
        generic: DeviceClass_1.GenericDeviceClass.get(nif[3]),
        specific: DeviceClass_1.SpecificDeviceClass.get(nif[3], nif[4]),
        supportedCCs: [],
        controlledCCs: [],
    };
    // split the CCs into supported/controlled
    // tslint:disable-next-line:variable-name
    const CCs = [...nif.slice(5)];
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
exports.parseNodeInformation = parseNodeInformation;
