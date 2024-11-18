/* eslint-disable @typescript-eslint/no-unused-expressions */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";

class Test {
	@validateArgs()
	foo(arg1: Date): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo(new Date());
test.foo(new Date(1996));

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo("string"),
	/arg1 to be a Date/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(undefined),
	/arg1 to be a Date/,
);
