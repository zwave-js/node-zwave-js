import { validateArgs } from "@zwave-js/transformers";
import assert from "assert";

interface Foo {
	p1: number;
	p2?: string;
}

class Test {
	@validateArgs()
	foo(arg1: Foo): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo({ p1: 1 });
test.foo({ p1: 1, p2: "a string" });
test.foo({ p1: 1, p2: undefined });

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo({ p2: "a string" }),
	/arg1 is not a Foo/,
);
