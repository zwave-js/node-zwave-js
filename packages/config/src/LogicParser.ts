// A parser to convert logical JavaScript-like expressions into JSON Logic

import { getEnumMemberName } from "@zwave-js/shared";
import { assertNever } from "alcalzone-shared/helpers";
import type { RulesLogic } from "json-logic-js";

export enum SyntaxKind {
	Group,
	Or,
	And,
	Comparison,
	Identifier,
	NumberLiteral,
	Version,
}

export enum Operator {
	Equal,
	NotEqual,
	LessThan,
	LessThanOrEqual,
	GreaterThan,
	GreaterThanOrEqual,
}

export type Expression = Or | And | Comparison;

type Or = {
	kind: SyntaxKind.Or;
	operands: Expression[];
};

type And = {
	kind: SyntaxKind.And;
	operands: Expression[];
};

type Comparison = {
	kind: SyntaxKind.Comparison;
	left: Identifier;
	operator: Operator;
	right: NumberLiteral | Version;
};

type Identifier = {
	kind: SyntaxKind.Identifier;
	name: string;
};

type NumberLiteral = {
	kind: SyntaxKind.NumberLiteral;
	value: number;
};

type Version = {
	kind: SyntaxKind.Version;
	value: string;
};

export enum TokenKind {
	Identifier,
	NumberLiteral,
	Dot, // "."
	LeftParen, // "("
	RightParen, // ")"
	BarBar, // "||"
	AmpAmp, // "&&"
	EqualsEquals, // "=="
	EqualsEqualsEquals, // "==="
	ExclamationEquals, // "!="
	ExclamationEqualsEquals, // "!=="
	LessThan, // "<"
	LessThanEquals, // "<="
	GreaterThan, // ">"
	GreaterThanEquals, // ">="
}

export type Token = {
	start: number;
	kind: TokenKind;
	value?: string;
};

/**
 * Splits a string into tokens to be consumed by the Parser.
 */
export function* tokenize(input: string): Generator<Token> {
	for (let i = 0; i < input.length; i++) {
		switch (input[i]) {
			case ".": {
				yield { kind: TokenKind.Dot, start: i };
				break;
			}
			case "(": {
				yield { kind: TokenKind.LeftParen, start: i };
				break;
			}
			case ")": {
				yield { kind: TokenKind.RightParen, start: i };
				break;
			}
			case "|": {
				if (input[i + 1] === "|") {
					yield { kind: TokenKind.BarBar, start: i };
					i++;
				}
				break;
			}
			case "&": {
				if (input[i + 1] === "&") {
					yield { kind: TokenKind.AmpAmp, start: i };
					i++;
				}
				break;
			}
			case "=": {
				if (input[i + 1] === "=") {
					if (input[i + 2] === "=") {
						yield { kind: TokenKind.EqualsEqualsEquals, start: i };
						i += 2;
					} else {
						yield { kind: TokenKind.EqualsEquals, start: i };
						i++;
					}
				}
				break;
			}
			case "!": {
				if (input[i + 1] === "=") {
					if (input[i + 2] === "=") {
						yield {
							kind: TokenKind.ExclamationEqualsEquals,
							start: i,
						};
						i += 2;
					} else {
						yield { kind: TokenKind.ExclamationEquals, start: i };
						i++;
					}
				}
				break;
			}
			case "<": {
				if (input[i + 1] === "=") {
					yield { kind: TokenKind.LessThanEquals, start: i };
					i++;
				} else {
					yield { kind: TokenKind.LessThan, start: i };
				}
				break;
			}
			case ">": {
				if (input[i + 1] === "=") {
					yield { kind: TokenKind.GreaterThanEquals, start: i };
					i++;
				} else {
					yield { kind: TokenKind.GreaterThan, start: i };
				}
				break;
			}
			default: {
				if (/\s/.test(input[i])) {
					// Skip whitespace
					continue;
				}

				// Parse hexadecimal numbers
				if (input[i] === "0" && input[i + 1] === "x") {
					const start = i;
					let hex = "0x";
					i += 2;
					while (i < input.length && /[0-9a-fA-F]/.test(input[i])) {
						hex += input[i];
						i++;
					}
					yield {
						kind: TokenKind.NumberLiteral,
						value: hex,
						start,
					};
					i--; // Account for the outer loop increment
					continue;
				}

				// Parse decimal numbers
				if (/\d/.test(input[i])) {
					const start = i;
					let num = "";
					while (i < input.length && /\d/.test(input[i])) {
						num += input[i];
						i++;
					}
					yield {
						kind: TokenKind.NumberLiteral,
						value: num,
						start,
					};
					i--; // Account for the outer loop increment
					continue;
				}

				// Parse identifiers
				if (/[a-zA-Z_$]/.test(input[i])) {
					const start = i;
					let id = "";
					while (i < input.length && /[a-zA-Z0-9_$]/.test(input[i])) {
						id += input[i];
						i++;
					}
					yield { kind: TokenKind.Identifier, value: id, start };
					i--; // Account for the outer loop increment
					continue;
				}

				throw new Error(
					`Unexpected character '${input[i]}' at index ${i}`,
				);
			}
		}
	}
}

