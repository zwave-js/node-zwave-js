export type EventListener =
	// Add more overloads as necessary
	| ((arg1: any, arg2: any, arg3: any, arg4: any) => void)
	| ((arg1: any, arg2: any, arg3: any) => void)
	| ((arg1: any, arg2: any) => void)
	| ((arg1: any) => void)
	| ((...args: any[]) => void);

// FIXME: Once we upgrade to Node.js 20, use the global CustomEvent class
class CustomEvent<T extends any[]> extends Event {
	constructor(type: string, detail: T) {
		super(type);
		this._detail = detail;
	}

	private _detail: T;
	public get detail(): T {
		return this._detail;
	}
}

type Fn = (...args: any[]) => void;

/**
 * A type-safe EventEmitter replacement that internally uses the portable _eventTarget API.
 *
 * **Usage:**
 *
 * 1.) Define event signatures
 * ```ts
 * interface TestEvents {
 * 	test1: (arg1: number) => void;
 * 	test2: () => void;
 * }
 * ```
 *
 * 2a.) direct inheritance:
 * ```ts
 * class Test extends TypedEventTarget<TestEvents> {
 * 	// class implementation
 * }
 * ```
 * 2b.) as a mixin
 * ```ts
 * interface Test extends TypedEventTarget<TestEvents> {}
 * Mixin([EventEmitter]) // This is a decorator - prepend it with an <at> sign
 * class Test extends OtherClass implements TypedEventTarget<TestEvents> {
 * 	// class implementation
 * }
 * ```
 */

export class TypedEventTarget<
	TEvents extends Record<keyof TEvents, EventListener>,
> {
	// We lazily initialize the instance properties, so they can be used in mixins

	private _eventTarget: EventTarget | undefined;
	private get eventTarget(): EventTarget {
		this._eventTarget ??= new EventTarget();
		return this._eventTarget;
	}

	private _listeners: Map<keyof TEvents, Set<Fn>> | undefined;
	private get listeners(): Map<keyof TEvents, Set<Fn>> {
		this._listeners ??= new Map();
		return this._listeners;
	}

	private _wrappers: WeakMap<Fn, Fn> | undefined;
	private get wrappers(): WeakMap<Fn, Fn> {
		this._wrappers ??= new WeakMap();
		return this._wrappers;
	}

	private getWrapper(
		event: keyof TEvents,
		callback: TEvents[keyof TEvents],
		once: boolean = false,
	): Fn {
		if (this.wrappers.has(callback)) {
			return this.wrappers.get(callback)!;
		} else {
			const wrapper = (e: Event) => {
				const detail =
					(e as CustomEvent<Parameters<TEvents[keyof TEvents]>>)
						.detail;
				// @ts-expect-error
				callback(...detail);
				if (once) this.listeners.get(event)?.delete(callback);
			};
			this.wrappers.set(callback, wrapper);
			return wrapper;
		}
	}

	private rememberListener(event: keyof TEvents, callback: Fn): void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)!.add(callback);
	}

	public on<TEvent extends keyof TEvents>(
		event: TEvent,
		callback: TEvents[TEvent],
	): this {
		this.eventTarget.addEventListener(
			event as string,
			this.getWrapper(event, callback),
		);
		this.rememberListener(event, callback);
		return this;
	}

	public once<TEvent extends keyof TEvents>(
		event: TEvent,
		callback: TEvents[TEvent],
	): this {
		this.eventTarget.addEventListener(
			event as string,
			this.getWrapper(event, callback, true),
			{ once: true },
		);
		return this;
	}

	public removeListener<TEvent extends keyof TEvents>(
		event: TEvent,
		callback: TEvents[TEvent],
	): this {
		if (this.wrappers.has(callback)) {
			this.eventTarget.removeEventListener(
				event as string,
				this.wrappers.get(callback)!,
			);
			this.wrappers.delete(callback);
		}
		if (this.listeners.has(event)) {
			this.listeners.get(event)!.delete(callback);
		}
		return this;
	}

	public removeAllListeners<TEvent extends keyof TEvents>(
		event?: TEvent,
	): this {
		if (event) {
			if (this.listeners.has(event)) {
				for (const callback of this.listeners.get(event)!) {
					this.removeListener(event, callback as any);
				}
			}
		} else {
			for (const event of this.listeners.keys()) {
				this.removeAllListeners(event);
			}
		}
		return this;
	}

	public off<TEvent extends keyof TEvents>(
		event: TEvent,
		callback: TEvents[TEvent],
	): this {
		return this.removeListener(event, callback);
	}

	public emit<TEvent extends keyof TEvents>(
		event: TEvent,
		...args: Parameters<TEvents[TEvent]>
	): boolean {
		return this.eventTarget.dispatchEvent(
			new CustomEvent(event as string, args),
		);
	}
}
