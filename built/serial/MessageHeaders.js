"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XModemMessageHeaders = exports.MessageHeaders = void 0;
var MessageHeaders;
(function (MessageHeaders) {
    MessageHeaders[MessageHeaders["SOF"] = 1] = "SOF";
    MessageHeaders[MessageHeaders["ACK"] = 6] = "ACK";
    MessageHeaders[MessageHeaders["NAK"] = 21] = "NAK";
    MessageHeaders[MessageHeaders["CAN"] = 24] = "CAN";
})(MessageHeaders = exports.MessageHeaders || (exports.MessageHeaders = {}));
var XModemMessageHeaders;
(function (XModemMessageHeaders) {
    XModemMessageHeaders[XModemMessageHeaders["SOF"] = 1] = "SOF";
    XModemMessageHeaders[XModemMessageHeaders["EOT"] = 4] = "EOT";
    XModemMessageHeaders[XModemMessageHeaders["ACK"] = 6] = "ACK";
    XModemMessageHeaders[XModemMessageHeaders["NAK"] = 21] = "NAK";
    XModemMessageHeaders[XModemMessageHeaders["CAN"] = 24] = "CAN";
    XModemMessageHeaders[XModemMessageHeaders["C"] = 67] = "C";
})(XModemMessageHeaders = exports.XModemMessageHeaders || (exports.XModemMessageHeaders = {}));
//# sourceMappingURL=MessageHeaders.js.map