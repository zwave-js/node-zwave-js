"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createDeferredPromise() {
    let res;
    let rej;
    const promise = new Promise((resolve, reject) => {
        res = resolve;
        rej = reject;
    });
    promise.resolve = res;
    promise.reject = rej;
    return promise;
}
exports.createDeferredPromise = createDeferredPromise;
