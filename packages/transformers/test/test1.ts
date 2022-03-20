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
	foo(arg1: number, arg2: Foo = { a: 1, b: 2 }, arg3?: Foo & Bar): void {
		arg1;
		arg2;
		arg3;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo(1, { a: 1, b: 2 }, { a: 1, b: 2, c: 3 });
test.foo(1, { a: 1, b: 2 }, undefined);

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo(1, { a: 1, b: 2 }, { a: 1, b: 2 }),
	/arg3 has the wrong type/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(1, { a: 1, b: "2" }, { a: 1, b: 2, c: 3 }),
	/arg2 is not a \(optional\) Foo/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(true, { a: 1, b: 2 }, undefined),
	/arg1 is not a number/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(undefined, { a: 1, b: 2 }, undefined),
	/arg1 is not a number/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(2, 2, undefined),
	/arg2 is not a \(optional\) Foo/,
);
