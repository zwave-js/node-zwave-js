import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import {
	type DeferredPromise,
	createDeferredPromise,
} from "alcalzone-shared/deferred-promise";
import { SortedList } from "alcalzone-shared/sorted-list";

import type { Transaction } from "./Transaction.js";

export interface TransactionQueueOptions {
	name: string;
	mayStartNextTransaction: (transaction: Transaction) => boolean;
}

/**
 * The transaction queue offers an async-iterable interface to a list of transactions.
 */
export class TransactionQueue implements AsyncIterable<Transaction> {
	public constructor(options?: Partial<TransactionQueueOptions>) {
		this.name = options?.name ?? "unnamed";
		this.mayStartNextTransaction =
			options?.mayStartNextTransaction ?? (() => true);
	}

	public readonly name: string;

	private mayStartNextTransaction: (transaction: Transaction) => boolean;
	public readonly transactions = new SortedList<Transaction>();
	public currentTransaction: Transaction | undefined;

	/** Adds transactions to the queue. Rejects them after the queue has ended. */
	public add(...items: Transaction[]): void {
		if (this.ended) {
			for (const transaction of items) {
				transaction.abort(
					new ZWaveError(
						"The message has been removed from the queue",
						ZWaveErrorCodes.Driver_TaskRemoved,
						undefined,
						transaction.stack,
					),
				);
			}
			return;
		}
		this.transactions.add(...items);
		this.trigger();
	}

	public remove(...items: Transaction[]): void {
		this.transactions.remove(...items);
		this.trigger();
	}

	private pauseCount = 0;

	/**
	 * Pauses the queue to prevent it from triggering while being modified.
	 * Each call must be balanced with unpause().
	 */
	public pause(): void {
		this.pauseCount++;
	}

	/** Unpauses the queue and starts the next transaction if possible */
	public unpause(): void {
		this.pauseCount--;
		if (this.pauseCount === 0) this.trigger();
	}

	public find(
		predicate: (item: Transaction) => boolean,
	): Transaction | undefined {
		return this.transactions.find(predicate);
	}

	public finalizeTransaction(): void {
		this.currentTransaction = undefined;
	}

	public get length(): number {
		return this.transactions.length;
	}

	/** Causes the queue to re-evaluate whether the next transaction may be started */
	public trigger(): void {
		if (this.pauseCount > 0) return;
		while (this.transactions.length > 0 && this.listeners.length > 0) {
			if (this.mayStartNextTransaction(this.transactions.peekStart()!)) {
				const promise = this.listeners.shift()!;
				const item = this.transactions.shift()!;
				this.currentTransaction = item;
				promise.resolve(item);
			} else {
				break;
			}
		}
	}

	// A list of Promises that are waiting to be resolved
	private listeners: DeferredPromise<Transaction | undefined>[] = [];

	// Whether the queue was ended
	private ended = false;

	/** Ends the queue after it has been drained */
	public end(): void {
		this.ended = true;
	}

	/** Ends the queue and discards all pending items */
	public abort(): void {
		this.ended = true;
		this.transactions.clear();
		this.currentTransaction = undefined;
		for (const p of this.listeners) {
			p.resolve(undefined);
		}
	}

	// Enable iterating the queue using for-await-of
	public [Symbol.asyncIterator](): AsyncIterator<Transaction> {
		return {
			next: async (): Promise<IteratorResult<Transaction>> => {
				let value: Transaction | undefined;

				if (
					this.pauseCount === 0
					&& this.transactions.length > 0
					&& this.mayStartNextTransaction(
						this.transactions.peekStart()!,
					)
				) {
					// If the next transaction may be started, return it
					value = this.transactions.shift()!;
				} else if (!this.ended) {
					// Otherwise create a new promise and add it to the pending list
					const promise = createDeferredPromise<
						Transaction | undefined
					>();
					this.listeners.push(promise);
					value = await promise;
				}

				this.currentTransaction = value;

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

export interface SerialAPIQueueItem extends Disposable {
	msg: Message;
	transactionSource?: string;
	result: DeferredPromise<Message | undefined>;
}
