import { assertZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import test from "ava";
import {
	decodeSetbackState,
	decodeSwitchpoint,
	encodeSetbackState,
	encodeSwitchpoint,
	setbackSpecialStateValues,
} from "./serializers";

test("encodeSetbackState() should return the defined values for the special states", (t) => {
	for (const state of Object.keys(
		setbackSpecialStateValues,
	) as (keyof typeof setbackSpecialStateValues)[]) {
		t.is(
			encodeSetbackState(state as any),
			setbackSpecialStateValues[state],
		);
	}
});

test("encodeSetbackState() should return the value times 10 otherwise", (t) => {
	for (const val of [0.1, 12, -12.7, 0, 5.5]) {
		t.is(encodeSetbackState(val), val * 10);
	}
});

test("decodeSetbackState() should return the defined values for the special states", (t) => {
	for (const state of Object.keys(
		setbackSpecialStateValues,
	) as (keyof typeof setbackSpecialStateValues)[]) {
		t.is(decodeSetbackState(setbackSpecialStateValues[state]), state);
	}
});

test("decodeSetbackState() should return undefined if an unknown special state is passed", (t) => {
	t.is(decodeSetbackState(0x7e), undefined);
});

test("decodeSetbackState() should return the value divided by 10 otherwise", (t) => {
	for (const val of [1, 120, -127, 0, 55]) {
		t.is(decodeSetbackState(val), val / 10);
	}
});

test("encodeSwitchpoint() should correctly encode the hour part", (t) => {
	const base = {
		minute: 5,
		state: 0,
	};
	for (let hour = 0; hour < 24; hour++) {
		t.is(encodeSwitchpoint({ ...base, hour })[0], hour);
	}
});

test("encodeSwitchpoint() should correctly encode the minute part", (t) => {
	const base = {
		hour: 5,
		state: 0,
	};
	for (let minute = 0; minute < 60; minute++) {
		t.is(encodeSwitchpoint({ ...base, minute })[1], minute);
	}
});

test("encodeSwitchpoint() should throw when the switchpoint state is undefined", (t) => {
	assertZWaveError(
		t,
		() => encodeSwitchpoint({ hour: 1, minute: 5, state: undefined }),
		{
			errorCode: ZWaveErrorCodes.CC_Invalid,
		},
	);
});

test("decodeSwitchpoint() should work correctly", (t) => {
	t.deepEqual(decodeSwitchpoint(Buffer.from([15, 37, 0])), {
		hour: 15,
		minute: 37,
		state: 0,
	});
});
