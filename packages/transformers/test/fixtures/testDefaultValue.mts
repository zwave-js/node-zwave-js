/* eslint-disable @typescript-eslint/no-unused-expressions */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";

class Test {
	@validateArgs()
	foo(arg1: number = 5): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	bar(arg1: number | string = 5): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo();
test.foo(1);
test.foo(undefined);

test.bar();
test.bar(1);
test.bar("str");
test.bar(undefined);

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo(true),
	/optional parameter arg1 to be a number, got true/,
);

assert.throws(
	// @ts-expect-error
	() => test.bar(true),
	/optional parameter arg1 to be one of (number \| string|string \| number), got true/,
);
