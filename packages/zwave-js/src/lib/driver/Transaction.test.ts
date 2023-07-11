import { NoOperationCC } from "@zwave-js/cc/NoOperationCC";
import { MessagePriority } from "@zwave-js/core";
import { getDefaultPriority, type Message } from "@zwave-js/serial";
import test from "ava";
import { NodeStatus } from "../node/_Types";
import type { ZWaveNode } from "../node/Node";
import { GetControllerVersionRequest } from "../serialapi/capability/GetControllerVersionMessages";
import { RemoveFailedNodeRequest } from "../serialapi/network-mgmt/RemoveFailedNodeMessages";
import { SendDataRequest } from "../serialapi/transport/SendDataMessages";
import type { Driver } from "./Driver";
import {
	Transaction,
	type MessageGenerator,
	type TransactionOptions,
} from "./Transaction";

function createDummyMessageGenerator(msg: Message): MessageGenerator {
	return {
		start: async function* () {
			this.current = msg;
			yield msg;
		},
		self: undefined,
		current: undefined,
		parent: undefined as any,
	};
}

function createDummyTransaction(
	driver: any,
	options: Partial<TransactionOptions>,
): Transaction {
	options.priority ??= MessagePriority.Normal;
	options.message ??= {} as any;
	options.parts = createDummyMessageGenerator(options.message!);
	return new Transaction(driver, options as TransactionOptions);
}

interface MockNode {
	id: number;
	canSleep: boolean;
	status: NodeStatus;
	isCCSecure: ZWaveNode["isCCSecure"];
	getEndpoint: ZWaveNode["getEndpoint"];
}

test("should compare priority, then the timestamp", (t) => {
	const driverMock = {
		controller: {
			nodes: new Map<number, MockNode>(),
		},
		get nodes() {
			return driverMock.controller.nodes;
		},
		getSafeCCVersion() {},
		getSupportedCCVersion() {},
		isCCSecure: () => false,
		options: {
			attempts: {},
		},
	};
	// "winning" means the position of a transaction in the queue is lower

	// t2 has a later timestamp by default
	const t1 = createDummyTransaction(driverMock, {
		priority: MessagePriority.Controller,
	});
	const t2 = createDummyTransaction(driverMock, {
		priority: MessagePriority.Controller,
	});
	// equal priority, earlier timestamp wins
	t.is(t1.compareTo(t2), -1);
	t.is(t2.compareTo(t1), 1);

	const t3 = createDummyTransaction(driverMock, {
		priority: MessagePriority.Poll,
	});
	const t4 = createDummyTransaction(driverMock, {
		priority: MessagePriority.Controller,
	});
	// lower priority loses
	t.is(t3.compareTo(t4), 1);
	t.is(t4.compareTo(t3), -1);

	// this should not happen but we still need to test it
	const t5 = createDummyTransaction(driverMock, {
		priority: MessagePriority.Controller,
	});
	const t6 = createDummyTransaction(driverMock, {
		priority: MessagePriority.Controller,
	});
	t6.creationTimestamp = t5.creationTimestamp;
	t.is(t5.compareTo(t6), 0);
	t.is(t6.compareTo(t5), 0);
});

