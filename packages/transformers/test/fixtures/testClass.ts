import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";
import type { Baz, FooBar as Imported } from "./_includes";

const ImportedFooBar = require("./_includes").FooBar;

class Local {
	constructor() {
		this.foo = "bar";
	}

	public foo: "bar";
}

// Tests for the static predicate function
// LocalBaz is structurally compatible with Baz, but not the same class
class LocalBaz {
	public baz: "baz" = "baz" as const;
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

	@validateArgs()
	baz(arg1: Baz): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo(new Local());
test.bar(new ImportedFooBar());
test.baz(new LocalBaz());

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
assert.throws(() => test.foo(new ImportedFooBar()), /arg1 is not a Local/);
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
assert.throws(
	() => test.baz(new ImportedFooBar()),
	/arg1 is not a Baz/,
);
