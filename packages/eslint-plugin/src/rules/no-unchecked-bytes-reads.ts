import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

import type { OxlintCompatibleRule } from "../utils.js";

// Bytes/Buffer read methods throw a RangeError when reading past the end of the buffer.
// The value is the number of bytes read, or undefined if it is passed as the 2nd argument.
const READ_METHODS: Record<string, number | undefined> = {
	readUInt8: 1,
	readInt8: 1,
	readUInt16LE: 2,
	readUInt16BE: 2,
	readInt16LE: 2,
	readInt16BE: 2,
	readUInt32LE: 4,
	readUInt32BE: 4,
	readInt32LE: 4,
	readInt32BE: 4,
	readBigUInt64LE: 8,
	readBigUInt64BE: 8,
	readBigInt64LE: 8,
	readBigInt64BE: 8,
	readUIntLE: undefined,
	readUIntBE: undefined,
	readIntLE: undefined,
	readIntBE: undefined,
};

const MAX_VARIABLE_BYTE_LENGTH = 6;

/**
 * A linear combination of opaque terms (keyed by their source text) plus a constant.
 * This is just expressive enough to prove that `offset + size <= buffer.length`
 * for the typical parsing patterns in this codebase.
 */
interface Linear {
	constant: number;
	terms: Map<string, number>;
}

function linConst(constant: number): Linear {
	return { constant, terms: new Map() };
}

function linAdd(a: Linear, b: Linear, factor: number = 1): Linear {
	const terms = new Map(a.terms);
	for (const [key, coeff] of b.terms) {
		const sum = (terms.get(key) ?? 0) + factor * coeff;
		if (sum === 0) terms.delete(key);
		else terms.set(key, sum);
	}
	return { constant: a.constant + factor * b.constant, terms };
}

function linScale(a: Linear, factor: number): Linear {
	return linAdd(linConst(0), a, factor);
}

function isConstant(a: Linear): boolean {
	return a.terms.size === 0;
}

interface Helpers {
	getText(node: TSESTree.Node): string;
	resolveConst(node: TSESTree.Identifier): TSESTree.Expression | undefined;
}

/** Finds the initializer of a `const` variable that is visible at the location of `node` */
function resolveConst(
	node: TSESTree.Identifier,
): TSESTree.Expression | undefined {
	let parent: TSESTree.Node | undefined = node.parent;
	while (parent) {
		if (
			parent.type === AST_NODE_TYPES.BlockStatement
			|| parent.type === AST_NODE_TYPES.Program
		) {
			for (const stmt of parent.body) {
				if (
					stmt.type !== AST_NODE_TYPES.VariableDeclaration
					|| stmt.kind !== "const"
				) {
					continue;
				}
				for (const decl of stmt.declarations) {
					if (
						decl.id.type === AST_NODE_TYPES.Identifier
						&& decl.id.name === node.name
						&& decl.init
					) {
						return decl.init;
					}
				}
			}
		}
		parent = parent.parent;
	}
}

function normalizeText(text: string): string {
	return text.replaceAll(/\s+/g, "").replaceAll("?.", ".");
}

/** Returns a key that identifies a buffer, so that views of the same buffer share their length */
function bufferKey(node: TSESTree.Node, h: Helpers, depth: number = 0): string {
	if (
		node.type === AST_NODE_TYPES.TSNonNullExpression
		|| node.type === AST_NODE_TYPES.TSAsExpression
	) {
		return bufferKey(node.expression, h, depth);
	}
	if (
		node.type === AST_NODE_TYPES.CallExpression
		&& node.arguments.length === 1
		&& node.callee.type === AST_NODE_TYPES.MemberExpression
		&& node.callee.object.type === AST_NODE_TYPES.Identifier
		&& node.callee.object.name === "Bytes"
		&& node.callee.property.type === AST_NODE_TYPES.Identifier
		&& (node.callee.property.name === "view"
			|| node.callee.property.name === "from")
	) {
		return bufferKey(node.arguments[0], h, depth);
	}
	if (node.type === AST_NODE_TYPES.Identifier && depth < 5) {
		const init = h.resolveConst(node);
		if (
			init?.type === AST_NODE_TYPES.Identifier
			|| init?.type === AST_NODE_TYPES.CallExpression
		) {
			const key = bufferKey(init, h, depth + 1);
			// Only follow aliases, not arbitrary function calls
			if (key !== normalizeText(h.getText(init))) return key;
			if (init.type === AST_NODE_TYPES.Identifier) return key;
		}
	}
	return normalizeText(h.getText(node));
}

