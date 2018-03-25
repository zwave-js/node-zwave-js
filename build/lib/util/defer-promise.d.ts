export interface DeferredPromise<T> extends Promise<T> {
    resolve(value?: T | PromiseLike<T>): void;
    reject(reason?: any): void;
}
export declare function createDeferredPromise<T = void>(): DeferredPromise<T>;
