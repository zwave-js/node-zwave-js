import {
	Comparable,
	compareNumberOrString,
	CompareResult,
} from "alcalzone-shared/comparable";
import type { DeferredPromise } from "alcalzone-shared/deferred-promise";
import { clamp } from "alcalzone-shared/math";
import { MessagePriority } from "../message/Constants";
import type { Message } from "../message/Message";
import { highResTimestamp } from "../util/date";
import type { Driver } from "./Driver";

// The Z-Wave spec declare that maximum 3 send attempts may be performed
export const MAX_SEND_ATTEMPTS = 3;

/**
 * Transactions are used to track and correllate messages with their responses.
 */
export class Transaction implements Comparable<Transaction> {
	public constructor(
		private readonly driver: Driver,
		public readonly message: Message,
		public readonly promise: DeferredPromise<Message | void>,
		public priority: MessagePriority,
	) {
		if (message.maxSendAttempts) {
			this.maxSendAttempts = message.maxSendAttempts;
		}
	}

	/** The timestamp at which the transaction was created */
	public creationTimestamp: number = highResTimestamp();
	/** The timestamp at which the message was sent */
	public txTimestamp?: number;
	/** The round-trip time from transmission of the message to receipt of the ACK */
	public rtt: number = Number.POSITIVE_INFINITY;
	public computeRTT(): void {
		this.rtt = highResTimestamp() - this.txTimestamp!;
	}
	/**
	 * @internal
	 * The timeout which causes the promise to be rejected when it elapses
	 */
	public timeoutInstance?: NodeJS.Timeout;

	/** Whether we're still waiting for an ACK from the controller */
	public controllerAckPending: boolean = true;
	/** Whether we're still waiting for an ACK from the node */
	public nodeAckPending: boolean | undefined;
	/** Whether the node status should be updated when this transaction times out */
	public changeNodeStatusOnTimeout: boolean = true;

	public response?: Message;

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

	/** Changes the internal state of this transaction so it can be sent */
	public prepareForTransmission(): void {
		if (this.sendAttempts === 0) this.sendAttempts = 1;
		this._wasSent = true;
		// If this is a retransmit, reset ack and timestamp
		this.controllerAckPending = true;
		this.nodeAckPending = undefined;
		this.txTimestamp = highResTimestamp();
	}

	private _wasSent: boolean = false;
	/**
	 * @internal
	 * Returns true when the driver tried to send this message at least once
	 */
	public get wasSent(): boolean {
		return this._wasSent;
	}
	public set wasSent(value: boolean) {
		this._wasSent = value;
	}

	/** Compares two transactions in order to plan their transmission sequence */
	public compareTo(other: Transaction): CompareResult {
		function compareWakeUpPriority(
			_this: Transaction,
			_other: Transaction,
		): CompareResult | undefined {
			const thisNode = _this.message.getNodeUnsafe();
			const otherNode = _other.message.getNodeUnsafe();

			// We don't require existence of the node object
			// If any transaction is not for a node, it targets the controller
			// which is always awake
			const thisIsAsleep = thisNode?.isAwake() === false;
			const otherIsAsleep = otherNode?.isAwake() === false;

			// If both nodes are asleep, the conventional order applies
			// Asleep nodes always have the lowest priority
			if (thisIsAsleep && !otherIsAsleep) return 1;
			if (otherIsAsleep && !thisIsAsleep) return -1;
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
		return compareNumberOrString(
			other.creationTimestamp,
			this.creationTimestamp,
		);
	}
}
