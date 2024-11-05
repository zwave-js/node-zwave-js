import { ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";
import {
	decodeSetbackState,
	decodeSwitchpoint,
	encodeSetbackState,
	encodeSwitchpoint,
	setbackSpecialStateValues,
} from "./serializers.js";

test("encodeSetbackState() should return the defined values for the special states", (t) => {
	for (
		const state of Object.keys(
			setbackSpecialStateValues,
		) as (keyof typeof setbackSpecialStateValues)[]
	) {
		t.expect(
			encodeSetbackState(state as any)[0],
		).toBe(setbackSpecialStateValues[state]);
	}
});

test("encodeSetbackState() should return the value times 10 otherwise", (t) => {
	for (const val of [0.1, 12, -12.7, 0, 5.5]) {
		const result = encodeSetbackState(val);
		const raw = result.readInt8(0);
		t.expect(raw).toBe(val * 10);
	}
});

test("decodeSetbackState() should return the defined values for the special states", (t) => {
	for (
		const state of Object.keys(
			setbackSpecialStateValues,
		) as (keyof typeof setbackSpecialStateValues)[]
	) {
		const raw = Uint8Array.from([setbackSpecialStateValues[state]]);
		t.expect(decodeSetbackState(raw)).toBe(state);
	}
});

test("decodeSetbackState() should return undefined if an unknown special state is passed", (t) => {
	t.expect(decodeSetbackState(Uint8Array.from([0x7e]))).toBeUndefined();
});

test("decodeSetbackState() should return the value divided by 10 otherwise", (t) => {
	for (const val of [1, 120, -127, 0, 55]) {
		const raw = new Bytes(1);
		raw.writeInt8(val);
		t.expect(decodeSetbackState(raw)).toBe(val / 10);
	}
});

test("encodeSwitchpoint() should correctly encode the hour part", (t) => {
	const base = {
		minute: 5,
		state: 0,
	};
	for (let hour = 0; hour < 24; hour++) {
		t.expect(encodeSwitchpoint({ ...base, hour })[0]).toBe(hour);
	}
});

test("encodeSwitchpoint() should correctly encode the minute part", (t) => {
	const base = {
		hour: 5,
		state: 0,
	};
	for (let minute = 0; minute < 60; minute++) {
		t.expect(encodeSwitchpoint({ ...base, minute })[1]).toBe(minute);
	}
});

test("encodeSwitchpoint() should throw when the switchpoint state is undefined", (t) => {
	assertZWaveError(
		t.expect,
		() => encodeSwitchpoint({ hour: 1, minute: 5, state: undefined }),
		{
			errorCode: ZWaveErrorCodes.CC_Invalid,
		},
	);
});

test("decodeSwitchpoint() should work correctly", (t) => {
	t.expect(decodeSwitchpoint(Uint8Array.from([15, 37, 0]))).toStrictEqual({
		hour: 15,
		minute: 37,
		state: 0,
	});
});