function toLinear(node: TSESTree.Node, h: Helpers, depth: number = 0): Linear {
	switch (node.type) {
		case AST_NODE_TYPES.MemberExpression:
			if (
				!node.computed
				&& node.property.type === AST_NODE_TYPES.Identifier
				&& (node.property.name === "length"
					|| node.property.name === "byteLength")
			) {
				return {
					constant: 0,
					terms: new Map([
						[`${bufferKey(node.object, h)}.length`, 1],
					]),
				};
			}
			break;
		case AST_NODE_TYPES.Identifier: {
			// Inline constants, so offsets computed from other offsets can be compared
			const init = depth < 5 ? h.resolveConst(node) : undefined;
			if (init) return toLinear(init, h, depth + 1);
			break;
		}
		case AST_NODE_TYPES.Literal:
			if (typeof node.value === "number") return linConst(node.value);
			break;
		case AST_NODE_TYPES.UnaryExpression:
			if (node.operator === "-") {
				return linScale(toLinear(node.argument, h, depth), -1);
			} else if (node.operator === "+") {
				return toLinear(node.argument, h, depth);
			}
			break;
		case AST_NODE_TYPES.TSNonNullExpression:
		case AST_NODE_TYPES.TSAsExpression:
			return toLinear(node.expression, h, depth);
		case AST_NODE_TYPES.BinaryExpression: {
			if (node.left.type === AST_NODE_TYPES.PrivateIdentifier) break;
			const left = toLinear(node.left, h, depth);
			const right = toLinear(node.right, h, depth);
			if (node.operator === "+") return linAdd(left, right);
			if (node.operator === "-") return linAdd(left, right, -1);
			if (node.operator === "*") {
				if (isConstant(left)) return linScale(right, left.constant);
				if (isConstant(right)) return linScale(left, right.constant);
			}
			break;
		}
	}
	return {
		constant: 0,
		terms: new Map([[normalizeText(h.getText(node)), 1]]),
	};
}

/**
 * Returns `true` if `fact >= 0` implies `goal >= 0`.
 * Opaque terms are assumed to be non-negative, which holds for the byte values,
 * counts and lengths that offsets are typically computed from.
 */
function implies(fact: Linear, goal: Linear): boolean {
	const diff = linAdd(goal, fact, -1);
	return isNonNegative(diff);
}

function isNonNegative(a: Linear): boolean {
	return a.constant >= 0 && [...a.terms.values()].every((c) => c > 0);
}

const NEGATED_OPERATOR: Record<string, string> = {
	"<": ">=",
	"<=": ">",
	">": "<=",
	">=": "<",
	"===": "!==",
	"==": "!=",
	"!==": "===",
	"!=": "==",
};

