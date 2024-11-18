/* eslint-disable @typescript-eslint/no-unused-expressions */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";

class Test {
	@validateArgs()
	foo(arg1: number, arg2: boolean): void {
		arg1;
		arg2;
		return void 0;
	}

	@validateArgs()
	bar(arg1?: number, arg2?: boolean): void {
		arg1;
		arg2;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo(1, true);
test.foo(0, false);

test.bar(undefined, undefined);
test.bar(7, undefined);
test.bar(undefined, true);
test.bar(0, false);

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo(true, 1),
	/parameter arg1 to be a number/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(true, 1),
	/parameter arg2 to be a boolean/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(undefined, true),
	/parameter arg1 to be a number/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(1, undefined),
	/parameter arg2 to be a boolean/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(1, { a: 1, b: 2 }),
	/parameter arg2 to be a boolean/,
);

assert.throws(
	// @ts-expect-error
	() => test.bar(true, 1),
	/parameter arg1 to be a number/,
);
assert.throws(
	// @ts-expect-error
	() => test.bar(true, 1),
	/parameter arg2 to be a boolean/,
);
assert.throws(
	// @ts-expect-error
	() => test.bar(true, undefined),
	/parameter arg1 to be a number/,
);
assert.throws(
	// @ts-expect-error
	() => test.bar(undefined, 1),
	/parameter arg2 to be a boolean/,
);
assert.throws(
	// @ts-expect-error
	() => test.bar(undefined, { a: 1 }),
	/parameter arg2 to be a boolean/,
);
