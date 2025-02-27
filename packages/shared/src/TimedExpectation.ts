import {
	type DeferredPromise,
	createDeferredPromise,
} from "alcalzone-shared/deferred-promise";
import { type Timer, setTimer } from "./Timers.js";

/** Allows waiting for something for a given amount of time, after which the expectation will automatically be rejected. */
export class TimedExpectation<TResult = void, TPredicate = never>
	implements PromiseLike<TResult>
{
	public constructor(
		timeoutMs: number,
		public readonly predicate?: (input: TPredicate) => boolean,
		private readonly timeoutErrorMessage: string =
			"Expectation was not fulfilled within the timeout",
	) {
		this.promise = createDeferredPromise<TResult>();
		this.timeout = setTimer(() => this.reject(), timeoutMs);

		// We need create the stack on a temporary object or the Error
		// class will try to print the message
		const tmp = { message: "" };
		Error.captureStackTrace(tmp, TimedExpectation);
		this.stack = (tmp as any).stack.replace(/^Error:?\s*\n/, "");
	}

	private promise: DeferredPromise<TResult>;
	private timeout?: Timer;
	private _done: boolean = false;

	/** The stack trace where the timed expectation was created */
	public readonly stack: string;

	public resolve(result: TResult): void {
		if (this._done) return;

		this.timeout?.clear();
		this.promise.resolve(result);
	}

	private reject(): void {
		if (this._done) return;

		this.timeout?.clear();
		const err = new Error(this.timeoutErrorMessage);
		err.stack = this.stack;
		this.promise.reject(err);
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