/** Converts a condition that is known to be true (or false if `negated`) into facts of the form `fact >= 0` */
function conditionToFacts(
	node: TSESTree.Node,
	negated: boolean,
	h: Helpers,
): Linear[] {
	if (node.type === AST_NODE_TYPES.UnaryExpression && node.operator === "!") {
		return conditionToFacts(node.argument, !negated, h);
	}
	if (node.type === AST_NODE_TYPES.LogicalExpression) {
		// a && b is true -> both are true. a || b is false -> both are false
		if (
			(node.operator === "&&" && !negated)
			|| (node.operator === "||" && negated)
		) {
			return [
				...conditionToFacts(node.left, negated, h),
				...conditionToFacts(node.right, negated, h),
			];
		}
		return [];
	}
	if (
		node.type !== AST_NODE_TYPES.BinaryExpression
		|| node.left.type === AST_NODE_TYPES.PrivateIdentifier
	) {
		return [];
	}

	const operator = negated ? NEGATED_OPERATOR[node.operator] : node.operator;
	if (!operator) return [];

	const left = toLinear(node.left, h);
	const right = toLinear(node.right, h);
	const leftMinusRight = linAdd(left, right, -1);
	const rightMinusLeft = linAdd(right, left, -1);
	switch (operator) {
		case ">=":
			return [leftMinusRight];
		case ">":
			return [linAdd(leftMinusRight, linConst(-1))];
		case "<=":
			return [rightMinusLeft];
		case "<":
			return [linAdd(rightMinusLeft, linConst(-1))];
		case "===":
		case "==":
			return [leftMinusRight, rightMinusLeft];
	}
	return [];
}

function isValidatePayloadCall(
	node: TSESTree.Node,
): node is TSESTree.CallExpression {
	if (node.type !== AST_NODE_TYPES.CallExpression) return false;
	const callee = node.callee;
	// validatePayload(...)
	if (
		callee.type === AST_NODE_TYPES.Identifier
		&& callee.name === "validatePayload"
	) {
		return true;
	}
	// validatePayload.withReason(...)(...)
	return (
		callee.type === AST_NODE_TYPES.CallExpression
		&& callee.callee.type === AST_NODE_TYPES.MemberExpression
		&& callee.callee.object.type === AST_NODE_TYPES.Identifier
		&& callee.callee.object.name === "validatePayload"
		&& callee.callee.property.type === AST_NODE_TYPES.Identifier
		&& callee.callee.property.name === "withReason"
	);
}

function isAlwaysExiting(node: TSESTree.Statement): boolean {
	switch (node.type) {
		case AST_NODE_TYPES.ReturnStatement:
		case AST_NODE_TYPES.ThrowStatement:
		case AST_NODE_TYPES.BreakStatement:
		case AST_NODE_TYPES.ContinueStatement:
			return true;
		case AST_NODE_TYPES.BlockStatement: {
			const last = node.body.at(-1);
			return !!last && isAlwaysExiting(last);
		}
		case AST_NODE_TYPES.ExpressionStatement: {
			// validatePayload.fail(...) and validatePayload(false) never return
			const expr = node.expression;
			if (expr.type !== AST_NODE_TYPES.CallExpression) return false;
			if (
				expr.callee.type === AST_NODE_TYPES.MemberExpression
				&& expr.callee.object.type === AST_NODE_TYPES.Identifier
				&& expr.callee.object.name === "validatePayload"
				&& expr.callee.property.type === AST_NODE_TYPES.Identifier
				&& expr.callee.property.name === "fail"
			) {
				return true;
			}
			return (
				isValidatePayloadCall(expr)
				&& expr.arguments.some(
					(arg) =>
						arg.type === AST_NODE_TYPES.Literal
						&& arg.value === false,
				)
			);
		}
		case AST_NODE_TYPES.IfStatement:
			return (
				!!node.alternate
				&& isAlwaysExiting(node.consequent)
				&& isAlwaysExiting(node.alternate)
			);
	}
	return false;
}

/** Collects facts that a single statement establishes for all statements after it */
function factsFromPrecedingStatement(
	stmt: TSESTree.Node,
	h: Helpers,
): Linear[] {
	if (
		stmt.type === AST_NODE_TYPES.ExpressionStatement
		&& isValidatePayloadCall(stmt.expression)
	) {
		return stmt.expression.arguments.flatMap((arg) =>
			conditionToFacts(arg, false, h),
		);
	}
	if (stmt.type === AST_NODE_TYPES.IfStatement) {
		if (isAlwaysExiting(stmt.consequent)) {
			if (!stmt.alternate) {
				return conditionToFacts(stmt.test, true, h);
			}
		} else if (stmt.alternate && isAlwaysExiting(stmt.alternate)) {
			return conditionToFacts(stmt.test, false, h);
		}
	}
	return [];
}

