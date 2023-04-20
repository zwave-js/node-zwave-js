/** Mixin to provide statistics functionality. Requires the base class to extend EventEmitter. */
export declare abstract class StatisticsHost<T> {
    protected abstract createEmpty(): T;
    private _statistics;
    get statistics(): Readonly<T>;
    resetStatistics(): void;
    /** Can be overridden in derived classes to specify additional args to be included in the statistics event callback. */
    protected getAdditionalEventArgs(): any[];
    private _emitUpdate;
    updateStatistics(updater: (current: Readonly<T>) => T): void;
    incrementStatistics(property: keyof T): void;
}
export interface StatisticsEventCallbacks<T> {
    "statistics updated": (statistics: T) => void;
}
export interface StatisticsEventCallbacksWithSelf<TSelf, TStats> {
    "statistics updated": (self: TSelf, statistics: TStats) => void;
}
//# sourceMappingURL=Statistics.d.ts.map