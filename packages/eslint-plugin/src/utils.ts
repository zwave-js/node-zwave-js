import {
	AST_NODE_TYPES,
	type TSESLint,
	type TSESTree,
} from "@typescript-eslint/utils";
import { CommandClasses } from "@zwave-js/core";
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

/** Takes a member expression (should be CommandClasses["..."]) and returns the name of the CC accessed by it */
export function getCCNameFromExpression(
	expression: TSESTree.MemberExpression,
): string | undefined {
	if (
		expression.object.type
			!== AST_NODE_TYPES.Identifier
		|| expression.object.name
			!== "CommandClasses"
	) {
		return;
	}

	if (expression.property.type === AST_NODE_TYPES.Identifier) {
		return expression.property.name;
	} else if (
		expression.property.type === AST_NODE_TYPES.Literal
		&& typeof expression.property.value === "string"
	) {
		return expression.property.value;
	}
}

/** Takes a member expression (should be CommandClasses["..."]) and returns the CC ID accessed by it */
export function getCCIdFromExpression(
	expression: TSESTree.MemberExpression,
): CommandClasses | undefined {
	const name = getCCNameFromExpression(expression);
	if (!name) return;
	return (CommandClasses as any)[name];
}

/** Takes a decorator found using {@link findDecoratorContainingCCId} and returns the CC name */
export function getCCNameFromDecorator(
	decorator: TSESTree.Decorator,
): string {
	return getCCNameFromExpression((decorator.expression as any).arguments[0])!;
}

/** Takes a decorator found using {@link findDecoratorContainingCCId} and returns the CC ID */
export function getCCIdFromDecorator(
	decorator: TSESTree.Decorator,
): CommandClasses {
	return (CommandClasses as any)[getCCNameFromDecorator(decorator)];
}

export type Rule = TSESLint.RuleModule<any, never[], TSESLint.RuleListener>;
