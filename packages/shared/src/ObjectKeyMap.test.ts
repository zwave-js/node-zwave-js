import { test } from "vitest";
import { ObjectKeyMap, type ReadonlyObjectKeyMap } from "./ObjectKeyMap.js";

const fixtures = {
	entries: [
		[
			{
				property: "prop",
				propertyKey: "foo",
			},
			1,
		],
		[
			{
				property: "prop",
				propertyKey: "bar",
			},
			2,
		],
	] as const,
	createMapWithEntries: () => {
		const map = new ObjectKeyMap<
			{ property: string; propertyKey: string },
			number
		>();
		for (const [key, value] of fixtures.entries) {
			map.set(key, value);
		}
		return map;
	},
};

test("get(): should treat different property keys as distinct values", (t) => {
	const map = fixtures.createMapWithEntries();
	t.expect(
		map.get({
			property: "prop",
			propertyKey: "foo",
		}),
	).toBe(1);
	t.expect(
		map.get({
			property: "prop",
			propertyKey: "bar",
		}),
	).toBe(2);
});

test("get(): should return undefined after a call to clear()", (t) => {
	const map = fixtures.createMapWithEntries();
	map.clear();
	t.expect(
		map.get({
			property: "prop",
			propertyKey: "foo",
		}),
	).toBeUndefined();
	t.expect(
		map.get({
			property: "prop",
			propertyKey: "bar",
		}),
	).toBeUndefined();
});

test("has(): should treat different property keys as distinct values", (t) => {
	const map = fixtures.createMapWithEntries();
	t.expect(
		map.has({
			property: "prop",
			propertyKey: "foo",
		}),
	).toBe(true);
	t.expect(
		map.has({
			property: "prop",
			propertyKey: "baz",
		}),
	).toBe(false);
});

test("has(): should return false after a call to clear()", (t) => {
	const map = fixtures.createMapWithEntries();
	map.clear();
	t.expect(
		map.has({
			property: "prop",
			propertyKey: "foo",
		}),
	).toBe(false);
});

test("set(): should overwrite previous values", (t) => {
	const map = new ObjectKeyMap<
		{ property: string; propertyKey: string },
		number
	>();
	map.set(
		{
			property: "prop",
			propertyKey: "foo",
		},
		1,
	);
	map.set(
		{
			property: "prop",
			propertyKey: "foo",
		},
		6,
	);

	t.expect(
		map.get({
			property: "prop",
			propertyKey: "foo",
		}),
	).toBe(6);
});

test("values(): works like on the original Map class", (t) => {
	const map = fixtures.createMapWithEntries();
	t.expect(
		[...map.values()],
	).toStrictEqual(fixtures.entries.map(([, v]) => v));
});

test("keys(): works like on the original Map class", (t) => {
	const map = fixtures.createMapWithEntries();
	t.expect(
		[...map.keys()],
	).toStrictEqual(fixtures.entries.map(([k]) => k));
});

test("required key properties should automatically be filled in", (t) => {
	const map = new ObjectKeyMap<
		{ property: string; propertyKey?: string },
		number
	>(undefined, { propertyKey: "5" });
	map.set({ property: "foo" }, 1);
	map.set({ property: "foo", propertyKey: "1" }, 2);
	t.expect(
		[...map.keys()],
	).toStrictEqual([
		{ property: "foo", propertyKey: "5" },
		{ property: "foo", propertyKey: "1" },
	]);
});

test("should be iterable", (t) => {
	const map: ReadonlyObjectKeyMap<{ key: string }, number> = new ObjectKeyMap(
		[[{ key: "test" }, 1]],
	);
	t.expect([...map]).toStrictEqual([[{ key: "test" }, 1]]);

	const readonlyMap: ReadonlyObjectKeyMap<{ key: string }, number> =
		new ObjectKeyMap([[{ key: "test" }, 1]]);
	t.expect([...readonlyMap]).toStrictEqual([[{ key: "test" }, 1]]);
});
