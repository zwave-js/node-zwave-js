"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Duration = void 0;
const math_1 = require("alcalzone-shared/math");
const ZWaveError_1 = require("../error/ZWaveError");
const durationStringRegex = /^(?:(?<hoursStr>\d+)h)?(?:(?<minutesStr>\d+)m)?(?:(?<secondsStr>\d+)s)?$/i;
/** Represents a duration that is used by some command classes */
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
        this._value = (0, math_1.clamp)(v, 0, 127);
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
    /** Parses a duration as represented in Set commands */
    static parseSet(payload) {
        if (payload == undefined)
            return undefined;
        if (payload === 0xff)
            return new Duration(0, "default");
        const isMinutes = !!(payload & 128);
        const value = (payload & 127) + (isMinutes ? 1 : 0); // minutes start at 1
        return new Duration(value, isMinutes ? "minutes" : "seconds");
    }
    /**
     * Parses a user-friendly duration string in the format "Xs", "Xm", "XhYm" or "XmYs", for example "10m20s".
     * If that cannot be exactly represented as a Z-Wave duration, the nearest possible representation will be used.
     */
    static parseString(text) {
        if (!text.length)
            return undefined;
        if (text === "default")
            return new Duration(0, "default");
        // unknown durations shouldn't be parsed from strings because they are only ever reported
        // Try to parse the numeric parts from a duration
        const match = durationStringRegex.exec(text);
        if (!match)
            return undefined;
        const { hoursStr, minutesStr, secondsStr } = match.groups;
        const hours = hoursStr ? parseInt(hoursStr) : 0;
        const minutes = minutesStr ? parseInt(minutesStr) : 0;
        const seconds = secondsStr ? parseInt(secondsStr) : 0;
        if (hours) {
            // Up to 2h7m can be represented as a duration
            if (hours * 60 + minutes <= 127) {
                return new Duration(60 * hours + minutes, "minutes");
            }
        }
        else if (minutes * 60 + seconds > 127) {
            // Up to 2m7s can be represented with seconds
            // anything higher has to be minutes - we round to the nearest minute
            return new Duration(minutes + Math.round(seconds / 60), "minutes");
        }
        else {
            return new Duration(minutes * 60 + seconds, "seconds");
        }
    }
    static from(input) {
        if (input instanceof Duration) {
            return input;
        }
        else if (input) {
            return Duration.parseString(input);
        }
        else {
            return undefined;
        }
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
    /** Serializes a duration for a Report command */
    serializeReport() {
        if (this.unit === "unknown")
            return 0xfe;
        const isMinutes = this.unit === "minutes";
        let payload = isMinutes ? 128 : 0;
        payload += (this._value - (isMinutes ? 1 : 0)) & 127;
        return payload;
    }
    toJSON() {
        if (this.unit === "default" || this.unit === "unknown")
            return this.unit;
        return {
            value: this.value,
            unit: this.unit,
        };
    }
    toMilliseconds() {
        switch (this.unit) {
            case "minutes":
                return this._value * 60000;
            case "seconds":
                return this._value * 1000;
        }
        // The other values have no ms representation
    }
    toString() {
        let ret = "";
        switch (this.unit) {
            case "minutes":
                if (this._value > 60) {
                    ret += `${Math.floor(this._value / 60)}h`;
                }
                ret += `${this._value % 60}m`;
                return ret;
            case "seconds":
                if (this._value > 60) {
                    ret += `${Math.floor(this._value / 60)}m`;
                }
                ret += `${this._value % 60}s`;
                return ret;
            default:
                return this.unit;
        }
    }
}
exports.Duration = Duration;
//# sourceMappingURL=Duration.js.map