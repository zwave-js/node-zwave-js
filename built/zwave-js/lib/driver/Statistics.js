"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsHost = void 0;
const shared_1 = require("@zwave-js/shared");
/** Mixin to provide statistics functionality. Requires the base class to extend EventEmitter. */
class StatisticsHost {
    get statistics() {
        if (!this._statistics)
            this.resetStatistics();
        return Object.freeze(this._statistics);
    }
    resetStatistics() {
        this.updateStatistics(() => this.createEmpty());
    }
    /** Can be overridden in derived classes to specify additional args to be included in the statistics event callback. */
    getAdditionalEventArgs() {
        return [];
    }
    updateStatistics(updater) {
        this._statistics = updater(this._statistics ?? this.createEmpty());
        if (!this._emitUpdate) {
            this._emitUpdate = (0, shared_1.throttle)(this.emit.bind(this, "statistics updated", ...this.getAdditionalEventArgs()), 250, true);
        }
        this._emitUpdate(this._statistics);
    }
    incrementStatistics(property) {
        this.updateStatistics((s) => {
            const value = s[property];
            if (typeof value === "number") {
                return {
                    ...s,
                    [property]: value + 1,
                };
            }
            else {
                return s;
            }
        });
    }
}
exports.StatisticsHost = StatisticsHost;
//# sourceMappingURL=Statistics.js.map