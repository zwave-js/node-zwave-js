/* eslint-disable @typescript-eslint/no-unused-expressions */
import { validateArgs } from "@zwave-js/transformers";
import assert from "node:assert";

class Test {
	@validateArgs()
	map(arg1: Map<any, any>): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	readonlyMap(arg1: ReadonlyMap<any, any>): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	set(arg1: Set<any>): void {
		arg1;
		return void 0;
	}

	@validateArgs()
	readonlySet(arg1: ReadonlySet<any>): void {
		arg1;
		return void 0;
	}
}

const test = new Test();
// These should not throw
test.map(new Map());
test.readonlyMap(new Map()); // readonly does not exist at runtime
test.set(new Set());
test.readonlySet(new Set()); // readonly does not exist at runtime

// These should throw
assert.throws(
	// @ts-expect-error
	() => test.map({}),
	/arg1 to be an instance of class Map, got object/,
);
assert.throws(
	// @ts-expect-error
	() => test.readonlyMap({}),
	/arg1 to be an instance of class Map, got object/,
);
assert.throws(
	// @ts-expect-error
	() => test.map("string"),
	/arg1 to be an instance of class Map, got string "string"/,
);
assert.throws(
	// @ts-expect-error
	() => test.readonlyMap("string"),
	/arg1 to be an instance of class Map, got string "string"/,
);

assert.throws(
	// @ts-expect-error
	() => test.set({}),
	/arg1 to be an instance of class Set, got object/,
);
assert.throws(
	// @ts-expect-error
	() => test.readonlySet({}),
	/arg1 to be an instance of class Set, got object/,
);
assert.throws(
	// @ts-expect-error
	() => test.set("string"),
	/arg1 to be an instance of class Set, got string "string"/,
);
assert.throws(
	// @ts-expect-error
	() => test.readonlySet("string"),
	/arg1 to be an instance of class Set, got string "string"/,
);
