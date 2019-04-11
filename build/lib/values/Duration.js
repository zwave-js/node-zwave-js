"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const math_1 = require("alcalzone-shared/math");
const ZWaveError_1 = require("../error/ZWaveError");
class Duration {
    constructor(value, unit) {
        this.unit = unit;
        switch (unit) {
            case "minutes":
                // Don't allow 0 minutes as a duration
                if (value === 0)
                    this.unit = "seconds";
                break;
            case "unknown":
            case "default":
                value = 0;
                break;
        }
        this.value = value;
    }
    get value() {
        return this._value;
    }
    set value(v) {
        this._value = math_1.clamp(v, 0, 127);
    }
    /** Parses a duration as represented in Report commands */
    static parseReport(payload) {
        if (payload == undefined)
            return undefined;
        if (payload === 0xff)
            return undefined; // reserved value
        if (payload === 0xfe)
            return new Duration(0, "unknown");
        const isMinutes = !!(payload & 128);
        const value = (payload & 127) + (isMinutes ? 1 : 0); // minutes start at 1
        return new Duration(value, isMinutes ? "minutes" : "seconds");
    }
    /** Serializes a duration for a Set command */
    serializeSet() {
        if (this.unit === "default")
            return 0xff;
        if (this.unit === "unknown")
            throw new ZWaveError_1.ZWaveError("Set commands don't support unknown durations", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        const isMinutes = this.unit === "minutes";
        let payload = isMinutes ? 128 : 0;
        payload += (this._value - (isMinutes ? 1 : 0)) & 127;
        return payload;
    }
}
exports.Duration = Duration;
