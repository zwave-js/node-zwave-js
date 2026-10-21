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
	t.expect(cloneDeep([1, 2, 3])).not.toBe([1, 2, 3]);
});

test("cloneDeep -> works with objects", (t) => {
	t.expect(cloneDeep({ a: 1, b: 2, c: 3 })).toStrictEqual({
		a: 1,
		b: 2,
		c: 3,
	});
	t.expect(cloneDeep({ a: 1, b: 2, c: 3 })).not.toBe({ a: 1, b: 2, c: 3 });
});

test("cloneDeep -> works with nested objects", (t) => {
	const source = { a: 1, b: { c: 3, d: 4 }, e: [5, 6, 7] };
	const target = cloneDeep(source);

	t.expect(target).toStrictEqual(source);
	t.expect(target).not.toBe(source);
	t.expect(target.b).not.toBe(source.b);
	t.expect(target.e).not.toBe(source.e);
});

test("cloneDeep -> works with nested arrays", (t) => {
	const source = [1, [2, 3], 4];
	const target = cloneDeep(source);

	t.expect(target).toStrictEqual(source);
	t.expect(target).not.toBe(source);
	t.expect(target[1]).not.toBe(source[1]);
});

test("cloneDeep -> works with objects nested in arrays", (t) => {
	const source = [{ a: 1 }, { b: 2 }, { c: 3 }];
	const target = cloneDeep(source);

	t.expect(target).toStrictEqual(source);
	t.expect(target).not.toBe(source);
	t.expect(target[0]).not.toBe(source[0]);
	t.expect(target[1]).not.toBe(source[1]);
	t.expect(target[2]).not.toBe(source[2]);
});

test("cloneDeep -> works with arrays nested in objects", (t) => {
	const source = { a: [1, 2, 3] };
	const target = cloneDeep(source);

	t.expect(target).toStrictEqual(source);
	t.expect(target).not.toBe(source);
	t.expect(target.a).not.toBe(source.a);
});

test("cloneDeep -> creates new object instances", (t) => {
	const source = { a: { b: { c: 3, d: 4 } } };
	const target = cloneDeep(source);

	target.a.b.c = 0;
	t.expect(source.a.b.c).not.toBe(0);
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

test("mergeDeep -> copies plain objects from the source", (t) => {
	const source = { a: { b: 1 } };
	const result = mergeDeep({}, source, true);
	mergeDeep(result, { a: { c: 2 } });
	t.expect(result).toStrictEqual({ a: { b: 1, c: 2 } });
	t.expect(source).toStrictEqual({ a: { b: 1 } });
});

test("mergeDeep -> keeps class instances and arrays from the source", (t) => {
	class Foo {
		bar(): number {
			return 1;
		}
	}
	const foo = new Foo();
	const arr = [1, 2];
	const result = mergeDeep({}, { foo, arr }, true);
	t.expect(result.foo).toBe(foo);
	t.expect(result.arr).toBe(arr);
});

test("mergeDeep -> does not merge into inherited properties", (t) => {
	const result = mergeDeep(
		{ b: {} },
		{ a: { constructor: { marker: true } }, constructor: { marker: true } },
		true,
	);
	t.expect((Object as any).marker).toBeUndefined();
	t.expect(result.a.constructor).toStrictEqual({ marker: true });
});

test("mergeDeep -> ignores __proto__ keys", (t) => {
	const source = JSON.parse(
		'{"__proto__": {"marker": true}, "b": {"__proto__": {"marker": true}}}',
	);
	const result = mergeDeep({ b: {} }, source, true);
	t.expect(({} as any).marker).toBeUndefined();
	t.expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
	t.expect(Object.getPrototypeOf(result.b)).toBe(Object.prototype);
});

test("mergeDeep -> does not merge into functions or class instances", (t) => {
	const result = mergeDeep({}, { binding: Object }, true);
	mergeDeep(result, { binding: { prototype: { marker: true } } });
	t.expect(({} as any).marker).toBeUndefined();
	t.expect(result.binding).toBe(Object);

	mergeDeep(result, { binding: { prototype: { marker: true } } }, true);
	t.expect(({} as any).marker).toBeUndefined();
	t.expect(result.binding).toStrictEqual({ prototype: { marker: true } });
});

test("mergeDeep -> replaces arrays instead of merging them", (t) => {
	const result = mergeDeep({ a: [1, 2, 3] }, { a: [4] }, true);
	t.expect(result.a).toStrictEqual([4]);
	t.expect(mergeDeep({ a: [1, 2, 3] }, { a: [4] }).a).toStrictEqual([
		1, 2, 3,
	]);
});
