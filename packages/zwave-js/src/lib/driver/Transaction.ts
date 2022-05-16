import { highResTimestamp } from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import { MessagePriority } from "@zwave-js/serial";
import {
	Comparable,
	compareNumberOrString,
	CompareResult,
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
}

/**
 * Transactions are used to track and correllate messages with their responses.
 */
export class Transaction implements Comparable<Transaction> {
	public constructor(
		private readonly driver: Driver,
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
		for (const prop of [
			"_stack",
			"creationTimestamp",
			"changeNodeStatusOnTimeout",
			"pauseSendThread",
			"requestWakeUpOnDemand",
		] as const) {
			(ret as any)[prop] = this[prop];
		}
		return ret;
	}

	/** Will be resolved/rejected by the Send Thread Machine when the entire transaction is handled */
	public readonly promise: DeferredPromise<Message | void> =
		this.options.promise;

	/** The "primary" message this transaction contains, e.g. the un-encapsulated version of a SendData request */
	public readonly message: Message = this.options.message;

	/** The message generator to create the actual messages for this transaction */
	public readonly parts: MessageGenerator = this.options.parts;

	/**
	 * Returns the current message of this transaction. This is either the currently active partial message
	 * or the primary message if the generator hasn't been started yet.
	 */
	public getCurrentMessage(): Message | undefined {
		return this.parts.current ?? this.message;
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
		function compareWakeUpPriority(
			_this: Transaction,
			_other: Transaction,
		): CompareResult | undefined {
			const thisNode = _this.message.getNodeUnsafe();
			const otherNode = _other.message.getNodeUnsafe();

			// We don't require existence of the node object
			// If any transaction is not for a node, it targets the controller
			// which is always awake
			const thisIsAsleep = thisNode?.status === NodeStatus.Asleep;
			const otherIsAsleep = otherNode?.status === NodeStatus.Asleep;

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
