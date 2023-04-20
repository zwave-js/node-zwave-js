"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sdkVersionLte = exports.sdkVersionLt = exports.sdkVersionGte = exports.sdkVersionGt = exports.assertProvisioningEntry = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const typeguards_1 = require("alcalzone-shared/typeguards");
const semver_1 = __importDefault(require("semver"));
const Inclusion_1 = require("./Inclusion");
function assertProvisioningEntry(arg) {
    const fail = (why) => {
        throw new safe_1.ZWaveError(`Invalid provisioning entry: ${why}`, safe_1.ZWaveErrorCodes.Argument_Invalid);
    };
    if (!(0, typeguards_1.isObject)(arg))
        throw fail("not an object");
    if (typeof arg.dsk !== "string")
        throw fail("dsk must be a string");
    else if (!(0, safe_1.isValidDSK)(arg.dsk))
        throw fail("dsk does not have the correct format");
    if (arg.status != undefined &&
        (typeof arg.status !== "number" ||
            !(arg.status in Inclusion_1.ProvisioningEntryStatus))) {
        throw fail("status is not a ProvisioningEntryStatus");
    }
    if (!(0, typeguards_1.isArray)(arg.securityClasses)) {
        throw fail("securityClasses must be an array");
    }
    else if (!arg.securityClasses.every((sc) => typeof sc === "number" && sc in safe_1.SecurityClass)) {
        throw fail("securityClasses contains invalid entries");
    }
    if (arg.requestedSecurityClasses != undefined) {
        if (!(0, typeguards_1.isArray)(arg.requestedSecurityClasses)) {
            throw fail("requestedSecurityClasses must be an array");
        }
        else if (!arg.requestedSecurityClasses.every((sc) => typeof sc === "number" && sc in safe_1.SecurityClass)) {
            {
                throw fail("requestedSecurityClasses contains invalid entries");
            }
        }
    }
}
exports.assertProvisioningEntry = assertProvisioningEntry;
/** Checks if the SDK version is greater than the given one */
function sdkVersionGt(sdkVersion, compareVersion) {
    if (sdkVersion === undefined) {
        return undefined;
    }
    return semver_1.default.gt((0, safe_2.padVersion)(sdkVersion), (0, safe_2.padVersion)(compareVersion));
}
exports.sdkVersionGt = sdkVersionGt;
/** Checks if the SDK version is greater than or equal to the given one */
function sdkVersionGte(sdkVersion, compareVersion) {
    if (sdkVersion === undefined) {
        return undefined;
    }
    return semver_1.default.gte((0, safe_2.padVersion)(sdkVersion), (0, safe_2.padVersion)(compareVersion));
}
exports.sdkVersionGte = sdkVersionGte;
/** Checks if the SDK version is lower than the given one */
function sdkVersionLt(sdkVersion, compareVersion) {
    if (sdkVersion === undefined) {
        return undefined;
    }
    return semver_1.default.lt((0, safe_2.padVersion)(sdkVersion), (0, safe_2.padVersion)(compareVersion));
}
exports.sdkVersionLt = sdkVersionLt;
/** Checks if the SDK version is lower than or equal to the given one */
function sdkVersionLte(sdkVersion, compareVersion) {
    if (sdkVersion === undefined) {
        return undefined;
    }
    return semver_1.default.lte((0, safe_2.padVersion)(sdkVersion), (0, safe_2.padVersion)(compareVersion));
}
exports.sdkVersionLte = sdkVersionLte;
//# sourceMappingURL=utils.js.map