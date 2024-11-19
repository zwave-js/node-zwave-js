/* eslint-disable @typescript-eslint/no-unused-expressions */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";
import type { Bar } from "./testInterface._imports.mjs";

// Define 3 interfaces with the same name to test that we handle
// declaration merging correctly
interface Foo {
	p1: number;
	p2?: string | number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Foo {
}

interface Foo {
	p3?: boolean;
}

class Test {
	@validateArgs()
	foo(arg1: Foo): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	bar(arg1: Bar): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo({ p1: 1 });
test.foo({ p1: -1, p2: "a string" });

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
	() => test.foo(null),
	/arg1 to be of type Foo, got null/,
);

assert.throws(
	// @ts-expect-error
	() => test.foo(() => void 0),
	/arg1 to be of type Foo, got function/,
);
