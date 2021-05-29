import type EventEmitter from "events";

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

	public updateStatistics(updater: (current: Readonly<T>) => T): void {
		this._statistics = updater(this._statistics ?? this.createEmpty());
		((this as unknown) as EventEmitter).emit(
			"statistics updated",
			this._statistics,
		);
	}

	public incrementStatistics(property: keyof T): void {
		this.updateStatistics((s) => {
			const value = s[property];
			if (typeof value === "number") {
				return {
					// wotan-disable-next-line no-duplicate-spread-property
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
	"statistics updated": (statistics: T) => void;
}
