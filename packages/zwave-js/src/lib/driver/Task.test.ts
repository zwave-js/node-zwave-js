import { ZWaveError, ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import { noop } from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { test } from "vitest";
import {
	type TaskBuilder,
	TaskInterruptBehavior,
	TaskPriority,
	type TaskReturnType,
	TaskScheduler,
} from "./Task.js";

test("The scheduler can be started and stopped", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();
	await scheduler.stop();
});

test("An empty task runs to completion", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();
	const task = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {},
	});
	await task;
});

test("The task promise resolves to the return value of the task function", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();
	const task = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			return 1;
		},
	});
	t.expect(await task).toBe(1);
});

test("A task with multiple interrupt points runs to completion", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();
	const task = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			yield;
		},
	});
	await task;
});

test("A task with multiple interrupt points has the correct result", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();
	const task = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			yield;
			return 2;
		},
	});
	t.expect(await task).toBe(2);
});

test("Multiple tasks run to completion", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();
	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			yield;
			return 1;
		},
	});
	const task2 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			yield;
			return 2;
		},
	});
	const result = await Promise.all([task1, task2]);
	t.expect(result).toStrictEqual([1, 2]);
});

test("Higher priority tasks run before lower priority ones if the scheduler is started afterwards", async (t) => {
	const scheduler = new TaskScheduler();
	const order: number[] = [];

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			yield;
			order.push(1);
		},
	});
	const task2 = scheduler.queueTask({
		priority: TaskPriority.High,
		task: async function*() {
			yield;
			yield;
			order.push(2);
		},
	});
	scheduler.start();

	await Promise.all([task1, task2]);
	t.expect(order).toStrictEqual([2, 1]);
});

test("Higher priority tasks run before lower priority ones when added at the same time", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const order: number[] = [];

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			yield;
			order.push(1);
		},
	});
	const task2 = scheduler.queueTask({
		priority: TaskPriority.High,
		task: async function*() {
			yield;
			yield;
			order.push(2);
		},
	});

	await Promise.all([task1, task2]);
	t.expect(order).toStrictEqual([2, 1]);
});

test("Higher priority tasks run before lower priority ones when added at the same time, part 2", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const order: number[] = [];

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			yield;
			order.push(1);
		},
	});
	const task2 = scheduler.queueTask({
		priority: TaskPriority.High,
		task: async function*() {
			yield;
			yield;
			order.push(2);
		},
	});
	const task3 = scheduler.queueTask({
		priority: TaskPriority.Idle,
		task: async function*() {
			yield;
			yield;
			order.push(3);
		},
	});

	await Promise.all([task1, task2, task3]);
	t.expect(order).toStrictEqual([2, 1, 3]);
});

test("Higher priority tasks interrupt lower priority ones", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const t1WasStarted = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			t1WasStarted.resolve();
			order.push("1a");
			await wait(1);
			yield;
			order.push("1b");
			await wait(1);
			yield;
			order.push("1c");
		},
	});
	// The test expects that task 1 has started executing before task 2 is queued
	await t1WasStarted;
	const task2 = scheduler.queueTask({
		priority: TaskPriority.High,
		task: async function*() {
			order.push("2a");
			await wait(1);
			yield;
			order.push("2b");
			await wait(1);
			yield;
			order.push("2c");
		},
	});

	await Promise.all([task1, task2]);

	t.expect(order).toStrictEqual(["1a", "2a", "2b", "2c", "1b", "1c"]);
});

test("Higher priority tasks interrupt lower priority ones, part 2", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const t1WasStarted = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			t1WasStarted.resolve();
			order.push("1a");
			await wait(1);
			yield;
			order.push("1b");
			await wait(1);
			yield;
			order.push("1c");
		},
	});

	await t1WasStarted;

	const task2 = scheduler.queueTask({
		priority: TaskPriority.High,
		task: async function*() {
			order.push("2a");
			await wait(1);
			yield;
			order.push("2b");
			await wait(1);
			yield;
			order.push("2c");
		},
	});

	const task3 = scheduler.queueTask({
		priority: TaskPriority.High,
		task: async function*() {
			order.push("3a");
			await wait(1);
			yield;
			order.push("3b");
			await wait(1);
			yield;
			order.push("3c");
		},
	});

	await Promise.all([task1, task2, task3]);

	t.expect(order).toStrictEqual([
		"1a",
		"2a",
		"2b",
		"2c",
		"3a",
		"3b",
		"3c",
		"1b",
		"1c",
	]);
});

