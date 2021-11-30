import { computeBergerCode } from "./utils";

describe("computeBergerCode", () => {
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

	it.each(cases.map((obj) => [obj.result, obj.input, obj.numBits]))(
		`returns %s for input %s with %s bits`,
		(result, input, numBits) => {
			expect(computeBergerCode(input, numBits)).toBe(result);
		},
	);
});
