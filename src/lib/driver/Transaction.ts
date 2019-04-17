import {
	Comparable,
	compareNumberOrString,
	CompareResult,
} from "alcalzone-shared/comparable";
import { DeferredPromise } from "alcalzone-shared/deferred-promise";
import { clamp } from "alcalzone-shared/math";
import { MessagePriority } from "../message/Constants";
import { Message } from "../message/Message";
import { Driver } from "./Driver";

/** Returns a timestamp with nano-second precision */
function highResTimestamp(): number {
	const [s, ns] = process.hrtime();
	return s * 1e9 + ns;
}

// The Z-Wave spec declare that maximum 3 send attempts may be performed
export const MAX_SEND_ATTEMPTS = 3;

export class Transaction implements Comparable<Transaction> {
	public constructor(
		driver: Driver,
		message: Message,
		promise: DeferredPromise<Message | void>,
		priority: MessagePriority,
	);
	public constructor(
		private readonly driver: Driver,
		public readonly message: Message,
		public readonly promise: DeferredPromise<Message | void>,
		public priority: MessagePriority,
		public timestamp: number = highResTimestamp(),
		/**
		 * The previously received partial responses of a multistep command
		 */
		public readonly partialResponses: Message[] = [],
		public ackPending: boolean = true,
		public response?: Message,
	) {
		if (message.maxSendAttempts)
			this.maxSendAttempts = message.maxSendAttempts;
	}

	private _maxSendAttempts: number = MAX_SEND_ATTEMPTS;
	/** The number of times the driver may try to send this message */
	public get maxSendAttempts(): number {
		return this._maxSendAttempts;
	}
	public set maxSendAttempts(value: number) {
		this._maxSendAttempts = clamp(value, 1, MAX_SEND_ATTEMPTS);
	}

	/** The number of times the driver has tried to send this message */
	public sendAttempts: number = 0;

	public compareTo(other: Transaction): CompareResult {
		// delay messages for sleeping nodes
		if (this.priority === MessagePriority.WakeUp) {
			const thisNode = this.message.getNodeUnsafe();
			const otherNode = other.message.getNodeUnsafe();
			if (thisNode) {
				// We don't require existence of the other node. If the other
				// transaction is not for a node, it targets the controller which
				// is assumed always awake
				const thisIsAsleep = !thisNode.isAwake();
				const otherIsAsleep = !(otherNode && otherNode.isAwake());
				// If both nodes are asleep, the conventional order applies
				// Asleep nodes always have the lowest priority
				if (thisIsAsleep && !otherIsAsleep) return 1;
				if (otherIsAsleep && !thisIsAsleep) return -1;
			}
		} else if (other.priority === MessagePriority.WakeUp) {
			return -other.compareTo(this) as CompareResult;
		}

		// delay NodeQuery messages for non-listening nodes
		if (this.priority === MessagePriority.NodeQuery) {
			const thisNode = this.message.getNodeUnsafe();
			const otherNode = other.message.getNodeUnsafe();
			if (thisNode && otherNode) {
				// Both nodes exist
				const thisListening =
					thisNode.isListening || thisNode.isFrequentListening;
				const otherListening =
					otherNode.isListening || otherNode.isFrequentListening;
				// prioritize (-1) the one node that is listening when the other is not
				if (thisListening && !otherListening) return -1;
				if (!thisListening && otherListening) return 1;
			}
		} else if (other.priority === MessagePriority.NodeQuery) {
			return -other.compareTo(this) as CompareResult;
		}

		// by default, sort by priority
		if (this.priority < other.priority) return -1;
		else if (this.priority > other.priority) return 1;

		// for equal priority, sort by the timestamp
		return compareNumberOrString(other.timestamp, this.timestamp);
	}

	// TODO: add a way to expire Transactions
}
