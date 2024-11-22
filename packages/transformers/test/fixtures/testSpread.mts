/* eslint-disable @typescript-eslint/no-unused-expressions */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";

class Test {
	@validateArgs()
	foo(...args: number[]): void {
		args;
		return void 0;
	}

	@validateArgs()
	bar(arg1: string, ...rest: boolean[]): void {
		arg1;
		rest;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo();
test.foo(1);
test.foo(2, 2);

test.bar("a");
test.bar("a", true);
test.bar("a", true, false);
test.bar("a", true, false, true);

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo(true, 1),
	/args is not assignable to Array<number>/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(true, 1),
	/args\[0\] to be a number, got true/,
);

assert.throws(
	// @ts-expect-error
	() => test.foo(undefined),
	/args\[0\] to be a number, got undefined/,
);

assert.throws(
	// @ts-expect-error
	() => test.bar("a", 1),
	/rest is not assignable to Array<boolean>/,
);
assert.throws(
	// @ts-expect-error
	() => test.bar("a", 1),
	/rest\[0\] to be a boolean, got 1/,
);
