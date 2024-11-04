import { test } from "vitest";
import { deserializeCacheValue, serializeCacheValue } from "./Cache.js";
import { Duration } from "./Duration.js";

test("serializeCacheValue() -> leaves numbers untouched", (t) => {
	const tests = [1, 2, 6, 7, -1, 0.15];
	for (const val of tests) {
		t.expect(serializeCacheValue(val)).toBe(val);
	}
});

test("serializeCacheValue() -> leaves strings untouched", (t) => {
	const tests = ["1", "2", "6", "7", "-1", "0.15"];
	for (const val of tests) {
		t.expect(serializeCacheValue(val)).toBe(val);
	}
});

test("serializeCacheValue() -> leaves booleans untouched", (t) => {
	t.expect(serializeCacheValue(true)).toBe(true);
});

test("serializeCacheValue() -> leaves arrays untouched", (t) => {
	const tests = [[], [1, 2, "3"], [false]];
	for (const val of tests) {
		t.expect(serializeCacheValue(val)).toBe(val);
	}
});

test("serializeCacheValue() -> leaves objects untouched", (t) => {
	const tests = [{}, { foo: "bar", baz: "inga" }, { 0: 1 }];
	for (const val of tests) {
		t.expect(serializeCacheValue(val)).toStrictEqual(val);
	}
});

test("serializeCacheValue() -> converts Maps into objects", (t) => {
	const input = new Map<any, any>([
		["foo", "bar"],
		[0, 1],
	]);
	const expected = { foo: "bar", 0: 1, $$type$$: "map" };
	t.expect(serializeCacheValue(input)).toStrictEqual(expected);
});

test("serializeCacheValue() -> converts Durations into objects", (t) => {
	const input = new Duration(2, "minutes");
	const expected = {
		unit: "minutes",
		value: 2,
		$$type$$: "duration",
	};
	t.expect(serializeCacheValue(input)).toStrictEqual(expected);
});
test("deserializeCacheValue() -> leaves numbers untouched", (t) => {
	const tests = [1, 2, 6, 7, -1, 0.15];
	for (const val of tests) {
		t.expect(deserializeCacheValue(val)).toBe(val);
	}
});

test("deserializeCacheValue() -> leaves strings untouched", (t) => {
	const tests = ["1", "2", "6", "7", "-1", "0.15"];
	for (const val of tests) {
		t.expect(deserializeCacheValue(val)).toBe(val);
	}
});

test("deserializeCacheValue() -> leaves booleans untouched", (t) => {
	t.expect(deserializeCacheValue(true)).toBe(true);
});

test("deserializeCacheValue() -> leaves arrays untouched", (t) => {
	const tests = [[], [1, 2, "3"], [false]];
	for (const val of tests) {
		t.expect(deserializeCacheValue(val)).toBe(val);
	}
});

test("deserializeCacheValue() -> leaves objects untouched", (t) => {
	const tests = [{}, { foo: "bar", baz: "inga" }, { 0: 1 }];
	for (const val of tests) {
		t.expect(deserializeCacheValue(val)).toStrictEqual(val);
	}
});

test("deserializeCacheValue() -> Restores Maps", (t) => {
	const input = { foo: "bar", 0: 1, $$type$$: "map" };
	const expected = new Map<any, any>([
		[0, 1],
		["foo", "bar"],
	]);
	t.expect(deserializeCacheValue(input)).toStrictEqual(expected);
});

test("deserializeCacheValue() -> restores Durations", (t) => {
	const expected = new Duration(1, "default");
	const input = {
		unit: "default",
		$$type$$: "duration",
	};
	t.expect(deserializeCacheValue(input)).toStrictEqual(expected);
});
