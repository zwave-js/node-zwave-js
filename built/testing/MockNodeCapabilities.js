"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultMockEndpointCapabilities = exports.getDefaultMockNodeCapabilities = void 0;
const core_1 = require("@zwave-js/core");
function getDefaultMockNodeCapabilities() {
    return {
        firmwareVersion: "1.0",
        manufacturerId: 0xffff,
        productType: 0xffff,
        productId: 0xfffe,
        isListening: true,
        isFrequentListening: false,
        isRouting: true,
        supportedDataRates: [9600, 40000, 100000],
        protocolVersion: 3,
        optionalFunctionality: true,
        nodeType: core_1.NodeType["End Node"],
        supportsSecurity: false,
        supportsBeaming: true,
        basicDeviceClass: 0x04,
        genericDeviceClass: 0x06,
        specificDeviceClass: 0x01,
        txDelay: 10,
    };
}
exports.getDefaultMockNodeCapabilities = getDefaultMockNodeCapabilities;
function getDefaultMockEndpointCapabilities(nodeCaps) {
    return {
        genericDeviceClass: nodeCaps.genericDeviceClass,
        specificDeviceClass: nodeCaps.specificDeviceClass,
    };
}
exports.getDefaultMockEndpointCapabilities = getDefaultMockEndpointCapabilities;
//# sourceMappingURL=MockNodeCapabilities.js.map