/* eslint-disable @typescript-eslint/no-unused-expressions */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";

export type Foo =
	& {
		groupId: number;
	}
	& (
		| { nodeIds: number[] }
		| { endpoints: string[] }
		| { nodeIds: number[]; endpoints: string[] }
	);

class Test {
	@validateArgs()
	foo(arg1: Foo): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo({ groupId: 1, nodeIds: [1, 2, 3] });
test.foo({ groupId: 1, endpoints: ["a", "b"] });
test.foo({ groupId: 1, nodeIds: [1, 2, 3], endpoints: ["a", "b"] });

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo({ groupId: 1 }),
	/arg1 is not assignable to Foo/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo({ groupId: 1 }),
	/required property nodeIds is missing/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo({ groupId: 1 }),
	/required property endpoints is missing/,
);

assert.throws(
	// @ts-expect-error
	() => test.foo({ nodeIds: [1] }),
	/arg1 is not assignable to Foo/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo({ nodeIds: [1] }),
	/required property groupId is missing/,
);
