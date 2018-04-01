// tslint:disable:no-unused-expression

import { expect, should } from "chai";
should();

import { MessagePriority } from "../message/Message";
import { Transaction } from "./Transaction";

describe("lib/driver/Transaction => ", () => {
	it("should compare priority, then the timestamp", () => {
		// "winning" means the position of a transaction in the queue is lower

		// t2 has a later timestamp by default
		const t1 = new Transaction(null, null, MessagePriority.Controller);
		const t2 = new Transaction(null, null, MessagePriority.Controller);
		// equal priority, earlier timestamp wins
		t1.compareTo(t2).should.equal(-1);
		t2.compareTo(t1).should.equal(1);

		const t3 = new Transaction(null, null, MessagePriority.Poll);
		const t4 = new Transaction(null, null, MessagePriority.Controller);
		// lower priority loses
		t3.compareTo(t4).should.equal(1);
		t4.compareTo(t3).should.equal(-1);

		// this should not happen but we still need to test it
		const t5 = new Transaction(null, null, MessagePriority.Controller);
		const t6 = new Transaction(null, null, MessagePriority.Controller);
		t6.timestamp = t5.timestamp;
		t5.compareTo(t6).should.equal(0);
		t6.compareTo(t5).should.equal(0);
	});
});
