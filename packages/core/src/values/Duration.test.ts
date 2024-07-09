import test from "ava";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { assertZWaveError } from "../test/assertZWaveError";
import { Duration } from "./Duration";

test("constructor() -> should remember the given value and unit", (t) => {
	const tests = [
		{ unit: "minutes", value: 4 },
		{ unit: "seconds", value: 8 },
	] as const;
	for (const { unit, value } of tests) {
		const duration = new Duration(value, unit as any);
		t.is(duration.unit, unit);
		t.is(duration.value, value);
	}
});

test("constructor() -> should set the duration to zero for unknown and default", (t) => {
	const tests = [
		{ unit: "unknown", value: 4 },
		{ unit: "default", value: 8 },
	] as const;
	for (const { unit, value } of tests) {
		const duration = new Duration(value, unit as any);
		t.is(duration.unit, unit);
		t.is(duration.value, 0);
	}
});

test("constructor() -> should change 0 minutes to 0 seconds", (t) => {
	const duration = new Duration(0, "minutes");
	t.is(duration.unit, "seconds");
	t.is(duration.value, 0);
});

test("parseReport() -> should correctly parse unknown durations", (t) => {
	const duration = Duration.parseReport(0xfe);
	t.is(duration!.unit, "unknown");
	t.is(duration!.value, 0);
});

test("parseReport() -> should return undefined when undefined is passed", (t) => {
	const duration = Duration.parseReport(undefined);
	t.is(duration, undefined);
});

test("parseReport() -> should return undefined when a reserved value is passed", (t) => {
	const duration = Duration.parseReport(0xff);
	t.is(duration, undefined);
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
		t.is(duration!.unit, unit);
		t.is(duration!.value, value);
	}
});

test("parseSet() -> should correctly parse default durations", (t) => {
	const duration = Duration.parseSet(0xff);
	t.is(duration!.unit, "default");
	t.is(duration!.value, 0);
});
test("parseSet() -> should return undefined when undefined is passed", (t) => {
	const duration = Duration.parseSet(undefined);
	t.is(duration, undefined);
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
		t.is(duration!.unit, unit);
		t.is(duration!.value, value);
	}
});

test("serializeSet() -> should correctly parse default durations", (t) => {
	const payload = Duration.default().serializeSet();
	t.is(payload, 0xff);
});

test("serializeSet() -> should throw for unknown durations", (t) => {
	const duration = Duration.unknown();
	assertZWaveError(t, () => duration.serializeSet(), {
		errorCode: ZWaveErrorCodes.CC_Invalid,
	});
	t.pass();
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
		t.is(actual, expected);
	}
});

test(`toJSON() -> should return a string for "unknown" and "default"`, (t) => {
	t.is(new Duration(1, "default").toJSON(), "default");
	t.is(new Duration(1, "unknown").toJSON(), "unknown");
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
		t.deepEqual(actual, test);
	}
});

test("parseString() -> should return undefined for unknown or unrepresentable values", (t) => {
	t.is(Duration.parseString(""), undefined);
	t.is(Duration.parseString("15"), undefined);
	t.is(Duration.parseString("33h"), undefined);
	t.is(Duration.parseString("not_a_number"), undefined);
});

test("parseString() -> should return a duration for seconds", (t) => {
	t.deepEqual(Duration.parseString("10s"), new Duration(10, "seconds"));
	t.deepEqual(Duration.parseString("25s"), new Duration(25, "seconds"));
	t.deepEqual(Duration.parseString("33S"), new Duration(33, "seconds"));
});

test(`parseString() -> should return a duration for minutes`, (t) => {
	t.deepEqual(Duration.parseString("17m"), new Duration(17, "minutes"));
	t.deepEqual(Duration.parseString("22m"), new Duration(22, "minutes"));
	t.deepEqual(Duration.parseString("99M"), new Duration(99, "minutes"));
});

test("parseString() -> should return a duration for hours", (t) => {
	t.deepEqual(Duration.parseString("2h"), new Duration(120, "minutes"));
	t.deepEqual(Duration.parseString("1h8s"), new Duration(60, "minutes"));
});

test("parseString() -> should return the nearest possible duration for combined seconds and minutes", (t) => {
	t.deepEqual(Duration.parseString("19m18s"), new Duration(19, "minutes"));
	t.deepEqual(
		Duration.parseString("1m10s"),
		new Duration(60 + 10, "seconds"),
	);
	t.deepEqual(Duration.parseString("0m9s"), new Duration(9, "seconds"));
});

test("from() -> should return a duration when a string is passed", (t) => {
	t.is(Duration.from(""), undefined);
	t.deepEqual(Duration.from("88s"), new Duration(88, "seconds"));
});

test("from() -> should return the passed duration when a duration instance is passed", (t) => {
	const duration = new Duration(137, "minutes");
	t.deepEqual(Duration.from(duration), duration);
});