interface ParserState {
	input: string;
	readonly tokens: readonly Token[];
	pos: number;
}

export function parse(input: string): Expression | undefined {
	const tokens = Array.from(tokenize(input));
	const state: ParserState = { input, tokens, pos: 0 };
	const ret = parseExpression(state);

	// If there are remaining tokens, the parse failed
	if (state.pos < tokens.length) {
		const token = tokens[state.pos];
		throw new Error(
			`Unexpected token ${getEnumMemberName(
				TokenKind,
				token.kind,
			)} at position ` + token.start,
		);
	}

	return ret;
}

// The grammar is parsed with a single token of lookahead, so parsing time is linear in the input length:
// expression := and ("||" and)*
// and        := primary ("&&" primary)*
// primary    := comparison | "(" expression ")"

function parseExpression(s: ParserState): Expression | undefined {
	return parseOr(s);
}

function parseOr(s: ParserState): Expression | undefined {
	const first = parseAnd(s);
	if (!first) return;

	const operands: Expression[] = [first];
	while (s.tokens[s.pos]?.kind === TokenKind.BarBar) {
		const startPos = s.pos;
		s.pos++; // consume "||"
		const next = parseAnd(s);
		if (!next) {
			s.pos = startPos;
			break;
		}
		operands.push(next);
	}

	if (operands.length === 1) return first;
	return {
		kind: SyntaxKind.Or,
		operands,
	};
}

function parseAnd(s: ParserState): Expression | undefined {
	const first = parsePrimary(s);
	if (!first) return;

	const operands: Expression[] = [first];
	while (s.tokens[s.pos]?.kind === TokenKind.AmpAmp) {
		const startPos = s.pos;
		s.pos++; // consume "&&"
		const next = parsePrimary(s);
		if (!next) {
			s.pos = startPos;
			break;
		}
		operands.push(next);
	}

	if (operands.length === 1) return first;
	return {
		kind: SyntaxKind.And,
		operands,
	};
}

function parsePrimary(s: ParserState): Expression | undefined {
	return parseComparison(s) || parseGroup(s);
}

function parseGroup(s: ParserState): Expression | undefined {
	// "(" <expression> ")"
	const startPos = s.pos;
	if (s.tokens[s.pos]?.kind !== TokenKind.LeftParen) {
		return;
	}
	s.pos++; // consume "("

	const expression = parseExpression(s);
	if (!expression) {
		s.pos = startPos;
		return;
	}

	if (s.tokens[s.pos]?.kind !== TokenKind.RightParen) {
		s.pos = startPos;
		return;
	}
	s.pos++; // consume ")"
	return expression;
}

function parseComparison(s: ParserState): Comparison | undefined {
	// <identifier> <operator> <identifier|version|number>
	const startPos = s.pos;
	const left = parseIdentifier(s);
	if (!left) {
		s.pos = startPos;
		return;
	}
	const operator = parseOperator(s);
	if (operator == undefined) {
		s.pos = startPos;
		return;
	}
	const right =
		parseVersion(s) || parseNumberLiteral(s) || parseIdentifier(s);
	if (!right) {
		s.pos = startPos;
		return;
	} else if (right.kind === SyntaxKind.Identifier) {
		// For comparisons, the right side must not be an identifier
		throw new Error(
			`Right-hand side of comparisons must be a version or number literal`,
		);
	}
	return {
		kind: SyntaxKind.Comparison,
		left,
		operator,
		right,
	};
}

