/* eslint-disable @typescript-eslint/no-unused-expressions */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";

interface Foo {
	p1: number;
	p2: string;
}

interface Bar {
	bar: string;
}

class Test {
	@validateArgs()
	both(arg1: Foo & Bar): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.both({
	p1: 1,
	p2: "a string",
	bar: "another string",
});

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.both(true),
	/arg1 is violating multiple constraints/,
);
assert.throws(
	// @ts-expect-error
	() => test.both(true),
	/arg1 to be of type Foo, got true/,
);
assert.throws(
	// @ts-expect-error
	() => test.both(true),
	/arg1 to be of type Bar, got true/,
);

assert.throws(
	// @ts-expect-error
	() => test.both({ what: "a different object" }),
	/arg1 is violating multiple constraints/,
);
assert.throws(
	// @ts-expect-error
	() => test.both({ what: "a different object" }),
	/arg1 is not assignable to Foo/,
);
assert.throws(
	// @ts-expect-error
	() => test.both({ what: "a different object" }),
	/required property p1 is missing/,
);
assert.throws(
	// @ts-expect-error
	() => test.both({ what: "a different object" }),
	/required property p2 is missing/,
);
assert.throws(
	// @ts-expect-error
	() => test.both({ what: "a different object" }),
	/arg1 is not assignable to Bar/,
);
assert.throws(
	// @ts-expect-error
	() => test.both({ what: "a different object" }),
	/required property bar is missing/,
);
