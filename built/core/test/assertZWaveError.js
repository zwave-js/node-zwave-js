"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertZWaveError = void 0;
/**
 * Asserts that a value is or a method returns a ZWaveError.
 * @param valueOrFactory An error object or method that is expected to throw
 * @param options Additional assertions
 */
function assertZWaveError(t, valueOrFactory, options = {}) {
    const { messageMatches, errorCode, context } = options;
    function _assertZWaveError(e) {
        t.is(e.constructor.name, "ZWaveError");
        t.is(typeof e.code, "number");
    }
    function handleError(e) {
        _assertZWaveError(e);
        if (messageMatches != undefined) {
            const regex = messageMatches instanceof RegExp
                ? messageMatches
                : new RegExp(messageMatches);
            t.regex(e.message, regex);
        }
        if (errorCode != undefined)
            t.is(e.code, errorCode);
        if (context != undefined)
            t.is(e.context, context);
    }
    function fail() {
        // We should not be here
        throw new Error("The factory function did not throw any error!");
    }
    if (typeof valueOrFactory === "function") {
        try {
            // This call is expected to throw if valueOrFactory is a synchronous function
            const result = valueOrFactory();
            if (result instanceof Promise) {
                return result.then(fail, // If valueOrFactory is an async function the promise should be rejected
                handleError);
            }
        }
        catch (e) {
            return void handleError(e);
        }
        fail();
    }
    else {
        // Directly assert the error object
        handleError(valueOrFactory);
    }
    return undefined;
}
exports.assertZWaveError = assertZWaveError;
//# sourceMappingURL=assertZWaveError.js.map