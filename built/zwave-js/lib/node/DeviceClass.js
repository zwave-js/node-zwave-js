"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceClass = void 0;
const safe_1 = require("@zwave-js/core/safe");
class DeviceClass {
    constructor(configManager, basic, generic, specific) {
        this.basic = configManager.lookupBasicDeviceClass(basic);
        this.generic = configManager.lookupGenericDeviceClass(generic);
        this.specific = configManager.lookupSpecificDeviceClass(generic, specific);
        // The specific class' CCs include the generic class' CCs
        this._mandatorySupportedCCs = this.specific.supportedCCs;
        this._mandatoryControlledCCs = this.specific.controlledCCs;
    }
    get mandatorySupportedCCs() {
        return this._mandatorySupportedCCs;
    }
    get mandatoryControlledCCs() {
        return this._mandatoryControlledCCs;
    }
    toJSON() {
        return {
            basic: this.basic.label,
            generic: this.generic.label,
            specific: this.specific.label,
            mandatorySupportedCCs: this._mandatorySupportedCCs.map((cc) => safe_1.CommandClasses[cc]),
            mandatoryControlCCs: this._mandatoryControlledCCs.map((cc) => safe_1.CommandClasses[cc]),
        };
    }
}
exports.DeviceClass = DeviceClass;
//# sourceMappingURL=DeviceClass.js.map