import { NoOperationCC } from "@zwave-js/cc/NoOperationCC";
import { MessagePriority } from "@zwave-js/core";
import { type Message, getDefaultPriority } from "@zwave-js/serial";
import { GetControllerVersionRequest } from "@zwave-js/serial/serialapi";
import { RemoveFailedNodeRequest } from "@zwave-js/serial/serialapi";
import { SendDataRequest } from "@zwave-js/serial/serialapi";
import { test } from "vitest";
import type { ZWaveNode } from "../node/Node.js";
import { NodeStatus } from "../node/_Types.js";
import type { Driver } from "./Driver.js";
import {
	type MessageGenerator,
	Transaction,
	type TransactionOptions,
} from "./Transaction.js";

function createDummyMessageGenerator(msg: Message): MessageGenerator {
	return {
		start: async function*() {
			this.current = msg;
			yield msg;
		},
		self: undefined,
		current: undefined,
		parent: undefined as any,
		reset() {
			this.current = undefined;
		},
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
		getNode(nodeId: number) {
			return driverMock.controller.nodes.get(nodeId);
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
	t.expect(t1.compareTo(t2)).toBe(-1);
	t.expect(t2.compareTo(t1)).toBe(1);

	const t3 = createDummyTransaction(driverMock, {
		priority: MessagePriority.Poll,
	});
	const t4 = createDummyTransaction(driverMock, {
		priority: MessagePriority.Controller,
	});
	// lower priority loses
	t.expect(t3.compareTo(t4)).toBe(1);
	t.expect(t4.compareTo(t3)).toBe(-1);

	// this should not happen but we still need to test it
	const t5 = createDummyTransaction(driverMock, {
		priority: MessagePriority.Controller,
	});
	const t6 = createDummyTransaction(driverMock, {
		priority: MessagePriority.Controller,
	});
	t6.creationTimestamp = t5.creationTimestamp;
	t.expect(t5.compareTo(t6)).toBe(0);
	t.expect(t6.compareTo(t5)).toBe(0);
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
		getNode(nodeId: number) {
			return driverMock.controller.nodes.get(nodeId);
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
		const msg = nodeId != undefined
			? new SendDataRequest({
				command: new NoOperationCC({
					nodeId,
				}),
			})
			: new GetControllerVersionRequest();
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
	t.expect(tNone.compareTo(tList)).toBe(1);
	t.expect(tNone.compareTo(tList)).toBe(1);
	t.expect(tNone.compareTo(tFreq)).toBe(1);
	// sanity checks
	t.expect(tList.compareTo(tNone)).toBe(-1);
	t.expect(tFreq.compareTo(tNone)).toBe(-1);
	t.expect(tListFreq.compareTo(tNone)).toBe(-1);
	// equal priority because both are (frequent or not) listening
	t.expect(tList.compareTo(tFreq)).toBe(0);
	t.expect(tList.compareTo(tListFreq)).toBe(0);
	// sanity checks
	t.expect(tFreq.compareTo(tListFreq)).toBe(0);
	t.expect(tFreq.compareTo(tList)).toBe(0);
	t.expect(tListFreq.compareTo(tList)).toBe(0);

	// NodeQuery (non listening) should be lower than other priorities (listening)
	t.expect(tNone.compareTo(tListLowPrio)).toBe(1);
	t.expect(tNone.compareTo(tListNormalPrio)).toBe(1);
	// sanity checks
	t.expect(tListLowPrio.compareTo(tNone)).toBe(-1);
	t.expect(tListNormalPrio.compareTo(tNone)).toBe(-1);

	// The default order should apply when both nodes are not listening
	t.expect(tNone.compareTo(tNoneNormalPrio)).toBe(1);
	t.expect(tNone.compareTo(tNoneLowPrio)).toBe(-1);
	// sanity checks
	t.expect(tNoneNormalPrio.compareTo(tNone)).toBe(-1);
	t.expect(tNoneLowPrio.compareTo(tNone)).toBe(1);

	// fallbacks for undefined nodes
	t.expect(tNoId.compareTo(tNone)).toBe(0);
	t.expect(tNoId.compareTo(tList)).toBe(0);
	t.expect(tFreq.compareTo(tNoId)).toBe(0);
	t.expect(tListFreq.compareTo(tNoId)).toBe(0);
	t.expect(tNoNode.compareTo(tNone)).toBe(0);
	t.expect(tNoNode.compareTo(tList)).toBe(0);
	t.expect(tFreq.compareTo(tNoNode)).toBe(0);
	t.expect(tListFreq.compareTo(tNoNode)).toBe(0);
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
		getNode(nodeId: number) {
			return driverMock.controller.nodes.get(nodeId);
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
		const msg = new SendDataRequest({
			command: new NoOperationCC({ nodeId }),
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
	t.expect(tAwakeHigh.compareTo(tAwakeWU)).toBe(-1);
	t.expect(tAwakeHigh.compareTo(tAwakeLow)).toBe(-1);
	t.expect(tAwakeWU.compareTo(tAwakeLow)).toBe(-1);
	// Test the opposite direction aswell
	t.expect(tAwakeWU.compareTo(tAwakeHigh)).toBe(1);
	t.expect(tAwakeLow.compareTo(tAwakeHigh)).toBe(1);
	t.expect(tAwakeLow.compareTo(tAwakeWU)).toBe(1);

	// For asleep nodes, the conventional order should apply too
	t.expect(tAsleepHigh.compareTo(tAsleepWU)).toBe(-1);
	t.expect(tAsleepHigh.compareTo(tAsleepLow)).toBe(-1);
	t.expect(tAsleepWU.compareTo(tAsleepLow)).toBe(-1);
	// Test the opposite direction aswell
	t.expect(tAsleepWU.compareTo(tAsleepHigh)).toBe(1);
	t.expect(tAsleepLow.compareTo(tAsleepHigh)).toBe(1);
	t.expect(tAsleepLow.compareTo(tAsleepWU)).toBe(1);

	// The wake-up priority of sleeping nodes is lower than everything else of awake nodes
	t.expect(tAsleepWU.compareTo(tAwakeHigh)).toBe(1);
	t.expect(tAsleepWU.compareTo(tAwakeWU)).toBe(1);
	t.expect(tAsleepWU.compareTo(tAwakeLow)).toBe(1);
	// Test the opposite direction aswell
	t.expect(tAwakeHigh.compareTo(tAsleepWU)).toBe(-1);
	t.expect(tAwakeWU.compareTo(tAsleepWU)).toBe(-1);
	t.expect(tAwakeLow.compareTo(tAsleepWU)).toBe(-1);
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
		getNode(nodeId: number) {
			return driverMock.controller.nodes.get(nodeId);
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

	const msgForSleepingNode = new SendDataRequest({
		command: new NoOperationCC({ nodeId: 2 }),
	});
	const tSleepingNode = createTransaction(
		msgForSleepingNode,
		MessagePriority.WakeUp,
	);
	const msgForController = new RemoveFailedNodeRequest({
		failedNodeId: 3,
	});
	const tController = createTransaction(msgForController);

	// The controller transaction should have a higher priority
	t.expect(tController.compareTo(tSleepingNode)).toBe(-1);
});

test("should capture a stack trace where it was created", (t) => {
	const driverMock = {
		controller: {
			nodes: new Map<number, MockNode>(),
		},
		getNode(nodeId: number) {
			return driverMock.controller.nodes.get(nodeId);
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
	t.expect(test.stack.includes(__filename)).toBe(true);
	t.expect(test.stack.includes("FOOBAR")).toBe(false);
});