test("Higher priority tasks do not interrupt non-interruptible lower priority ones", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		interrupt: TaskInterruptBehavior.Forbidden,
		task: async function*() {
			order.push("1a");
			await wait(1);
			yield;
			order.push("1b");
			await wait(1);
			yield;
			order.push("1c");
		},
	});
	await wait(0);
	const task2 = scheduler.queueTask({
		priority: TaskPriority.High,
		task: async function*() {
			order.push("2a");
			await wait(1);
			yield;
			order.push("2b");
			await wait(1);
			yield;
			order.push("2c");
		},
	});

	await Promise.all([task1, task2]);

	t.expect(order).toStrictEqual(["1a", "1b", "1c", "2a", "2b", "2c"]);
});

test("Interrupting a task with the Restart interrupt behavior restarts it completely", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const t1WasStarted = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		interrupt: TaskInterruptBehavior.Restart,
		task: async function*() {
			t1WasStarted.resolve();
			order.push("1a");
			await wait(1);
			yield;
			order.push("1b");
			await wait(1);
			yield;
			order.push("1c");
		},
	});
	// The test expects that task 1 has started executing before task 2 is queued
	await t1WasStarted;
	const task2 = scheduler.queueTask({
		priority: TaskPriority.High,
		task: async function*() {
			order.push("2a");
			await wait(1);
			yield;
			order.push("2b");
			await wait(1);
			yield;
			order.push("2c");
		},
	});

	await Promise.all([task1, task2]);

	t.expect(order).toStrictEqual(["1a", "2a", "2b", "2c", "1a", "1b", "1c"]);
});

test("Completed Restart tasks are not restarted after completion", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const t1IsAlmostDone = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		interrupt: TaskInterruptBehavior.Restart,
		task: async function*() {
			order.push("1a");
			yield;
			order.push("1b");
			yield;
			t1IsAlmostDone.resolve();
			order.push("1c");
		},
	});
	await t1IsAlmostDone;
	const task2 = scheduler.queueTask({
		priority: TaskPriority.High,
		task: async function*() {
			order.push("2a");
			await wait(1);
			yield;
			order.push("2b");
			await wait(1);
			yield;
			order.push("2c");
		},
	});

	await Promise.all([task1, task2]);

	t.expect(order).toStrictEqual(["1a", "1b", "1c", "2a", "2b", "2c"]);
});

test("Yielding a promise-returning function causes the scheduler to wait for that until resuming the task", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const yieldedPromise = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("1a");
			yield () => yieldedPromise;
			order.push("1b");
			return;
		},
	});

	// Wait long enough that the task is definitely waiting for the promise
	await wait(50);
	t.expect(order).toStrictEqual(["1a"]);

	// Run to completion
	yieldedPromise.resolve();
	await task1;

	t.expect(order).toStrictEqual(["1a", "1b"]);
});

test("While a task is waiting, higher-priority tasks are still executed", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const yieldedPromise = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("1a");
			yield () => yieldedPromise;
			order.push("1b");
			return;
		},
	});

	await wait(1);

	const task2 = scheduler.queueTask({
		priority: TaskPriority.High,
		task: async function*() {
			order.push("2a");
			yield;
			order.push("2b");
			return;
		},
	});

	// Task 2 should be able to finish before task 1
	await task2;

	// Task 1 should not have completed yet
	// Wait long enough that it would have if the scheduler didn't work correctly
	await wait(50);
	t.expect(order).toStrictEqual(["1a", "2a", "2b"]);

	// Run task 1 to completion
	yieldedPromise.resolve();
	await task1;

	t.expect(order).toStrictEqual(["1a", "2a", "2b", "1b"]);
});

