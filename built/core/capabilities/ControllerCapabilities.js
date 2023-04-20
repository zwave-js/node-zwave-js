"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControllerCapabilityFlags = void 0;
var ControllerCapabilityFlags;
(function (ControllerCapabilityFlags) {
    ControllerCapabilityFlags[ControllerCapabilityFlags["Secondary"] = 1] = "Secondary";
    ControllerCapabilityFlags[ControllerCapabilityFlags["OnOtherNetwork"] = 2] = "OnOtherNetwork";
    ControllerCapabilityFlags[ControllerCapabilityFlags["SISPresent"] = 4] = "SISPresent";
    ControllerCapabilityFlags[ControllerCapabilityFlags["WasRealPrimary"] = 8] = "WasRealPrimary";
    ControllerCapabilityFlags[ControllerCapabilityFlags["SUC"] = 16] = "SUC";
    ControllerCapabilityFlags[ControllerCapabilityFlags["NoNodesIncluded"] = 32] = "NoNodesIncluded";
    // NVM backups indicate there is also a 0x40 flag, but no idea what it means
})(ControllerCapabilityFlags = exports.ControllerCapabilityFlags || (exports.ControllerCapabilityFlags = {}));
//# sourceMappingURL=ControllerCapabilities.js.map