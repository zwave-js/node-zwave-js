export class Timer {
	readonly #callback: (...args: any[]) => void;
	readonly #delay?: number;
	readonly #args: any[];

	readonly #inner: NodeJS.Timeout;
	readonly #kind = "timeout";

	/** @internal */
	constructor(
		callback: (...args: any[]) => void,
		delay?: number,
		...args: any[]
	) {
		this.#callback = callback;
		this.#delay = delay;
		this.#args = args;
		this.#inner = globalThis.setTimeout(callback, delay, ...args);
	}

	/** Clears the timeout. */
	public clear(): void {
		globalThis.clearTimeout(this.#inner);
	}

	public unref(): this {
		// Not supported in browsers
		if (typeof this.#inner.unref === "function") {
			this.#inner.unref();
		}
		return this;
	}

	public refresh(): this {
		if (typeof this.#inner.refresh === "function") {
			this.#inner.refresh();
		} else {
			globalThis.clearTimeout(this.#inner);
			globalThis.setTimeout(this.#callback, this.#delay, ...this.#args);
		}
		return this;
	}
}

export class Interval {
	readonly #inner: NodeJS.Timeout;
	readonly #kind = "interval";

	/** @internal */
	constructor(inner: NodeJS.Timeout) {
		this.#inner = inner;
	}

	/** Clears the timeout. */
	public clear(): void {
		globalThis.clearInterval(this.#inner);
	}

	public unref(): this {
		// Not supported in browsers
		if (typeof this.#inner.unref === "function") {
			this.#inner.unref();
		}
		return this;
	}
}

export function setTimer<TArgs extends any[]>(
	callback: (...args: TArgs) => void,
	delay?: number,
	...args: TArgs
): Timer {
	return new Timer(
		callback,
		delay,
		...args,
	);
}

export function setInterval<TArgs extends any[]>(
	callback: (...args: TArgs) => void,
	delay?: number,
	...args: TArgs
): Interval {
	return new Interval(globalThis.setInterval(callback, delay, ...args));
}
