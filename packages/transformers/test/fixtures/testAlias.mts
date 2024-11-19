/* eslint-disable @typescript-eslint/no-unused-expressions */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";

interface Foo {
	p1: number;
	p2: string;
}

type MyFoo = Foo;
type MyBar = number | string;

class Test {
	@validateArgs()
	foo(arg1: MyFoo): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	bar(arg1: MyBar): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo({
	p1: 1,
	p2: "a string",
});
test.bar(1);
test.bar("a string");

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo({ p2: "a string" }),
	/arg1 is not assignable to Foo/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo({ p2: "a string" }),
	/required property p1 is missing/,
);

assert.throws(
	// @ts-expect-error
	() => test.bar(null),
	/arg1 to be one of (number \| string|string \| number), got null/,
);
