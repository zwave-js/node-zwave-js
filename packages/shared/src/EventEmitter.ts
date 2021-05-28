import EventEmitter from "events";

/**
 * A type-safe EventEmitter interface to use in place of Node.js's EventEmitter.
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
 * class Test extends TypedEventEmitter<TestEvents> {
 * 	// class implementation
 * }
 * ```
 * 2b.) as a mixin
 * ```ts
 * interface Test extends TypedEventEmitter<TestEvents> {}
 * Mixin([EventEmitter]) // This is a decorator - prepend it with an <at> sign
 * class Test extends OtherClass implements TypedEventEmitter<TestEvents> {
 * 	// class implementation
 * }
 * ```
 */

export interface TypedEventEmitter<
	TEvents extends Record<keyof TEvents, (...args: any[]) => void>
> {
	on<TEvent extends keyof TEvents>(
		event: TEvent,
		callback: TEvents[TEvent],
	): this;
	once<TEvent extends keyof TEvents>(
		event: TEvent,
		callback: TEvents[TEvent],
	): this;
	removeListener<TEvent extends keyof TEvents>(
		event: TEvent,
		callback: TEvents[TEvent],
	): this;
	off<TEvent extends keyof TEvents>(
		event: TEvent,
		callback: TEvents[TEvent],
	): this;
	removeAllListeners(event?: keyof TEvents): this;

	emit<TEvent extends keyof TEvents>(
		event: TEvent,
		...args: Parameters<TEvents[TEvent]>
	): boolean;
}

export class TypedEventEmitter<
	TEvents extends Record<keyof TEvents, (...args: any[]) => void>
> extends (EventEmitter as any) {}
