/// <reference types="jest-extended" />
import { assertZWaveError } from "../../../test/util";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { decodeSwitchpoint, encodeSwitchpoint } from "./Switchpoint";

describe("lib/values/Switchpoint", () => {
	describe("encodeSwitchpoint()", () => {
		it("should correctly encode the hour part", () => {
			const base = {
				minute: 5,
				state: 0,
			};
			for (let hour = 0; hour < 24; hour++) {
				expect(encodeSwitchpoint({ ...base, hour })[0]).toBe(hour);
			}
		});

		it("should correctly encode the minute part", () => {
			const base = {
				hour: 5,
				state: 0,
			};
			for (let minute = 0; minute < 60; minute++) {
				expect(encodeSwitchpoint({ ...base, minute })[1]).toBe(minute);
			}
		});

		it("should throw when the switchpoint state is undefined", () => {
			assertZWaveError(
				() =>
					encodeSwitchpoint({ hour: 1, minute: 5, state: undefined }),
				{
					errorCode: ZWaveErrorCodes.CC_Invalid,
				},
			);
		});
	});

	describe("decodeSwitchpoint()", () => {
		it("should work correctly", () => {
			expect(
				decodeSwitchpoint(Buffer.from([15, 37, 0])),
			).toContainEntries([["hour", 15], ["minute", 37], ["state", 0]]);
		});
	});
});
