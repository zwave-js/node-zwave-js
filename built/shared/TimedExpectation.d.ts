/** Allows waiting for something for a given amount of time, after which the expectation will automatically be rejected. */
export declare class TimedExpectation<TResult = void, TPredicate = never> implements PromiseLike<TResult> {
    readonly predicate?: ((input: TPredicate) => boolean) | undefined;
    private readonly timeoutErrorMessage;
    constructor(timeoutMs: number, predicate?: ((input: TPredicate) => boolean) | undefined, timeoutErrorMessage?: string);
    private promise;
    private timeout?;
    private _done;
    /** The stack trace where the timed expectation was created */
    readonly stack: string;
    resolve(result: TResult): void;
    private reject;
    then<TResult1 = TResult, TResult2 = never>(onfulfilled?: ((value: TResult) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2>;
}
//# sourceMappingURL=TimedExpectation.d.ts.map