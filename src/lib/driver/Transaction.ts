import { MessagePriority, MessageType } from "../message/Constants";
import { Message, ResponseRole } from "../message/Message";
import { getNodeId } from "../node/Node";
import { Comparable, compareNumberOrString, CompareResult } from "../util/comparable";
import { DeferredPromise } from "../util/defer-promise";
import { Driver } from "./Driver";

/** Returns a timestamp with nano-second precision */
function highResTimestamp(): number {
	const [s, ns] = process.hrtime();
	return s * 1e9 + ns;
}

export class Transaction implements Comparable<Transaction> {

	constructor(
		driver: Driver,
		message: Message,
		promise: DeferredPromise<Message | void>,
		priority: MessagePriority,
	);
	constructor(
		private readonly driver: Driver,
		public readonly message: Message,
		public readonly promise: DeferredPromise<Message | void>,
		public readonly priority: MessagePriority,
		public timestamp: number = highResTimestamp(),
		public ackPending: boolean = true,
		public response?: Message,
		public retries: number = 0,
	) {
	}

	public compareTo(other: Transaction): CompareResult {
		// first sort by priority
		if (this.priority < other.priority) return -1;
		else if (this.priority > other.priority) return 1;

		// delay node queries for sleeping devices
		if (this.priority === MessagePriority.NodeQuery) {
			const thisNodeId = getNodeId(this.message);
			const otherNodeId = getNodeId(other.message);
			if (thisNodeId != null && otherNodeId != null) {
				// Both messages contain a node ID
				const thisNode = this.driver.controller.nodes.get(thisNodeId);
				const otherNode = this.driver.controller.nodes.get(otherNodeId);
				if (thisNode != null && otherNode != null) {
					// Both nodes exist
					const thisListening = thisNode.isListening || thisNode.isFrequentListening;
					const otherListening = otherNode.isListening || otherNode.isFrequentListening;
					// prioritize (-1) the one node that is listening when the other is not
					if (thisListening && !otherListening) return -1;
					if (!thisListening && otherListening) return 1;
				}
			}
		}

		// for equal priority, sort by the timestamp
		return compareNumberOrString(other.timestamp, this.timestamp);

		// TODO: do we need to sort by the message itself?
	}

	// TODO: add a way to expire these
	// TODO: add a way to resend these
}
