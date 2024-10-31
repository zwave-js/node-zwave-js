import { test } from "vitest";
import { evaluate } from "./Logic.js";

const tests = [
	{
		logic: "firmwareVersion > 1.0",
		context: { firmwareVersion: "1.5" },
		expected: true,
	},
	{
		logic: "firmwareVersion > 1.5",
		context: { firmwareVersion: "1.5" },
		expected: false,
	},
	{
		logic: "a === 0 && b === 0 || a === 1 && b === 1",
		context: { a: 1, b: 1 },
		expected: true,
	},
	{
		logic: "a === 0 && (b === 0 || a === 1) && b === 1",
		context: { a: 1, b: 1 },
		expected: false,
	},
	// Regression tests
	{
		// Missing variable in the context does not throw (1)
		logic: "a > 0 || b === 1",
		context: {},
		expected: false,
	},
	{
		// Missing variable in the context does not throw (2)
		logic: "firmwareVersion > 1.5",
		context: {},
		expected: false,
	},
] as const;

for (let i = 1; i <= tests.length; i++) {
	const { logic, context, expected } = tests[i - 1];
	test(
		`Logic parser, test ${i}: ${
			JSON.stringify(
				context,
			)
		} --> ${logic} is ${expected}`,
		(t) => {
			t.expect(evaluate(logic, context)).toBe(expected);
		},
	);
}
