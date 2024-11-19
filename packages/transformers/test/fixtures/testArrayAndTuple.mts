/* eslint-disable @typescript-eslint/no-unused-expressions */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";

class Test {
	@validateArgs()
	foo(arg1: number[]): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	bar(arg1: [number, string]): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	baz(arg1: [number?, string?]): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	bip(arg1: (boolean | string)[]): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	nested(arg1: [[][]]): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo([]);
test.foo([1, 2, 3]);
test.bar([1, "a"]);
test.baz([]);
test.bip([true, "a"]);
test.bip(["true", false]);
test.nested([[[], []]]);

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo("string"),
	/arg1 to be an Array<number>, got string "string"/,
);

assert.throws(
	// @ts-expect-error
	() => test.foo(["1", 2]),
	/arg1 is not assignable to Array<number>/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(["1", 2]),
	/arg1\[0\] to be a number, got string "1"/,
);

assert.throws(
	// @ts-expect-error
	() => test.bar(["1", 2]),
	/arg1 is not assignable to \[number, string\]/,
);
assert.throws(
	// @ts-expect-error
	() => test.bar(["1", 2]),
	/arg1\[0\] to be a number, got string "1"/,
);
assert.throws(
	// @ts-expect-error
	() => test.bar(["1", 2]),
	/arg1\[1\] to be a string, got 2/,
);

assert.throws(
	// @ts-expect-error
	() => test.bar([1, "2", true]),
	/arg1 to be of type \[number, string\], got tuple with 3 items/,
);

assert.throws(
	// @ts-expect-error
	() => test.bar([1, "2", undefined]),
	/arg1 to be of type \[number, string\], got tuple with 3 items/,
);

assert.throws(
	// @ts-expect-error
	() => test.bar([1]),
	/arg1 is not assignable to \[number, string\]/,
);
assert.throws(
	// @ts-expect-error
	() => test.bar([1]),
	/arg1\[1\] to be a string, got undefined/,
);

assert.throws(
	// @ts-expect-error
	() => test.nested([1]),
	/arg1\[0\] to be an Array/,
);

assert.throws(
	// @ts-expect-error
	() => test.nested([[1]]),
	/arg1\[0\]\[0\] to be of type \[\]/,
);
