import { test } from "vitest";
import {
	cloneDeep,
	discreteBinarySearch,
	discreteLinearSearch,
	mergeDeep,
} from "./utils.js";

test("discreteBinarySearch -> test case 1", async (t) => {
	const [rangeMin, rangeMax] = [0, 9];
	const values = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
	t.expect(
		await discreteBinarySearch(rangeMin, rangeMax, (i) => values[i] === 0),
	).toBe(4);
});

test("discreteBinarySearch -> test case 2", async (t) => {
	const [rangeMin, rangeMax] = [0, 9];
	const values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	t.expect(
		await discreteBinarySearch(rangeMin, rangeMax, (i) => values[i] === 0),
	).toBe(9);
});

test("discreteBinarySearch -> test case 3", async (t) => {
	const [rangeMin, rangeMax] = [0, 6];
	const values = [0, 1, 1, 1, 1, 1, 1];
	t.expect(
		await discreteBinarySearch(rangeMin, rangeMax, (i) => values[i] === 0),
	).toBe(0);
});

test("discreteBinarySearch -> test case 4", async (t) => {
	const [rangeMin, rangeMax] = [0, 6];
	const values = [1, 1, 1, 1, 1, 1, 1];
	t.expect(
		await discreteBinarySearch(rangeMin, rangeMax, (i) => values[i] === 0),
	).toBeUndefined();
});

test("discreteBinarySearch -> test case 5", async (t) => {
	const [rangeMin, rangeMax] = [0, 0];
	const values = [0];
	t.expect(
		await discreteBinarySearch(rangeMin, rangeMax, (i) => values[i] === 0),
	).toBe(0);
});

test("discreteBinarySearch -> test case 6", async (t) => {
	const [rangeMin, rangeMax] = [1, -1];
	const values: number[] = [];
	t.expect(
		await discreteBinarySearch(rangeMin, rangeMax, (i) => values[i] === 0),
	).toBeUndefined();
});

test("discreteLinearSearch -> test case 1", async (t) => {
	const [rangeMin, rangeMax] = [0, 9];
	const values = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
	t.expect(
		await discreteLinearSearch(rangeMin, rangeMax, (i) => values[i] === 0),
	).toBe(4);
});

test("discreteLinearSearch -> test case 2", async (t) => {
	const [rangeMin, rangeMax] = [0, 9];
	const values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	t.expect(
		await discreteLinearSearch(rangeMin, rangeMax, (i) => values[i] === 0),
	).toBe(9);
});

test("discreteLinearSearch -> test case 3", async (t) => {
	const [rangeMin, rangeMax] = [0, 6];
	const values = [0, 1, 1, 1, 1, 1, 1];
	t.expect(
		await discreteLinearSearch(rangeMin, rangeMax, (i) => values[i] === 0),
	).toBe(0);
});

test("discreteLinearSearch -> test case 4", async (t) => {
	const [rangeMin, rangeMax] = [0, 6];
	const values = [1, 1, 1, 1, 1, 1, 1];
	t.expect(
		await discreteLinearSearch(rangeMin, rangeMax, (i) => values[i] === 0),
	).toBeUndefined();
});

test("discreteLinearSearch -> test case 5", async (t) => {
	const [rangeMin, rangeMax] = [0, 0];
	const values = [0];
	t.expect(
		await discreteLinearSearch(rangeMin, rangeMax, (i) => values[i] === 0),
	).toBe(0);
});

test("discreteLinearSearch -> test case 6", async (t) => {
	const [rangeMin, rangeMax] = [1, -1];
	const values: number[] = [];
	t.expect(
		await discreteLinearSearch(rangeMin, rangeMax, (i) => values[i] === 0),
	).toBeUndefined();
});

test("cloneDeep -> works with primitives", (t) => {
	t.expect(cloneDeep(1)).toBe(1);
	t.expect(cloneDeep("foo")).toBe("foo");
	t.expect(cloneDeep(true)).toBe(true);
});

test("cloneDeep -> works with arrays", (t) => {
	t.expect(cloneDeep([1, 2, 3])).toStrictEqual([1, 2, 3]);
	t.not(cloneDeep([1, 2, 3]), [1, 2, 3]);
});

test("cloneDeep -> works with objects", (t) => {
	t.expect(cloneDeep({ a: 1, b: 2, c: 3 })).toStrictEqual({
		a: 1,
		b: 2,
		c: 3,
	});
	t.not(cloneDeep({ a: 1, b: 2, c: 3 }), { a: 1, b: 2, c: 3 });
});

test("cloneDeep -> works with nested objects", (t) => {
	const source = { a: 1, b: { c: 3, d: 4 }, e: [5, 6, 7] };
	const target = cloneDeep(source);

	t.expect(target).toStrictEqual(source);
	t.not(target, source);
	t.not(target.b, source.b);
	t.not(target.e, source.e);
});

test("cloneDeep -> works with nested arrays", (t) => {
	const source = [1, [2, 3], 4];
	const target = cloneDeep(source);

	t.expect(target).toStrictEqual(source);
	t.not(target, source);
	t.not(target[1], source[1]);
});

test("cloneDeep -> works with objects nested in arrays", (t) => {
	const source = [{ a: 1 }, { b: 2 }, { c: 3 }];
	const target = cloneDeep(source);

	t.expect(target).toStrictEqual(source);
	t.not(target, source);
	t.not(target[0], source[0]);
	t.not(target[1], source[1]);
	t.not(target[2], source[2]);
});

test("cloneDeep -> works with arrays nested in objects", (t) => {
	const source = { a: [1, 2, 3] };
	const target = cloneDeep(source);

	t.expect(target).toStrictEqual(source);
	t.not(target, source);
	t.not(target.a, source.a);
});

test("cloneDeep -> creates new object instances", (t) => {
	const source = { a: { b: { c: 3, d: 4 } } };
	const target = cloneDeep(source);

	target.a.b.c = 0;
	t.not(source.a.b.c, 0);
});

test("mergeDeep -> can delete keys when undefined is passed", (t) => {
	const target = { a: 1, b: 2, c: 3 };
	const result = mergeDeep(target, { a: undefined }, true);
	t.expect(result).toStrictEqual({ b: 2, c: 3 });
});

test("mergeDeep -> sanity check with overwrite: true", (t) => {
	const target = { a: 1, b: { c: 3, d: 4 }, e: [5, 6, 7] };
	const source = { b: { c: undefined }, e: "foo" };
	const result = mergeDeep(target, source, true);
	t.expect(result).toStrictEqual({ a: 1, b: { d: 4 }, e: "foo" });
});

test("mergeDeep -> sanity check with overwrite: false", (t) => {
	const target = { a: 1, b: { c: 3, d: 4 }, e: [5, 6, 7] };
	const source = { b: { c: undefined }, e: "foo", f: "bar" };
	const result = mergeDeep(target, source, false);
	t.expect(result).toStrictEqual({
		a: 1,
		b: { c: 3, d: 4 },
		e: [5, 6, 7],
		f: "bar",
	});
});
