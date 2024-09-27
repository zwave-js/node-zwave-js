import { ZWaveError, ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import { wait } from "alcalzone-shared/async";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import test from "ava";
import {
	type TaskBuilder,
	TaskInterruptBehavior,
	TaskPriority,
	TaskScheduler,
} from "./Task";

test("The scheduler can be started and stopped", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();
	await scheduler.stop();
	t.pass();
});

test("An empty task runs to completion", async (t) => {
	const scheduler = new TaskScheduler();
	scheduler.start();
	const task = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {},
	});
	await task;
	t.pass();
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
	t.is(await task, 1);
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
	t.pass();
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
	t.is(await task, 2);
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
	t.deepEqual(result, [1, 2]);
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
	t.deepEqual(order, [2, 1]);
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
	t.deepEqual(order, [2, 1]);
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
	t.deepEqual(order, [2, 1, 3]);
});

test("Higher priority tasks interrupt lower priority ones", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
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

	t.deepEqual(order, ["1a", "2a", "2b", "2c", "1b", "1c"]);
});

test("Higher priority tasks interrupt lower priority ones, part 2", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
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

	t.deepEqual(order, ["1a", "2a", "2b", "2c", "3a", "3b", "3c", "1b", "1c"]);
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

	t.deepEqual(order, ["1a", "1b", "1c", "2a", "2b", "2c"]);
});

test("Interrupting a task with the Restart interrupt behavior restarts it completely", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		interrupt: TaskInterruptBehavior.Restart,
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

	t.deepEqual(order, ["1a", "2a", "2b", "2c", "1a", "1b", "1c"]);
});

test("Completed Restart tasks are not restarted after completion", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		interrupt: TaskInterruptBehavior.Restart,
		task: async function*() {
			order.push("1a");
			yield;
			order.push("1b");
			yield;
			order.push("1c");
		},
	});
	await wait(1);
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

	t.deepEqual(order, ["1a", "1b", "1c", "2a", "2b", "2c"]);
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
	t.deepEqual(order, ["1a"]);

	// Run to completion
	yieldedPromise.resolve();
	await task1;

	t.deepEqual(order, ["1a", "1b"]);
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
	t.deepEqual(order, ["1a", "2a", "2b"]);

	// Run task 1 to completion
	yieldedPromise.resolve();
	await task1;

	t.deepEqual(order, ["1a", "2a", "2b", "1b"]);
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
	t.deepEqual(order, ["1a", "2a", "2b"]);

	// Run task 1 to completion
	yieldedPromise.resolve();
	await task1;

	t.deepEqual(order, ["1a", "2a", "2b", "1b"]);
});

test("Waiting tasks are deprioritized over tasks with a higher priority", async (t) => {
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
	t.deepEqual(order, ["1a", "2a", "2b"]);

	// Run task 1 to completion
	yieldedPromise.resolve();
	await task1;

	t.deepEqual(order, ["1a", "2a", "2b", "1b"]);
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
	t.deepEqual(order, ["1a"]);

	// Run to completion
	yieldedPromise.resolve();
	await Promise.all([task1, task2]);

	t.deepEqual(order, ["1a", "1b", "2a", "2b"]);
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

	t.deepEqual(order, ["1a", "2a", "1b", "2b"]);
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
	t.deepEqual(order, ["1a"]);

	await scheduler.stop();

	// "Run" to completion, but nothing should happen
	yieldedPromise.resolve();
	await wait(50);
	t.deepEqual(order, ["1a"]);
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
	t.deepEqual(result, [1, 2]);

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
			const inner = scheduler.queueTask(innerBuilder);
			yield () => inner;
			order.push("outer");
		},
	});

	await outer;

	t.deepEqual(order, ["inner", "outer"]);
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
			const inner = scheduler.queueTask(innerBuilder);
			yield () => inner;
			order.push("outer");
		},
	});

	await outer;

	t.deepEqual(order, ["inner", "outer"]);
});

