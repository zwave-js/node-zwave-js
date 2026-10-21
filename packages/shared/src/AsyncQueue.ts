import {
	type DeferredPromise,
	createDeferredPromise,
} from "alcalzone-shared/deferred-promise";

function disposeItem(item: unknown): void {
	if (typeof item === "object" && item !== null && Symbol.dispose in item) {
		const dispose = item[Symbol.dispose];
		if (typeof dispose === "function") dispose.call(item);
	}
}

export class AsyncQueue<T> implements AsyncIterable<T> {
	/** Adds items to the queue. Disposes new items after the queue has ended. */
	public add(...items: T[]): void {
		if (this.ended) {
			for (const item of items) disposeItem(item);
			return;
		}
		if (items.length === 0) return;

		// Resolve any pending promises first
		while (items.length > 0 && this.listeners.length > 0) {
			const promise = this.listeners.shift()!;
			const item = items.shift()!;
			promise.resolve(item);
		}

		// Add the remaining items to the backlog
		this.backlog.push(...items);
	}

	/**
	 * Removes an item from the queue if it was not processed yet.
	 * The return value indicates whether the item was removed.
	 */
	public remove(item: T): boolean {
		if (this.ended) return false;

		// Remove the item from the backlog
		const index = this.backlog.indexOf(item);
		if (index !== -1) {
			this.backlog.splice(index, 1);
			return true;
		}

		return false;
	}

	public get length(): number {
		return this.backlog.length;
	}

	// A list of items that have been pushed but not pulled
	private backlog: T[] = [];
	// A list of Promises that are waiting to be resolved
	private listeners: DeferredPromise<T | undefined>[] = [];

	// Whether the queue was ended
	private ended = false;

	/** Ends the queue after it has been drained */
	public end(): void {
		this.ended = true;
	}

	/** Ends the queue and discards all pending items */
	public abort(): void {
		this.ended = true;

		while (this.backlog.length > 0) {
			disposeItem(this.backlog.pop());
		}

		for (const p of this.listeners) {
			p.resolve(undefined);
		}
	}

	public [Symbol.asyncIterator](): AsyncIterator<T> {
		return {
			next: async (): Promise<IteratorResult<T>> => {
				let value: T | undefined;

				if (this.backlog.length > 0) {
					// If there are items in the backlog, return the first one
					value = this.backlog.shift();
				} else if (!this.ended) {
					// Otherwise create a new promise and add it to the pending list
					const promise = createDeferredPromise<T | undefined>();
					this.listeners.push(promise);
					value = await promise;
				}

				if (value) {
					// We have a value, return it
					return { value, done: false };
				} else {
					// No value means the queue was ended
					return { value: undefined, done: true };
				}
			},
		};
	}
}
