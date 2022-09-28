import ava, { type TestFn } from "ava";
import sinon from "sinon";
import { throttle } from "./utils";

interface TestContext {
	clock: sinon.SinonFakeTimers;
	advanceTime(ms: number): void;
}

const test = ava as TestFn<TestContext>;

const originalDateNow = Date.now;
let now: number;

test.before((t) => {
	now = Date.now();
	Date.now = sinon.fake(() => {
		return now;
	});
	t.context.clock = sinon.useFakeTimers(now);
	t.context.advanceTime = (ms) => {
		now += ms;
		t.context.clock.tick(ms);
	};
});

test.after.always((t) => {
	t.context.clock.restore();
	Date.now = originalDateNow;
});

test("calls the function immediately when called once", (t) => {
	const spy = sinon.stub();
	const throttled = throttle(spy, 100);
	throttled();
	sinon.assert.calledOnce(spy);
	t.pass();
});

test("passes the given parameters along", (t) => {
	const spy = sinon.stub();
	const throttled = throttle(spy, 100);
	throttled(5, 6, "7");
	sinon.assert.calledWith(spy, 5, 6, "7");
	t.pass();
});

test("calls the function once when called twice quickly", (t) => {
	const spy = sinon.stub();
	const throttled = throttle(spy, 100);
	throttled(1);
	throttled(2);
	sinon.assert.calledOnce(spy);
	sinon.assert.calledWith(spy, 1);
	t.pass();
});

test("only adds a delayed function call when trailing=true", (t) => {
	const spy = sinon.stub();

	// Attempt 1: trailing = false
	let throttled = throttle(spy, 100);
	throttled(1);
	throttled(2);
	sinon.assert.calledOnce(spy);
	t.context.advanceTime(100);
	sinon.assert.calledOnce(spy);

	spy.resetHistory();
	// Attempt 2: trailing = true
	throttled = throttle(spy, 100, true);
	throttled(1);
	throttled(2);
	sinon.assert.calledOnce(spy);
	sinon.assert.calledWith(spy, 1);
	t.context.advanceTime(100);
	sinon.assert.calledTwice(spy);
	sinon.assert.calledWith(spy, 2);
	t.pass();
});

test("when called during the wait time for the trailing call, the most recent arguments are used", (t) => {
	const spy = sinon.stub();

	const throttled = throttle(spy, 100, true);
	throttled(1);
	throttled(2);
	sinon.assert.calledOnce(spy);
	sinon.assert.calledWith(spy, 1);
	t.context.advanceTime(50);
	throttled(3);
	t.context.advanceTime(25);
	throttled(4);
	t.context.advanceTime(25);
	sinon.assert.calledTwice(spy);
	sinon.assert.neverCalledWith(spy, 2);
	sinon.assert.calledWith(spy, 4);
	t.pass();
});