test("Waiting tasks are deprioritized over tasks with the same priority", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const yieldedPromise = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("1a");
			yield () => yieldedPromise;
			order.push("1b");
			return;
		},
	});

	await wait(1);

	const task2 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("2a");
			yield;
			order.push("2b");
			return;
		},
	});

	// Task 2 should be able to finish before task 1
	await task2;

	// Task 1 should not have completed yet
	// Wait long enough that it would have if the scheduler didn't work correctly
	await wait(50);
	t.expect(order).toStrictEqual(["1a", "2a", "2b"]);

	// Run task 1 to completion
	yieldedPromise.resolve();
	await task1;

	t.expect(order).toStrictEqual(["1a", "2a", "2b", "1b"]);
});

test("Waiting tasks are deprioritized over tasks with a higher priority", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const yieldedPromise = createDeferredPromise<void>();
	const t1WasStarted = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			t1WasStarted.resolve();
			order.push("1a");
			yield () => yieldedPromise;
			order.push("1b");
			return;
		},
	});

	// The test expects that task 1 has started executing before task 2 is queued
	await t1WasStarted;

	const task2 = scheduler.queueTask({
		priority: TaskPriority.High,
		task: async function*() {
			order.push("2a");
			yield;
			order.push("2b");
			return;
		},
	});

	// Task 2 should be able to finish before task 1
	await task2;

	// Task 1 should not have completed yet
	// Wait long enough that it would have if the scheduler didn't work correctly
	await wait(50);
	t.expect(order).toStrictEqual(["1a", "2a", "2b"]);

	// Run task 1 to completion
	yieldedPromise.resolve();
	await task1;

	t.expect(order).toStrictEqual(["1a", "2a", "2b", "1b"]);
});

test("Waiting tasks are NOT deprioritized over tasks with a lower priority", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const yieldedPromise = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("1a");
			yield () => yieldedPromise;
			order.push("1b");
			return;
		},
	});

	await wait(1);

	const task2 = scheduler.queueTask({
		priority: TaskPriority.Idle,
		task: async function*() {
			order.push("2a");
			yield;
			order.push("2b");
			return;
		},
	});

	// Task 2 should not have started yet
	await wait(50);
	t.expect(order).toStrictEqual(["1a"]);

	// Run to completion
	yieldedPromise.resolve();
	await Promise.all([task1, task2]);

	t.expect(order).toStrictEqual(["1a", "1b", "2a", "2b"]);
});

test("Two tasks of the same priority can wait at the same time", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("1a");
			yield () => wait(50);
			order.push("1b");
			return;
		},
	});
	const task2 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("2a");
			yield () => wait(100);
			order.push("2b");
			return;
		},
	});

	await Promise.all([task1, task2]);

	t.expect(order).toStrictEqual(["1a", "2a", "1b", "2b"]);
});

test("Stopping the scheduler mid-task works", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const yieldedPromise = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("1a");
			yield () => yieldedPromise;
			order.push("1b");
			return;
		},
	});

	await wait(1);

	const task2 = scheduler.queueTask({
		priority: TaskPriority.Idle,
		task: async function*() {
			order.push("2a");
			yield;
			order.push("2b");
			return;
		},
	});

	// Task 2 should not have started yet
	await wait(1);
	t.expect(order).toStrictEqual(["1a"]);

	await scheduler.stop();

	// "Run" to completion, but nothing should happen
	yieldedPromise.resolve();
	await wait(50);
	t.expect(order).toStrictEqual(["1a"]);
});

test("Stopping the scheduler works after multiple tasks have run to completion", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();
	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			yield;
			return 1;
		},
	});
	const task2 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			yield;
			return 2;
		},
	});
	const result = await Promise.all([task1, task2]);
	t.expect(result).toStrictEqual([1, 2]);

	await scheduler.stop();
});