interface LoopBound {
	variable: string;
	/** The (inclusive) upper bound of the loop variable */
	max: Linear;
	/** The (inclusive) lower bound of the loop variable, if known */
	min?: Linear;
}

/** Recognizes `for (let i = <min>; i < <max>; ...)` loops */
function getLoopBound(
	node: TSESTree.ForStatement,
	h: Helpers,
): LoopBound | undefined {
	const test = node.test;
	if (
		test?.type !== AST_NODE_TYPES.BinaryExpression
		|| test.left.type !== AST_NODE_TYPES.Identifier
		|| (test.operator !== "<" && test.operator !== "<=")
	) {
		return;
	}
	const variable = test.left.name;
	let max = toLinear(test.right, h);
	if (test.operator === "<") max = linAdd(max, linConst(-1));

	let min: Linear | undefined;
	if (
		node.init?.type === AST_NODE_TYPES.VariableDeclaration
		&& node.init.declarations.length === 1
	) {
		const decl = node.init.declarations[0];
		if (
			decl.id.type === AST_NODE_TYPES.Identifier
			&& decl.id.name === variable
			&& decl.init
		) {
			min = toLinear(decl.init, h);
		}
	}

	// With constant bounds and step, the variable may not reach the bound, e.g. for (i = 0; i < 16; i += 2)
	const update = node.update;
	if (
		min
		&& isConstant(min)
		&& isConstant(max)
		&& update?.type === AST_NODE_TYPES.AssignmentExpression
		&& update.operator === "+="
		&& update.left.type === AST_NODE_TYPES.Identifier
		&& update.left.name === variable
		&& update.right.type === AST_NODE_TYPES.Literal
		&& typeof update.right.value === "number"
		&& update.right.value > 0
	) {
		const step = update.right.value;
		max = linConst(
			min.constant
				+ Math.floor((max.constant - min.constant) / step) * step,
		);
	}

	return { variable, max, min };
}

