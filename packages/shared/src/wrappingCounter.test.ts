import test from "ava";
import { createWrappingCounter } from "./wrappingCounter";

test("wrappingCounter -> should return 1 first", (t) => {
	const c1 = createWrappingCounter(1);
	const c2 = createWrappingCounter(0b1111);
	t.is(c1(), 1);
	t.is(c2(), 1);
});

test("wrappingCounter -> should wrap back to 1 after surpassing the max value", (t) => {
	// Useless counter, but it's a good test to make sure that the wrapping works
	const c1 = createWrappingCounter(1);
	t.is(c1(), 1);
	t.is(c1(), 1);
	t.is(c1(), 1);
	t.is(c1(), 1);

	const c2 = createWrappingCounter(0b11);
	t.is(c2(), 1);
	t.is(c2(), 2);
	t.is(c2(), 3);
	t.is(c2(), 1);
});
