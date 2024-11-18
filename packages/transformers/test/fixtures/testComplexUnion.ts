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
	primitive(arg1: number | string): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	mixed(arg1: Foo | number): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	complex(arg1: Foo | Bar): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.primitive(1);
test.primitive("a string");
test.mixed({ p1: 1, p2: "a string" });
test.mixed(1);
test.complex({ p1: 1, p2: "a string" });
test.complex({ bar: "a string" });

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.primitive(true),
	/arg1 to be one of (number \| string|string \| number), got true/,
);
assert.throws(
	// @ts-expect-error
	() => test.primitive({ p2: "a string" }),
	/arg1 to be one of (number \| string|string \| number), got object/,
);

assert.throws(
	// @ts-expect-error
	() => test.mixed("string"),
	/arg1 to be one of (number \| Foo|Foo \| number), got string "string"/,
);

assert.throws(
	// @ts-expect-error
	() => test.mixed({ p3: true }),
	/arg1 to be one of (number \| Foo|Foo \| number)/,
);
assert.throws(
	// @ts-expect-error
	() => test.mixed({ p3: true }),
	/arg1 is not assignable to Foo/,
);
assert.throws(
	// @ts-expect-error
	() => test.mixed({ p3: true }),
	/required property p1 is missing/,
);
assert.throws(
	// @ts-expect-error
	() => test.mixed({ p3: true }),
	/required property p2 is missing/,
);

assert.throws(
	// @ts-expect-error
	() => test.complex("string"),
	/arg1 to be one of (Foo \| Bar|Bar \| Foo), got string "string"/,
);

assert.throws(
	// @ts-expect-error
	() => test.complex({ something: "else" }),
	/arg1 to be one of (Foo \| Bar|Bar \| Foo)/,
);
assert.throws(
	// @ts-expect-error
	() => test.complex({ something: "else" }),
	/arg1 is not assignable to Foo/,
);
assert.throws(
	// @ts-expect-error
	() => test.complex({ something: "else" }),
	/required property p1 is missing/,
);
assert.throws(
	// @ts-expect-error
	() => test.complex({ something: "else" }),
	/required property p2 is missing/,
);
assert.throws(
	// @ts-expect-error
	() => test.complex({ something: "else" }),
	/arg1 is not assignable to Bar/,
);
assert.throws(
	// @ts-expect-error
	() => test.complex({ something: "else" }),
	/required property bar is missing/,
);
