import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

import type { OxlintCompatibleRule } from "../utils.js";

// Parameter types that indicate a function parses untrusted data
const RAW_PARAM_TYPE = /(?:Raw|^Bytes|^BytesView|^Uint8Array)$/;
const PARSE_METHOD_NAMES = new Set(["from", "parse"]);
const PARSE_FUNCTION_NAME = /^(?:parse|decode)/;

function isFunctionNode(
	node: TSESTree.Node,
): node is
	| TSESTree.FunctionDeclaration
	| TSESTree.FunctionExpression
	| TSESTree.ArrowFunctionExpression {
	return (
		node.type === AST_NODE_TYPES.FunctionDeclaration
		|| node.type === AST_NODE_TYPES.FunctionExpression
		|| node.type === AST_NODE_TYPES.ArrowFunctionExpression
	);
}

function hasRawParameter(
	fn: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression,
): boolean {
	const param = fn.params[0];
	if (param?.type !== AST_NODE_TYPES.Identifier) return false;
	const type = param.typeAnnotation?.typeAnnotation;
	return (
		type?.type === AST_NODE_TYPES.TSTypeReference
		&& type.typeName.type === AST_NODE_TYPES.Identifier
		&& RAW_PARAM_TYPE.test(type.typeName.name)
	);
}

/** Whether this function parses untrusted data, e.g. `static from(raw: CCRaw)` or `parseFoo(data: BytesView)` */
function isParseFunction(node: TSESTree.Node): boolean {
	if (node.type === AST_NODE_TYPES.FunctionDeclaration) {
		return (
			!!node.id
			&& PARSE_FUNCTION_NAME.test(node.id.name)
			&& hasRawParameter(node)
		);
	}
	if (
		node.type === AST_NODE_TYPES.FunctionExpression
		&& node.parent.type === AST_NODE_TYPES.MethodDefinition
	) {
		const method = node.parent;
		return (
			method.static
			&& method.key.type === AST_NODE_TYPES.Identifier
			&& PARSE_METHOD_NAMES.has(method.key.name)
			&& hasRawParameter(node)
		);
	}
	return false;
}

/** Returns the enclosing parse function, if the node is part of one. Inline callbacks are considered part of their parent */
function getEnclosingParseFunction(
	node: TSESTree.Node,
): TSESTree.Node | undefined {
	let current: TSESTree.Node | undefined = node.parent;
	while (current) {
		if (isFunctionNode(current)) {
			if (isParseFunction(current)) return current;
			if (current.type !== AST_NODE_TYPES.ArrowFunctionExpression) {
				return;
			}
		}
		current = current.parent;
	}
}

// The receive path handles these error codes by dropping the offending message
const EXPECTED_ERROR_CODE =
	/^(?:PacketFormat_.+|Deserialization_NotImplemented|CC_NotImplemented)$/;

/** ZWaveErrors with one of the expected codes are the correct way to reject invalid payloads */
function isExpectedError(node: TSESTree.Expression): boolean {
	if (
		node.type !== AST_NODE_TYPES.NewExpression
		|| node.callee.type !== AST_NODE_TYPES.Identifier
		|| node.callee.name !== "ZWaveError"
	) {
		return false;
	}
	const code = node.arguments[1];
	return (
		code?.type === AST_NODE_TYPES.MemberExpression
		&& code.object.type === AST_NODE_TYPES.Identifier
		&& code.object.name === "ZWaveErrorCodes"
		&& code.property.type === AST_NODE_TYPES.Identifier
		&& EXPECTED_ERROR_CODE.test(code.property.name)
	);
}

/** Whether a throw statement creates a new, unexpected error. Re-throwing caught errors is fine */
function isUnexpectedThrow(node: TSESTree.ThrowStatement): boolean {
	return (
		node.argument.type === AST_NODE_TYPES.NewExpression
		&& !isExpectedError(node.argument)
	);
}

