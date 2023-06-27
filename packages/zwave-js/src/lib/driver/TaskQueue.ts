import { type Message } from "@zwave-js/serial";
import { type Transaction } from "./Transaction";

// The task queue is a series of tasks that are executed in order.

export class TaskQueue {
	// TODO: This should be a sorted list
	private queue: Task[] = [];
	private currentTask: Task | undefined;
	private currentTransaction: Transaction | undefined;

	public async poll(
		prevResult: Message | undefined,
	): Promise<Message | void> {
		while (true) {
			// We have no current task yet. Try starting one.
			if (!this.currentTask) {
				this.currentTask = this.queue.shift();
				if (!this.currentTask) {
					// No more tasks, we're done
					return;
				}

				// Start the task. This does not execute it yet, only the next call to next() does.
				this.currentTask.gen = this.currentTask.start();
			}

			// We have no current transaction yet. Try starting one.
			if (!this.currentTransaction?.parts.self) {
				const { value, done } = await this.currentTask.gen!.next();
				if (done) {
					// This task is finished, try the next one
					this.currentTask = undefined;
					continue;
				} else {
					// Remember the current transaction and try iterating through that
					this.currentTransaction = value;
					this.currentTransaction.parts.start();
					// We do not pass previous results to new transactions
					prevResult = undefined;
				}
			}

			// Use the current transaction to generate the next message
			{
				const { value, done } =
					await this.currentTransaction.parts.self!.next(prevResult!);
				if (done) {
					// This transaction is done, try the next one
					this.currentTransaction = undefined;
					continue;
				} else {
					// Found a message we can use
					return value;
				}
			}
		}
	}
}

// Each task contains a generator function that yields one or more transactions. The result of executing each transaction
// is passed back to the task, so it can use the result to decide what to do next. The result of the final transaction
// is the result of the task.

export interface Task {
	/** Start executing a new copy of this task */
	start: () => AsyncGenerator<
		// Each invokation yields a transaction
		Transaction,
		// A task returns nothing (TODO: not sure)
		undefined,
		// Anything can be the result of a Transaction
		unknown
	>;
	/** A reference to the currently running generator function if it was already started */
	gen?: ReturnType<Task["start"]>;
	/** A reference to the last generated transaction, or undefined if the generator wasn't started or has finished */
	current?: Transaction;
}

// A transaction is a generator function that yields one or more messages. The result of sending each message
// is passed back to the transaction so it can react to it. The result of the final message is the result of the transaction.

// Failures at any point are handled directly by the task or transaction.