function parseIdentifier(s: ParserState): Identifier | undefined {
	const token = s.tokens[s.pos];
	if (token?.kind === TokenKind.Identifier) {
		s.pos++;
		return { kind: SyntaxKind.Identifier, name: token.value! };
	}
}

function parseOperator(s: ParserState): Operator | null {
	const token = s.tokens[s.pos];
	if (!token) return null;

	switch (token.kind) {
		case TokenKind.EqualsEquals:
		case TokenKind.EqualsEqualsEquals:
			s.pos++;
			return Operator.Equal;
		case TokenKind.ExclamationEquals:
		case TokenKind.ExclamationEqualsEquals:
			s.pos++;
			return Operator.NotEqual;
		case TokenKind.LessThan:
			s.pos++;
			return Operator.LessThan;
		case TokenKind.LessThanEquals:
			s.pos++;
			return Operator.LessThanOrEqual;
		case TokenKind.GreaterThan:
			s.pos++;
			return Operator.GreaterThan;
		case TokenKind.GreaterThanEquals:
			s.pos++;
			return Operator.GreaterThanOrEqual;
		default:
			return null;
	}
}

function parseVersion(s: ParserState): Version | undefined {
	// <number> "." <number> ["." <number>]
	let pos = s.pos;
	// Parse a sequence of 2-3 number literals separated by dots
	if (s.tokens[pos]?.kind !== TokenKind.NumberLiteral) {
		return;
	}
	let version = s.tokens[pos].value!;
	pos++;
	if (s.tokens[pos]?.kind !== TokenKind.Dot) {
		return;
	}
	version += ".";
	pos++;
	if (s.tokens[pos]?.kind !== TokenKind.NumberLiteral) {
		return;
	}
	version += s.tokens[pos].value!;
	pos++;
	// Optionally parse a third number
	if (s.tokens[pos]?.kind === TokenKind.Dot) {
		version += ".";
		pos++;
		if (s.tokens[pos]?.kind !== TokenKind.NumberLiteral) {
			return;
		}
		version += s.tokens[pos].value!;
		pos++;
	}
	// Update the parser state position
	s.pos = pos;
	return { kind: SyntaxKind.Version, value: version };
}

function parseNumberLiteral(s: ParserState): NumberLiteral | undefined {
	if (s.tokens[s.pos]?.kind === TokenKind.NumberLiteral) {
		const token = s.tokens[s.pos];
		s.pos++;
		return {
			kind: SyntaxKind.NumberLiteral,
			value: parseInt(token.value!),
		};
	}
}

export function toRulesLogic(expr: Expression): RulesLogic {
	if (expr.kind === SyntaxKind.Or) {
		return {
			or: expr.operands.map(toRulesLogic),
		};
	} else if (expr.kind === SyntaxKind.And) {
		return {
			and: expr.operands.map(toRulesLogic),
		};
	} else if (expr.kind === SyntaxKind.Comparison) {
		if (expr.right.kind === SyntaxKind.Version) {
			const opMap = {
				[Operator.Equal]: "ver ===",
				[Operator.NotEqual]: "ver !==",
				[Operator.LessThan]: "ver <",
				[Operator.LessThanOrEqual]: "ver <=",
				[Operator.GreaterThan]: "ver >",
				[Operator.GreaterThanOrEqual]: "ver >=",
			} as const;
			// @ts-expect-error The generated types for the version comparisons are not compatible with the RulesLogic type
			return {
				[opMap[expr.operator]]: [
					{ var: expr.left.name },
					expr.right.value,
				],
			};
		} else {
			const opMap = {
				[Operator.Equal]: "===",
				[Operator.NotEqual]: "!==",
				[Operator.LessThan]: "<",
				[Operator.LessThanOrEqual]: "<=",
				[Operator.GreaterThan]: ">",
				[Operator.GreaterThanOrEqual]: ">=",
			};
			// @ts-expect-error The generated types for the version comparisons are not compatible with the RulesLogic type
			return {
				[opMap[expr.operator]]: [
					{ var: expr.left.name },
					expr.right.value,
				] as const,
			};
		}
	} else {
		assertNever(expr);
	}
}
