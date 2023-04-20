"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeIDType = exports.ZWaveLibraryTypes = void 0;
var safe_1 = require("@zwave-js/core/safe");
Object.defineProperty(exports, "ZWaveLibraryTypes", { enumerable: true, get: function () { return safe_1.ZWaveLibraryTypes; } });
var NodeIDType;
(function (NodeIDType) {
    NodeIDType[NodeIDType["Short"] = 1] = "Short";
    NodeIDType[NodeIDType["Long"] = 2] = "Long";
})(NodeIDType = exports.NodeIDType || (exports.NodeIDType = {}));
//# sourceMappingURL=_Types.js.map