import { expect } from "chai";
import { composeObject, entries, filter, values } from "./object-polyfill";
// tslint:disable:no-unused-expression

// describe("lib/object-polyfill => bury() =>", () => {

// 	it("should work with nested properties", () => {
// 		const target = {a: "a", b: {c: "c"}, d: "d"};
// 		bury(target, "a", "A");
// 		bury(target, "b.c", "C");
// 		const expected = {a: "A", b: {c: "C"}, d: "d"};
// 		expect(target).to.deep.equal(expected);
// 	});

// 	it("should work with non-existing properties", () => {
// 		const target = {a: "a", b: {c: "c"}, d: "d"};
// 		bury(target, "e", "E");
// 		const expected = {a: "a", b: {c: "c"}, d: "d", e: "E"};
// 		expect(target).to.deep.equal(expected);
// 	});

// 	it("should work with arrays", () => {
// 		const target = {a: [{b: "b"}, {c: "c"}]};
// 		bury(target, "a.[1].c", "C");
// 		bury(target, "a.[1].d", "d");
// 		const expected = {a: [{b: "b"}, {c: "C", d: "d"}]};
// 		expect(target).to.deep.equal(expected);
// 	});

// });

// describe("lib/object-polyfill => dig() =>", () => {

// 	const source = {a: "A", b: ["B", {c: "C"}], d: {e: "E"}};

// 	it("should find the correct property", () => {
// 		expect(dig(source, "a")).to.equal("A");
// 	});

// 	it("should work with nested properties", () => {
// 		expect(dig(source, "d.e")).to.equal("E");
// 	});

// 	it("should work with arrays", () => {
// 		expect(dig(source, "b.[0]")).to.be.equal("B");
// 		expect(dig(source, "b.[1]")).to.deep.equal({c: "C"});
// 	});
// });

describe("lib/object-polyfill => values() =>", () => {

	const source = {a: "A", b: "B", c: "C"};

	it("should return the array of values", () => {
		expect(values(source)).to.deep.equal(["A", "B", "C"]);
	});

	it("should work for empty objects", () => {
		expect(values({})).to.deep.equal([]);
	});

});

describe("lib/object-polyfill => entries() =>", () => {

	const source = {a: "A", b: "B", c: "C"};

	it("should return the array of [key, value] pairs", () => {
		expect(entries(source)).to.deep.equal([["a", "A"], ["b", "B"], ["c", "C"]]);
	});

	it("should work for empty objects", () => {
		expect(entries({})).to.deep.equal([]);
	});

});

describe("lib/object-polyfill => composeObject() =>", () => {

	const _entries: [string, string][] = [["a", "A"], ["b", "B"], ["c", "C"]];
	const expected = {a: "A", b: "B", c: "C"};

	it("should turn an array of [key, value] pairs into an object", () => {
		expect(composeObject(_entries)).to.deep.equal(expected);
	});

	it("should overwrite duplicates", () => {
		const dupes = _entries.concat([["a", "F"]]);
		const expectedWithDupes = {a: "F", b: "B", c: "C"};
		expect(composeObject(dupes)).to.deep.equal(expectedWithDupes);
	});

	it("should work for empty arrays", () => {
		expect(composeObject([])).to.deep.equal({});
	});

});

describe("lib/object-polyfill => filter() =>", () => {

	const source = {a: 1, b: 2, c: 3};

	it("should return only the properties matching the filter", () => {
		expect(filter(source, v => v >= 2)).to.deep.equal({ b: 2, c: 3 });
	});

	it("should work correctly with an impossible filter", () => {
		expect(filter(source, () => false)).to.deep.equal({ });
	});

	it("should work for empty objects", () => {
		expect(filter({}, () => true)).to.deep.equal({});
	});

});

// describe("lib/object-polyfill => extend() =>", () => {

// 	it("the target should include the source object's properties", () => {
// 		const target1 = {};
// 		const target2 = {a: "a"};
// 		const target3 = {c: {_c: "c"}};
// 		const source = {a: 1, b: 2, c: {d: "d", e: "e"}};
// 		expect(extend(target1, source)).to.deep.include(source);
// 		expect(extend(target2, source)).to.deep.include(source);
// 		expect(extend(target3, source)).to.include({a: 1, b: 2});
// 		expect(extend(target3.c, source)).to.include({d: "d", e: "e"});
// 	});

// 	it("should override existing properties", () => {
// 		const target = {a: "a", b: "b"};
// 		const source = {a: "A"};
// 		const expected = {a: "A", b: "b"};
// 		expect(extend(target, source)).to.deep.equal(expected);
// 	});

// 	it("should merge nested objects", () => {
// 		const target = {a: "a", b: {c: "c"}};
// 		const source = {b: {d: "d"}};
// 		const expected = {a: "a", b: {c: "c", d: "d"}};
// 		expect(extend(target, source)).to.deep.equal(expected);
// 	});

// 	it("should accept null as a target", () => {
// 		expect(extend(null, {a: "a"})).to.deep.equal({a: "a"});
// 	});
// 	it("should work with empty objects", () => {
// 		expect(extend({}, {})).to.deep.equal({});
// 	});
// });
