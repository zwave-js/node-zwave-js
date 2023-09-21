import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import path from "node:path";

export const repoRoot = path.normalize(
	__dirname.slice(0, __dirname.lastIndexOf(`${path.sep}packages${path.sep}`)),
);

/** Finds a specific decorator on a node */
export function findDecorator(
	node: TSESTree.ClassDeclaration,
	name: string,
): TSESTree.Decorator | undefined {
	return node.decorators.find((d) =>
		d.expression.type === AST_NODE_TYPES.CallExpression
		&& d.expression.callee.type === AST_NODE_TYPES.Identifier
		&& d.expression.callee.name === name
	);
}

/** Finds the `@API(...)` or `@commandClass(...)` decorator on a node */
export function findDecoratorContainingCCId(
	node: TSESTree.ClassDeclaration,
	possibleNames: string[] = ["API", "commandClass"],
): TSESTree.Decorator | undefined {
	return node.decorators.find((d) =>
		d.expression.type === AST_NODE_TYPES.CallExpression
		&& d.expression.callee.type === AST_NODE_TYPES.Identifier
		&& possibleNames.includes(d.expression.callee.name)
		&& d.expression.arguments.length === 1
		&& d.expression.arguments[0].type
			=== AST_NODE_TYPES.MemberExpression
		&& d.expression.arguments[0].object.type
			=== AST_NODE_TYPES.Identifier
		&& d.expression.arguments[0].object.name
			=== "CommandClasses"
		&& (d.expression.arguments[0].property.type
				=== AST_NODE_TYPES.Identifier
			|| (d.expression.arguments[0].property.type
					=== AST_NODE_TYPES.Literal
				&& typeof d.expression.arguments[0].property.value
					=== "string"))
	);
}

/** Takes a decorator found using {@link findDecoratorContainingCCId} and returns the CC name */
export function getCCNameFromDecorator(
	decorator: TSESTree.Decorator,
): string {
	const prop: TSESTree.Literal | TSESTree.Identifier =
		(decorator.expression as any).arguments[0].property;

	return prop.type === AST_NODE_TYPES.Literal
		? prop.value as string
		: prop.name;
}
