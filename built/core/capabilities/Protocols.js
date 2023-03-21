"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolType = exports.protocolDataRateMask = exports.RouteProtocolDataRate = exports.protocolDataRateToString = exports.ProtocolDataRate = exports.ZWaveDataRate = exports.Protocols = void 0;
const safe_1 = require("@zwave-js/shared/safe");
var Protocols;
(function (Protocols) {
    Protocols[Protocols["ZWave"] = 0] = "ZWave";
    Protocols[Protocols["ZWaveLongRange"] = 1] = "ZWaveLongRange";
})(Protocols = exports.Protocols || (exports.Protocols = {}));
var ZWaveDataRate;
(function (ZWaveDataRate) {
    ZWaveDataRate[ZWaveDataRate["9k6"] = 1] = "9k6";
    ZWaveDataRate[ZWaveDataRate["40k"] = 2] = "40k";
    ZWaveDataRate[ZWaveDataRate["100k"] = 3] = "100k";
})(ZWaveDataRate = exports.ZWaveDataRate || (exports.ZWaveDataRate = {}));
var ProtocolDataRate;
(function (ProtocolDataRate) {
    ProtocolDataRate[ProtocolDataRate["ZWave_9k6"] = 1] = "ZWave_9k6";
    ProtocolDataRate[ProtocolDataRate["ZWave_40k"] = 2] = "ZWave_40k";
    ProtocolDataRate[ProtocolDataRate["ZWave_100k"] = 3] = "ZWave_100k";
    ProtocolDataRate[ProtocolDataRate["LongRange_100k"] = 4] = "LongRange_100k";
})(ProtocolDataRate = exports.ProtocolDataRate || (exports.ProtocolDataRate = {}));
function protocolDataRateToString(rate) {
    switch (rate) {
        case ProtocolDataRate.ZWave_9k6:
            return "Z-Wave, 9.6 kbit/s";
        case ProtocolDataRate.ZWave_40k:
            return "Z-Wave, 40 kbit/s";
        case ProtocolDataRate.ZWave_100k:
            return "Z-Wave, 100 kbit/s";
        case ProtocolDataRate.LongRange_100k:
            return "Z-Wave Long Range, 100 kbit/s";
    }
    return `Unknown (${(0, safe_1.num2hex)(rate)})`;
}
exports.protocolDataRateToString = protocolDataRateToString;
// Same as ProtocolDataRate, but with the ability to NOT specify a data rate
var RouteProtocolDataRate;
(function (RouteProtocolDataRate) {
    RouteProtocolDataRate[RouteProtocolDataRate["Unspecified"] = 0] = "Unspecified";
    RouteProtocolDataRate[RouteProtocolDataRate["ZWave_9k6"] = 1] = "ZWave_9k6";
    RouteProtocolDataRate[RouteProtocolDataRate["ZWave_40k"] = 2] = "ZWave_40k";
    RouteProtocolDataRate[RouteProtocolDataRate["ZWave_100k"] = 3] = "ZWave_100k";
    RouteProtocolDataRate[RouteProtocolDataRate["LongRange_100k"] = 4] = "LongRange_100k";
})(RouteProtocolDataRate = exports.RouteProtocolDataRate || (exports.RouteProtocolDataRate = {}));
exports.protocolDataRateMask = 0b111;
var ProtocolType;
(function (ProtocolType) {
    ProtocolType[ProtocolType["Z-Wave"] = 0] = "Z-Wave";
    ProtocolType[ProtocolType["Z-Wave AV"] = 1] = "Z-Wave AV";
    ProtocolType[ProtocolType["Z-Wave for IP"] = 2] = "Z-Wave for IP";
})(ProtocolType = exports.ProtocolType || (exports.ProtocolType = {}));
//# sourceMappingURL=Protocols.js.map