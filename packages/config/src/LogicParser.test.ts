import { expect, test } from "vitest";

import {
	type Expression,
	Operator,
	SyntaxKind,
	type Token,
	TokenKind,
	parse,
	tokenize,
} from "./LogicParser.js";

test("tokenize, happy path 1", () => {
	const input = "a && b || ((c == d === e != f)) !== g < h <= i > j >= k";
	const actual: Omit<Token, "start">[] = Array.from(tokenize(input)).map(
		(token) => {
			const { start, ...rest } = token;
			return rest;
		},
	);
	const expected: Omit<Token, "start">[] = [
		{ kind: TokenKind.Identifier, value: "a" },
		{ kind: TokenKind.AmpAmp },
		{ kind: TokenKind.Identifier, value: "b" },
		{ kind: TokenKind.BarBar },
		{ kind: TokenKind.LeftParen },
		{ kind: TokenKind.LeftParen },
		{ kind: TokenKind.Identifier, value: "c" },
		{ kind: TokenKind.EqualsEquals },
		{ kind: TokenKind.Identifier, value: "d" },
		{ kind: TokenKind.EqualsEqualsEquals },
		{ kind: TokenKind.Identifier, value: "e" },
		{ kind: TokenKind.ExclamationEquals },
		{ kind: TokenKind.Identifier, value: "f" },
		{ kind: TokenKind.RightParen },
		{ kind: TokenKind.RightParen },
		{ kind: TokenKind.ExclamationEqualsEquals },
		{ kind: TokenKind.Identifier, value: "g" },
		{ kind: TokenKind.LessThan },
		{ kind: TokenKind.Identifier, value: "h" },
		{ kind: TokenKind.LessThanEquals },
		{ kind: TokenKind.Identifier, value: "i" },
		{ kind: TokenKind.GreaterThan },
		{ kind: TokenKind.Identifier, value: "j" },
		{ kind: TokenKind.GreaterThanEquals },
		{ kind: TokenKind.Identifier, value: "k" },
	];
	expect(actual).toEqual(expected);
});

test("tokenize, happy path 2", () => {
	const input =
		"firmwareVersion>= 1.2.3 && (productType == 0x1234 || productId !== 5)";
	const actual: Omit<Token, "start">[] = Array.from(tokenize(input)).map(
		(token) => {
			const { start, ...rest } = token;
			return rest;
		},
	);
	const expected: Omit<Token, "start">[] = [
		{ kind: TokenKind.Identifier, value: "firmwareVersion" },
		{ kind: TokenKind.GreaterThanEquals },
		{ kind: TokenKind.NumberLiteral, value: "1" },
		{ kind: TokenKind.Dot },
		{ kind: TokenKind.NumberLiteral, value: "2" },
		{ kind: TokenKind.Dot },
		{ kind: TokenKind.NumberLiteral, value: "3" },
		{ kind: TokenKind.AmpAmp },
		{ kind: TokenKind.LeftParen },
		{ kind: TokenKind.Identifier, value: "productType" },
		{ kind: TokenKind.EqualsEquals },
		{ kind: TokenKind.NumberLiteral, value: "0x1234" },
		{ kind: TokenKind.BarBar },
		{ kind: TokenKind.Identifier, value: "productId" },
		{ kind: TokenKind.ExclamationEqualsEquals },
		{ kind: TokenKind.NumberLiteral, value: "5" },
		{ kind: TokenKind.RightParen },
	];
	expect(actual).toEqual(expected);
});

test("tokenize, with illegal characters", () => {
	const input = "a + b - c * d / e % f";
	expect(() => Array.from(tokenize(input))).toThrowError(
		/Unexpected character '\+' at index 2/,
	);
});

test("parse, simple comparison", () => {
	const input = "abc == 5";
	const actual = parse(input);
	const expected: Expression = {
		kind: SyntaxKind.Comparison,
		operator: Operator.Equal,
		left: {
			kind: SyntaxKind.Identifier,
			name: "abc",
		},
		right: {
			kind: SyntaxKind.NumberLiteral,
			value: 5,
		},
	};
	expect(actual).toEqual(expected);
});

test("parse, illegal comparison", () => {
	const input = "a == b";
	expect(() => parse(input)).toThrowError(
		/Right-hand side of comparisons must be a version or number literal/,
	);
});

