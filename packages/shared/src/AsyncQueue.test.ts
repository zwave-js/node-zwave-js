import { wait } from "alcalzone-shared/async";
import { test } from "vitest";
import { AsyncQueue } from "./AsyncQueue.js";

test("can be iterated over after adding items", async (t) => {
	const queue = new AsyncQueue<number>();

	queue.add(1, 2, 3);
	queue.end();

	const actual = new Promise<number[]>(async (resolve) => {
		const seen: number[] = [];
		for await (const item of queue) {
			seen.push(item);
		}
		resolve(seen);
	});

	t.expect(await actual).toStrictEqual([1, 2, 3]);
});

test("can be iterated over when adding items later", async (t) => {
	const queue = new AsyncQueue<number>();

	const actual = new Promise<number[]>(async (resolve) => {
		const seen: number[] = [];
		for await (const item of queue) {
			seen.push(item);
		}
		resolve(seen);
	});

	queue.add(1, 2, 3);
	queue.end();

	t.expect(await actual).toStrictEqual([1, 2, 3]);
});

test("can be iterated over when adding items asynchronously", async (t) => {
	const queue = new AsyncQueue<number>();

	const actual = new Promise<number[]>(async (resolve) => {
		const seen: number[] = [];
		for await (const item of queue) {
			seen.push(item);
		}
		resolve(seen);
	});

	queue.add(1, 2, 3);
	await wait(100);
	queue.add(4, 5);
	queue.end();

	t.expect(await actual).toStrictEqual([1, 2, 3, 4, 5]);
});

test("aborting clears all pending items", async (t) => {
	const queue = new AsyncQueue<number>();

	const actual = new Promise<number[]>(async (resolve) => {
		const seen: number[] = [];
		for await (const item of queue) {
			seen.push(item);
			if (seen.length === 3) {
				await wait(100);
			}
		}
		resolve(seen);
	});

	queue.add(1, 2, 3, 4, 5);
	await wait(50);
	queue.abort();

	t.expect(await actual).toStrictEqual([1, 2, 3]);
});

test("items can be removed before they are consumed", async (t) => {
	const queue = new AsyncQueue<number>();

	const actual = new Promise<number[]>(async (resolve) => {
		const seen: number[] = [];
		for await (const item of queue) {
			seen.push(item);
			if (seen.length === 2) {
				await wait(100);
			}
		}
		resolve(seen);
	});

	queue.add(1, 2, 3, 4, 5);
	await wait(50);
	t.expect(queue.remove(2)).toBe(false);
	t.expect(queue.remove(3)).toBe(true);
	t.expect(queue.remove(4)).toBe(true);
	queue.end();

	t.expect(await actual).toStrictEqual([1, 2, 5]);
});
