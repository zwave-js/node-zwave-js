import { validateArgs } from "@zwave-js/transformers";
import assert from "assert";

interface Foo {
	p1: number;
	p2?: string | number;
}

class Test {
	@validateArgs()
	foo(arg1?: Foo | string): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	bar(arg1?: number | null): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo({ p1: 1 });
test.foo(undefined);
test.bar(1);
test.bar(undefined);
test.bar(null);

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo({ p2: "a string" }),
	/arg1 has the wrong type/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(null),
	/arg1 has the wrong type/,
);
