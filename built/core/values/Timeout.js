"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timeout = void 0;
const math_1 = require("alcalzone-shared/math");
/** Represents a timeout that is used by some command classes */
class Timeout {
    constructor(value, unit) {
        this.unit = unit;
        if (value === 0)
            this.unit = "none";
        switch (unit) {
            case "none":
            case "infinite":
                value = 0;
                break;
        }
        this.value = value;
    }
    get value() {
        return this._value;
    }
    set value(v) {
        this._value = (0, math_1.clamp)(v, 0, this.unit === "seconds" ? 60 : 191);
    }
    static parse(payload) {
        if (payload == undefined)
            return undefined;
        if (payload === 0xff)
            return new Timeout(0, "infinite");
        const isMinutes = !!(payload & 64);
        const value = (payload & 63) + (isMinutes ? 1 : 0); // minutes start at 1
        return new Timeout(value, isMinutes ? "minutes" : "seconds");
    }
    /** Serializes a timeout for a Set command */
    serialize() {
        if (this.unit === "infinite")
            return 0xff;
        if (this.unit === "none")
            return 0x00;
        const isMinutes = this.unit === "minutes";
        return (isMinutes ? 64 : 0) | (this._value & 63);
    }
    toJSON() {
        if (this.unit === "none" || this.unit === "infinite")
            return this.unit;
        return {
            value: this.value,
            unit: this.unit,
        };
    }
    toMilliseconds() {
        switch (this.unit) {
            case "none":
                return 0;
            case "minutes":
                return this._value * 60000;
            case "seconds":
                return this._value * 1000;
            case "infinite":
                return Number.POSITIVE_INFINITY;
        }
    }
    toString() {
        switch (this.unit) {
            case "minutes":
                return `[Timeout: ${this._value}${this.value === 1 ? "minute" : "minutes"}]`;
            case "seconds":
                return `[Timeout: ${this._value}${this.value === 1 ? "second" : "seconds"}]`;
            default:
                return `[Timeout: ${this.unit}]`;
        }
    }
}
exports.Timeout = Timeout;
//# sourceMappingURL=Timeout.js.map