/** Returns the range of possible values for constants like `const size = isLR ? 2 : 1` */
function constantRange(
	node: TSESTree.Node,
	h: Helpers,
): [min: number, max: number] | undefined {
	if (node.type === AST_NODE_TYPES.Identifier) {
		const init = h.resolveConst(node);
		return init && constantRange(init, h);
	}
	if (node.type === AST_NODE_TYPES.ConditionalExpression) {
		const a = constantRange(node.consequent, h);
		const b = constantRange(node.alternate, h);
		if (a && b) {
			return [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
		}
		return;
	}
	const value = toLinear(node, h);
	if (isConstant(value)) return [value.constant, value.constant];
}

interface Subarray {
	parent: TSESTree.Node;
	start: TSESTree.Node | undefined;
	end: TSESTree.Node | undefined;
}

/** Recognizes buffers created with `parent.subarray(start, end)`, either inline or through a constant */
function resolveSubarray(
	node: TSESTree.Node,
	h: Helpers,
): Subarray | undefined {
	if (node.type === AST_NODE_TYPES.Identifier) {
		const init = h.resolveConst(node);
		if (!init) return;
		node = init;
	}
	if (
		node.type === AST_NODE_TYPES.CallExpression
		&& node.callee.type === AST_NODE_TYPES.MemberExpression
		&& !node.callee.computed
		&& node.callee.property.type === AST_NODE_TYPES.Identifier
		&& (node.callee.property.name === "subarray"
			|| node.callee.property.name === "slice")
		&& node.arguments.length <= 2
		&& node.arguments.every(
			(arg) => arg.type !== AST_NODE_TYPES.SpreadElement,
		)
	) {
		return {
			parent: node.callee.object,
			start: node.arguments[0],
			end: node.arguments[1],
		};
	}
}

/** Replaces loop variables in a goal with the bound that makes the goal hardest to satisfy */
function applyLoopBounds(goal: Linear, loops: LoopBound[]): Linear {
	let ret = goal;
	for (const loop of loops) {
		const coeff = ret.terms.get(loop.variable);
		if (!coeff) continue;
		const bound = coeff < 0 ? loop.max : loop.min;
		if (!bound) continue;
		const terms = new Map(ret.terms);
		terms.delete(loop.variable);
		ret = linAdd({ constant: ret.constant, terms }, bound, coeff);
	}
	return ret;
}

function isFunctionNode(node: TSESTree.Node): boolean {
	return (
		node.type === AST_NODE_TYPES.FunctionDeclaration
		|| node.type === AST_NODE_TYPES.FunctionExpression
		|| node.type === AST_NODE_TYPES.ArrowFunctionExpression
	);
}

/** Collects everything that is known to be true at the location of `node` */
function collectContext(
	node: TSESTree.Node,
	h: Helpers,
): { facts: Linear[]; loops: LoopBound[] } {
	const facts: Linear[] = [];
	const loops: LoopBound[] = [];

	let child: TSESTree.Node = node;
	let parent = node.parent;
	while (parent) {
		switch (parent.type) {
			case AST_NODE_TYPES.IfStatement:
			case AST_NODE_TYPES.ConditionalExpression:
				if (child === parent.consequent) {
					facts.push(...conditionToFacts(parent.test, false, h));
				} else if (child === parent.alternate) {
					facts.push(...conditionToFacts(parent.test, true, h));
				}
				break;
			case AST_NODE_TYPES.LogicalExpression:
				if (child === parent.right) {
					if (parent.operator === "&&") {
						facts.push(...conditionToFacts(parent.left, false, h));
					} else if (parent.operator === "||") {
						facts.push(...conditionToFacts(parent.left, true, h));
					}
				}
				break;
			case AST_NODE_TYPES.WhileStatement:
				if (child === parent.body) {
					facts.push(...conditionToFacts(parent.test, false, h));
				}
				break;
			case AST_NODE_TYPES.ForStatement:
				if (child === parent.body && parent.test) {
					facts.push(...conditionToFacts(parent.test, false, h));
					const bound = getLoopBound(parent, h);
					if (bound) loops.push(bound);
				}
				break;
			case AST_NODE_TYPES.BlockStatement:
			case AST_NODE_TYPES.Program:
			case AST_NODE_TYPES.StaticBlock:
			case AST_NODE_TYPES.SwitchCase: {
				const body: TSESTree.Node[] =
					parent.type === AST_NODE_TYPES.SwitchCase
						? parent.consequent
						: parent.body;
				const index = body.indexOf(child);
				for (let i = 0; i < index; i++) {
					facts.push(...factsFromPrecedingStatement(body[i], h));
				}
				break;
			}
		}

		// Checks in an outer function only apply to inline callbacks, not to separate functions
		if (
			isFunctionNode(parent)
			&& (parent.type === AST_NODE_TYPES.FunctionDeclaration
				|| parent.parent?.type === AST_NODE_TYPES.MethodDefinition
				|| parent.parent?.type === AST_NODE_TYPES.PropertyDefinition
				|| parent.parent?.type === AST_NODE_TYPES.VariableDeclarator)
		) {
			break;
		}

		child = parent;
		parent = parent.parent;
	}

	return { facts, loops };
}

export const noUncheckedBytesReads: OxlintCompatibleRule = {
	createOnce(context) {
		const getText = (node: TSESTree.Node): string =>
			context.sourceCode.getText(node);
		const h: Helpers = { getText, resolveConst };

		return {
			CallExpression(node) {
				if (
					node.callee.type !== AST_NODE_TYPES.MemberExpression
					|| node.callee.computed
					|| node.callee.property.type !== AST_NODE_TYPES.Identifier
					|| !Object.hasOwn(READ_METHODS, node.callee.property.name)
				) {
					return;
				}
				const method = node.callee.property.name;
				const buffer = node.callee.object;
				// Avoid reporting the implementation of the Bytes class itself
				if (buffer.type === AST_NODE_TYPES.ThisExpression) return;

				const [offsetArg, sizeArg] = node.arguments;
				const offset = offsetArg ? toLinear(offsetArg, h) : linConst(0);
				let size: Linear;
				const fixedSize = READ_METHODS[method];
				if (fixedSize != undefined) {
					size = linConst(fixedSize);
				} else if (sizeArg) {
					size = toLinear(sizeArg, h);
				} else {
					return;
				}

				const { facts, loops } = collectContext(node, h);

				// readUIntBE etc. throw for byte lengths that are not in 1..6
				const sizeRange = sizeArg && constantRange(sizeArg, h);
				if (
					fixedSize == undefined
					&& !(
						sizeRange
						&& sizeRange[0] >= 1
						&& sizeRange[1] <= MAX_VARIABLE_BYTE_LENGTH
					)
				) {
					const bounded = (goal: Linear): boolean =>
						isConstant(goal)
							? goal.constant >= 0
							: facts.some((f) => implies(f, goal));
					const lowerOk = bounded(linAdd(size, linConst(-1)));
					const upperOk = bounded(
						linAdd(linConst(MAX_VARIABLE_BYTE_LENGTH), size, -1),
					);
					if (!lowerOk || !upperOk) {
						context.report({
							node: sizeArg,
							messageId: "unchecked-byte-length",
							data: {
								method,
								size: getText(sizeArg),
								max: MAX_VARIABLE_BYTE_LENGTH,
							},
						});
						return;
					}
				}

				// We need: buffer.length - offset - size >= 0
				const isLengthOk = (
					target: TSESTree.Node,
					targetOffset: Linear,
				): boolean => {
					const lengthTerm = linConst(0);
					lengthTerm.terms.set(`${bufferKey(target, h)}.length`, 1);
					const goal = applyLoopBounds(
						linAdd(lengthTerm, linAdd(targetOffset, size), -1),
						loops,
					);
					return (
						isNonNegative(goal)
						|| facts.some((f) => implies(f, goal))
					);
				};
				let lengthOk = isLengthOk(buffer, offset);
				// For a subarray, checking the length of the original buffer works too,
				// as long as the read stays within the subarray's bounds
				const sub = !lengthOk && resolveSubarray(buffer, h);
				if (sub) {
					const start = sub.start
						? toLinear(sub.start, h)
						: linConst(0);
					const withinSub =
						!sub.end
						|| isNonNegative(
							applyLoopBounds(
								linAdd(
									linAdd(toLinear(sub.end, h), start, -1),
									linAdd(offset, size),
									-1,
								),
								loops,
							),
						);
					lengthOk =
						withinSub
						&& isLengthOk(sub.parent, linAdd(start, offset));
				}

				// Negative offsets throw too, e.g. when reading a checksum at the end of a short buffer
				const offsetOk = isConstant(offset)
					? offset.constant >= 0
					: ![...offset.terms].some(
							([key, coeff]) =>
								coeff < 0 && key.endsWith(".length"),
						) || facts.some((f) => implies(f, offset));
				if (offsetOk && lengthOk) return;

				context.report({
					node,
					messageId: "unchecked-read",
					data: {
						method,
						buffer: getText(buffer),
						required: offsetArg
							? `${getText(offsetArg)} + ${sizeArg ? getText(sizeArg) : fixedSize}`
							: String(fixedSize),
					},
				});
			},
		};
	},
	meta: {
		docs: {
			description:
				"Reading from Bytes/Buffers past the end throws a RangeError. Ensure the buffer is long enough before reading, e.g. with validatePayload().",
		},
		type: "problem",
		schema: [],
		messages: {
			"unchecked-read":
				"{{method}}() throws a RangeError if {{buffer}} is too short. Ensure that {{buffer}}.length >= {{required}} first, e.g. using validatePayload().",
			"unchecked-byte-length":
				"{{method}}() throws a RangeError unless 1 <= {{size}} <= {{max}}. Validate the byte length first, e.g. using validatePayload().",
		},
	},
	defaultOptions: [],
};
