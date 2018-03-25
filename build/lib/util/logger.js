"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debugPackage = require("debug");
const _debug = debugPackage("zwave");
let customLogger;
function setCustomLogger(logger) {
    customLogger = logger;
}
exports.setCustomLogger = setCustomLogger;
function log(message, severity = "info") {
    function defaultLogger() {
        let prefix = "";
        if (severity !== "info") {
            prefix = `[${severity.toUpperCase()}] `;
        }
        _debug(`${prefix}${message}`);
    }
    (customLogger || defaultLogger)(message, severity);
}
exports.log = log;
