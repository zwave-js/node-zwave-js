import { discreteBinarySearch, throttle } from "./misc";

describe("throttle()", () => {
	const originalDateNow = Date.now;
	let now: number;

	beforeAll(() => {
		now = Date.now();
		Date.now = jest.fn().mockImplementation(() => now);
		jest.useFakeTimers();
	});

	afterAll(() => {
		jest.clearAllTimers();
		jest.useRealTimers();

		Date.now = originalDateNow;
	});

	function advanceTime(ms: number): void {
		now += ms;
		jest.advanceTimersByTime(ms);
	}

	it("calls the function immediately when called once", () => {
		const spy = jest.fn();
		const throttled = throttle(spy, 100);
		throttled();
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it("passes the given parameters along", () => {
		const spy = jest.fn();
		const throttled = throttle(spy, 100);
		throttled(5, 6, "7");
		expect(spy).toHaveBeenCalledWith(5, 6, "7");
	});

	it("calls the function once when called twice quickly", () => {
		const spy = jest.fn();
		const throttled = throttle(spy, 100);
		throttled(1);
		throttled(2);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(1);
	});

	it("only adds a delayed function call when trailing=true", () => {
		const spy = jest.fn();

		// Attempt 1: trailing = false
		let throttled = throttle(spy, 100);
		throttled(1);
		throttled(2);
		expect(spy).toHaveBeenCalledTimes(1);
		advanceTime(100);
		expect(spy).toHaveBeenCalledTimes(1);

		spy.mockReset();
		// Attempt 2: trailing = true
		throttled = throttle(spy, 100, true);
		throttled(1);
		throttled(2);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(1);
		advanceTime(100);
		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).toHaveBeenCalledWith(2);
	});

	it("when called during the wait time for the trailing call, the most recent arguments are used", () => {
		const spy = jest.fn();

		const throttled = throttle(spy, 100, true);
		throttled(1);
		throttled(2);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(1);
		advanceTime(50);
		throttled(3);
		advanceTime(25);
		throttled(4);
		advanceTime(25);
		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).not.toHaveBeenCalledWith(2);
		expect(spy).toHaveBeenCalledWith(4);
	});
});

describe("discreteBinarySearch()", () => {
	it("test case 1", async () => {
		const [rangeMin, rangeMax] = [0, 9];
		const values = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
		expect(
			await discreteBinarySearch(
				rangeMin,
				rangeMax,
				(i) => values[i] === 0,
			),
		).toBe(4);
	});

	it("test case 2", async () => {
		const [rangeMin, rangeMax] = [0, 9];
		const values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		expect(
			await discreteBinarySearch(
				rangeMin,
				rangeMax,
				(i) => values[i] === 0,
			),
		).toBe(9);
	});

	it("test case 3", async () => {
		const [rangeMin, rangeMax] = [0, 6];
		const values = [0, 1, 1, 1, 1, 1, 1];
		expect(
			await discreteBinarySearch(
				rangeMin,
				rangeMax,
				(i) => values[i] === 0,
			),
		).toBe(0);
	});

	it("test case 4", async () => {
		const [rangeMin, rangeMax] = [0, 6];
		const values = [1, 1, 1, 1, 1, 1, 1];
		expect(
			await discreteBinarySearch(
				rangeMin,
				rangeMax,
				(i) => values[i] === 0,
			),
		).toBe(undefined);
	});

	it("test case 5", async () => {
		const [rangeMin, rangeMax] = [0, 0];
		const values = [0];
		expect(
			await discreteBinarySearch(
				rangeMin,
				rangeMax,
				(i) => values[i] === 0,
			),
		).toBe(0);
	});

	it("test case 6", async () => {
		const [rangeMin, rangeMax] = [1, -1];
		const values: number[] = [];
		expect(
			await discreteBinarySearch(
				rangeMin,
				rangeMax,
				(i) => values[i] === 0,
			),
		).toBe(undefined);
	});
});
