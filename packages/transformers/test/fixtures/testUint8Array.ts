/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-restricted-globals */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";

class Test {
	@validateArgs()
	foo(arg1: Uint8Array): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo(new Uint8Array());
test.foo(Uint8Array.from([0xaa, 0xbb, 0xcc]));
// These should also not throw
test.foo(Buffer.alloc(0));

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo("string"),
	/arg1 to be a Uint8Array/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(undefined),
	/arg1 to be a Uint8Array/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo({ type: "Buffer", data: [170, 187, 204] }),
	/arg1 to be a Uint8Array/,
);
