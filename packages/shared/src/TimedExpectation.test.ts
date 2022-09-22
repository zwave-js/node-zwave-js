import test from "ava";
import sinon from "sinon";
import { TimedExpectation } from "./TimedExpectation";

test("resolves to the given value", async (t) => {
	const exp = new TimedExpectation<string>(100);
	setImmediate(() => {
		exp.resolve("OK");
	});
	const result = await exp;
	t.is(result, "OK");
});

test("only resolves once", async (t) => {
	const exp = new TimedExpectation<string>(100);
	setImmediate(() => {
		exp.resolve("OK");
		exp.resolve("NOK");
	});
	const result = await exp;
	t.is(result, "OK");
});

test("rejects when timed out and does not resolve afterwards", (t) => {
	const clock = sinon.useFakeTimers(Date.now());

	return new Promise<void>((resolve) => {
		const start = Date.now();
		const exp = new TimedExpectation<string>(100);
		exp.then(
			() => {
				throw new Error("Should not resolve");
			},
			(e) => {
				t.true(e instanceof Error);
				t.is(Date.now() - start, 100);
				exp.resolve("NOK");
				clock.restore();
				resolve();
			},
		);

		clock.next();
	});
});
