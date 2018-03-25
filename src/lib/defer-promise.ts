export interface DeferredPromise<T> extends Promise<T> {
	resolve(value?: T | PromiseLike<T>): void;
	reject(reason?: any): void;
}

export function createDeferredPromise<T = void>(): DeferredPromise<T> {
	let res: (value?: T | PromiseLike<T>) => void;
	let rej: (reason?: any) => void;

	const promise = new Promise<T>((resolve, reject) => {
		res = resolve;
		rej = reject;
	}) as DeferredPromise<T>;

	promise.resolve = res;
	promise.reject = rej;

	return promise;
}
