import { validateArgs } from "@zwave-js/transformers";
import assert from "assert";

type Foo = {
	a: 1;
	b: 2;
};

type Bar = {
	c: 3;
};

class Test {
	@validateArgs()
	foo(arg1: number, arg2: Foo, arg3: Foo & Bar): void {
		arg1;
		arg2;
		arg3;
		return void 0;
	}
}

const test = new Test();
// This should not throw
test.foo(1, { a: 1, b: 2 }, { a: 1, b: 2, c: 3 });

// These should throw
// @ts-expect-error
assert.throws(() => test.foo(1, { a: 1, b: 2 }, { a: 1, b: 2 }));
// @ts-expect-error
assert.throws(() => test.foo(1, { a: 1, b: "2" }, { a: 1, b: 2, c: 3 }));
// @ts-expect-error
assert.throws(() => test.foo(true, { a: 1, b: 2 }, { a: 1, b: 2, c: 3 }));
