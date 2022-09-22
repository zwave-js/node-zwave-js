import test from "ava";
import { ObjectKeyMap, ReadonlyObjectKeyMap } from "./ObjectKeyMap";

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
	t.is(
		map.get({
			property: "prop",
			propertyKey: "foo",
		}),
		1,
	);
	t.is(
		map.get({
			property: "prop",
			propertyKey: "bar",
		}),
		2,
	);
});

test("get(): should return undefined after a call to clear()", (t) => {
	const map = fixtures.createMapWithEntries();
	map.clear();
	t.is(
		map.get({
			property: "prop",
			propertyKey: "foo",
		}),
		undefined,
	);
	t.is(
		map.get({
			property: "prop",
			propertyKey: "bar",
		}),
		undefined,
	);
});

test("has(): should treat different property keys as distinct values", (t) => {
	const map = fixtures.createMapWithEntries();
	t.true(
		map.has({
			property: "prop",
			propertyKey: "foo",
		}),
	);
	t.false(
		map.has({
			property: "prop",
			propertyKey: "baz",
		}),
	);
});

test("has(): should return false after a call to clear()", (t) => {
	const map = fixtures.createMapWithEntries();
	map.clear();
	t.false(
		map.has({
			property: "prop",
			propertyKey: "foo",
		}),
	);
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

	t.is(
		map.get({
			property: "prop",
			propertyKey: "foo",
		}),
		6,
	);
});

test("values(): works like on the original Map class", (t) => {
	const map = fixtures.createMapWithEntries();
	t.deepEqual(
		[...map.values()],
		fixtures.entries.map(([, v]) => v),
	);
});

test("keys(): works like on the original Map class", (t) => {
	const map = fixtures.createMapWithEntries();
	t.deepEqual(
		[...map.keys()],
		fixtures.entries.map(([k]) => k),
	);
});

test("required key properties should automatically be filled in", (t) => {
	const map = new ObjectKeyMap<
		{ property: string; propertyKey?: string },
		number
	>(undefined, { propertyKey: "5" });
	map.set({ property: "foo" }, 1);
	map.set({ property: "foo", propertyKey: "1" }, 2);
	t.deepEqual(
		[...map.keys()],
		[
			{ property: "foo", propertyKey: "5" },
			{ property: "foo", propertyKey: "1" },
		],
	);
});

test("should be iterable", (t) => {
	const map: ReadonlyObjectKeyMap<{ key: string }, number> = new ObjectKeyMap(
		[[{ key: "test" }, 1]],
	);
	t.deepEqual([...map], [[{ key: "test" }, 1]]);

	const readonlyMap: ReadonlyObjectKeyMap<{ key: string }, number> =
		new ObjectKeyMap([[{ key: "test" }, 1]]);
	t.deepEqual([...readonlyMap], [[{ key: "test" }, 1]]);
});
