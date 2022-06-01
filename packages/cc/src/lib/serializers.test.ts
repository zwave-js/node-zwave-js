import { assertZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import {
	decodeSetbackState,
	decodeSwitchpoint,
	encodeSetbackState,
	encodeSwitchpoint,
	setbackSpecialStateValues,
} from "./serializers";

describe("encodeSetbackState()", () => {
	it("should return the defined values for the special states", () => {
		for (const state of Object.keys(
			setbackSpecialStateValues,
		) as (keyof typeof setbackSpecialStateValues)[]) {
			expect(encodeSetbackState(state as any)).toBe(
				setbackSpecialStateValues[state],
			);
		}
	});

	it("should return the value times 10 otherwise", () => {
		for (const val of [0.1, 12, -12.7, 0, 5.5]) {
			expect(encodeSetbackState(val)).toBe(val * 10);
		}
	});
});

describe("decodeSetbackState()", () => {
	it("should return the defined values for the special states", () => {
		for (const state of Object.keys(
			setbackSpecialStateValues,
		) as (keyof typeof setbackSpecialStateValues)[]) {
			expect(decodeSetbackState(setbackSpecialStateValues[state])).toBe(
				state,
			);
		}
	});

	it("should return undefined if an unknown special state is passed", () => {
		expect(decodeSetbackState(0x7e)).toBeUndefined();
	});

	it("should return the value divided by 10 otherwise", () => {
		for (const val of [1, 120, -127, 0, 55]) {
			expect(decodeSetbackState(val)).toBe(val / 10);
		}
	});
});

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
			() => encodeSwitchpoint({ hour: 1, minute: 5, state: undefined }),
			{
				errorCode: ZWaveErrorCodes.CC_Invalid,
			},
		);
	});
});

describe("decodeSwitchpoint()", () => {
	it("should work correctly", () => {
		expect(decodeSwitchpoint(Buffer.from([15, 37, 0]))).toContainEntries([
			["hour", 15],
			["minute", 37],
			["state", 0],
		]);
	});
});
