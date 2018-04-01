import { Message, MessagePriority } from "../message/Message";
import { Comparable, compareNumberOrString, CompareResult } from "../util/comparable";
import { DeferredPromise } from "../util/defer-promise";

/** Returns a timestamp with nano-second precision */
function highResTimestamp(): number {
	const [s, ns] = process.hrtime();
	return s * 1e9 + ns;
}

export class Transaction implements Comparable<Transaction> {

	constructor(
		message: Message,
		promise: DeferredPromise<Message | void>,
		priority: MessagePriority,
	);
	constructor(
		public readonly message: Message,
		public readonly promise: DeferredPromise<Message | void>,
		public readonly priority: MessagePriority,
		public timestamp: number = highResTimestamp(),
		public ackPending: boolean = true,
		public response?: Message,
	) {
	}

	public compareTo(other: Transaction): CompareResult {
		// first sort by priority
		if (this.priority < other.priority) return -1;
		else if (this.priority > other.priority) return 1;

		// for equal priority, sort by the timestamp
		return compareNumberOrString(other.timestamp, this.timestamp);

		// TODO: do we need to sort by the message itself?
	}

	// TODO: add a way to expire these
	// TODO: add a way to resend these
}
