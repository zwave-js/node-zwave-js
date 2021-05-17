import { ObjectKeyMap, ReadonlyObjectKeyMap } from "./ObjectKeyMap";

describe("lib/util/ObjectKeyMap", () => {
	describe("get()", () => {
		const map = new ObjectKeyMap<
			{ property: string; propertyKey: string },
			number
		>();
		beforeAll(() => {
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
					propertyKey: "bar",
				},
				2,
			);
		});

		it("should treat different property keys as distinct values", () => {
			expect(
				map.get({
					property: "prop",
					propertyKey: "foo",
				}),
			).toBe(1);
			expect(
				map.get({
					property: "prop",
					propertyKey: "bar",
				}),
			).toBe(2);
		});

		it("should return undefined after a call to clear()", () => {
			map.clear();
			expect(
				map.get({
					property: "prop",
					propertyKey: "foo",
				}),
			).toBeUndefined();
			expect(
				map.get({
					property: "prop",
					propertyKey: "bar",
				}),
			).toBeUndefined();
		});
	});

	describe("has()", () => {
		const map = new ObjectKeyMap<
			{ property: string; propertyKey: string },
			number
		>();
		beforeAll(() => {
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
					propertyKey: "bar",
				},
				2,
			);
		});

		it("should treat different property keys as distinct values", () => {
			expect(
				map.has({
					property: "prop",
					propertyKey: "foo",
				}),
			).toBeTrue();
			expect(
				map.has({
					property: "prop",
					propertyKey: "baz",
				}),
			).toBeFalse();
		});

		it("should return false after a call to clear()", () => {
			map.clear();
			expect(
				map.has({
					property: "prop",
					propertyKey: "foo",
				}),
			).toBeFalse();
		});
	});

	describe("set()", () => {
		const map = new ObjectKeyMap<
			{ property: string; propertyKey: string },
			number
		>();

		it("should overwrite previous values", () => {
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

			expect(
				map.get({
					property: "prop",
					propertyKey: "foo",
				}),
			).toBe(6);
		});
	});

	describe("values()", () => {
		const map = new ObjectKeyMap<
			{ property: string; propertyKey: string },
			number
		>();
		const entries = [
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
		] as const;

		beforeAll(() => {
			for (const [k, v] of entries) {
				map.set(k, v);
			}
		});

		it("works like on the original Map class", () => {
			expect([...map.values()]).toEqual(entries.map(([, v]) => v));
		});
	});

	describe("keys()", () => {
		const map = new ObjectKeyMap<
			{ property: string; propertyKey: string },
			number
		>();
		const entries = [
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
		] as const;

		beforeAll(() => {
			for (const [k, v] of entries) {
				map.set(k, v);
			}
		});

		it("works like on the original Map class", () => {
			expect([...map.keys()]).toEqual(entries.map(([k]) => k));
		});
	});

	describe("required key properties", () => {
		it("should automatically be filled in", () => {
			const map = new ObjectKeyMap<
				{ property: string; propertyKey?: string },
				number
			>(undefined, { propertyKey: "5" });
			map.set({ property: "foo" }, 1);
			map.set({ property: "foo", propertyKey: "1" }, 2);
			expect([...map.keys()]).toEqual([
				{ property: "foo", propertyKey: "5" },
				{ property: "foo", propertyKey: "1" },
			]);
		});
	});

	it("should be iterable", () => {
		const map: ReadonlyObjectKeyMap<
			{ key: string },
			number
		> = new ObjectKeyMap([[{ key: "test" }, 1]]);
		expect([...map]).toEqual([[{ key: "test" }, 1]]);

		const readonlyMap: ReadonlyObjectKeyMap<
			{ key: string },
			number
		> = new ObjectKeyMap([[{ key: "test" }, 1]]);
		expect([...readonlyMap]).toEqual([[{ key: "test" }, 1]]);
	});
});