test.failing("Tasks cannot yield-queue lower-priority tasks", async (t) => {
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
			const inner = scheduler.queueTask(innerBuilder);
			yield () => inner;
			order.push("outer");
		},
	});

	await outer;
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
			const inner = scheduler.queueTask(innerBuilder);
			const result = (yield () => inner) as Awaited<typeof inner>;
			return result;
		},
	});

	t.is(await outer, "foo");
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
			const inner1 = scheduler.queueTask(inner1Builder);
			const result1 = (yield () => inner1) as Awaited<typeof inner1>;
			const result2 = (yield) as any;
			const inner3 = scheduler.queueTask(inner3Builder);
			const result3 = (yield () => inner3) as Awaited<typeof inner3>;
			return result1 + (result2 ?? "") + result3;
		},
	});

	t.is(await outer, "foobar");
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
			const inner = scheduler.queueTask(innerBuilder);
			try {
				const ret = (yield () => inner) as any;
				return ret;
			} catch (e) {
				return e;
			}
		},
	});

	const result = await outer;
	t.true(result instanceof Error);
	t.is(result.message, "foo");
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

	t.deepEqual(order, ["outer", "inner"]);
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

	await t.throwsAsync(task1, { message: "Task 1 failed" });
	t.is(await task2, 2);
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
	t.deepEqual(order, ["1a"]);

	await scheduler.removeTasks((t) => t.name === "task2");

	await assertZWaveError(t, () => task2, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});

	// Run to completion
	longRunningThing.resolve();
	await task1;
	t.deepEqual(order, ["1a", "1b"]);
});

test("Tasks can be removed while paused", async (t) => {
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

	await wait(1);
	// The task should have run to the first yield
	t.deepEqual(order, ["1a"]);

	await scheduler.removeTasks((t) => true);

	await assertZWaveError(t, () => task1, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});

	t.deepEqual(order, ["1a", "1c"]);
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

	await wait(1);
	// The tasks should have run to the first yield
	t.deepEqual(order, ["1a", "2a"]);

	await scheduler.removeTasks((t) => true);

	await assertZWaveError(t, () => task1, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});
	await assertZWaveError(t, () => task2, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});

	// Current task "1" gets cleaned up last
	t.deepEqual(order, ["1a", "2a", "2c", "1c"]);
});

test("Tasks can be removed while running", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
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

	await wait(1);
	// Task 1 should have run to the first yield,
	// Task 2 should not have started yet
	t.deepEqual(order, ["1a"]);

	await scheduler.removeTasks((t) => true);

	await assertZWaveError(t, () => task1, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});
	await assertZWaveError(t, () => task2, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});

	// Only task 1 should have been cleaned up, since task 2 was not started
	t.deepEqual(order, ["1a", "1c"]);
});

test("Tasks can be removed while running and paused", async (t) => {
	const scheduler = new TaskScheduler();
	const order: string[] = [];
	scheduler.start();

	const task1 = scheduler.queueTask({
		priority: TaskPriority.Normal,
		task: async function*() {
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

	await wait(1);
	// Both tasks should have run to the first yield.
	t.deepEqual(order, ["1a", "2a"]);

	await scheduler.removeTasks((t) => true);

	await assertZWaveError(t, () => task1, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});
	await assertZWaveError(t, () => task2, {
		errorCode: ZWaveErrorCodes.Driver_TaskRemoved,
	});

	// Both tasks should be cleaned up, 1c before 2c,
	// since task 2 was the current task and should be cleaned up last
	t.deepEqual(order, ["1a", "2a", "1c", "2c"]);
});

test("The task rejection uses the given error, if any", async (t) => {
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

	await wait(1);
	// The task should have run to the first yield
	t.deepEqual(order, ["1a"]);

	await scheduler.removeTasks(
		(t) => true,
		new ZWaveError("Test error", ZWaveErrorCodes.Driver_Reset),
	);

	await assertZWaveError(t, () => task1, {
		errorCode: ZWaveErrorCodes.Driver_Reset,
	});

	t.deepEqual(order, ["1a", "1c"]);
});
