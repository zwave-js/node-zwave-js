import { type TypedEventTarget, throttle } from "@zwave-js/shared";

/** Mixin to provide statistics functionality. Requires the base class to extend EventEmitter. */
export abstract class StatisticsHost<T> {
	protected abstract createEmpty(): T;

	private _statistics: T | undefined;
	public get statistics(): Readonly<T> {
		if (!this._statistics) this.resetStatistics();
		return Object.freeze(this._statistics!);
	}

	public resetStatistics(): void {
		this.updateStatistics(() => this.createEmpty());
	}

	/** Can be overridden in derived classes to specify additional args to be included in the statistics event callback. */
	protected getAdditionalEventArgs(): any[] {
		return [];
	}

	private _emitUpdate: ((stat: T) => void) | undefined;
	public updateStatistics(updater: (current: Readonly<T>) => T): void {
		this._statistics = updater(this._statistics ?? this.createEmpty());
		if (!this._emitUpdate) {
			this._emitUpdate = throttle(
				(this as unknown as TypedEventTarget<any>).emit.bind(
					this,
					"statistics updated",
					...this.getAdditionalEventArgs(),
				),
				250,
				true,
			);
		}
		this._emitUpdate(this._statistics);
	}

	public incrementStatistics(property: keyof T): void {
		this.updateStatistics((s) => {
			const value = s[property];
			if (typeof value === "number") {
				return {
					...s,
					[property]: value + 1,
				};
			} else {
				return s;
			}
		});
	}
}

export interface StatisticsEventCallbacks<T> {
	"statistics updated": (statistics: Readonly<T>) => void;
}

export interface StatisticsEventCallbacksWithSelf<TSelf, TStats> {
	"statistics updated": (self: TSelf, statistics: Readonly<TStats>) => void;
}
