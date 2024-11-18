/* eslint-disable @typescript-eslint/no-unused-expressions */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";
import {
	Bar,
	type Baz as ImportedBaz,
	Foo,
	type Foo as BarFoo,
} from "./testClass._imports.mjs";

const { Foo: ImportedFooBar } = await import("./testClass._imports.mjs");

class LocalFoo {
	public foo: "foo" = "foo" as const;
}

// Tests for the static predicate function
// LocalBaz is structurally compatible with Baz, but not the same class
class LocalBaz {
	public baz: "baz" = "baz" as const;
}

class Test {
	// BarFoo is imported with renames. Ensure that the
	// transformer follows this chain correctly
	@validateArgs()
	foo(arg1: BarFoo): void {
		arg1;
		return void 0;
	}

	// Bar is simply imported without any magic
	@validateArgs()
	bar(arg1: Bar): void {
		arg1;
		return void 0;
	}

	// Baz/ImportedBaz has a static type guard and should allow passing
	// a local definition that is structurally compatible
	@validateArgs()
	baz(arg1: ImportedBaz): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.foo(new ImportedFooBar());
test.bar(new Bar());
test.baz(new LocalBaz());
test.baz({ baz: "baz" });

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.foo("string"),
	/arg1 to be an instance of class Foo, got string/,
);
assert.throws(
	// @ts-expect-error
	() => test.foo(undefined),
	/arg1 to be an instance of class Foo, got undefined/,
);
assert.throws(
	() => test.foo(new LocalFoo()),
	/arg1 to be an instance of class Foo, got object/,
);
assert.throws(
	() => test.foo({ foo: "foo" }),
	/arg1 to be an instance of class Foo, got object/,
);

assert.throws(
	// @ts-expect-error
	() => test.bar("string"),
	/arg1 to be an instance of class Bar, got string/,
);
assert.throws(
	// @ts-expect-error
	() => test.bar(undefined),
	/arg1 to be an instance of class Bar, got undefined/,
);
assert.throws(
	() => test.bar({ bar: "bar" }),
	/arg1 to be an instance of class Bar, got object/,
);

assert.throws(
	// @ts-expect-error
	() => test.baz("string"),
	/arg1 to be an instance of class Baz, got string/,
);
assert.throws(
	// @ts-expect-error
	() => test.baz(undefined),
	/arg1 to be an instance of class Baz, got undefined/,
);
assert.throws(
	// @ts-expect-error
	() => test.baz(new Foo()),
	/arg1 to be an instance of class Baz, got object/,
);
