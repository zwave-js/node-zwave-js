import { validateArgs } from "@zwave-js/transformers";
import assert from "assert";

enum My {
	Foot,
	Hand,
	Eye,
}

class Test {
	@validateArgs()
	foo(arg1: My): void {
		arg1;
		return void 0;
	}

	@validateArgs({ strictEnums: true })
	bar(arg1: My): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo(1);
test.foo(My.Hand);
test.foo(My.Eye);
test.foo(10000000);

test.bar(1);
test.bar(My.Hand);
test.bar(My.Eye);

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo("string"),
	/arg1 is not a My/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo("Hand"),
	/arg1 is not a My/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(true),
	/arg1 is not a My/,
);

assert.throws(() => test.bar(10000), /arg1 is not a My/);
