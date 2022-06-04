import { TimedExpectation } from "./TimedExpectation";

describe("TimedExpectation", () => {
	// beforeAll(() => {
	// 	jest.useFakeTimers();
	// });

	afterAll(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
	});

	it("resolves to the given value", async () => {
		const exp = new TimedExpectation<string>(100);
		setImmediate(() => {
			exp.resolve("OK");
		});
		const result = await exp;
		expect(result).toBe("OK");
	});

	it("only resolves once", async () => {
		const exp = new TimedExpectation<string>(100);
		setImmediate(() => {
			exp.resolve("OK");
			exp.resolve("NOK");
		});
		const result = await exp;
		expect(result).toBe("OK");
	});

	it("rejects when timed out and does not resolve afterwards", (done) => {
		jest.useFakeTimers();
		const start = Date.now();
		const exp = new TimedExpectation<string>(100);
		exp.then(
			() => {
				throw new Error("Should not resolve");
			},
			(e) => {
				expect(e).toBeInstanceOf(Error);
				expect(Date.now() - start).toBe(100);
				exp.resolve("NOK");
				done();
			},
		);

		jest.advanceTimersToNextTimer();
	});
});