test("NodeQuery comparisons should prioritize listening nodes", (t) => {
	interface MockNode {
		isListening: boolean;
		isFrequentListening: boolean;
		isCCSecure: ZWaveNode["isCCSecure"];
		getEndpoint: ZWaveNode["getEndpoint"];
	}

	const driverMock = {
		controller: {
			nodes: new Map<number, MockNode>([
				// 1: non-listening
				[
					1,
					{
						isListening: false,
						isFrequentListening: false,
						isCCSecure: () => false,
						getEndpoint: () => undefined as any,
					},
				],
				// 2: listening, but not frequent
				[
					2,
					{
						isListening: true,
						isFrequentListening: false,
						isCCSecure: () => false,
						getEndpoint: () => undefined as any,
					},
				],
				// 3: listening, and frequent
				[
					3,
					{
						isListening: true,
						isFrequentListening: true,
						isCCSecure: () => false,
						getEndpoint: () => undefined as any,
					},
				],
				// 4: not listening, but frequent listening
				[
					4,
					{
						isListening: false,
						isFrequentListening: true,
						isCCSecure: () => false,
						getEndpoint: () => undefined as any,
					},
				],
			]),
		},
		get nodes() {
			return driverMock.controller.nodes;
		},
		getSafeCCVersion() {},
		getSupportedCCVersion() {},
		isCCSecure: () => false,
		options: {
			attempts: {},
		},
	};

	function createTransactionForNode(
		nodeId: number | undefined,
		priority: MessagePriority = MessagePriority.NodeQuery,
	) {
		const driver = driverMock as any as Driver;
		const msg =
			nodeId != undefined
				? new SendDataRequest(driver, {
						command: new NoOperationCC(driver, {
							nodeId,
						}),
				  })
				: new GetControllerVersionRequest(driver);
		const ret = createDummyTransaction(driverMock, {
			priority,
			message: msg,
		});
		ret.creationTimestamp = 0;
		return ret;
	}

	const tNone = createTransactionForNode(1);
	const tList = createTransactionForNode(2);
	const tFreq = createTransactionForNode(3);
	const tListFreq = createTransactionForNode(4);
	const tNoId = createTransactionForNode(undefined as any);
	const tNoNode = createTransactionForNode(5);
	const tListNormalPrio = createTransactionForNode(2, MessagePriority.Normal);
	const tListLowPrio = createTransactionForNode(2, MessagePriority.Poll);
	const tNoneNormalPrio = createTransactionForNode(1, MessagePriority.Normal);
	const tNoneLowPrio = createTransactionForNode(1, MessagePriority.Poll);

	// t2/3/4 prioritized because it's listening and t1 is not
	t.is(tNone.compareTo(tList), 1);
	t.is(tNone.compareTo(tList), 1);
	t.is(tNone.compareTo(tFreq), 1);
	// sanity checks
	t.is(tList.compareTo(tNone), -1);
	t.is(tFreq.compareTo(tNone), -1);
	t.is(tListFreq.compareTo(tNone), -1);
	// equal priority because both are (frequent or not) listening
	t.is(tList.compareTo(tFreq), 0);
	t.is(tList.compareTo(tListFreq), 0);
	// sanity checks
	t.is(tFreq.compareTo(tListFreq), 0);
	t.is(tFreq.compareTo(tList), 0);
	t.is(tListFreq.compareTo(tList), 0);

	// NodeQuery (non listening) should be lower than other priorities (listening)
	t.is(tNone.compareTo(tListLowPrio), 1);
	t.is(tNone.compareTo(tListNormalPrio), 1);
	// sanity checks
	t.is(tListLowPrio.compareTo(tNone), -1);
	t.is(tListNormalPrio.compareTo(tNone), -1);

	// The default order should apply when both nodes are not listening
	t.is(tNone.compareTo(tNoneNormalPrio), 1);
	t.is(tNone.compareTo(tNoneLowPrio), -1);
	// sanity checks
	t.is(tNoneNormalPrio.compareTo(tNone), -1);
	t.is(tNoneLowPrio.compareTo(tNone), 1);

	// fallbacks for undefined nodes
	t.is(tNoId.compareTo(tNone), 0);
	t.is(tNoId.compareTo(tList), 0);
	t.is(tFreq.compareTo(tNoId), 0);
	t.is(tListFreq.compareTo(tNoId), 0);
	t.is(tNoNode.compareTo(tNone), 0);
	t.is(tNoNode.compareTo(tList), 0);
	t.is(tFreq.compareTo(tNoNode), 0);
	t.is(tListFreq.compareTo(tNoNode), 0);
});

