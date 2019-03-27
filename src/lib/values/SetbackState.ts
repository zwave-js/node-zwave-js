import { clamp } from "alcalzone-shared/math";
import { entries } from "alcalzone-shared/objects";

export type SetbackSpecialState = "Frost Protection" | "Energy Saving" | "Unused";
export const setbackSpecialStateValues: Record<SetbackSpecialState, number> = {
	"Frost Protection": 0x79,
	"Energy Saving": 0x7A,
	"Unused": 0x7F,
};

export type SetbackState = number | SetbackSpecialState;

/** Encodes a setback state to use in a ThermostatSetbackCC */
export function encodeSetbackState(state: SetbackState): number {
	if (typeof state === "string") return setbackSpecialStateValues[state];
	state = clamp(state, -12.8, 12);
	return (state * 10) & 0xff;
}

/** Decodes a setback state used in a ThermostatSetbackCC */
export function decodeSetbackState(val: number): SetbackState | undefined {
	if (val > 120) {
		// Special state, try to look it up
		const foundEntry = entries(setbackSpecialStateValues).find(([, v]) => val === v);
		if (!foundEntry) return;
		return foundEntry[0] as SetbackSpecialState;
	} else {
		return val / 10;
	}
}
