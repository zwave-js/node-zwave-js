import { assertZWaveError } from "../../../test/util";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { Duration } from "./Duration";

describe("lib/util/Duration", () => {
	describe("constructor()", () => {
		it("should remember the given value and unit", () => {
			const tests = [
				{ unit: "minutes", value: 4 },
				{ unit: "seconds", value: 8 },
			];
			for (const { unit, value } of tests) {
				const duration = new Duration(value, unit as any);
				expect(duration.unit).toBe(unit);
				expect(duration.value).toBe(value);
			}
		});

		it("should set the duration to zero for unknown and default", () => {
			const tests = [
				{ unit: "unknown", value: 4 },
				{ unit: "default", value: 8 },
			];
			for (const { unit, value } of tests) {
				const duration = new Duration(value, unit as any);
				expect(duration.unit).toBe(unit);
				expect(duration.value).toBe(0);
			}
		});

		it("should change 0 minutes to 0 seconds", () => {
			const duration = new Duration(0, "minutes");
			expect(duration.unit).toBe("seconds");
			expect(duration.value).toBe(0);
		});
	});

	describe("parseReport()", () => {
		it("should correctly parse unknown durations", () => {
			const duration = Duration.parseReport(0xfe);
			expect(duration!.unit).toBe("unknown");
			expect(duration!.value).toBe(0);
		});

		it("should return undefined when a reserved value is passed", () => {
			const duration = Duration.parseReport(0xff);
			expect(duration).toBeUndefined();
		});

		it("should correctly parse valid durations", () => {
			const tests = [
				{ payload: 0x83, unit: "minutes", value: 4 },
				{ payload: 0xfd, unit: "minutes", value: 126 },
				{ payload: 0x08, unit: "seconds", value: 8 },
				{ payload: 0x7f, unit: "seconds", value: 127 },
			];
			for (const { payload, unit, value } of tests) {
				const duration = Duration.parseReport(payload);
				expect(duration!.unit).toBe(unit);
				expect(duration!.value).toBe(value);
			}
		});
	});

	describe("serializeSet()", () => {
		it("should correctly parse default durations", () => {
			const payload = new Duration(0, "default").serializeSet();
			expect(payload).toBe(0xff);
		});

		it("should throw for unknown durations", () => {
			const duration = new Duration(0, "unknown");
			assertZWaveError(() => duration.serializeSet(), {
				errorCode: ZWaveErrorCodes.CC_Invalid,
			});
		});

		it("should correctly serialize valid durations", () => {
			const tests = [
				{ expected: 0x83, unit: "minutes", value: 4 },
				{ expected: 0xfe, unit: "minutes", value: 127 },
				{ expected: 0x08, unit: "seconds", value: 8 },
				{ expected: 0x7f, unit: "seconds", value: 127 },
			];
			for (const { expected, unit, value } of tests) {
				const actual = new Duration(value, unit as any).serializeSet();
				expect(actual).toBe(expected);
			}
		});
	});

	describe("toJSON()", () => {
		it(`should return a string for "unknown" and "default"`, () => {
			expect(new Duration(1, "default").toJSON()).toBe("default");
			expect(new Duration(1, "unknown").toJSON()).toBe("unknown");
		});

		it("should return an object with the value and unit otherwise", () => {
			const tests = [
				{ unit: "minutes" as const, value: 4 },
				{ unit: "minutes" as const, value: 127 },
				{ unit: "seconds" as const, value: 8 },
				{ unit: "seconds" as const, value: 127 },
			];
			for (const test of tests) {
				const { unit, value } = test;
				const actual = new Duration(value, unit).toJSON();
				expect(actual).toEqual(test);
			}
		});
	});
});
