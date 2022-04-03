import { validateArgs } from "@zwave-js/transformers";
import assert from "assert";
import type { FooBar as Imported } from "./_includes";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ImportedClass = require("./_includes").FooBar;

class Local {
	constructor() {
		this.foo = "bar";
	}

	public foo: "bar";
}

class Test {
	@validateArgs()
	foo(arg1: Local): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	bar(arg1: Imported): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo(new Local());
test.bar(new ImportedClass());

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo("string"),
	/arg1 is not a Local/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(undefined),
	/arg1 is not a Local/,
);
assert.throws(() => test.foo(new ImportedClass()), /arg1 is not a Local/);
assert.throws(
	// @ts-expect-error
	() => test.bar("string"),
	/arg1 is not a Imported/,
);
assert.throws(
	// @ts-expect-error
	() => test.bar(undefined),
	/arg1 is not a Imported/,
);
assert.throws(
	// @ts-expect-error
	() => test.bar(new Local()),
	/arg1 is not a Imported/,
);
