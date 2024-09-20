import test from "ava";
import { computeBergerCode } from "./utils";

{
	const cases = [
		{
			input: 0b1111,
			numBits: 4,
			result: 0,
		},
		{
			input: 0b11111111_00000000_11110000_01010011,
			numBits: 27,
			result: 16,
		},
		{
			input: 0xfffffffe,
			numBits: 27,
			result: 1,
		},
		{
			input: 0,
			numBits: 28,
			result: 28,
		},
	];

	for (const { input, numBits, result } of cases) {
		test(`computeBergerCode() -> returns ${result} for input ${input} with ${numBits} bits`, (t) => {
			t.is(computeBergerCode(input, numBits), result);
		});
	}
}
