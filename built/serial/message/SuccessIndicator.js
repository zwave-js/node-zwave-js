"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMultiStageCallback = exports.isSuccessIndicator = void 0;
function isSuccessIndicator(msg) {
    return typeof msg.isOK === "function";
}
exports.isSuccessIndicator = isSuccessIndicator;
function isMultiStageCallback(msg) {
    return typeof msg.isFinal === "function";
}
exports.isMultiStageCallback = isMultiStageCallback;
//# sourceMappingURL=SuccessIndicator.js.map