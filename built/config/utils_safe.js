"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwInvalidConfig = exports.hexKeyRegex2Digits = exports.hexKeyRegex4Digits = exports.hexKeyRegexNDigits = void 0;
const safe_1 = require("@zwave-js/core/safe");
exports.hexKeyRegexNDigits = /^0x[a-f0-9]+$/;
exports.hexKeyRegex4Digits = /^0x[a-f0-9]{4}$/;
exports.hexKeyRegex2Digits = /^0x[a-f0-9]{2}$/;
function throwInvalidConfig(which, reason) {
    throw new safe_1.ZWaveError(`The ${which ? which + " " : ""}config file is malformed!` +
        (reason ? `\n${reason}` : ""), safe_1.ZWaveErrorCodes.Config_Invalid);
}
exports.throwInvalidConfig = throwInvalidConfig;
//# sourceMappingURL=utils_safe.js.map