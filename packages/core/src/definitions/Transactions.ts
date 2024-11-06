/**
 * The state a transaction is in.
 */

export enum TransactionState {
	/** The transaction is currently queued */
	Queued,
	/** The transaction is currently being handled */
	Active,
	/** The transaction was completed */
	Completed,
	/** The transaction failed */
	Failed,
}

export type TransactionProgress = {
	state:
		| TransactionState.Queued
		| TransactionState.Active
		| TransactionState.Completed;
} | {
	state: TransactionState.Failed;
	/** Why the transaction failed */
	reason?: string;
};

export type TransactionProgressListener = (
	progress: TransactionProgress,
) => void;
