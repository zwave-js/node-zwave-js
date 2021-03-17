import { highResTimestamp } from "@zwave-js/core";
import { pick } from "@zwave-js/shared";
import {
	Comparable,
	compareNumberOrString,
	CompareResult,
} from "alcalzone-shared/comparable";
import type { DeferredPromise } from "alcalzone-shared/deferred-promise";
import { MessagePriority } from "../message/Constants";
import type { Message } from "../message/Message";
import { NodeStatus } from "../node/Types";
import type { Driver } from "./Driver";

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
		// We need create the stack on a temporary object or the Error
		// class will try to print the message
		const tmp = { message: "" };
		Error.captureStackTrace(tmp, Transaction);
		this.stack = (tmp as any).stack.replace(/^Error:?\s*\n/, "");
	}

	/** The timestamp at which the transaction was created */
	public creationTimestamp: number = highResTimestamp();

	/** Whether the node status should be updated when this transaction times out */
	public changeNodeStatusOnTimeout: boolean = true;

	/** Internal information used to identify or mark this transaction */
	public tag?: any;

	/** The stack trace where the transaction was created */
	public readonly stack!: string;

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

	public toJSON(): any {
		return pick(this, [
			"creationTimestamp",
			"changeNodeStatusOnTimeout",
			"tag",
			"message",
			"priority",
			"stack",
		]);
	}
}