test("Messages in the wakeup queue should be preferred over lesser priorities only if the node is awake", (t) => {
	const driverMock = {
		controller: {
			nodes: new Map<number, MockNode>([
				// 1: awake
				[
					1,
					{
						id: 1,
						// non-sleeping
						canSleep: false,
						status: NodeStatus.Alive,
						isCCSecure: () => false,
						getEndpoint: () => undefined as any,
					},
				],
				// 2: not awake
				[
					2,
					{
						id: 2,
						// sleeping
						canSleep: true,
						status: NodeStatus.Asleep,
						isCCSecure: () => false,
						getEndpoint: () => undefined as any,
					},
				],
			]),
		},
		get nodes() {
			return driverMock.controller.nodes;
		},
		getSafeCCVersion() {},
		getSupportedCCVersion() {},
		isCCSecure: () => false,
		options: {
			attempts: {},
		},
	} as unknown as Driver;

	function createTransaction(nodeId: number, priority: MessagePriority) {
		const driver = driverMock as any as Driver;
		const msg = new SendDataRequest(driver, {
			command: new NoOperationCC(driver, { nodeId }),
		});
		const ret = createDummyTransaction(driverMock, {
			priority,
			message: msg,
		});
		ret.creationTimestamp = 0;
		return ret;
	}

	// Node awake, higher priority than WakeUp
	const tAwakeHigh = createTransaction(1, MessagePriority.Controller);
	// Node awake, WakeUp priority
	const tAwakeWU = createTransaction(1, MessagePriority.WakeUp);
	// Node awake, lowest priority
	const tAwakeLow = createTransaction(1, MessagePriority.Poll);
	// Node asleep, higher priority than WakeUp
	const tAsleepHigh = createTransaction(2, MessagePriority.Controller);
	// Node asleep, WakeUp priority
	const tAsleepWU = createTransaction(2, MessagePriority.WakeUp);
	// Node asleep, lowest priority
	const tAsleepLow = createTransaction(2, MessagePriority.Poll);

	// For alive nodes, the conventional order should apply
	t.is(tAwakeHigh.compareTo(tAwakeWU), -1);
	t.is(tAwakeHigh.compareTo(tAwakeLow), -1);
	t.is(tAwakeWU.compareTo(tAwakeLow), -1);
	// Test the opposite direction aswell
	t.is(tAwakeWU.compareTo(tAwakeHigh), 1);
	t.is(tAwakeLow.compareTo(tAwakeHigh), 1);
	t.is(tAwakeLow.compareTo(tAwakeWU), 1);

	// For asleep nodes, the conventional order should apply too
	t.is(tAsleepHigh.compareTo(tAsleepWU), -1);
	t.is(tAsleepHigh.compareTo(tAsleepLow), -1);
	t.is(tAsleepWU.compareTo(tAsleepLow), -1);
	// Test the opposite direction aswell
	t.is(tAsleepWU.compareTo(tAsleepHigh), 1);
	t.is(tAsleepLow.compareTo(tAsleepHigh), 1);
	t.is(tAsleepLow.compareTo(tAsleepWU), 1);

	// The wake-up priority of sleeping nodes is lower than everything else of awake nodes
	t.is(tAsleepWU.compareTo(tAwakeHigh), 1);
	t.is(tAsleepWU.compareTo(tAwakeWU), 1);
	t.is(tAsleepWU.compareTo(tAwakeLow), 1);
	// Test the opposite direction aswell
	t.is(tAwakeHigh.compareTo(tAsleepWU), -1);
	t.is(tAwakeWU.compareTo(tAsleepWU), -1);
	t.is(tAwakeLow.compareTo(tAsleepWU), -1);
});

// Repro for #550
test("Controller message should be preferred over messages for sleeping nodes", (t) => {
	const driverMock = {
		controller: {
			nodes: new Map<number, MockNode>([
				// 1: non-sleeping
				[
					1,
					{
						id: 1,
						// non-sleeping
						canSleep: false,
						status: NodeStatus.Alive,
						isCCSecure: () => false,
						getEndpoint: () => undefined as any,
					},
				],
				// 2: not awake
				[
					2,
					{
						id: 2,
						// sleeping
						canSleep: true,
						status: NodeStatus.Asleep,
						isCCSecure: () => false,
						getEndpoint: () => undefined as any,
					},
				],
			]),
		},
		get nodes() {
			return driverMock.controller.nodes;
		},
		getSafeCCVersion() {},
		getSupportedCCVersion() {},
		isCCSecure: () => false,
		options: {
			attempts: {},
		},
	} as unknown as Driver;

	let creationTimestamp = 0;
	function createTransaction(
		msg: Message,
		priority: MessagePriority = getDefaultPriority(msg)!,
	) {
		const ret = createDummyTransaction(driverMock, {
			priority,
			message: msg,
		});
		ret.creationTimestamp = ++creationTimestamp;
		return ret;
	}

	const msgForSleepingNode = new SendDataRequest(driverMock, {
		command: new NoOperationCC(driverMock, { nodeId: 2 }),
	});
	const tSleepingNode = createTransaction(
		msgForSleepingNode,
		MessagePriority.WakeUp,
	);
	const msgForController = new RemoveFailedNodeRequest(driverMock, {
		failedNodeId: 3,
	});
	const tController = createTransaction(msgForController);

	// The controller transaction should have a higher priority
	t.is(tController.compareTo(tSleepingNode), -1);
});

test("should capture a stack trace where it was created", (t) => {
	const driverMock = {
		controller: {
			nodes: new Map<number, MockNode>(),
		},
		get nodes() {
			return driverMock.controller.nodes;
		},
		getSafeCCVersion() {},
		getSupportedCCVersion() {},
		isCCSecure: () => false,
		options: {
			attempts: {},
		},
	};
	const test = createDummyTransaction(driverMock, {
		message: "FOOBAR" as any,
	});
	t.true(test.stack.includes(__filename));
	t.false(test.stack.includes("FOOBAR"));
});
