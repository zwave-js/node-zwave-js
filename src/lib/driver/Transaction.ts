import {
	Comparable,
	compareNumberOrString,
	CompareResult,
} from "alcalzone-shared/comparable";
import { DeferredPromise } from "alcalzone-shared/deferred-promise";
import { clamp } from "alcalzone-shared/math";
import { MessagePriority } from "../message/Constants";
import { Message } from "../message/Message";
import { IDriver } from "./IDriver";

/** Returns a timestamp with nano-second precision */
function highResTimestamp(): number {
	const [s, ns] = process.hrtime();
	return s * 1e9 + ns;
}

// The Z-Wave spec declare that maximum 3 send attempts may be performed
export const MAX_SEND_ATTEMPTS = 3;

export class Transaction implements Comparable<Transaction> {
	public constructor(
		driver: IDriver,
		message: Message,
		promise: DeferredPromise<Message | void>,
		priority: MessagePriority,
		timeout?: number,
	);
	public constructor(
		private readonly driver: IDriver,
		public readonly message: Message,
		public readonly promise: DeferredPromise<Message | void>,
		public priority: MessagePriority,
		public readonly timeout?: number,
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
		if (typeof this.timeout === "number" && this.timeout < 1)
			this.timeout = undefined;
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
		function compareWakeUpPriority(
			_this: Transaction,
			_other: Transaction,
		): CompareResult | undefined {
			const thisNode = _this.message.getNodeUnsafe();
			const otherNode = _other.message.getNodeUnsafe();
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
		}

		// delay messages for sleeping nodes
		if (this.priority === MessagePriority.WakeUp) {
			const result = compareWakeUpPriority(this, other);
			if (result != undefined) return result;
		} else if (other.priority === MessagePriority.WakeUp) {
			const result = compareWakeUpPriority(other, this);
			if (result != undefined) return -result as CompareResult;
		}

		function compareNodeQueryPriority(
			_this: Transaction,
			_other: Transaction,
		): CompareResult | undefined {
			const thisNode = _this.message.getNodeUnsafe();
			const otherNode = _other.message.getNodeUnsafe();
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
		}

		// delay NodeQuery messages for non-listening nodes
		if (this.priority === MessagePriority.NodeQuery) {
			const result = compareNodeQueryPriority(this, other);
			if (result != undefined) return result;
		} else if (other.priority === MessagePriority.NodeQuery) {
			const result = compareNodeQueryPriority(other, this);
			if (result != undefined) return -result as CompareResult;
		}

		// by default, sort by priority
		if (this.priority < other.priority) return -1;
		else if (this.priority > other.priority) return 1;

		// for equal priority, sort by the timestamp
		return compareNumberOrString(other.timestamp, this.timestamp);
	}

	// TODO: add a way to expire Transactions
}
