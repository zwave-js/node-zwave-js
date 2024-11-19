/* eslint-disable @typescript-eslint/no-unused-expressions */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";

class Test {
	@validateArgs()
	string(arg1: "literal"): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	number(arg1: 1): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.string("literal");
test.number(1);

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.string("another string"),
	/arg1 to be string "literal", got string "another string"/,
);
assert.throws(
	// @ts-expect-error
	() => test.number(2),
	/arg1 to be 1, got 2/,
);
assert.throws(
	// @ts-expect-error
	() => test.number({}),
	/arg1 to be 1, got object/,
);
