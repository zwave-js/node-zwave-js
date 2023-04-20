"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceClass = exports.ProtocolVersion = exports.ProtocolDataRate = exports.NODE_ID_MAX = exports.NODE_ID_BROADCAST = exports.NodeType = void 0;
var safe_1 = require("@zwave-js/core/safe");
Object.defineProperty(exports, "NodeType", { enumerable: true, get: function () { return safe_1.NodeType; } });
Object.defineProperty(exports, "NODE_ID_BROADCAST", { enumerable: true, get: function () { return safe_1.NODE_ID_BROADCAST; } });
Object.defineProperty(exports, "NODE_ID_MAX", { enumerable: true, get: function () { return safe_1.NODE_ID_MAX; } });
Object.defineProperty(exports, "ProtocolDataRate", { enumerable: true, get: function () { return safe_1.ProtocolDataRate; } });
Object.defineProperty(exports, "ProtocolVersion", { enumerable: true, get: function () { return safe_1.ProtocolVersion; } });
var DeviceClass_1 = require("./lib/node/DeviceClass");
Object.defineProperty(exports, "DeviceClass", { enumerable: true, get: function () { return DeviceClass_1.DeviceClass; } });
__exportStar(require("./lib/node/_Types"), exports);
//# sourceMappingURL=Node_safe.js.map