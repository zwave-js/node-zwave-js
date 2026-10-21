import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

export type Binding =
	| {
			kind: "const";
			init: TSESTree.Expression | undefined;
	  }
	| {
			kind: "catch";
	  }
	| {
			kind: "other";
	  };

function addPatternNames(
	pattern: TSESTree.Node | null | undefined,
	binding: Binding,
	ret: Map<string, Binding>,
): void {
	if (!pattern) return;
	switch (pattern.type) {
		case AST_NODE_TYPES.Identifier:
			ret.set(pattern.name, binding);
			break;
		case AST_NODE_TYPES.ArrayPattern:
			for (const element of pattern.elements) {
				addPatternNames(element, binding, ret);
			}
			break;
		case AST_NODE_TYPES.ObjectPattern:
			for (const prop of pattern.properties) {
				addPatternNames(
					prop.type === AST_NODE_TYPES.Property ? prop.value : prop,
					binding,
					ret,
				);
			}
			break;
		case AST_NODE_TYPES.AssignmentPattern:
			addPatternNames(pattern.left, binding, ret);
			break;
		case AST_NODE_TYPES.RestElement:
			addPatternNames(pattern.argument, binding, ret);
			break;
		case AST_NODE_TYPES.TSParameterProperty:
			addPatternNames(pattern.parameter, binding, ret);
			break;
	}
}

const OTHER: Binding = { kind: "other" };

function addDeclarationNames(
	stmt: TSESTree.Node | null | undefined,
	ret: Map<string, Binding>,
): void {
	if (!stmt) return;
	switch (stmt.type) {
		case AST_NODE_TYPES.ExportNamedDeclaration:
		case AST_NODE_TYPES.ExportDefaultDeclaration:
			addDeclarationNames(stmt.declaration, ret);
			break;
		case AST_NODE_TYPES.VariableDeclaration:
			for (const decl of stmt.declarations) {
				addPatternNames(
					decl.id,
					stmt.kind === "const"
						&& decl.id.type === AST_NODE_TYPES.Identifier
						? { kind: "const", init: decl.init ?? undefined }
						: OTHER,
					ret,
				);
			}
			break;
		case AST_NODE_TYPES.FunctionDeclaration:
		case AST_NODE_TYPES.ClassDeclaration:
		case AST_NODE_TYPES.TSEnumDeclaration:
			if (stmt.id) ret.set(stmt.id.name, OTHER);
			break;
		case AST_NODE_TYPES.ImportDeclaration:
			for (const spec of stmt.specifiers) {
				ret.set(spec.local.name, OTHER);
			}
			break;
	}
}

const bindingsCache = new WeakMap<TSESTree.Node, Map<string, Binding>>();

/** Returns the names that are declared directly in the scope that `node` creates, if any */
export function getScopeBindings(node: TSESTree.Node): Map<string, Binding> {
	let ret = bindingsCache.get(node);
	if (ret) return ret;
	ret = new Map();
	switch (node.type) {
		case AST_NODE_TYPES.Program:
		case AST_NODE_TYPES.BlockStatement:
		case AST_NODE_TYPES.StaticBlock:
			for (const stmt of node.body) addDeclarationNames(stmt, ret);
			break;
		case AST_NODE_TYPES.SwitchStatement:
			for (const c of node.cases) {
				for (const stmt of c.consequent) addDeclarationNames(stmt, ret);
			}
			break;
		case AST_NODE_TYPES.ForStatement:
			addDeclarationNames(node.init, ret);
			break;
		case AST_NODE_TYPES.ForInStatement:
		case AST_NODE_TYPES.ForOfStatement:
			if (node.left.type === AST_NODE_TYPES.VariableDeclaration) {
				for (const decl of node.left.declarations) {
					addPatternNames(decl.id, OTHER, ret);
				}
			}
			break;
		case AST_NODE_TYPES.FunctionDeclaration:
		case AST_NODE_TYPES.FunctionExpression:
		case AST_NODE_TYPES.ArrowFunctionExpression:
			for (const param of node.params) addPatternNames(param, OTHER, ret);
			if (
				node.type === AST_NODE_TYPES.FunctionExpression
				&& node.id
				&& !ret.has(node.id.name)
			) {
				ret.set(node.id.name, OTHER);
			}
			break;
		case AST_NODE_TYPES.CatchClause:
			addPatternNames(
				node.param,
				node.param?.type === AST_NODE_TYPES.Identifier
					? { kind: "catch" }
					: OTHER,
				ret,
			);
			break;
		case AST_NODE_TYPES.ClassExpression:
			if (node.id) ret.set(node.id.name, OTHER);
			break;
	}
	bindingsCache.set(node, ret);
	return ret;
}

/** Finds the nearest binding of the identifier's name that is visible at its location */
export function findBinding(node: TSESTree.Identifier): Binding | undefined {
	let scope: TSESTree.Node | undefined = node.parent;
	while (scope) {
		const binding = getScopeBindings(scope).get(node.name);
		if (binding) return binding;
		scope = scope.parent;
	}
}
