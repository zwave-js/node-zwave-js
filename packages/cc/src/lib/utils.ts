import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { clamp } from "alcalzone-shared/math";
import { entries } from "alcalzone-shared/objects";
import type { SetbackSpecialState, SetbackState, Switchpoint } from "./_Types";

export const setbackSpecialStateValues: Record<SetbackSpecialState, number> = {
	"Frost Protection": 0x79,
	"Energy Saving": 0x7a,
	Unused: 0x7f,
};

/**
 * @publicAPI
 * Encodes a setback state to use in a ThermostatSetbackCC
 */
export function encodeSetbackState(state: SetbackState): number {
	if (typeof state === "string") return setbackSpecialStateValues[state];
	state = clamp(state, -12.8, 12);
	return Math.round(state * 10);
}

/**
 * @publicAPI
 * Decodes a setback state used in a ThermostatSetbackCC
 */
export function decodeSetbackState(val: number): SetbackState | undefined {
	if (val > 120) {
		// Special state, try to look it up
		const foundEntry = entries(setbackSpecialStateValues).find(
			([, v]) => val === v,
		);
		if (!foundEntry) return;
		return foundEntry[0] as SetbackSpecialState;
	} else {
		return val / 10;
	}
}

/**
 * @publicAPI
 * Decodes a switch point used in a ClimateControlScheduleCC
 */
export function decodeSwitchpoint(data: Buffer): Switchpoint {
	return {
		hour: data[0] & 0b000_11111,
		minute: data[1] & 0b00_111111,
		state: decodeSetbackState(data[2]),
	};
}

/**
 * @publicAPI
 * Encodes a switch point to use in a ClimateControlScheduleCC
 */
export function encodeSwitchpoint(point: Switchpoint): Buffer {
	if (point.state == undefined)
		throw new ZWaveError(
			"The given Switchpoint is not valid!",
			ZWaveErrorCodes.CC_Invalid,
		);
	return Buffer.from([
		point.hour & 0b000_11111,
		point.minute & 0b00_111111,
		encodeSetbackState(point.state),
	]);
}
