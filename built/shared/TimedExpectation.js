"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimedExpectation = void 0;
const deferred_promise_1 = require("alcalzone-shared/deferred-promise");
/** Allows waiting for something for a given amount of time, after which the expectation will automatically be rejected. */
class TimedExpectation {
    constructor(timeoutMs, predicate, timeoutErrorMessage = "Expectation was not fulfilled within the timeout") {
        this.predicate = predicate;
        this.timeoutErrorMessage = timeoutErrorMessage;
        this._done = false;
        this.promise = (0, deferred_promise_1.createDeferredPromise)();
        this.timeout = setTimeout(() => this.reject(), timeoutMs);
        // We need create the stack on a temporary object or the Error
        // class will try to print the message
        const tmp = { message: "" };
        Error.captureStackTrace(tmp, TimedExpectation);
        this.stack = tmp.stack.replace(/^Error:?\s*\n/, "");
    }
    resolve(result) {
        if (this._done)
            return;
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.promise.resolve(result);
    }
    reject() {
        if (this._done)
            return;
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        const err = new Error(this.timeoutErrorMessage);
        err.stack = this.stack;
        this.promise.reject(err);
    }
    // Make this await-able
    then(onfulfilled, onrejected) {
        return this.promise.then(onfulfilled, onrejected);
    }
}
exports.TimedExpectation = TimedExpectation;
//# sourceMappingURL=TimedExpectation.js.map