"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throttlePresets = void 0;
exports.throttlePresets = {
    slow: {
        autoCompress: {
            intervalMs: 60 * 60000,
            intervalMinChanges: 100,
            sizeFactor: 3,
            sizeFactorMinimumSize: 100,
        },
        throttleFS: {
            intervalMs: 5 * 60000,
            maxBufferedCommands: 500, // or after 500 changes
        },
    },
    normal: {
        autoCompress: {
            intervalMs: 60000,
            intervalMinChanges: 5,
            sizeFactor: 2,
            sizeFactorMinimumSize: 20,
        },
        throttleFS: {
            intervalMs: 1000,
            maxBufferedCommands: 50,
        },
    },
    fast: {
        autoCompress: {
            intervalMs: 60000,
            intervalMinChanges: 5,
            sizeFactor: 2,
            sizeFactorMinimumSize: 20,
        },
        // no throttle :)
    },
};
//# sourceMappingURL=ThrottlePresets.js.map