test("Tasks can yield-queue higher-priority tasks", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const order: string[] = [];

	const innerBuilder: TaskBuilder<void> = {
		priority: TaskPriority.High,
		task: async function*() {
			yield;
			yield;
			order.push("inner");
		},
	};

	const outer = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield innerBuilder;
			order.push("outer");
		},
	});

	await outer;

	t.expect(order).toStrictEqual(["inner", "outer"]);
});

test("Tasks can yield-queue same-priority tasks", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const order: string[] = [];

	const innerBuilder: TaskBuilder<void> = {
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			yield;
			order.push("inner");
		},
	};

	const outer = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield innerBuilder;
			order.push("outer");
		},
	});

	await outer;

	t.expect(order).toStrictEqual(["inner", "outer"]);
});

test("Tasks cannot yield-queue lower-priority tasks", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const order: string[] = [];

	const innerBuilder: TaskBuilder<void> = {
		priority: TaskPriority.Idle,
		task: async function*() {
			yield;
			yield;
			order.push("inner");
		},
	};

	const outer = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield innerBuilder;
			order.push("outer");
		},
	});

	t.expect(() => outer).rejects.toThrowError("lower priority");
});

test("Yielding tasks multiple levels deep works", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const order: string[] = [];
	const yieldedPromise = createDeferredPromise<void>();

	const innerinnerBuilder: TaskBuilder<void> = {
		name: "innerinner",
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			order.push("innerinner1");
			yield () => yieldedPromise;
			order.push("innerinner2");
		},
	};

	const innerBuilder: TaskBuilder<void> = {
		name: "inner",
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			order.push("inner1");
			yield innerinnerBuilder;
			order.push("inner2");
		},
	};

	const outer = scheduler.queueTask({
		name: "outer",
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("outer1");
			yield innerBuilder;
			order.push("outer2");
		},
	});

	// Wait long enough that the task is definitely waiting for the promise
	await wait(10);
	t.expect(order).toStrictEqual(["outer1", "inner1", "innerinner1"]);

	// Run to completion
	yieldedPromise.resolve();
	await outer;

	t.expect(order).toStrictEqual([
		"outer1",
		"inner1",
		"innerinner1",
		"innerinner2",
		"inner2",
		"outer2",
	]);
});

test("Tasks receive the result of yielded tasks", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const innerBuilder: TaskBuilder<string> = {
		priority: TaskPriority.High,
		task: async function*() {
			yield;
			yield;
			return "foo";
		},
	};

	const outer = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			const result = (yield innerBuilder) as TaskReturnType<
				typeof innerBuilder
			>;
			return result;
		},
	});

	t.expect(await outer).toBe("foo");
});

test("Tasks receive the result of yielded tasks, part 2", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const inner1Builder: TaskBuilder<string> = {
		priority: TaskPriority.High,
		task: async function*() {
			yield;
			yield;
			return "foo";
		},
	};

	const inner3Builder: TaskBuilder<string> = {
		priority: TaskPriority.High,
		task: async function*() {
			yield;
			yield;
			return "bar";
		},
	};

	const outer = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			const result1 = (yield inner1Builder) as TaskReturnType<
				typeof inner1Builder
			>;
			const result2 = (yield) as any;
			const result3 = (yield inner3Builder) as TaskReturnType<
				typeof inner3Builder
			>;
			return result1 + (result2 ?? "") + result3;
		},
	});

	t.expect(await outer).toBe("foobar");
});

test("Tasks receive the result of yielded tasks, part 3", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const innerBuilder: TaskBuilder<string> = {
		priority: TaskPriority.High,
		task: async function*() {
			yield;
			throw new Error("foo");
		},
	};

	const outer = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			try {
				yield innerBuilder;
				throw new Error("This should not happen");
			} catch (e) {
				return e as Error;
			}
		},
	});

	const result = await outer;
	t.expect(result instanceof Error).toBe(true);
	t.expect(result.message).toBe("foo");
});

