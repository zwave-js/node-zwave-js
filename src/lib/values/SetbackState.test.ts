import {
	decodeSetbackState,
	encodeSetbackState,
	setbackSpecialStateValues,
} from "./SetbackState";

describe("lib/values/SetbackState", () => {
	describe("encodeSetbackState()", () => {
		it("should return the defined values for the special states", () => {
			for (const state of Object.keys(setbackSpecialStateValues)) {
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
			for (const state of Object.keys(setbackSpecialStateValues)) {
				expect(
					decodeSetbackState(setbackSpecialStateValues[state]),
				).toBe(state);
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
});
