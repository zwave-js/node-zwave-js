"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultMockControllerCapabilities = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/serial/safe");
function getDefaultMockControllerCapabilities() {
    return {
        firmwareVersion: "1.0",
        manufacturerId: 0xffff,
        productType: 0xffff,
        productId: 0xfffe,
        supportedFunctionTypes: [
            safe_2.FunctionType.GetSerialApiInitData,
            safe_2.FunctionType.GetControllerCapabilities,
            safe_2.FunctionType.SendData,
            safe_2.FunctionType.SendDataMulticast,
            safe_2.FunctionType.GetControllerVersion,
            safe_2.FunctionType.GetControllerId,
            safe_2.FunctionType.GetNodeProtocolInfo,
            safe_2.FunctionType.RequestNodeInfo,
            safe_2.FunctionType.AssignSUCReturnRoute,
        ],
        controllerType: safe_1.ZWaveLibraryTypes["Static Controller"],
        libraryVersion: "Z-Wave 7.17.99",
        zwaveApiVersion: {
            kind: "legacy",
            version: 9,
        },
        isSecondary: false,
        isSISPresent: true,
        isStaticUpdateController: true,
        wasRealPrimary: true,
        isUsingHomeIdFromOtherNetwork: false,
        sucNodeId: 0,
        supportsTimers: false,
        zwaveChipType: {
            // EFR32ZG14 / ZGM130S
            type: 0x07,
            version: 0x00,
        },
        supportsLongRange: false,
        watchdogEnabled: false,
    };
}
exports.getDefaultMockControllerCapabilities = getDefaultMockControllerCapabilities;
//# sourceMappingURL=MockControllerCapabilities.js.map