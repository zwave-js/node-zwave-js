// tslint:disable:no-unused-expression

import { expect, should } from "chai";
should();

import { NoOperationCC } from "../commandclass/NoOperationCC";
import { SendDataRequest } from "../controller/SendDataMessages";
import { MessagePriority } from "../message/Constants";
import { Message } from "../message/Message";
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
					[1, {isListening: false, isFrequentListening: false}],
					// 2: listening, but not frequent
					[2, {isListening: true, isFrequentListening: false}],
					// 3: listening, and frequent
					[3, {isListening: true, isFrequentListening: true}],
					// 4: not listening, but frequent listening
					[4, {isListening: false, isFrequentListening: true}],
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
});
