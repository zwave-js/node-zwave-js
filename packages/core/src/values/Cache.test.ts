import { failAssertion } from "@zwave-js/testing";
import test from "ava";
import { deserializeCacheValue, serializeCacheValue } from "./Cache";
import { Duration } from "./Duration";

test("serializeCacheValue() -> leaves numbers untouched", (t) => {
	const tests = [1, 2, 6, 7, -1, 0.15];
	for (const val of tests) {
		t.is(serializeCacheValue(val), val);
	}
});

test("serializeCacheValue() -> leaves strings untouched", (t) => {
	const tests = ["1", "2", "6", "7", "-1", "0.15"];
	for (const val of tests) {
		t.is(serializeCacheValue(val), val);
	}
});

test("serializeCacheValue() -> leaves booleans untouched", (t) => {
	t.true(serializeCacheValue(true));
});

test("serializeCacheValue() -> leaves arrays untouched", (t) => {
	const tests = [[], [1, 2, "3"], [false]];
	for (const val of tests) {
		t.is(serializeCacheValue(val), val);
	}
});

test("serializeCacheValue() -> leaves objects untouched", (t) => {
	const tests = [{}, { foo: "bar", baz: "inga" }, { 0: 1 }];
	for (const val of tests) {
		t.deepEqual(serializeCacheValue(val), val);
	}
});

test("serializeCacheValue() -> converts Maps into objects", (t) => {
	const input = new Map<any, any>([
		["foo", "bar"],
		[0, 1],
	]);
	const expected = { foo: "bar", 0: 1, $$type$$: "map" };
	t.deepEqual(serializeCacheValue(input), expected);
});

test("serializeCacheValue() -> converts Durations into objects", (t) => {
	const input = new Duration(2, "minutes");
	const expected = {
		unit: "minutes",
		value: 2,
		$$type$$: "duration",
	};
	t.deepEqual(serializeCacheValue(input), expected);
});
test("deserializeCacheValue() -> leaves numbers untouched", (t) => {
	const tests = [1, 2, 6, 7, -1, 0.15];
	for (const val of tests) {
		t.is(deserializeCacheValue(val), val);
	}
});

test("deserializeCacheValue() -> leaves strings untouched", (t) => {
	const tests = ["1", "2", "6", "7", "-1", "0.15"];
	for (const val of tests) {
		t.is(deserializeCacheValue(val), val);
	}
});

test("deserializeCacheValue() -> leaves booleans untouched", (t) => {
	t.true(deserializeCacheValue(true));
});

test("deserializeCacheValue() -> leaves arrays untouched", (t) => {
	const tests = [[], [1, 2, "3"], [false]];
	for (const val of tests) {
		t.is(deserializeCacheValue(val), val);
	}
});

test("deserializeCacheValue() -> leaves objects untouched", (t) => {
	const tests = [{}, { foo: "bar", baz: "inga" }, { 0: 1 }];
	for (const val of tests) {
		t.deepEqual(deserializeCacheValue(val), val);
	}
});

test("deserializeCacheValue() -> Restores Maps", (t) => {
	const input = { foo: "bar", 0: 1, $$type$$: "map" };
	const expected = new Map<any, any>([
		[0, 1],
		["foo", "bar"],
	]);
	t.deepEqual(deserializeCacheValue(input), expected);
});

test("deserializeCacheValue() -> restores Durations", (t) => {
	const expected = new Duration(1, "default");
	const input = {
		unit: "default",
		$$type$$: "duration",
	};
	t.deepEqual(deserializeCacheValue(input), expected);
});

test("sinon test", (t) => {
	failAssertion();
});
