import { CommandClasses } from "../commandclass/CommandClasses";
import { NoOperationCC } from "../commandclass/NoOperationCC";
import { SendDataRequest } from "../controller/SendDataMessages";
import { MessagePriority } from "../message/Constants";
import { ZWaveNode } from "../node/Node";
import { Driver } from "./Driver";
import { MAX_SEND_ATTEMPTS, Transaction } from "./Transaction";

function createTransactionWithPriority(priority: MessagePriority): Transaction {
	return new Transaction(
		undefined as any,
		{} as any,
		undefined as any,
		priority,
	);
}

describe("lib/driver/Transaction => ", () => {
	it("should compare priority, then the timestamp", () => {
		// "winning" means the position of a transaction in the queue is lower

		// t2 has a later timestamp by default
		const t1 = createTransactionWithPriority(MessagePriority.Controller);
		const t2 = createTransactionWithPriority(MessagePriority.Controller);
		// equal priority, earlier timestamp wins
		expect(t1.compareTo(t2)).toBe(-1);
		expect(t2.compareTo(t1)).toBe(1);

		const t3 = createTransactionWithPriority(MessagePriority.Poll);
		const t4 = createTransactionWithPriority(MessagePriority.Controller);
		// lower priority loses
		expect(t3.compareTo(t4)).toBe(1);
		expect(t4.compareTo(t3)).toBe(-1);

		// this should not happen but we still need to test it
		const t5 = createTransactionWithPriority(MessagePriority.Controller);
		const t6 = createTransactionWithPriority(MessagePriority.Controller);
		t6.timestamp = t5.timestamp;
		expect(t5.compareTo(t6)).toBe(0);
		expect(t6.compareTo(t5)).toBe(0);
	});

	it("NodeQuery comparisons should prioritize listening nodes", () => {
		interface MockNode {
			isListening: boolean;
			isFrequentListening: boolean;
		}

		const driverMock = {
			controller: {
				nodes: new Map<number, MockNode>([
					// 1: non-listening
					[1, { isListening: false, isFrequentListening: false }],
					// 2: listening, but not frequent
					[2, { isListening: true, isFrequentListening: false }],
					// 3: listening, and frequent
					[3, { isListening: true, isFrequentListening: true }],
					// 4: not listening, but frequent listening
					[4, { isListening: false, isFrequentListening: true }],
				]),
			},
			getSafeCCVersionForNode() {},
		};

		function createTransactionForNode(nodeId: number) {
			const driver = (driverMock as any) as Driver;
			const msg = new SendDataRequest(driver, {
				command: new NoOperationCC(driver, { nodeId }),
			});
			const ret = new Transaction(
				driver,
				msg,
				undefined as any,
				MessagePriority.NodeQuery,
			);
			ret.timestamp = 0;
			return ret;
		}

		const t1 = createTransactionForNode(1);
		const t2 = createTransactionForNode(2);
		const t3 = createTransactionForNode(3);
		const t4 = createTransactionForNode(4);
		const tNoId = createTransactionForNode(undefined as any);
		const tNoNode = createTransactionForNode(5);

		// t2/3/4 prioritized because it's listening and t1 is not
		expect(t1.compareTo(t2)).toBe(1);
		expect(t1.compareTo(t2)).toBe(1);
		expect(t1.compareTo(t3)).toBe(1);
		// sanity checks
		expect(t2.compareTo(t1)).toBe(-1);
		expect(t3.compareTo(t1)).toBe(-1);
		expect(t4.compareTo(t1)).toBe(-1);
		// equal priority because both are (frequent or not) listening
		expect(t2.compareTo(t3)).toBe(0);
		expect(t2.compareTo(t4)).toBe(0);
		// sanity checks
		expect(t3.compareTo(t4)).toBe(0);
		expect(t3.compareTo(t2)).toBe(0);
		expect(t4.compareTo(t2)).toBe(0);

		// fallbacks for undefined nodes
		expect(tNoId.compareTo(t1)).toBe(0);
		expect(tNoId.compareTo(t2)).toBe(0);
		expect(t3.compareTo(tNoId)).toBe(0);
		expect(t4.compareTo(tNoId)).toBe(0);
		expect(tNoNode.compareTo(t1)).toBe(0);
		expect(tNoNode.compareTo(t2)).toBe(0);
		expect(t3.compareTo(tNoNode)).toBe(0);
		expect(t4.compareTo(tNoNode)).toBe(0);
	});

	it("Messages in the wakeup queue should be preferred over lesser priorities only if the node is awake", () => {
		interface MockNode {
			id: number;
			isAwake(): boolean;
			supportsCC: ZWaveNode["supportsCC"];
		}

		function supportsCC(cc: CommandClasses) {
			return cc === CommandClasses["Wake Up"];
		}

		const driverMock = ({
			controller: {
				nodes: new Map<number, MockNode>([
					// 1: awake
					[
						1,
						{
							id: 1,
							isAwake() {
								return true;
							},
							supportsCC,
						},
					],
					// 2: not awake
					[
						2,
						{
							id: 2,
							isAwake() {
								return false;
							},
							supportsCC,
						},
					],
				]),
			},
			getSafeCCVersionForNode() {},
		} as unknown) as Driver;

		function createTransaction(nodeId: number, priority: MessagePriority) {
			const driver = (driverMock as any) as Driver;
			const msg = new SendDataRequest(driver, {
				command: new NoOperationCC(driver, { nodeId }),
			});
			const ret = new Transaction(
				driver,
				msg,
				undefined as any,
				priority,
			);
			ret.timestamp = 0;
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
		expect(tAwakeHigh.compareTo(tAwakeWU)).toBe(-1);
		expect(tAwakeHigh.compareTo(tAwakeLow)).toBe(-1);
		expect(tAwakeWU.compareTo(tAwakeLow)).toBe(-1);

		// For asleep nodes, the conventional order should apply too
		expect(tAsleepHigh.compareTo(tAsleepWU)).toBe(-1);
		expect(tAsleepHigh.compareTo(tAsleepLow)).toBe(-1);
		expect(tAsleepWU.compareTo(tAsleepLow)).toBe(-1);

		// The wake-up priority of sleeping nodes is lower than everything else of awake nodes
		expect(tAsleepWU.compareTo(tAwakeHigh)).toBe(1);
		expect(tAsleepWU.compareTo(tAwakeWU)).toBe(1);
		expect(tAsleepWU.compareTo(tAwakeLow)).toBe(1);
	});

	describe("the number of send attempts", () => {
		let test: Transaction;

		beforeAll(() => {
			test = createTransactionWithPriority(MessagePriority.Normal);
		});

		it("should default to the maximum", () => {
			expect(test.maxSendAttempts).toBe(MAX_SEND_ATTEMPTS);
		});

		it("should not exceed the defined maximum", () => {
			test.maxSendAttempts = MAX_SEND_ATTEMPTS + 1;
			expect(test.maxSendAttempts).toBe(MAX_SEND_ATTEMPTS);
		});

		it("may not be less than 1", () => {
			test.maxSendAttempts = -1;
			expect(test.maxSendAttempts).toBe(1);
		});
	});
});
