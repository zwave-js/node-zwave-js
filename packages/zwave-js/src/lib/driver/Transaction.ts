import {
	MessagePriority,
	type TransactionProgress,
	type TransactionProgressListener,
	type ZWaveError,
	highResTimestamp,
	isZWaveError,
} from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import { noop } from "@zwave-js/shared";
import {
	type Comparable,
	type CompareResult,
	compareNumberOrString,
} from "alcalzone-shared/comparable";
import type { DeferredPromise } from "alcalzone-shared/deferred-promise";
import { NodeStatus } from "../node/_Types";
import type { Driver } from "./Driver";

export interface MessageGenerator {
	parent: Transaction;
	/** Start a new copy of this message generator */
	start: () => AsyncGenerator<Message, void, Message>;
	/** A reference to the currently running message generator if it was already started */
	self?: ReturnType<MessageGenerator["start"]>;
	/** A reference to the last generated message, or undefined if the generator wasn't started or has finished */
	current?: Message;
}

export interface TransactionOptions {
	/** The "primary" message this transaction contains, e.g. the un-encapsulated version of a SendData request */
	message: Message;
	/**
	 * The actual messages that will be sent when handling this transaction,
	 * defined as a message generator to dynamically create the messages.
	 */
	parts: MessageGenerator;
	/** The priority of this transaction */
	priority: MessagePriority;
	/** Will be resolved/rejected by the Send Thread Machine when the entire transaction is handled */
	promise: DeferredPromise<Message | void>;

	/** Gets called with progress updates for a transaction */
	listener?: TransactionProgressListener;
}

/**
 * Transactions are used to track and correlate messages with their responses.
 */
export class Transaction implements Comparable<Transaction> {
	public constructor(
		public readonly driver: Driver,
		private readonly options: TransactionOptions,
	) {
		// Give the message generator a reference to this transaction
		options.parts.parent = this;
		// We need create the stack on a temporary object or the Error
		// class will try to print the message
		const tmp = { message: "" };
		Error.captureStackTrace(tmp, Transaction);
		this._stack = (tmp as any).stack.replace(/^Error:?\s*\n/, "");
	}

	public clone(): Transaction {
		const ret = new Transaction(this.driver, this.options);
		for (
			const prop of [
				"_stack",
				"creationTimestamp",
				"changeNodeStatusOnTimeout",
				"pauseSendThread",
				"requestWakeUpOnDemand",
			] as const
		) {
			(ret as any)[prop] = this[prop];
		}

		// The listener callback now lives on the clone
		this.listener = undefined;

		return ret;
	}

	/** Will be resolved/rejected by the Send Thread Machine when the entire transaction is handled */
	public readonly promise: DeferredPromise<Message | void> =
		this.options.promise;

	/** The "primary" message this transaction contains, e.g. the un-encapsulated version of a SendData request */
	public readonly message: Message = this.options.message;

	/** The message generator to create the actual messages for this transaction */
	public readonly parts: MessageGenerator = this.options.parts;

	/** A callback which gets called with updates about this transaction */
	private listener?: TransactionProgressListener = this.options.listener;

	public notifyListener(progress: TransactionProgress): void {
		this.listener?.(progress);
	}

	/**
	 * Returns the current message of this transaction. This is either the currently active partial message
	 * or the primary message if the generator hasn't been started yet.
	 */
	public getCurrentMessage(): Message | undefined {
		return this.parts.current ?? this.message;
	}

	/**
	 * Starts the transaction's message generator if it hasn't been started yet.
	 * Returns `true` when the generator was started, `false` if it was already started before.
	 */
	public start(): boolean {
		if (!this.parts.self) {
			this.parts.start();
			return true;
		}
		return false;
	}

	public async generateNextMessage(
		prevResult: Message | undefined,
	): Promise<Message | undefined> {
		if (!this.parts.self) return;
		// Get the next message from the generator
		const { done, value } = await this.parts.self.next(prevResult!);
		if (!done) return value;
	}

	/**
	 * Forcefully aborts the message generator by throwing the given result.
	 * Errors will be treated as a rejection of the transaction, everything else as success
	 */
	public abort(result: Message | ZWaveError | undefined): void {
		if (this.parts.self) {
			this.parts.self.throw(result).catch(noop);
		} else if (isZWaveError(result)) {
			this.promise.reject(result);
		} else {
			this.promise.resolve(result);
		}
	}

	/** The priority of this transaction */
	public priority: MessagePriority = this.options.priority;

	/** The timestamp at which the transaction was created */
	public creationTimestamp: number = highResTimestamp();

	/** Whether the node status should be updated when this transaction times out */
	public changeNodeStatusOnTimeout: boolean = true;

	/** Whether the send thread MUST be paused after this transaction was handled */
	public pauseSendThread: boolean = false;

	/** If a Wake Up On Demand should be requested for the target node. */
	public requestWakeUpOnDemand: boolean = false;

	/** Internal information used to identify or mark this transaction */
	public tag?: any;

	/** The stack trace where the transaction was created */
	private _stack: string;
	public get stack(): string {
		return this._stack;
	}

	/** Compares two transactions in order to plan their transmission sequence */
	public compareTo(other: Transaction): CompareResult {
		const compareWakeUpPriority = (
			_this: Transaction,
			_other: Transaction,
		): CompareResult | undefined => {
			const thisNode = _this.message.getNodeUnsafe(this.driver);
			const otherNode = _other.message.getNodeUnsafe(this.driver);

			// We don't require existence of the node object
			// If any transaction is not for a node, it targets the controller
			// which is always awake
			const thisIsAsleep = thisNode?.status === NodeStatus.Asleep;
			const otherIsAsleep = otherNode?.status === NodeStatus.Asleep;

			// If both nodes are asleep, the conventional order applies
			// Asleep nodes always have the lowest priority
			if (thisIsAsleep && !otherIsAsleep) return 1;
			if (otherIsAsleep && !thisIsAsleep) return -1;
		};

		// delay messages for sleeping nodes
		if (this.priority === MessagePriority.WakeUp) {
			const result = compareWakeUpPriority(this, other);
			if (result != undefined) return result;
		} else if (other.priority === MessagePriority.WakeUp) {
			const result = compareWakeUpPriority(other, this);
			if (result != undefined) return -result as CompareResult;
		}

		const compareNodeQueryPriority = (
			_this: Transaction,
			_other: Transaction,
		): CompareResult | undefined => {
			const thisNode = _this.message.getNodeUnsafe(this.driver);
			const otherNode = _other.message.getNodeUnsafe(this.driver);
			if (thisNode && otherNode) {
				// Both nodes exist
				const thisListening = thisNode.isListening
					|| thisNode.isFrequentListening;
				const otherListening = otherNode.isListening
					|| otherNode.isFrequentListening;
				// prioritize (-1) the one node that is listening when the other is not
				if (thisListening && !otherListening) return -1;
				if (!thisListening && otherListening) return 1;
			}
		};

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
