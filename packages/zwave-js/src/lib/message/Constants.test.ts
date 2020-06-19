import { isMessagePriority, MessagePriority } from "./Constants";

describe("lib/message/Constants => isMessagePriority() => ", () => {
	it("should detect numbers in the enum range as a message priority", () => {
		const numericKeys = Object.keys(MessagePriority)
			.map((key) => parseInt(key, 10))
			.filter((num) => !Number.isNaN(num));
		const minKey = Math.min(...numericKeys);
		const maxKey = Math.max(...numericKeys);
		for (let num = minKey - 2; num <= maxKey + 2; num++) {
			expect(isMessagePriority(num)).toBe(num >= minKey && num <= maxKey);
		}
	});

	it("should not detect anything else as a message priority", () => {
		const notAPriority: any[] = [null, undefined, "", [], {}, true, false];
		for (const stuff of notAPriority) {
			expect(isMessagePriority(stuff)).toBe(false);
		}
	});
});
