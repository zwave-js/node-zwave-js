"use strict";
///
/// Stellt einen Promise-Wrapper für asynchrone Node-Funktionen zur Verfügung
///
Object.defineProperty(exports, "__esModule", { value: true });
function promisify(fn, context) {
    return function (...args) {
        context = context || this;
        return new Promise((resolve, reject) => {
            fn.apply(context, [...args, (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    else {
                        return resolve(result);
                    }
                }]);
        });
    };
}
exports.promisify = promisify;
function promisifyNoError(fn, context) {
    return function (...args) {
        context = context || this;
        return new Promise((resolve) => {
            fn.apply(context, [...args, (result) => {
                    return resolve(result);
                }]);
        });
    };
}
exports.promisifyNoError = promisifyNoError;
// tslint:enable:ban-types
/** Creates a promise that waits for the specified time and then resolves */
function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
exports.wait = wait;