test("Tasks can queue lower-priority tasks without waiting for them", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const order: string[] = [];
	let inner: Promise<void>;

	const innerBuilder: TaskBuilder<void> = {
		priority: TaskPriority.Idle,
		task: async function*() {
			yield;
			order.push("inner");
		},
	};

	const outer = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			inner = scheduler.queueTask(innerBuilder);
			yield;
			order.push("outer");
		},
	});

	await outer;
	await inner!;

	t.expect(order).toStrictEqual(["outer", "inner"]);
});

test("Failing tasks reject the corresponding Promise", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			throw new Error("Task 1 failed");
		},
	});

	const task2 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			yield;
			return 2;
		},
	});

	await t.expect(() => task1).rejects.toThrowError("Task 1 failed");
	t.expect(await task2).toBe(2);
});

test("Tasks can be removed if they haven't been started yet", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const longRunningThing = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("1a");
			await longRunningThing;
			yield;
			order.push("1b");
			return;
		},
	});

	await wait(1);

	const task2 = scheduler.queueTask({
		name: "task2",
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("2a");
			yield;
			order.push("2b");
			return;
		},
	});

	// Task 2 should not have started yet
	await wait(1);
	t.expect(order).toStrictEqual(["1a"]);

	await scheduler.removeTasks((t) => t.name === "task2");

	await assertZWaveError(t.expect, () => task2, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});

	// Run to completion
	longRunningThing.resolve();
	await task1;
	t.expect(order).toStrictEqual(["1a", "1b"]);
});

test("Tasks can be removed while paused", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const t1WasStarted = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			t1WasStarted.resolve();
			order.push("1a");
			yield () => wait(10);
			order.push("1b");
			return;
		},
		cleanup() {
			order.push("1c");
			return Promise.resolve();
		},
	});

	await t1WasStarted;
	// The task should have run to the first yield
	t.expect(order).toStrictEqual(["1a"]);

	await scheduler.removeTasks((t) => true);

	await assertZWaveError(t.expect, () => task1, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});

	t.expect(order).toStrictEqual(["1a", "1c"]);
});

test("Tasks can be removed while paused, part 2", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("1a");
			yield () => wait(10);
			order.push("1b");
			return;
		},
		cleanup() {
			order.push("1c");
			return Promise.resolve();
		},
	});

	const task2 = scheduler.queueTask({
		name: "task2",
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("2a");
			yield () => wait(10);
			order.push("2b");
			return;
		},
		cleanup() {
			order.push("2c");
			return Promise.resolve();
		},
	});

	await wait(5);
	// The tasks have run to the first yield
	t.expect(order).toStrictEqual(["1a", "2a"]);

	await scheduler.removeTasks((t) => true);

	await assertZWaveError(t.expect, () => task1, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});
	await assertZWaveError(t.expect, () => task2, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});

	// Current task "1" gets cleaned up last
	t.expect(order).toStrictEqual(["1a", "2a", "2c", "1c"]);
});

test("Tasks can be removed while running", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const t1WasStarted = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			t1WasStarted.resolve();
			order.push("1a");
			await wait(10);
			yield;
			order.push("1b");
		},
		cleanup() {
			order.push("1c");
			return Promise.resolve();
		},
	});

	const task2 = scheduler.queueTask({
		name: "task2",
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("2a");
			yield;
			order.push("2b");
		},
		cleanup() {
			order.push("2c");
			return Promise.resolve();
		},
	});

	await t1WasStarted;
	// Task 1 should have run to the first yield,
	// Task 2 should not have started yet
	t.expect(order).toStrictEqual(["1a"]);

	await scheduler.removeTasks((t) => true);

	await assertZWaveError(t.expect, () => task1, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});
	await assertZWaveError(t.expect, () => task2, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});

	// Only task 1 should have been cleaned up, since task 2 was not started
	t.expect(order).toStrictEqual(["1a", "1c"]);
});

