import { type Message } from "@zwave-js/serial";
import { type DeferredPromise } from "alcalzone-shared/deferred-promise";
import { SortedList } from "alcalzone-shared/sorted-list";
import { type Transaction } from "./Transaction";

/**
 * The transaction queue is responsible for sequencing equally-important transactions
 * and starting, stepping through and stopping them.
 */
export class TransactionQueue {
	private transactions = new SortedList<Transaction>();
	public currentTransaction: Transaction | undefined;

	public peek(): Transaction | undefined {
		return this.transactions.peekStart();
	}

	public add(...items: Transaction[]): number {
		return this.transactions.add(...items);
	}

	public find(
		predicate: (item: Transaction) => boolean,
	): Transaction | undefined {
		return this.transactions.find(predicate);
	}

	public startNextTransaction(): Transaction | undefined {
		this.currentTransaction = this.transactions.shift();
		if (this.currentTransaction) {
			this.currentTransaction.parts.start();
		}
		return this.currentTransaction;
	}

	public async tryGenerateNextMessage(
		prevResult: Message,
	): Promise<Message | undefined> {
		if (!this.currentTransaction?.parts.self) return;
		const { done } = await this.currentTransaction.parts.self.next(
			prevResult,
		);
		if (!done) {
			return this.currentTransaction.getCurrentMessage();
		}
	}

	public finalizeTransaction(): void {
		this.currentTransaction = undefined;
	}
}

export interface SerialAPIQueueItem {
	msg: Message;
	transactionSource?: string;
	result: DeferredPromise<Message | undefined>;
}
