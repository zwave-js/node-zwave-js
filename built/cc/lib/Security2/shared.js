"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inclusionTimeouts = exports.KEXFailType = exports.ECDHProfiles = exports.KEXSchemes = void 0;
/** @publicAPI */
var KEXSchemes;
(function (KEXSchemes) {
    KEXSchemes[KEXSchemes["KEXScheme1"] = 1] = "KEXScheme1";
})(KEXSchemes = exports.KEXSchemes || (exports.KEXSchemes = {}));
/** @publicAPI */
var ECDHProfiles;
(function (ECDHProfiles) {
    ECDHProfiles[ECDHProfiles["Curve25519"] = 0] = "Curve25519";
})(ECDHProfiles = exports.ECDHProfiles || (exports.ECDHProfiles = {}));
/** @publicAPI */
var KEXFailType;
(function (KEXFailType) {
    KEXFailType[KEXFailType["NoKeyMatch"] = 1] = "NoKeyMatch";
    KEXFailType[KEXFailType["NoSupportedScheme"] = 2] = "NoSupportedScheme";
    KEXFailType[KEXFailType["NoSupportedCurve"] = 3] = "NoSupportedCurve";
    KEXFailType[KEXFailType["Decrypt"] = 5] = "Decrypt";
    KEXFailType[KEXFailType["BootstrappingCanceled"] = 6] = "BootstrappingCanceled";
    KEXFailType[KEXFailType["WrongSecurityLevel"] = 7] = "WrongSecurityLevel";
    KEXFailType[KEXFailType["KeyNotGranted"] = 8] = "KeyNotGranted";
    KEXFailType[KEXFailType["NoVerify"] = 9] = "NoVerify";
    KEXFailType[KEXFailType["DifferentKey"] = 10] = "DifferentKey";
})(KEXFailType = exports.KEXFailType || (exports.KEXFailType = {}));
/** @publicAPI */
exports.inclusionTimeouts = Object.freeze({
    TA1: 10000,
    TA2: 10000,
    TA3: 10000,
    TA4: 10000,
    TA5: 10000,
    TAI1: 240000,
    TAI2: 240000,
});
//# sourceMappingURL=shared.js.map