test("Tasks can be removed while running and paused", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const t1WasStarted = createDeferredPromise<void>();
	const t2WasStarted = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			t1WasStarted.resolve();
			order.push("1a");
			yield () => wait(10);
			order.push("1b");
		},
		cleanup() {
			order.push("1c");
			return Promise.resolve();
		},
	});

	const task2 = scheduler.queueTask({
		name: "task2",
		priority: TaskPriority.Normal,
		task: async function*() {
			t2WasStarted.resolve();
			order.push("2a");
			await wait(10);
			yield;
			order.push("2b");
		},
		cleanup() {
			order.push("2c");
			return Promise.resolve();
		},
	});

	await Promise.all([t1WasStarted, t2WasStarted]);
	// Both tasks should have run to the first yield.
	t.expect(order).toStrictEqual(["1a", "2a"]);

	await scheduler.removeTasks((t) => true);

	await assertZWaveError(t.expect, () => task1, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});
	await assertZWaveError(t.expect, () => task2, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});

	// Both tasks should be cleaned up, 1c before 2c,
	// since task 2 was the current task and should be cleaned up last
	t.expect(order).toStrictEqual(["1a", "2a", "1c", "2c"]);
});

test("The task rejection uses the given error, if any", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const t1WasStarted = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			t1WasStarted.resolve();
			order.push("1a");
			yield () => wait(10);
			order.push("1b");
			return;
		},
		cleanup() {
			order.push("1c");
			return Promise.resolve();
		},
	});

	// task 1 has run to the first yield
	await t1WasStarted;
	t.expect(order).toStrictEqual(["1a"]);

	await scheduler.removeTasks(
		(t) => true,
		new ZWaveError("Test error", ZWaveErrorCodes.Driver_Reset),
	);

	await assertZWaveError(t.expect, () => task1, {
		errorCode: ZWaveErrorCodes.Driver_Reset,
	});

	t.expect(order).toStrictEqual(["1a", "1c"]);
});

test("Canceling nested tasks works", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const order: string[] = [];
	const yieldedPromise = createDeferredPromise<void>();

	const innerBuilder: TaskBuilder<void> = {
		priority: TaskPriority.High,
		task: async function*() {
			order.push("2a");
			yield () => yieldedPromise;
			order.push("2b");
		},
	};

	const outer = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("1a");
			yield innerBuilder;
			order.push("1b");
		},
	}).catch(noop);

	// Wait long enough that the task is definitely waiting for the promise
	await wait(50);
	t.expect(order).toStrictEqual(["1a", "2a"]);

	// Cancel all tasks
	await scheduler.removeTasks(() => true);

	t.expect(order).toStrictEqual(["1a", "2a"]);
});

test("Canceling nested tasks works, part 2", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const yieldedPromise = createDeferredPromise<void>();

	const innerBuilder: TaskBuilder<void> = {
		priority: TaskPriority.High,
		name: "inner",
		task: async function*() {
			yield () => yieldedPromise;
		},
	};

	const outer = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			try {
				yield innerBuilder;
			} catch (e) {
				return "canceled";
			}
		},
	});

	// Wait long enough that the task is definitely waiting for the promise
	await wait(10);

	// Cancel all tasks
	// FIXME: Restore parent tasks when removing nested tasks
	await scheduler.removeTasks((t) => t.name === "inner");

	t.expect(await outer).toBe("canceled");
});

test("Splitting tasks into multiple generator functions works", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const order: string[] = [];

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("1a");

			async function* inner() {
				order.push("1b");
				yield;
				order.push("1c");
			}

			yield* inner();
			yield;
			order.push("1d");
		},
	});

	await task1;

	t.expect(order).toStrictEqual(["1a", "1b", "1c", "1d"]);
});

test("Split tasks can be canceled", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();

	const order: string[] = [];
	const yieldedPromise = createDeferredPromise<void>();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
			order.push("1a");

			async function* inner() {
				order.push("1b");
				yield () => yieldedPromise;
				order.push("1c");
			}

			yield* inner();
			yield;
			order.push("1d");
		},
	}).catch(noop);

	// Wait long enough that the task is definitely waiting for the promise
	await wait(10);

	// Cancel all tasks
	await scheduler.removeTasks(() => true);

	t.expect(order).toStrictEqual(["1a", "1b"]);
});