/** Finds throw statements in a function body, excluding nested functions */
function findUnexpectedThrows(node: TSESTree.Node): TSESTree.ThrowStatement[] {
	const ret: TSESTree.ThrowStatement[] = [];
	const visit = (n: TSESTree.Node): void => {
		if (n.type === AST_NODE_TYPES.ThrowStatement) {
			if (isUnexpectedThrow(n)) ret.push(n);
			return;
		}
		for (const [key, value] of Object.entries(n)) {
			if (key === "parent") continue;
			const children: unknown[] = Array.isArray(value) ? value : [value];
			for (const child of children) {
				if (
					child
					&& typeof child === "object"
					&& typeof (child as TSESTree.Node).type === "string"
					&& !isFunctionNode(child as TSESTree.Node)
				) {
					visit(child as TSESTree.Node);
				}
			}
		}
	};
	visit(node);
	return ret;
}

function getConstructor(
	node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
): TSESTree.MethodDefinition | undefined {
	return node.body.body.find(
		(m): m is TSESTree.MethodDefinition =>
			m.type === AST_NODE_TYPES.MethodDefinition
			&& m.kind === "constructor",
	);
}

export const noUnexpectedParseErrors: OxlintCompatibleRule = {
	createOnce(context) {
		// Classes in the current file whose constructor may throw unexpected errors
		let throwingClasses = new Map<string, TSESTree.ThrowStatement>();

		return {
			before() {
				throwingClasses = new Map();
			},
			Program(node) {
				const visitClass = (cls: TSESTree.Node | null | undefined) => {
					if (
						cls?.type !== AST_NODE_TYPES.ClassDeclaration
						|| !cls.id
					) {
						return;
					}
					const ctor = getConstructor(cls);
					if (!ctor?.value.body) return;
					const [firstThrow] = findUnexpectedThrows(ctor.value.body);
					if (firstThrow)
						throwingClasses.set(cls.id.name, firstThrow);
				};
				for (const stmt of node.body) {
					if (
						stmt.type === AST_NODE_TYPES.ExportNamedDeclaration
						|| stmt.type === AST_NODE_TYPES.ExportDefaultDeclaration
					) {
						visitClass(stmt.declaration);
					} else {
						visitClass(stmt);
					}
				}
			},
			ThrowStatement(node) {
				if (!isUnexpectedThrow(node)) return;
				if (!getEnclosingParseFunction(node)) return;
				context.report({
					node,
					messageId: "unexpected-throw",
				});
			},
			NewExpression(node) {
				let className: string | undefined;
				if (node.callee.type === AST_NODE_TYPES.Identifier) {
					className = node.callee.name;
				} else if (node.callee.type === AST_NODE_TYPES.ThisExpression) {
					// `new this(...)` in a static method creates an instance of the containing class
					let cls: TSESTree.Node | undefined = node.parent;
					while (
						cls
						&& cls.type !== AST_NODE_TYPES.ClassDeclaration
					) {
						cls = cls.parent;
					}
					className = cls?.id?.name;
				}
				if (!className) return;
				const throwStmt = throwingClasses.get(className);
				if (!throwStmt) return;
				if (!getEnclosingParseFunction(node)) return;

				context.report({
					node,
					messageId: "throwing-constructor",
					data: {
						className,
						line: throwStmt.loc.start.line,
					},
				});
			},
		};
	},
	meta: {
		docs: {
			description:
				"Code that parses untrusted data should only throw ZWaveErrors that the receive path expects, e.g. using validatePayload().",
		},
		type: "problem",
		schema: [],
		messages: {
			"unexpected-throw":
				"Parse functions should only throw ZWaveErrors with a PacketFormat_* code or another code the receive path handles. Use validatePayload() to reject invalid payloads instead.",
			"throwing-constructor":
				"The constructor of {{className}} can throw an unexpected error (line {{line}}). Validate the payload before calling it, so it cannot throw while parsing.",
		},
	},
	defaultOptions: [],
};
