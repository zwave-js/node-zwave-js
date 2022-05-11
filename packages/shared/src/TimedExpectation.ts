import {
	createDeferredPromise,
	DeferredPromise,
} from "alcalzone-shared/deferred-promise";

/** Allows waiting for something for a given amount of time, after which the expectation will automatically be rejected. */
export class TimedExpectation<TResult = void, TPredicate = never>
	implements PromiseLike<TResult>
{
	public constructor(
		timeoutMs: number,
		public readonly predicate?: (input: TPredicate) => boolean,
		private readonly timeoutErrorMessage: string = "Expectation was not fulfilled within the timeout",
	) {
		this.promise = createDeferredPromise<TResult>();
		this.timeout = setTimeout(() => this.reject(), timeoutMs);
	}

	private promise: DeferredPromise<TResult>;
	private timeout?: NodeJS.Timeout;
	private _done: boolean = false;

	public resolve(result: TResult): void {
		if (this._done) return;

		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		this.promise.resolve(result);
	}

	private reject(): void {
		if (this._done) return;

		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		this.promise.reject(new Error(this.timeoutErrorMessage));
	}

	// Make this await-able
	then<TResult1 = TResult, TResult2 = never>(
		onfulfilled?:
			| ((value: TResult) => TResult1 | PromiseLike<TResult1>)
			| null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
	): PromiseLike<TResult1 | TResult2> {
		return this.promise.then(onfulfilled, onrejected);
	}
}
