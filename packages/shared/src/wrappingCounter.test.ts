import { createWrappingCounter } from "./wrappingCounter";

describe("wrappingCounter", () => {
	it("should return 1 first", () => {
		const c1 = createWrappingCounter(1);
		const c2 = createWrappingCounter(0b1111);
		expect(c1()).toBe(1);
		expect(c2()).toBe(1);
	});

	it("should wrap back to 1 after surpassing the max value", () => {
		// Useless counter, but it's a good test to make sure that the wrapping works
		const c1 = createWrappingCounter(1);
		expect(c1()).toBe(1);
		expect(c1()).toBe(1);
		expect(c1()).toBe(1);
		expect(c1()).toBe(1);

		const c2 = createWrappingCounter(0b11);
		expect(c2()).toBe(1);
		expect(c2()).toBe(2);
		expect(c2()).toBe(3);
		expect(c2()).toBe(1);
	});
});
