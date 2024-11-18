/* eslint-disable @typescript-eslint/no-unused-expressions */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";

class TestAny {
	@validateArgs()
	foo(arg1: any): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	bar(arg1: any, arg2: boolean | undefined): void {
		arg1;
		arg2;
		return void 0;
	}
}

class TestUnknown {
	@validateArgs()
	foo(arg1: unknown): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	bar(arg1: any, arg2: boolean | undefined): void {
		arg1;
		arg2;
		return void 0;
	}
}

const testAny = new TestAny();
const testUnknown = new TestUnknown();

// These should not throw
testAny.foo(1);
testAny.foo(true);
testAny.foo(undefined);
testAny.foo({ a: 1, b: 2 });
testAny.foo(() => void 0);
testAny.foo(new TestAny());
testAny.foo(testAny.foo(globalThis));

testAny.bar(1, true);
testAny.bar(true, true);
testAny.bar(undefined, true);
testAny.bar(7, undefined);

testUnknown.foo(1);
testUnknown.foo(true);
testUnknown.foo(undefined);
testUnknown.foo({ a: 1, b: 2 });
testUnknown.foo(() => void 0);
testUnknown.foo(new TestUnknown());
testUnknown.foo(testUnknown.foo(globalThis));

testUnknown.bar(1, true);
testUnknown.bar(true, true);
testUnknown.bar(undefined, true);
testUnknown.bar(7, undefined);

// These should throw
assert.throws(
	// @ts-expect-error
	() => testAny.bar(true, 1),
	/parameter arg2 to be a boolean/,
);

assert.throws(
	// @ts-expect-error
	() => testUnknown.bar(true, 1),
	/parameter arg2 to be a boolean/,
);
