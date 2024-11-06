import { test } from "vitest";
import { MessagePriority, isMessagePriority } from "./MessagePriority.js";

test("isMessagePriority() should detect numbers in the enum range as a message priority", (t) => {
	const numericKeys = Object.keys(MessagePriority)
		.map((key) => parseInt(key, 10))
		.filter((num) => !Number.isNaN(num));
	const minKey = Math.min(...numericKeys);
	const maxKey = Math.max(...numericKeys);
	for (let num = minKey - 2; num <= maxKey + 2; num++) {
		t.expect(isMessagePriority(num)).toBe(num >= minKey && num <= maxKey);
	}
});

test("isMessagePriority() should not detect anything else as a message priority", (t) => {
	const notAPriority: any[] = [null, undefined, "", [], {}, true, false];
	for (const stuff of notAPriority) {
		t.expect(isMessagePriority(stuff)).toBe(false);
	}
});