test("parse, version comparison", () => {
	const input = "firmwareVersion >= 1.2.3";
	const actual = parse(input);
	const expected: Expression = {
		kind: SyntaxKind.Comparison,
		operator: Operator.GreaterThanOrEqual,
		left: {
			kind: SyntaxKind.Identifier,
			name: "firmwareVersion",
		},
		right: {
			kind: SyntaxKind.Version,
			value: "1.2.3",
		},
	};
	expect(actual).toEqual(expected);
});

test("parse, OR chain", () => {
	const input = "a > 2 || b < 0x1234 || c === 1.0";
	const actual = parse(input);
	const expected: Expression = {
		kind: SyntaxKind.Or,
		operands: [
			{
				kind: SyntaxKind.Comparison,
				operator: Operator.GreaterThan,
				left: {
					kind: SyntaxKind.Identifier,
					name: "a",
				},
				right: {
					kind: SyntaxKind.NumberLiteral,
					value: 2,
				},
			},
			{
				kind: SyntaxKind.Comparison,
				operator: Operator.LessThan,
				left: {
					kind: SyntaxKind.Identifier,
					name: "b",
				},
				right: {
					kind: SyntaxKind.NumberLiteral,
					value: 0x1234,
				},
			},
			{
				kind: SyntaxKind.Comparison,
				operator: Operator.Equal,
				left: {
					kind: SyntaxKind.Identifier,
					name: "c",
				},
				right: {
					kind: SyntaxKind.Version,
					value: "1.0",
				},
			},
		],
	};
	expect(actual).toEqual(expected);
});

test("parse, grouped AND/OR with operator precendence", () => {
	const input = "(a <= 5 || b >= 10) && c != 0x1A2B || d === 3.4.5";
	const actual = parse(input);
	const expected: Expression = {
		kind: SyntaxKind.Or,
		operands: [
			{
				kind: SyntaxKind.And,
				operands: [
					{
						kind: SyntaxKind.Or,
						operands: [
							{
								kind: SyntaxKind.Comparison,
								operator: Operator.LessThanOrEqual,
								left: {
									kind: SyntaxKind.Identifier,
									name: "a",
								},
								right: {
									kind: SyntaxKind.NumberLiteral,
									value: 5,
								},
							},
							{
								kind: SyntaxKind.Comparison,
								operator: Operator.GreaterThanOrEqual,
								left: {
									kind: SyntaxKind.Identifier,
									name: "b",
								},
								right: {
									kind: SyntaxKind.NumberLiteral,
									value: 10,
								},
							},
						],
					},
					{
						kind: SyntaxKind.Comparison,
						operator: Operator.NotEqual,
						left: {
							kind: SyntaxKind.Identifier,
							name: "c",
						},
						right: {
							kind: SyntaxKind.NumberLiteral,
							value: 0x1a2b,
						},
					},
				],
			},
			{
				kind: SyntaxKind.Comparison,
				operator: Operator.Equal,
				left: {
					kind: SyntaxKind.Identifier,
					name: "d",
				},
				right: {
					kind: SyntaxKind.Version,
					value: "3.4.5",
				},
			},
		],
	};
	expect(actual).toEqual(expected);
});

test("parse, weird, but valid expression", () => {
	const input = "((((a > 1)) || b <= 2))";
	const actual = parse(input);
	const expected: Expression = {
		kind: SyntaxKind.Or,
		operands: [
			{
				kind: SyntaxKind.Comparison,
				operator: Operator.GreaterThan,
				left: {
					kind: SyntaxKind.Identifier,
					name: "a",
				},
				right: {
					kind: SyntaxKind.NumberLiteral,
					value: 1,
				},
			},
			{
				kind: SyntaxKind.Comparison,
				operator: Operator.LessThanOrEqual,
				left: {
					kind: SyntaxKind.Identifier,
					name: "b",
				},
				right: {
					kind: SyntaxKind.NumberLiteral,
					value: 2,
				},
			},
		],
	};
	expect(actual).toEqual(expected);
});

test("parse() handles deeply nested groups in linear time", () => {
	// At this depth, a parser with exponential backtracking would not finish
	// before the test timeout
	const depth = 500;
	const input = "(".repeat(depth) + "a > 1 && b < 2" + ")".repeat(depth);
	expect(parse(input)).toMatchObject({ kind: SyntaxKind.And });
});
