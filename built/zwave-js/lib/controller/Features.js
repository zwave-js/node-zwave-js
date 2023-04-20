"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minFeatureVersions = exports.ZWaveFeature = void 0;
/** A named list of Z-Wave features */
var ZWaveFeature;
(function (ZWaveFeature) {
    // Available starting with Z-Wave SDK 6.81
    ZWaveFeature[ZWaveFeature["SmartStart"] = 0] = "SmartStart";
})(ZWaveFeature = exports.ZWaveFeature || (exports.ZWaveFeature = {}));
exports.minFeatureVersions = {
    [ZWaveFeature.SmartStart]: "6.81",
};
//# sourceMappingURL=Features.js.map