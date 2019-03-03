// tslint:disable:no-unused-expression

import { expect, should } from "chai";
should();

import { CommandClasses } from "../commandclass/CommandClass";
import { NoOperationCC } from "../commandclass/NoOperationCC";
import { WakeUpCC } from "../commandclass/WakeUpCC";
import { SendDataRequest } from "../controller/SendDataMessages";
import { MessagePriority } from "../message/Constants";
import { ZWaveNode } from "../node/Node";
import { ValueDB } from "../node/ValueDB";
import { Driver } from "./Driver";
import { Transaction } from "./Transaction";

describe("lib/driver/Transaction => ", () => {
	it("should compare priority, then the timestamp", () => {
		// "winning" means the position of a transaction in the queue is lower

		// t2 has a later timestamp by default
		const t1 = new Transaction(null, null, null, MessagePriority.Controller);
		const t2 = new Transaction(null, null, null, MessagePriority.Controller);
		// equal priority, earlier timestamp wins
		t1.compareTo(t2).should.equal(-1);
		t2.compareTo(t1).should.equal(1);

		const t3 = new Transaction(null, null, null, MessagePriority.Poll);
		const t4 = new Transaction(null, null, null, MessagePriority.Controller);
		// lower priority loses
		t3.compareTo(t4).should.equal(1);
		t4.compareTo(t3).should.equal(-1);

		// this should not happen but we still need to test it
		const t5 = new Transaction(null, null, null, MessagePriority.Controller);
		const t6 = new Transaction(null, null, null, MessagePriority.Controller);
		t6.timestamp = t5.timestamp;
		t5.compareTo(t6).should.equal(0);
		t6.compareTo(t5).should.equal(0);
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
		};

		function createTransaction(nodeID: number) {
			const driver = driverMock as any as Driver;
			const msg = new SendDataRequest(driver, new NoOperationCC(driver, nodeID));
			const ret = new Transaction(driver, msg, null, MessagePriority.NodeQuery);
			ret.timestamp = 0;
			return ret;
		}

		const t1 = createTransaction(1);
		const t2 = createTransaction(2);
		const t3 = createTransaction(3);
		const t4 = createTransaction(4);
		const tNoId = createTransaction(undefined);
		const tNoNode = createTransaction(5);

		// t2/3/4 prioritized because it's listening and t1 is not
		t1.compareTo(t2).should.equal(1);
		t1.compareTo(t2).should.equal(1);
		t1.compareTo(t3).should.equal(1);
		// sanity checks
		t2.compareTo(t1).should.equal(-1);
		t3.compareTo(t1).should.equal(-1);
		t4.compareTo(t1).should.equal(-1);
		// equal priority because both are (frequent or not) listening
		t2.compareTo(t3).should.equal(0);
		t2.compareTo(t4).should.equal(0);
		// sanity checks
		t3.compareTo(t4).should.equal(0);
		t3.compareTo(t2).should.equal(0);
		t4.compareTo(t2).should.equal(0);

		// fallbacks for undefined nodes
		tNoId.compareTo(t1).should.equal(0);
		tNoId.compareTo(t2).should.equal(0);
		t3.compareTo(tNoId).should.equal(0);
		t4.compareTo(tNoId).should.equal(0);
		tNoNode.compareTo(t1).should.equal(0);
		tNoNode.compareTo(t2).should.equal(0);
		t3.compareTo(tNoNode).should.equal(0);
		t4.compareTo(tNoNode).should.equal(0);
	});

	it("Messages in the wakeup queue should be preferred over lesser priorities only if the node is awake", () => {
		interface MockNode {
			id: number;
			valueDB: ValueDB;
			supportsCC: ZWaveNode["supportsCC"];
		}

		function supportsCC(cc: CommandClasses) {
			return cc === CommandClasses["Wake Up"];
		}

		const driverMock = {
			controller: {
				nodes: new Map<number, MockNode>([
					// 1: awake
					[1, {id: 1, valueDB: new ValueDB(), supportsCC }],
					// 2: not awake
					[2, {id: 2, valueDB: new ValueDB(), supportsCC }],
				]),
			},
		} as unknown as Driver;

		// Mark the first node as awake
		const wakeupCC1 = new WakeUpCC(driverMock, 1);
		wakeupCC1.setAwake(true);

		// Mark the second node as sleeping
		const wakeupCC2 = new WakeUpCC(driverMock, 2);
		wakeupCC2.setAwake(false);

		function createTransaction(nodeID: number, priority: MessagePriority) {
			const driver = driverMock as any as Driver;
			const msg = new SendDataRequest(driver, new NoOperationCC(driver, nodeID));
			const ret = new Transaction(driver, msg, null, priority);
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
		tAwakeHigh.compareTo(tAwakeWU).should.equal(-1);
		tAwakeHigh.compareTo(tAwakeLow).should.equal(-1);
		tAwakeWU.compareTo(tAwakeLow).should.equal(-1);

		// For asleep nodes, the conventional order should apply too
		tAsleepHigh.compareTo(tAsleepWU).should.equal(-1);
		tAsleepHigh.compareTo(tAsleepLow).should.equal(-1);
		tAsleepWU.compareTo(tAsleepLow).should.equal(-1);

		// The wake-up priority of sleeping nodes is lower than everything else of awake nodes
		tAsleepWU.compareTo(tAwakeHigh).should.equal(1);
		tAsleepWU.compareTo(tAwakeWU).should.equal(1);
		tAsleepWU.compareTo(tAwakeLow).should.equal(1);
	});
});
