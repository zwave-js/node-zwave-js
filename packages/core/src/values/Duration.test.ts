import { test } from "vitest";
import { ZWaveErrorCodes } from "../error/ZWaveError.js";
import { assertZWaveError } from "../test/assertZWaveError.js";
import { Duration } from "./Duration.js";

test("constructor() -> should remember the given value and unit", (t) => {
	const tests = [
		{ unit: "minutes", value: 4 },
		{ unit: "seconds", value: 8 },
	] as const;
	for (const { unit, value } of tests) {
		const duration = new Duration(value, unit as any);
		t.expect(duration.unit).toBe(unit);
		t.expect(duration.value).toBe(value);
	}
});

test("constructor() -> should set the duration to zero for unknown and default", (t) => {
	const tests = [
		{ unit: "unknown", value: 4 },
		{ unit: "default", value: 8 },
	] as const;
	for (const { unit, value } of tests) {
		const duration = new Duration(value, unit as any);
		t.expect(duration.unit).toBe(unit);
		t.expect(duration.value).toBe(0);
	}
});

test("constructor() -> should change 0 minutes to 0 seconds", (t) => {
	const duration = new Duration(0, "minutes");
	t.expect(duration.unit).toBe("seconds");
	t.expect(duration.value).toBe(0);
});

test("parseReport() -> should correctly parse unknown durations", (t) => {
	const duration = Duration.parseReport(0xfe);
	t.expect(duration!.unit).toBe("unknown");
	t.expect(duration!.value).toBe(0);
});

test("parseReport() -> should return undefined when undefined is passed", (t) => {
	const duration = Duration.parseReport(undefined);
	t.expect(duration).toBeUndefined();
});

test("parseReport() -> should return undefined when a reserved value is passed", (t) => {
	const duration = Duration.parseReport(0xff);
	t.expect(duration).toBeUndefined();
});

test("parseReport() -> should correctly parse valid durations", (t) => {
	const tests = [
		{ payload: 0x83, unit: "minutes", value: 4 },
		{ payload: 0xfd, unit: "minutes", value: 126 },
		{ payload: 0x08, unit: "seconds", value: 8 },
		{ payload: 0x7f, unit: "seconds", value: 127 },
	] as const;
	for (const { payload, unit, value } of tests) {
		const duration = Duration.parseReport(payload);
		t.expect(duration!.unit).toBe(unit);
		t.expect(duration!.value).toBe(value);
	}
});

test("parseSet() -> should correctly parse default durations", (t) => {
	const duration = Duration.parseSet(0xff);
	t.expect(duration!.unit).toBe("default");
	t.expect(duration!.value).toBe(0);
});
test("parseSet() -> should return undefined when undefined is passed", (t) => {
	const duration = Duration.parseSet(undefined);
	t.expect(duration).toBeUndefined();
});

test("parseSet() -> should correctly parse valid durations", (t) => {
	const tests = [
		{ payload: 0x80, unit: "minutes", value: 1 },
		{ payload: 0x83, unit: "minutes", value: 4 },
		{ payload: 0xfe, unit: "minutes", value: 127 },
		{ payload: 0x00, unit: "seconds", value: 0 },
		{ payload: 0x01, unit: "seconds", value: 1 },
		{ payload: 0x08, unit: "seconds", value: 8 },
		{ payload: 0x7f, unit: "seconds", value: 127 },
	] as const;
	for (const { payload, unit, value } of tests) {
		const duration = Duration.parseSet(payload);
		t.expect(duration!.unit).toBe(unit);
		t.expect(duration!.value).toBe(value);
	}
});

test("serializeSet() -> should correctly parse default durations", (t) => {
	const payload = Duration.default().serializeSet();
	t.expect(payload).toBe(0xff);
});

test("serializeSet() -> should throw for unknown durations", (t) => {
	const duration = Duration.unknown();
	assertZWaveError(t.expect, () => duration.serializeSet(), {
		errorCode: ZWaveErrorCodes.CC_Invalid,
	});
});

test("serializeSet() -> should correctly serialize valid durations", (t) => {
	const tests = [
		{ expected: 0x83, unit: "minutes", value: 4 },
		{ expected: 0xfe, unit: "minutes", value: 127 },
		{ expected: 0x08, unit: "seconds", value: 8 },
		{ expected: 0x7f, unit: "seconds", value: 127 },
	];
	for (const { expected, unit, value } of tests) {
		const actual = new Duration(value, unit as any).serializeSet();
		t.expect(actual).toBe(expected);
	}
});

test(`toJSON() -> should return a string for "unknown" and "default"`, (t) => {
	t.expect(new Duration(1, "default").toJSON()).toBe("default");
	t.expect(new Duration(1, "unknown").toJSON()).toBe("unknown");
});

test("toJSON() -> should return an object with the value and unit otherwise", (t) => {
	const tests = [
		{ unit: "minutes" as const, value: 4 },
		{ unit: "minutes" as const, value: 127 },
		{ unit: "seconds" as const, value: 8 },
		{ unit: "seconds" as const, value: 127 },
	];
	for (const test of tests) {
		const { unit, value } = test;
		const actual = new Duration(value, unit).toJSON();
		t.expect(actual).toStrictEqual(test);
	}
});

test("parseString() -> should return undefined for unknown or unrepresentable values", (t) => {
	t.expect(Duration.parseString("")).toBeUndefined();
	t.expect(Duration.parseString("15")).toBeUndefined();
	t.expect(Duration.parseString("33h")).toBeUndefined();
	t.expect(Duration.parseString("not_a_number")).toBeUndefined();
});

test("parseString() -> should return a duration for seconds", (t) => {
	t.expect(Duration.parseString("10s")).toStrictEqual(
		new Duration(10, "seconds"),
	);
	t.expect(Duration.parseString("25s")).toStrictEqual(
		new Duration(25, "seconds"),
	);
	t.expect(Duration.parseString("33S")).toStrictEqual(
		new Duration(33, "seconds"),
	);
});

test(`parseString() -> should return a duration for minutes`, (t) => {
	t.expect(Duration.parseString("17m")).toStrictEqual(
		new Duration(17, "minutes"),
	);
	t.expect(Duration.parseString("22m")).toStrictEqual(
		new Duration(22, "minutes"),
	);
	t.expect(Duration.parseString("99M")).toStrictEqual(
		new Duration(99, "minutes"),
	);
});

test("parseString() -> should return a duration for hours", (t) => {
	t.expect(Duration.parseString("2h")).toStrictEqual(
		new Duration(120, "minutes"),
	);
	t.expect(Duration.parseString("1h8s")).toStrictEqual(
		new Duration(60, "minutes"),
	);
});

test("parseString() -> should return the nearest possible duration for combined seconds and minutes", (t) => {
	t.expect(Duration.parseString("19m18s")).toStrictEqual(
		new Duration(19, "minutes"),
	);
	t.expect(
		Duration.parseString("1m10s"),
	).toStrictEqual(new Duration(60 + 10, "seconds"));
	t.expect(Duration.parseString("0m9s")).toStrictEqual(
		new Duration(9, "seconds"),
	);
});

test("from() -> should return a duration when a string is passed", (t) => {
	t.expect(Duration.from("")).toBeUndefined();
	t.expect(Duration.from("88s")).toStrictEqual(new Duration(88, "seconds"));
});

test("from() -> should return the passed duration when a duration instance is passed", (t) => {
	const duration = new Duration(137, "minutes");
	t.expect(Duration.from(duration)).toStrictEqual(duration);
});
