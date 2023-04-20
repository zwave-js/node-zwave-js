"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNotificationEventPayload = void 0;
/**
 * Tests if the given message contains a CC
 */
function isNotificationEventPayload(msg) {
    return typeof msg.toNotificationEventParameters === "function";
}
exports.isNotificationEventPayload = isNotificationEventPayload;
//# sourceMappingURL=NotificationEventPayload.js.map