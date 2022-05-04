import { validateArgs } from "@zwave-js/transformers";
import assert from "assert";

class Test {
	@validateArgs()
	foo(arg1: Buffer): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo(Buffer.from([]));
test.foo(Buffer.from("aabbcc", "hex"));

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo("string"),
	/arg1 is not a Buffer/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(undefined),
	/arg1 is not a Buffer/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo({ type: "Buffer", data: [170, 187, 204] }),
	/arg1 is not a Buffer/,
);
