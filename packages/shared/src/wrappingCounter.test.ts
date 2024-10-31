import { test } from "vitest";
import { createWrappingCounter } from "./wrappingCounter.js";

test("wrappingCounter -> should return 1 first", (t) => {
	const c1 = createWrappingCounter(1);
	const c2 = createWrappingCounter(0b1111);
	t.expect(c1()).toBe(1);
	t.expect(c2()).toBe(1);
});

test("wrappingCounter -> should wrap back to 1 after surpassing the max value", (t) => {
	// Useless counter, but it's a good test to make sure that the wrapping works
	const c1 = createWrappingCounter(1);
	t.expect(c1()).toBe(1);
	t.expect(c1()).toBe(1);
	t.expect(c1()).toBe(1);
	t.expect(c1()).toBe(1);

	const c2 = createWrappingCounter(0b11);
	t.expect(c2()).toBe(1);
	t.expect(c2()).toBe(2);
	t.expect(c2()).toBe(3);
	t.expect(c2()).toBe(1);
});
