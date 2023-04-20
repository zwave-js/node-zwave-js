"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessage = void 0;
function getErrorMessage(e, includeStack) {
    if (e instanceof Error)
        return includeStack && e.stack ? e.stack : e.message;
    return String(e);
}
exports.getErrorMessage = getErrorMessage;
//# sourceMappingURL=errors.js.map